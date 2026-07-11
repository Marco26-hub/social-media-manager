'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Sparkles, Search, Megaphone, FileText, Eye, Play, Loader2, RefreshCw, Settings } from 'lucide-react'
import Link from 'next/link'
import { isDemo } from '@/lib/demo'

type AgentKey = 'content' | 'seo' | 'ads' | 'report' | 'competitor'

const AGENTS: { key: AgentKey; nome: string; desc: string; endpoint: string; icon: typeof Sparkles; resultKey: string; unit: string }[] = [
  { key: 'content', nome: 'Contenuti', desc: 'Genera bozze contenuti (DA_APPROVARE) per i clienti in AUTO.', endpoint: '/api/agents/genera-contenuti', icon: Sparkles, resultKey: 'generati', unit: 'bozze' },
  { key: 'seo', nome: 'SEO / GEO', desc: 'Audit SEO e visibilità AI, con score e miglioramenti.', endpoint: '/api/agents/seo-audit', icon: Search, resultKey: 'audit_fatti', unit: 'audit' },
  { key: 'ads', nome: 'Ads', desc: 'Campagne pubblicitarie sulle piattaforme del cliente.', endpoint: '/api/agents/ads', icon: Megaphone, resultKey: 'campagne', unit: 'campagne' },
  { key: 'report', nome: 'Report cliente', desc: 'Report esecutivo periodico (cosa fatto, risultati, prossimi passi).', endpoint: '/api/agents/report', icon: FileText, resultKey: 'report_fatti', unit: 'report' },
  { key: 'competitor', nome: 'Competitor', desc: 'Analisi dei competitor salvati del cliente.', endpoint: '/api/agents/competitor-analysis', icon: Eye, resultKey: 'analisi', unit: 'analisi' },
]

export default function AgentiPage() {
  const demo = isDemo()
  const [config, setConfig] = useState<Record<AgentKey, boolean>>({ content: true, seo: true, ads: true, report: true, competitor: true })
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<AgentKey | null>(null)
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({})

  useEffect(() => {
    fetch('/api/agents/config').then(r => r.ok ? r.json() : null).then(d => {
      if (d && typeof d === 'object') setConfig(prev => ({ ...prev, ...d }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function toggle(key: AgentKey) {
    const next = !config[key]
    setConfig(prev => ({ ...prev, [key]: next }))
    if (demo) return
    const res = await fetch('/api/agents/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_key: key, enabled: next }),
    }).catch(() => null)
    if (!res || !res.ok) setConfig(prev => ({ ...prev, [key]: !next })) // rollback
  }

  async function esegui(a: typeof AGENTS[number]) {
    setRunning(a.key)
    setResults(prev => ({ ...prev, [a.key]: { ok: true, text: 'In esecuzione…' } }))
    try {
      const res = await fetch(a.endpoint, { method: 'POST' })
      const data = await res.json().catch(() => ({})) as Record<string, unknown>
      if (!res.ok) {
        setResults(prev => ({ ...prev, [a.key]: { ok: false, text: `Errore: ${(data.error as string) || res.status}` } }))
        return
      }
      if (data.disabled) {
        setResults(prev => ({ ...prev, [a.key]: { ok: false, text: 'Agente disabilitato: attivalo qui sopra.' } }))
        return
      }
      const n = Number(data[a.resultKey] ?? 0)
      const clienti = Number(data.clienti_auto ?? 0)
      setResults(prev => ({ ...prev, [a.key]: { ok: true, text: `${n} ${a.unit} su ${clienti} clienti in AUTO.` } }))
    } catch (e) {
      setResults(prev => ({ ...prev, [a.key]: { ok: false, text: `Errore di rete: ${(e as Error).message}` } }))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-2 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pannello agenti</h1>
        <Link href="/dashboard/settings" className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
          <Settings className="w-3.5 h-3.5" /> Chi va in AUTO (per cliente)
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">Attiva/disattiva ogni agente e lancialo subito. Un agente produce per un cliente solo se il cliente è su <b>AUTO</b> (in Impostazioni) <b>e</b> l&apos;agente è abilitato qui.</p>

      {demo && <p className="text-xs text-amber-600 mb-4">Modalità demo: le esecuzioni non sono reali.</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 max-w-4xl">
          {AGENTS.map(a => {
            const on = config[a.key]
            const Icon = a.icon
            const r = results[a.key]
            return (
              <div key={a.key} className={`card p-4 ${on ? '' : 'opacity-70'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{a.nome}</p>
                      <button
                        onClick={() => toggle(a.key)}
                        aria-label={`Attiva o disattiva agente ${a.nome}`}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-brand-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => esegui(a)}
                        disabled={!on || running === a.key}
                        className="py-1.5 px-3 text-xs inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {running === a.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Esegui ora
                      </button>
                      {r && <span className={`text-xs ${r.ok ? 'text-gray-500' : 'text-red-600'}`}>{r.text}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 max-w-4xl">
        Nota: &quot;Esegui ora&quot; parte subito con la tua sessione admin. Per l&apos;esecuzione automatica a calendario serve uno scheduler esterno che chiami gli endpoint con l&apos;header <span className="font-mono">Authorization: Bearer CRON_SECRET</span>.
      </p>
    </div>
  )
}
