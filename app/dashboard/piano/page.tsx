'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { PLATFORM_LIST, type PlatformKey } from '@/lib/social-config'
import { Target, Calendar, CalendarRange, Sparkles, Loader2, Check, X, Info } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import AIModelSelector from '@/components/AIModelSelector'
import { useActiveClienteId } from '@/lib/tenant/client'
import { readAISettings, readApiError } from '@/lib/ai-client'
import { useRuntimeDemo } from '@/lib/demo-client'
import { CONTENT_QUALITY_OPTIONS, type ContentQuality } from '@/lib/content-quality'

type QualitySelection = 'auto' | ContentQuality

export default function PianoPage() {
  const [periodo, setPeriodo] = useState<'settimanale' | 'mensile'>('settimanale')
  const [piattaforme, setPiattaforme] = useState<PlatformKey[]>(['instagram','facebook','tiktok','pinterest'])
  const [obiettivo, setObiettivo] = useState('mix')
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [aiModel, setAiModel] = useState('claude-sonnet-4-6')
  const [quality, setQuality] = useState<QualitySelection>('auto')
  const { clienteId } = useActiveClienteId()
  const demo = useRuntimeDemo()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAiModel(localStorage.getItem('ai_model') ?? 'claude-sonnet-4-6')
    }
  }, [])

  function togglePlatform(key: PlatformKey) {
    setPiattaforme(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key])
  }

  function chiediConferma() {
    if (piattaforme.length === 0) {
      setMsg({ type: 'err', text: 'Seleziona almeno una piattaforma' })
      return
    }
    setAiModel(readAISettings().model)
    setConfirmOpen(true)
  }

  async function genera() {
    setConfirmOpen(false)
    setRunning(true)
    setMsg(null)

    if (demo) {
      await new Promise(r => setTimeout(r, 1800))
      const count = periodo === 'mensile' ? 30 : 7
      setMsg({ type: 'ok', text: `${count} contenuti generati per ${piattaforme.length} piattaforme. Vai al calendario per approvare.` })
      setRunning(false)
      return
    }

    try {
      if (!clienteId) throw new Error('Cliente non selezionato')
      const aiSettings = readAISettings()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000)
      const res = await fetch('/api/generate/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ cliente_id: clienteId, piattaforme, obiettivo, periodo, quality, ...aiSettings }),
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(await readApiError(res, 'Generazione piano fallita'))
      setMsg({ type: 'ok', text: 'Piano generato. I contenuti sono nel calendario.' })
    } catch (e) {
      const msg = (e as Error).name === 'AbortError'
        ? 'Richiesta troppo lunga (90s). Il modello AI potrebbe essere sovraccarico. Riprova con un modello diverso.'
        : (e as Error).message
      setMsg({ type: 'err', text: msg })
    }
    setRunning(false)
  }

  const numContenuti = periodo === 'mensile' ? '25-35' : '7-10'
  const isFree = aiModel.endsWith(':free')
  const stimaContenuti = periodo === 'mensile' ? 30 : 8
  const tokenStima = {
    input:  stimaContenuti * 800,    // ~800 token input per contenuto
    output: stimaContenuti * 600,    // ~600 token output per contenuto
    cost:   isFree ? 'GRATIS (OpenRouter free tier)' :
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
          {PLATFORM_LIST.filter(p => p.key !== 'blog').map(p => {
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

        <button
          onClick={chiediConferma}
          disabled={running || piattaforme.length === 0}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {running ? 'Generazione in corso...' : `Genera piano ${periodo}`}
        </button>

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
