'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import { PLATFORMS, type PlatformKey, type FormatoConfig } from '@/lib/social-config'
import { demoContenuti } from '@/lib/demo-data'
import { Sparkles, Loader2, Check, X, ArrowLeft, Calendar, Eye, ChevronRight, ImagePlus, Link2, Trash2, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import ConfirmModal from '@/components/ConfirmModal'
import AIModelSelector from '@/components/AIModelSelector'
import type { Contenuto } from '@/lib/types'
import { useActiveClienteId } from '@/lib/tenant/client'
import { readAISettings, readApiError } from '@/lib/ai-client'
import { useGeneration } from '@/components/GenerationProvider'
import { useRuntimeDemo } from '@/lib/demo-client'
import { CONTENT_QUALITY_OPTIONS, type ContentQuality } from '@/lib/content-quality'
import { GENERATION_OPTIMIZATION_CYCLE } from '@/lib/production-cycle'

type QualitySelection = 'auto' | ContentQuality
type UploadedAsset = {
  name: string
  url: string
  previewUrl?: string
  path?: string
  mime?: string
  size?: number
  source: 'upload' | 'url'
}

export default function SocialPlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = use(params)
  const config = PLATFORMS[platform as PlatformKey]
  if (!config) notFound()

  return <PlatformContent config={config} />
}

function PlatformContent({ config }: { config: typeof PLATFORMS[PlatformKey] }) {
  const [recenti, setRecenti] = useState<Contenuto[]>([])
  const [states, setStates]   = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({})
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [pending, setPending] = useState<FormatoConfig | null>(null)
  const [aiModel, setAiModel] = useState('meta-llama/llama-3.3-70b-instruct:free')
  const [quality, setQuality] = useState<QualitySelection>('auto')
  const [assets, setAssets] = useState<UploadedAsset[]>([])
  const [assetUrl, setAssetUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [prodottoNome, setProdottoNome] = useState('')
  const demo = useRuntimeDemo()
  const { clienteId, loading: loadingCliente } = useActiveClienteId()
  const gen = useGeneration()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAiModel(localStorage.getItem('ai_model') ?? 'meta-llama/llama-3.3-70b-instruct:free')
    }
  }, [])

  useEffect(() => {
    async function load() {
      if (demo) {
        setRecenti(demoContenuti.filter(c => c.canale === config.canaleDb).slice(0, 5))
        return
      }
      if (loadingCliente) return
      const params = new URLSearchParams({ canale: config.canaleDb, limit: '5' })
      const response = await fetch(`/api/data/calendario?${params.toString()}`)
      const data = response.ok ? await response.json() as Contenuto[] : []
      setRecenti(data)
    }
    load()
  }, [demo, config.canaleDb, clienteId, loadingCliente])

  function chiediGenera(f: FormatoConfig) {
    setAiModel(readAISettings().model)
    setPending(f)
  }

  async function uploadAssets(files: FileList | null) {
    if (!files?.length) return
    try {
      if (!clienteId) throw new Error('Cliente non selezionato')
      setUploading(true)
      const form = new FormData()
      form.append('cliente_id', clienteId)
      const selectedFiles = Array.from(files).slice(0, 7 - assets.length)
      selectedFiles.forEach(file => form.append('files', file))
      const previews = new Map(selectedFiles.map(file => [file.name, URL.createObjectURL(file)]))
      const res = await fetch('/api/assets/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await readApiError(res, 'Upload immagini fallito'))
      const data = await res.json() as { assets?: UploadedAsset[] }
      const uploaded = (data.assets || []).map(asset => ({ ...asset, previewUrl: previews.get(asset.name) || asset.url }))
      setAssets(prev => [...prev, ...uploaded].slice(0, 7))
    } catch (e) {
      setErrors(prev => ({ ...prev, asset_upload: (e as Error).message }))
    } finally {
      setUploading(false)
    }
  }

  function addAssetUrl() {
    const value = assetUrl.trim()
    if (!value) return
    try {
      const parsed = new URL(value)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL non valido')
      const asset: UploadedAsset = {
        name: parsed.pathname.split('/').pop() || 'immagine-url',
        url: parsed.toString(),
        source: 'url',
      }
      setAssets(prev => [...prev, asset].slice(0, 7))
      setAssetUrl('')
    } catch {
      setErrors(prev => ({ ...prev, asset_url: 'Inserisci un URL pubblico valido, es. https://...' }))
    }
  }

  function removeAsset(index: number) {
    setAssets(prev => prev.filter((_, i) => i !== index))
  }

  function renameAsset(index: number, nome: string) {
    setAssets(prev => prev.map((a, i) => (i === index ? { ...a, name: nome } : a)))
  }

  async function genera(f: FormatoConfig) {
    setPending(null)
    setErrors(prev => {
      const next = { ...prev }
      delete next[f.id]
      return next
    })
    if (!demo && !clienteId) {
      setErrors(prev => ({ ...prev, [f.id]: 'Cliente non selezionato' }))
      setStates(s => ({ ...s, [f.id]: 'error' }))
      return
    }
    setStates(s => ({ ...s, [f.id]: 'loading' }))

    const aiSettings = readAISettings()
    const isBlog = f.formato === 'articolo'
    const endpoint = isBlog ? '/api/generate/blog' : '/api/generate/content'
    const body = isBlog
      ? { cliente_id: clienteId, tema: prodottoNome.trim() || (config.nome + ' - ' + f.nome), nome_prodotto: prodottoNome.trim() || undefined, quality, uploaded_assets: assets, media_urls: assets.map(asset => asset.url), ...aiSettings }
      : { cliente_id: clienteId, canale: config.canaleDb, formato: f.formato, tema: prodottoNome.trim() || undefined, nome_prodotto: prodottoNome.trim() || undefined, quality, uploaded_assets: assets, media_urls: assets.map(asset => asset.url), ...aiSettings }

    // Generazione nel provider globale: continua anche se cambi pagina, con barra di progresso.
    const result = await gen.run({
      key: `content:${f.id}`,
      label: `${config.nome} · ${f.nome}`,
      url: endpoint,
      body,
      href: '/dashboard/calendario',
      estMs: isBlog ? 35000 : 22000,
    })

    if (result.ok) {
      setStates(s => ({ ...s, [f.id]: 'success' }))
    } else {
      setErrors(prev => ({ ...prev, [f.id]: result.error || `Generazione ${f.nome} fallita` }))
      setStates(s => ({ ...s, [f.id]: 'error' }))
    }
    setTimeout(() => setStates(s => ({ ...s, [f.id]: 'idle' })), 4000)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      {/* Header piattaforma */}
      <div className={`rounded-2xl bg-gradient-to-br ${config.gradient} border border-gray-100 p-6 md:p-8 mb-6`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${config.colorBg} flex items-center justify-center text-3xl md:text-4xl shadow-lg flex-shrink-0`}>
            {config.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{config.nome}</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">{config.tagline}</p>
            <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-2xl">{config.descrizione}</p>
          </div>
        </div>
      </div>

      <AIModelSelector task="contenuti-social" />

      <div className="card p-4 mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Qualità generazione</p>
            <p className="text-xs text-gray-500">Auto usa il pacchetto cliente; High crea brief elite con KPI, varianti e checklist.</p>
          </div>
          <select
            value={quality}
            onChange={event => setQuality(event.target.value as QualitySelection)}
            className="input md:max-w-xs"
          >
            {CONTENT_QUALITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label} — {option.desc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-4 mb-5 border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="w-5 h-5 text-brand-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-900">Ciclo operativo della generazione</p>
            <p className="text-xs text-gray-500">
              Il contenuto non esce “nudo”: include ipotesi performance, metrica da guardare, fallback e prossime azioni.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {GENERATION_OPTIMIZATION_CYCLE.slice(0, 3).map(stage => (
            <div key={stage.id} className="rounded-xl bg-white border border-gray-100 p-3">
              <p className="text-xs font-bold text-gray-900">{stage.title}</p>
              <p className="text-[11px] text-gray-500 mt-1">{stage.output}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-5 border-brand-100 bg-gradient-to-br from-white to-brand-50/40">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-brand-600" />
              <p className="text-sm font-bold text-gray-900">Immagini tue per creare il contenuto</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Carica foto prodotto/brand o incolla URL pubblici: entrano nel prompt e vengono salvate nel contenuto.
            </p>
            <p className="text-[11px] text-amber-700 mt-1">
              Per autopublishing Blotato usa URL pubblici o immagini caricate qui; max 7 asset.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:w-[520px]">
            <label className="btn-secondary justify-center py-2 px-3 cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {uploading ? 'Carico...' : 'Carica immagini'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading || assets.length >= 7}
                onChange={event => uploadAssets(event.target.files)}
              />
            </label>
            <div className="flex flex-1 gap-2">
              <input
                value={assetUrl}
                onChange={event => setAssetUrl(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addAssetUrl()
                  }
                }}
                className="input text-xs"
                placeholder="https://... immagine pubblica"
              />
              <button type="button" onClick={addAssetUrl} className="btn-secondary py-2 px-3" aria-label="Aggiungi URL immagine">
                <Link2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Nome prodotto/i caricati: la vision VEDE il prodotto, questo dà i NOMI esatti */}
        <div className="mt-3">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5 text-brand-600" />
            Prodotto/i nell&apos;immagine <span className="font-normal text-gray-400">(nome esatto per un copy preciso)</span>
          </label>
          <input
            value={prodottoNome}
            onChange={event => setProdottoNome(event.target.value)}
            className="input text-xs mt-1"
            placeholder="Es: Camicia Riva azzurra in lino, Cappellino Darsena"
          />
        </div>

        {assets.length > 0 && (
          <>
            <p className="text-[11px] text-gray-500 mt-4 mb-1.5">Dai un nome a ogni immagine col prodotto che contiene — l&apos;AI lo userà nel copy.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {assets.map((asset, index) => (
                <div key={`${asset.url}-${index}`} className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.previewUrl || asset.url} alt={asset.name} className="w-full aspect-square object-cover" />
                    <span className="absolute top-1 left-1 bg-black/55 text-white text-[9px] px-1.5 py-0.5 rounded-full">{asset.source === 'upload' ? 'Upload' : 'URL'}</span>
                    <button
                      type="button"
                      onClick={() => removeAsset(index)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/90 text-red-600 flex items-center justify-center opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Rimuovi immagine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    value={asset.name || ''}
                    onChange={e => renameAsset(index, e.target.value)}
                    placeholder="Nome prodotto…"
                    className="w-full text-[11px] px-2 py-1.5 border-t border-gray-100 focus:outline-none focus:bg-brand-50/40"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {Object.values(errors).length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          AI: {Object.values(errors)[0]}
        </div>
      )}

      {/* Format scegliere cosa creare */}
      <div className="mb-8">
        <h2 className="font-bold text-gray-900 mb-1">Cosa vuoi creare?</h2>
        <p className="text-xs md:text-sm text-gray-500 mb-4">Scegli il formato. L&apos;AI scriverà hook, caption, hashtag e CTA per te.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
          {config.formati.map(f => {
            const Icon = f.icon
            const st = states[f.id] ?? 'idle'
            return (
              <div key={f.id} className="card p-4 md:p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${config.colorBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{f.nome}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-mono">{f.aspectRatio}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{f.formato}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Esempio</p>
                  <p className="text-xs text-gray-700 italic">&ldquo;{f.esempio}&rdquo;</p>
                </div>

                <button
                  onClick={() => chiediGenera(f)}
                  disabled={st === 'loading'}
                  className={`w-full text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                    st === 'success' ? 'bg-green-100 text-green-700' :
                    st === 'error'   ? 'bg-red-100 text-red-700' :
                                       'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60'
                  }`}
                >
                  {st === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {st === 'success' && <Check className="w-4 h-4" />}
                  {st === 'error'   && <X className="w-4 h-4" />}
                  {st === 'idle'    && <Sparkles className="w-4 h-4" />}
                  {st === 'loading' ? 'Generando...' :
                   st === 'success' ? 'Aggiunto in calendario' :
                   st === 'error'   ? 'Errore — riprova' :
                   `Genera ${f.nome.toLowerCase()}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm modal */}
      {pending && (() => {
        const isFree = aiModel.endsWith(':free')
        return (
          <ConfirmModal
            open={true}
            onClose={() => setPending(null)}
            onConfirm={() => genera(pending)}
            title={`Generare ${pending.nome} ${config.nome}?`}
            desc={`L'AI scriverà hook, caption, hashtag e CTA per un ${pending.nome.toLowerCase()} ${config.nome}. Verrà aggiunto al calendario in stato DA_APPROVARE.`}
            modello={aiModel}
            isFree={isFree}
            tokenEstimate={{
              input: 800,
              output: 600,
              cost: isFree ? 'GRATIS (OpenRouter free)' :
                    aiModel.includes('opus') ? '~$0.03' :
                    aiModel.includes('haiku') ? '~$0.004' :
                    '~$0.012',
            }}
            running={false}
          />
        )
      })()}

      {/* Contenuti recenti */}
      {recenti.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Ultimi contenuti {config.nome}</h2>
            <Link href={`/dashboard/calendario`} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              Tutti <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recenti.map(c => (
              <div key={c.id} className="card p-3 md:p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                  {c.link_media_1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.link_media_1} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">{config.emoji}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-gray-400">{c.id_contenuto}</span>
                    <StatusBadge status={c.status} />
                    {c.quality_level && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 uppercase">{c.quality_level}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{c.hook || c.caption}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {c.data_pubblicazione} {c.ora_pubblicazione?.slice(0,5)}
                  </p>
                </div>
                <Link href={`/dashboard/calendario`} className="btn-secondary py-1.5 px-2">
                  <Eye className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
