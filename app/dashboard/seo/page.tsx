'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { demoSeoAudit } from '@/lib/demo-data'
import type { SeoAudit } from '@/lib/types'
import { TrendingUp, AlertTriangle, Target, CheckCircle2, Calendar, Search, Loader2, Globe, Sparkles } from 'lucide-react'
import AIModelSelector from '@/components/AIModelSelector'
import { useActiveClienteId } from '@/lib/tenant/client'

import { isDemo } from '@/lib/demo'

export default function SeoPage() {
  const [audits, setAudits] = useState<SeoAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [url, setUrl] = useState('')
  const [periodo, setPeriodo] = useState<'settimanale' | 'mensile'>('settimanale')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const demo = isDemo()
  const { clienteId, loading: loadingCliente } = useActiveClienteId()

  useEffect(() => {
    async function load() {
      if (demo) { setAudits(demoSeoAudit); setLoading(false); return }
      if (loadingCliente) return
      const response = await fetch('/api/data/seo-audit')
      const data = response.ok ? await response.json() as SeoAudit[] : []
      setAudits(data)
      setLoading(false)
    }
    load()
  }, [demo, clienteId, loadingCliente])

  async function avviaAudit() {
    if (!url.trim()) {
      setMsg({ type: 'err', text: 'Inserisci URL del sito' })
      return
    }
    setRunning(true)
    setMsg(null)

    if (demo) {
      await new Promise(r => setTimeout(r, 2000))
      setMsg({ type: 'ok', text: `Audit ${periodo} avviato per ${url}. Riceverai i risultati in 30-60s` })
      setRunning(false)
      return
    }

    try {
      if (!clienteId) throw new Error('Cliente non selezionato')
      const aiModel = typeof window !== 'undefined' ? localStorage.getItem('ai_model') ?? 'claude-sonnet-4-6' : 'claude-sonnet-4-6'
      const orKey = typeof window !== 'undefined' ? localStorage.getItem('openrouter_key') ?? '' : ''
      const res = await fetch('/api/generate/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, sito_url: url, periodo, model: aiModel, openrouter_key: orKey || undefined }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`) }
      setMsg({ type: 'ok', text: `Audit completato per ${url}` })
    } catch (e) {
      setMsg({ type: 'err', text: (e as Error).message })
    }
    setRunning(false)
  }

  const latest = audits[0]
  const scoreColor = (n: number) =>
    n >= 80 ? 'text-green-600' :
    n >= 60 ? 'text-yellow-600' :
              'text-red-600'
  const scoreBg = (n: number) =>
    n >= 80 ? 'bg-green-500' :
    n >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
  const impattoColor: Record<string, string> = {
    alto:  'bg-red-100 text-red-700',
    medio: 'bg-yellow-100 text-yellow-700',
    basso: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">SEO + GEO Audit</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">Analisi sito + ottimizzazione AI search engines</p>
      </div>

      <AIModelSelector task="seo-audit" />

      {/* Form avvio audit */}
      <div className="card p-5 md:p-6 mb-6 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-teal-100">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Nuovo audit</h2>
            <p className="text-xs text-gray-500 mt-0.5">Inserisci URL e periodo. AI analizza SEO tecnico, contenuti, GEO/AI, E-E-A-T.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">URL sito da analizzare</label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="input pl-9"
                disabled={running}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="label">Periodo audit</label>
              <div className="flex gap-2">
                {(['settimanale', 'mensile'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      periodo === p
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p === 'settimanale' ? '📅 Settimanale' : '🗓️ Mensile'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={avviaAudit}
              disabled={running}
              className="btn-primary text-sm px-5 py-2.5 justify-center md:w-auto w-full"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {running ? 'Avvio audit...' : 'Avvia audit'}
            </button>
          </div>

          {msg && (
            <div className={`text-xs rounded-lg p-2.5 ${
              msg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' :
                                  'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>

      {/* Ultimo audit */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !latest ? (
        <div className="card p-12 text-center text-gray-400">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-lg">Nessun audit ancora</p>
          <p className="text-sm mt-1">Compila il form sopra per avviare il primo</p>
        </div>
      ) : (
        <>
          {/* Score globale */}
          <div className="card p-5 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Ultimo audit · {latest.periodo}</p>
                <p className="text-sm text-gray-500 mt-0.5">{latest.data_audit}</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl md:text-5xl font-bold ${scoreColor(latest.score_globale)}`}>
                  {latest.score_globale}
                </div>
                <p className="text-xs text-gray-400">/ 100</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{latest.riepilogo}</p>
          </div>

          {/* Scores grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'SEO Tecnico',        val: latest.score_seo_tecnico },
              { label: 'SEO Contenuti',      val: latest.score_seo_contenuti },
              { label: 'GEO / AI Search',    val: latest.score_geo_ai_search },
              { label: 'Social Coerenza',    val: latest.score_social_coerenza },
              { label: 'E-E-A-T',            val: latest.score_eeat },
              { label: 'Performance Social', val: latest.score_performance_social },
            ].map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-xs text-gray-500 font-medium mb-2">{s.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${scoreColor(s.val)}`}>{s.val}</span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${scoreBg(s.val)}`} style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Punti forti + critici */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-3">
                <CheckCircle2 className="w-4 h-4" /> Punti forti
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {latest.punti_forti?.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-green-500">✓</span>{p}</li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-3">
                <AlertTriangle className="w-4 h-4" /> Punti critici
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {latest.punti_critici?.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-red-500">!</span>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Miglioramenti */}
          <div className="card p-5 mb-6">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <Target className="w-4 h-4 text-brand-600" /> Miglioramenti prioritari
            </h3>
            <div className="space-y-3">
              {latest.miglioramenti?.map((m, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.azione}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Area: {m.area} · Deadline: {m.deadline_suggerita}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${impattoColor[m.impatto] ?? 'bg-gray-100'}`}>
                      Impatto: {m.impatto}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                      Effort: {m.effort}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI + suggeriti */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <TrendingUp className="w-4 h-4 text-brand-600" /> KPI da monitorare
              </h3>
              <div className="space-y-3">
                {latest.kpi_da_monitorare?.map((k, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-gray-900">{k.metrica}</p>
                    <div className="flex gap-3 text-xs mt-1">
                      <span className="text-gray-500">Ora: <span className="font-mono text-gray-700">{k.valore_attuale}</span></span>
                      <span className="text-brand-600">Target: <span className="font-mono">{k.target}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
                <Calendar className="w-4 h-4 text-brand-600" /> Contenuti suggeriti
              </h3>
              <div className="space-y-2">
                {latest.contenuti_suggeriti?.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm text-gray-700 flex-1 min-w-0 truncate">{c.tema}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{c.formato} · {c.canale}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      c.priorita === 'alta' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{c.priorita}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
