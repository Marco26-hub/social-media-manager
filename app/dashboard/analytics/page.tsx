'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Loader2, AlertTriangle, CheckCircle, Send, FileEdit, TrendingUp, Eye, Plus, RefreshCw, Instagram } from 'lucide-react'
import { readApiError } from '@/lib/ai-client'

type PubPost = {
  id_contenuto: string; canale: string; formato?: string; hook?: string
  impressions?: number; reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; clicks?: number; engagement_rate?: number
}

function MetricsEntry({ onSaved }: { onSaved: () => void }) {
  const [posts, setPosts] = useState<PubPost[]>([])
  const [sel, setSel] = useState('')
  const [f, setF] = useState({ reach: '', impressions: '', likes: '', comments: '', shares: '', clicks: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/data/metrics')
      if (res.ok) setPosts(await res.json() as PubPost[])
    } catch { /* ignore */ }
  }, [])
  useEffect(() => { loadPosts() }, [loadPosts])

  const selected = posts.find(p => `${p.id_contenuto}|${p.canale}` === sel)

  async function save() {
    if (!selected) { setMsg('Seleziona un post'); return }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/data/metrics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_contenuto: selected.id_contenuto, canale: selected.canale, ...f }),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Salvataggio metriche fallito'))
      setMsg('✅ Metriche salvate')
      setF({ reach: '', impressions: '', likes: '', comments: '', shares: '', clicks: '' })
      await loadPosts(); onSaved()
    } catch (e) { setMsg(`❌ ${(e as Error).message}`) }
    setSaving(false)
  }

  return (
    <div className="card p-5 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Plus className="w-5 h-5 text-brand-600" />
        <h2 className="font-bold text-gray-900">Inserisci metriche reali</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">Copia i numeri dalle Insights native (Instagram/Facebook) per il post pubblicato. Sono dati reali, niente stime.</p>
      {posts.length === 0 ? (
        <p className="text-sm text-gray-400">Nessun post pubblicato ancora. Le metriche si inseriscono sui post in stato PUBBLICATO.</p>
      ) : (
        <div className="space-y-3">
          <select value={sel} onChange={e => setSel(e.target.value)} className="input text-sm">
            <option value="">Scegli un post pubblicato…</option>
            {posts.map(p => (
              <option key={`${p.id_contenuto}|${p.canale}`} value={`${p.id_contenuto}|${p.canale}`}>
                {p.canale} · {p.id_contenuto} {p.hook ? `· ${p.hook.slice(0, 40)}` : ''} {p.engagement_rate ? `(${p.engagement_rate}% eng)` : ''}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([['reach', 'Reach'], ['impressions', 'Impression'], ['likes', 'Like'], ['comments', 'Commenti'], ['shares', 'Condivisioni'], ['clicks', 'Click']] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-[11px] text-gray-500">{label}</label>
                <input type="number" min={0} value={f[key]} onChange={e => setF(s => ({ ...s, [key]: e.target.value }))} className="input text-sm" placeholder="0" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !sel} className="btn-primary text-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salva metriche
            </button>
            {msg && <span className="text-xs text-gray-600">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

type Analytics = {
  demo: boolean
  meta?: { configured: boolean; igConnected: number }
  kpi: { totale: number; daApprovare: number; approvati: number; pubblicati: number; errori: number; tassoApprovazione: number; tassoErrore: number }
  timeline: { giorno: string; creati: number }[]
  perCanale: Record<string, number>
  perFormato: Record<string, number>
  perQualita: Record<string, number>
  perFunnel: Record<string, number>
  pipeline: Record<string, number>
  performance: { hasData: boolean; totali: Record<string, number> | null; topPost: Record<string, unknown>[] }
}

function BarList({ title, data, color = 'bg-brand-500' }: { title: string; data: Record<string, number>; color?: string }) {
  const entries = Object.entries(data || {}).filter(([k]) => k && k !== '—').sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">Nessun dato</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-700 capitalize">{k}</span>
                <span className="font-semibold text-gray-900">{v}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/data/analytics')
      if (!res.ok) throw new Error(await readApiError(res, 'Impossibile caricare le analytics'))
      setData(await res.json() as Analytics)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Feedback dal ritorno OAuth (?connect=ok|error|no_ig).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const c = p.get('connect')
    if (c === 'ok') setSyncMsg(`✅ Instagram collegato (${p.get('accounts') || 1} account). Ora sincronizza le Insights.`)
    else if (c === 'no_ig') setSyncMsg('⚠️ Nessun account Instagram Business trovato. Serve un profilo Instagram Business/Creator collegato a una Pagina Facebook.')
    else if (c === 'error') setSyncMsg(`❌ Collegamento fallito: ${p.get('msg') || 'errore'}`)
  }, [])

  async function syncNow() {
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await fetch('/api/data/metrics/sync', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Sync fallito')
      setSyncMsg(`✅ ${d.synced} post sincronizzati da Instagram.${d.errors?.length ? ' Avvisi: ' + d.errors.join('; ') : ''}`)
      await load()
    } catch (e) { setSyncMsg(`❌ ${(e as Error).message}`) }
    setSyncing(false)
  }

  if (loading) return <div className="p-8 flex justify-center py-20"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
  if (error) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="card p-6 border-red-200 bg-red-50 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div><p className="font-semibold text-red-900">Analytics non disponibili</p><p className="text-sm text-red-700 mt-1">{error}</p></div>
      </div>
    </div>
  )
  if (!data) return null

  const k = data.kpi
  const maxTimeline = Math.max(1, ...data.timeline.map(t => t.creati))
  const pipelineOrder = ['IDEA', 'BOZZA', 'DA_APPROVARE', 'APPROVATO', 'PUBBLICATO', 'ERRORE']
  const maxPipe = Math.max(1, ...pipelineOrder.map(s => data.pipeline[s] || 0))
  const perf = data.performance

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">Produzione contenuti e performance — dati reali del cliente attivo.</p>

      {/* Connessione Instagram → Insights automatiche */}
      <div className="card p-4 mb-6 bg-gradient-to-br from-white to-pink-50/40 border-pink-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">Insights Instagram automatiche</p>
              {data.meta?.igConnected ? (
                <p className="text-xs text-green-700">✓ {data.meta.igConnected} account collegato. Sincronizza per leggere reach/engagement reali.</p>
              ) : data.meta?.configured ? (
                <p className="text-xs text-gray-500">Collega il profilo Instagram Business per leggere le metriche reali via API Meta.</p>
              ) : (
                <p className="text-xs text-amber-700">Integrazione Meta non ancora configurata (servono META_APP_ID e META_APP_SECRET su Render).</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {data.meta?.configured && (
              data.meta.igConnected ? (
                <button onClick={syncNow} disabled={syncing} className="btn-primary text-xs disabled:opacity-50">
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {syncing ? 'Sincronizzo...' : 'Sincronizza Insights'}
                </button>
              ) : (
                <a href="/api/social/connect" className="btn-primary text-xs"><Instagram className="w-4 h-4" /> Collega Instagram</a>
              )
            )}
          </div>
        </div>
        {syncMsg && <p className="text-xs text-gray-700 mt-3 border-t border-gray-100 pt-2">{syncMsg}</p>}
      </div>

      {/* KPI produzione */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Contenuti', value: k.totale, icon: FileEdit, color: 'text-gray-700 bg-gray-50' },
          { label: 'Da approvare', value: k.daApprovare, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Approvati', value: k.approvati, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Pubblicati', value: k.pubblicati, icon: Send, color: 'text-brand-600 bg-brand-50' },
          { label: 'Tasso approvaz.', value: `${k.tassoApprovazione}%`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
          { label: 'Tasso errore', value: `${k.tassoErrore}%`, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.color}`}><c.icon className="w-4 h-4" /></div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Timeline produzione */}
      <div className="card p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contenuti creati · ultimi 30 giorni</p>
        {data.timeline.length === 0 ? (
          <p className="text-xs text-gray-400">Nessun contenuto creato di recente</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {data.timeline.map(t => (
              <div key={t.giorno} className="flex-1 flex flex-col items-center justify-end group" title={`${t.giorno}: ${t.creati}`}>
                <div className="w-full bg-brand-500 rounded-t group-hover:bg-brand-600 transition-colors" style={{ height: `${(t.creati / maxTimeline) * 100}%`, minHeight: t.creati ? 4 : 0 }} />
                <span className="text-[8px] text-gray-400 mt-1 rotate-0">{t.giorno.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="card p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pipeline editoriale</p>
        <div className="space-y-2">
          {pipelineOrder.map(s => (
            <div key={s}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-700">{s.replace('_', ' ')}</span>
                <span className="font-semibold text-gray-900">{data.pipeline[s] || 0}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${s === 'ERRORE' ? 'bg-red-500' : s === 'PUBBLICATO' ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${((data.pipeline[s] || 0) / maxPipe) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribuzioni */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BarList title="Per canale" data={data.perCanale} color="bg-blue-500" />
        <BarList title="Per formato" data={data.perFormato} color="bg-violet-500" />
        <BarList title="Per qualità" data={data.perQualita} color="bg-amber-500" />
        <BarList title="Per funnel" data={data.perFunnel} color="bg-emerald-500" />
      </div>

      {/* Performance reali */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-gray-900">Performance post (reach, engagement)</h2>
        </div>
        {perf.hasData && perf.totali ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Impression', value: perf.totali.impressions },
                { label: 'Reach', value: perf.totali.reach },
                { label: 'Like', value: perf.totali.likes },
                { label: 'Engagement medio', value: `${perf.totali.engagement_rate_medio || 0}%` },
              ].map(m => (
                <div key={m.label} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xl font-bold text-gray-900">{String(m.value)}</p>
                  <p className="text-xs text-gray-500">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top post per engagement</p>
            <div className="space-y-1.5">
              {perf.topPost.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1.5">
                  <span className="text-gray-700">{String(p.id_contenuto || '—')} · {String(p.canale || '')}</span>
                  <span className="font-semibold text-brand-700">{String(p.engagement_rate || 0)}% eng · {String(p.reach || 0)} reach</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800">Nessun dato di performance ancora.</p>
            <p className="mt-1 text-xs">Inserisci le metriche reali qui sotto (dalle Insights della piattaforma). <span className="font-medium">Non mostriamo numeri finti.</span></p>
          </div>
        )}
      </div>

      <MetricsEntry onSaved={load} />
    </div>
  )
}
