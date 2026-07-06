'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { PLATFORM_LIST, type PlatformKey } from '@/lib/social-config'
import { Target, Calendar, CalendarRange, Sparkles, Loader2, Check, X, Info, ImagePlus, Trash2 } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import AIModelSelector from '@/components/AIModelSelector'
import { useActiveClienteId } from '@/lib/tenant/client'
import { readAISettings, readApiError } from '@/lib/ai-client'
import { useGeneration } from '@/components/GenerationProvider'
import { useRuntimeDemo } from '@/lib/demo-client'
import { CONTENT_QUALITY_OPTIONS, type ContentQuality } from '@/lib/content-quality'

type QualitySelection = 'auto' | ContentQuality
type PlanAsset = { url: string; name: string }
const MAX_PLAN_IMAGES = 60

export default function PianoPage() {
  const [periodo, setPeriodo] = useState<'settimanale' | 'mensile'>('settimanale')
  const [piattaforme, setPiattaforme] = useState<PlatformKey[]>(['instagram','facebook','tiktok','pinterest'])
  const [obiettivo, setObiettivo] = useState('mix')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [aiModel, setAiModel] = useState('meta-llama/llama-3.3-70b-instruct:free')
  const [quality, setQuality] = useState<QualitySelection>('auto')
  const [planAssets, setPlanAssets] = useState<PlanAsset[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { clienteId } = useActiveClienteId()
  const demo = useRuntimeDemo()
  const gen = useGeneration()
  const running = gen.isRunning('piano')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAiModel(localStorage.getItem('ai_model') ?? 'meta-llama/llama-3.3-70b-instruct:free')
    }
  }, [])

  function togglePlatform(key: PlatformKey) {
    setPiattaforme(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key])
  }

  // Upload in blocchi da 7 (limite server per richiesta) finché tutti i file scelti sono caricati.
  async function uploadPlanImages(files: FileList | null) {
    if (!files?.length || !clienteId) return
    setUploadError(null)
    setUploadingImages(true)
    try {
      const selected = Array.from(files).slice(0, MAX_PLAN_IMAGES - planAssets.length)
      for (let i = 0; i < selected.length; i += 14) {
        const chunk = selected.slice(i, i + 14)
        const form = new FormData()
        form.append('cliente_id', clienteId)
        chunk.forEach(file => form.append('files', file))
        const res = await fetch('/api/assets/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error(await readApiError(res, 'Upload immagini fallito'))
        const data = await res.json() as { assets?: { url: string; name: string }[] }
        const uploaded = (data.assets || []).map(a => ({ url: a.url, name: a.name }))
        setPlanAssets(prev => [...prev, ...uploaded])
      }
    } catch (e) {
      setUploadError((e as Error).message)
    } finally {
      setUploadingImages(false)
    }
  }

  function removePlanImage(index: number) {
    setPlanAssets(prev => prev.filter((_, i) => i !== index))
  }

  function chiediConferma() {
    if (piattaforme.length === 0) {
      setMsg({ type: 'err', text: 'Seleziona almeno una piattaforma' })
      return
    }
    setAiModel(readAISettings().model)
    setConfirmOpen(true)
  }

  async function genera(fase?: 1 | 2) {
    setConfirmOpen(false)
    setMsg(null)

    if (!demo && !clienteId) {
      setMsg({ type: 'err', text: 'Cliente non selezionato' })
      return
    }

    const aiSettings = readAISettings()
    const faseLabel = fase ? ` · fase ${fase} (sett. ${fase === 1 ? '1-2' : '3-4'})` : ''
    // Fase mensile: metà settimane per volta → richiesta più corta, meno rischio timeout.
    const result = await gen.run<{
      count?: number
      images_provided?: number
      images_insufficient?: boolean
      carousel_underfilled?: boolean
      chunks_total?: number
      chunks_failed?: number
      items_scartati?: number
    }>({
      key: fase ? `piano-fase-${fase}` : 'piano',
      label: `Piano editoriale ${periodo}${faseLabel}`,
      url: '/api/generate/plan',
      body: { cliente_id: clienteId, piattaforme, obiettivo, periodo, quality, media_urls: planAssets.map(a => a.url), ...(fase ? { fase } : {}), ...aiSettings },
      href: '/dashboard/calendario',
      estMs: periodo === 'mensile' ? 50000 : 25000,
      timeoutMs: periodo === 'mensile' ? 130000 : 95000,
    })

    if (result.ok) {
      const data = result.data
      const imgNote = !data?.images_provided
        ? ' Nessuna immagine caricata: i contenuti sono senza foto, caricale poi dal calendario.'
        : data.images_insufficient
          ? ` ${data.images_provided} foto usate una per contenuto: sono finite prima dei post, gli ultimi restano senza immagine (caricane altre o assegnale dal calendario).`
          : ` ${data.images_provided} foto distribuite, una per contenuto (carosello 3-10).`
      const chunkNote = data?.chunks_failed
        ? ` ⚠️ ${data.chunks_failed} di ${data.chunks_total} blocchi settimanali non ha generato contenuti (riprova per coprire quei giorni).`
        : ''
      const scartatiNote = data?.items_scartati
        ? ` ${data.items_scartati} contenuti generati sono stati scartati per dati non validi.`
        : ''
      const faseNote = fase ? ` (fase ${fase}: settimane ${fase === 1 ? '1-2' : '3-4'})` : ''
      setMsg({ type: 'ok', text: `Piano generato${faseNote} (${data?.count ?? '?'} contenuti). I contenuti sono nel calendario.${imgNote}${chunkNote}${scartatiNote}` })
    } else {
      setMsg({ type: 'err', text: result.error || 'Generazione piano fallita' })
    }
  }

  const numContenuti = periodo === 'mensile' ? '25-35' : '7-10'
  const isLocal = aiModel.startsWith('ollama/')
  const isFree = aiModel.endsWith(':free')
  const stimaContenuti = periodo === 'mensile' ? 30 : 8
  const tokenStima = {
    input:  stimaContenuti * 800,    // ~800 token input per contenuto
    output: stimaContenuti * 600,    // ~600 token output per contenuto
    cost:   isLocal ? 'GRATIS (Ollama locale · Mac)' :
            isFree ? 'GRATIS (OpenRouter free tier)' :
            aiModel.includes('opus') ? `~$${(stimaContenuti * 0.03).toFixed(2)}` :
            aiModel.includes('haiku') ? `~$${(stimaContenuti * 0.004).toFixed(3)}` :
            `~$${(stimaContenuti * 0.012).toFixed(2)}`,
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Piano editoriale</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">
          Un click → AI genera contenuti per tutti i social selezionati con il modello che hai impostato.
        </p>
      </div>

      <AIModelSelector task="piano-editoriale" />

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">Q</div>
          <h2 className="font-semibold text-gray-900">Qualità operativa</h2>
        </div>
        <select
          value={quality}
          onChange={event => setQuality(event.target.value as QualitySelection)}
          className="input"
        >
          {CONTENT_QUALITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label} — {option.desc}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-2">
          High/Elite aggiunge per ogni contenuto: audience, funnel, KPI, angle, brief creativo, A/B test, rischi e checklist.
        </p>
      </div>

      {/* Step 1 — Periodo */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">1</div>
          <h2 className="font-semibold text-gray-900">Periodo</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['settimanale', 'mensile'] as const).map(p => {
            const Icon = p === 'settimanale' ? Calendar : CalendarRange
            return (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  periodo === p
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${periodo === p ? 'text-brand-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm text-gray-900 capitalize">{p}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p === 'settimanale' ? '7-10 contenuti / 7 giorni' : '25-35 contenuti / 30 giorni'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2 — Piattaforme */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">2</div>
          <h2 className="font-semibold text-gray-900">Piattaforme</h2>
          <span className="text-xs text-gray-400 ml-auto">{piattaforme.length} selezionate</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PLATFORM_LIST.map(p => {
            const selected = piattaforme.includes(p.key)
            return (
              <button
                key={p.key}
                onClick={() => togglePlatform(p.key)}
                className={`p-3 rounded-xl border-2 transition-all relative ${
                  selected
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                {selected && (
                  <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-brand-600" />
                )}
                <div className="text-2xl mb-1">{p.emoji}</div>
                <p className="text-xs font-semibold text-gray-900">{p.nome}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{p.formati.length} formati</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 3 — Obiettivo */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center">3</div>
          <h2 className="font-semibold text-gray-900">Obiettivo principale</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { v: 'mix',         l: 'Mix completo', e: '🎯' },
            { v: 'vendita',     l: 'Vendita',      e: '💰' },
            { v: 'awareness',   l: 'Awareness',    e: '📢' },
            { v: 'community',   l: 'Community',    e: '💬' },
          ].map(o => (
            <button
              key={o.v}
              onClick={() => setObiettivo(o.v)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                obiettivo === o.v
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="text-xl mb-1">{o.e}</div>
              <p className="text-xs font-semibold text-gray-900">{o.l}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Riepilogo + CTA */}
      <div className="card p-5 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border-violet-100">
        <div className="flex items-start gap-3 mb-4">
          <Target className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">Riepilogo</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-mono font-bold text-violet-700">{numContenuti}</span> contenuti
              {' '}<span className="capitalize">{periodo}</span> distribuiti su
              {' '}<span className="font-semibold">{piattaforme.length}</span> piattaforme
              ({piattaforme.map(p => PLATFORM_LIST.find(x => x.key === p)?.emoji).join(' ')})
              {' '}con obiettivo <span className="font-semibold">{obiettivo}</span>
              {' '}e qualità <span className="font-semibold uppercase">{quality}</span>.
            </p>
          </div>
        </div>

        {/* Upload immagini: caricale tutte in un colpo, il piano le distribuisce sui contenuti */}
        <div className="mb-4 p-3 rounded-xl bg-white/70 border border-violet-100">
          <div className="flex items-start gap-2.5">
            <ImagePlus className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700 leading-relaxed flex-1">
              <p className="font-semibold text-gray-900">Immagini per questo piano</p>
              <p className="mt-0.5">
                Piano <span className="font-semibold capitalize">{periodo}</span> ({numContenuti} contenuti) → servono circa{' '}
                <span className="font-bold text-violet-700">{periodo === 'mensile' ? '35-60' : '10-20'} immagini</span>.
                {' '}<span className="font-semibold text-violet-700">{planAssets.length} caricate</span>.
              </p>
              <ul className="mt-1.5 space-y-0.5 text-gray-600">
                <li>• <span className="font-medium">1 immagine</span> per ogni post e story</li>
                <li>• <span className="font-medium">5 immagini</span> per ogni carosello</li>
                <li>• <span className="font-medium">1 clip video</span> (o cover) per ogni reel/video</li>
              </ul>
              <p className="mt-1.5 text-gray-500">
                Carica tutte le foto qui sotto in un colpo solo: verranno assegnate in ordine ai contenuti del piano.
              </p>
            </div>
          </div>

          <label className={`mt-3 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 text-xs font-medium cursor-pointer transition-colors ${
            uploadingImages ? 'border-violet-200 text-violet-400' : 'border-violet-300 text-violet-700 hover:bg-violet-50'
          }`}>
            {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploadingImages ? 'Caricamento...' : `Scegli foto dal tuo computer (${planAssets.length}/${MAX_PLAN_IMAGES})`}
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              disabled={uploadingImages || planAssets.length >= MAX_PLAN_IMAGES}
              onChange={e => { uploadPlanImages(e.target.files); e.target.value = '' }}
            />
          </label>

          {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}

          {planAssets.length > 0 && (
            <div className="mt-3 grid grid-cols-6 sm:grid-cols-8 gap-1.5">
              {planAssets.map((a, i) => (
                <div key={a.url + i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePlanImage(i)}
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={chiediConferma}
          disabled={running || uploadingImages || piattaforme.length === 0}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {running ? 'Generazione in corso...' : `Genera piano ${periodo}`}
        </button>

        {/* Mensile in 2 fasi: richieste più corte, meno rischio timeout/rate-limit */}
        {periodo === 'mensile' && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2 text-center">Oppure genera in 2 fasi (più affidabile se va in timeout):</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => genera(1)}
                disabled={running || uploadingImages || piattaforme.length === 0}
                className="btn-secondary py-2.5 justify-center text-sm disabled:opacity-50"
              >
                Fase 1 · settimane 1-2
              </button>
              <button
                onClick={() => genera(2)}
                disabled={running || uploadingImages || piattaforme.length === 0}
                className="btn-secondary py-2.5 justify-center text-sm disabled:opacity-50"
              >
                Fase 2 · settimane 3-4
              </button>
            </div>
          </div>
        )}

        <ConfirmModal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={genera}
          title="Conferma generazione piano"
          desc={`Stai per generare ${numContenuti} contenuti per ${piattaforme.length} piattaforme con qualità ${quality}. L'AI verrà chiamata UNA volta.`}
          modello={aiModel}
          isFree={isFree}
          tokenEstimate={tokenStima}
          running={running}
        />

        {msg && (
          <div className={`mt-4 text-sm rounded-lg p-3 flex items-start gap-2 ${
            msg.type === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {msg.type === 'ok' ? <Check className="w-4 h-4 mt-0.5" /> : <X className="w-4 h-4 mt-0.5" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>I contenuti verranno creati in stato <span className="font-mono bg-white px-1 rounded">BOZZA</span>.
        Dovrai approvarli dal <a href="/dashboard/calendario" className="text-brand-600 hover:underline">calendario</a> prima della pubblicazione.</p>
      </div>
    </div>
  )
}
