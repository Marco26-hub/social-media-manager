import { createClient } from '@/lib/supabase/server'
import { Calendar, CheckCircle, AlertCircle, Send, Clock, TrendingUp, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { demoContenuti, demoLogs } from '@/lib/demo-data'
import AIModelSelector from '@/components/AIModelSelector'
import { PLATFORM_LIST } from '@/lib/social-config'

export const dynamic = 'force-dynamic'

const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

async function getStats() {
  if (isDemo()) {
    return {
      daApprovare: demoContenuti.filter(c => c.status === 'DA_APPROVARE').length,
      pubblicati7g: demoContenuti.filter(c => c.status === 'PUBBLICATO').length,
      errori: demoContenuti.filter(c => c.status === 'ERRORE' || c.status === 'ERRORE_MANUALE').length,
      inCoda: demoContenuti.filter(c => c.status === 'APPROVATO').length,
      ultimi: demoLogs,
    }
  }
  const supabase = await createClient()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [
    { count: daApprovare },
    { count: pubblicati7g },
    { count: errori },
    { count: inCoda },
    { data: ultimi },
  ] = await Promise.all([
    supabase.from('calendario').select('*', { count: 'exact', head: true }).eq('status', 'DA_APPROVARE'),
    supabase.from('calendario').select('*', { count: 'exact', head: true }).eq('status', 'PUBBLICATO').gte('data_pubblicazione', weekAgo),
    supabase.from('calendario').select('*', { count: 'exact', head: true }).in('status', ['ERRORE', 'ERRORE_MANUALE']),
    supabase.from('calendario').select('*', { count: 'exact', head: true }).eq('status', 'APPROVATO'),
    supabase.from('log_pubblicazioni').select('*').order('timestamp', { ascending: false }).limit(5),
  ])

  return { daApprovare, pubblicati7g, errori, inCoda, ultimi: ultimi ?? [] }
}

export default async function DashboardPage() {
  const { daApprovare, pubblicati7g, errori, inCoda, ultimi } = await getStats()

  const stats = [
    { label: 'Da approvare',    value: daApprovare ?? 0, icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/dashboard/calendario?filter=DA_APPROVARE' },
    { label: 'Pubblicati 7gg',  value: pubblicati7g ?? 0,icon: TrendingUp,    color: 'text-green-600',  bg: 'bg-green-50',  href: '/dashboard/log' },
    { label: 'In coda',         value: inCoda ?? 0,      icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/dashboard/calendario?filter=APPROVATO' },
    { label: 'Errori attivi',   value: errori ?? 0,      icon: AlertCircle,   color: 'text-red-600',    bg: 'bg-red-50',    href: '/dashboard/calendario?filter=ERRORE' },
  ]

  const statusColor: Record<string, string> = {
    PUBBLICATO:       'text-green-700',
    ERRORE:           'text-red-700',
    ERRORE_MANUALE:   'text-red-700',
    DRY_RUN_OK:       'text-teal-700',
    ERRORE_WORKFLOW:  'text-orange-700',
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Selettore modello AI — top dashboard */}
      <AIModelSelector />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link href={href} key={label} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      {/* Grid social — entry-point per ogni piattaforma */}
      <div className="mb-6 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold text-gray-900">Crea contenuto</h2>
          <Link href="/dashboard/piano" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
            Piano editoriale <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PLATFORM_LIST.map(p => (
            <Link
              key={p.key}
              href={`/dashboard/social/${p.key}`}
              className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
            >
              <div className={`w-12 h-12 mx-auto rounded-2xl ${p.colorBg} flex items-center justify-center text-2xl mb-2 shadow-sm group-hover:scale-110 transition-transform`}>
                {p.emoji}
              </div>
              <p className="font-semibold text-sm text-gray-900">{p.nome}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{p.formati.length} {p.formati.length === 1 ? 'formato' : 'formati'}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Ultimi log + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ultime attività</h2>
            <Link href="/dashboard/log" className="text-sm text-brand-600 hover:underline">Vedi tutti →</Link>
          </div>
          {ultimi.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna attività ancora.</p>
          ) : (
            <div className="space-y-3">
              {ultimi.map((log: { id: string; timestamp: string; id_contenuto?: string; status_finale: string; canale?: string; messaggio?: string }) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800">{log.id_contenuto ?? '—'}</span>
                    {log.canale && <span className="text-gray-400 ml-1">· {log.canale}</span>}
                    <span className={`ml-2 font-medium ${statusColor[log.status_finale] ?? 'text-gray-600'}`}>
                      {log.status_finale}
                    </span>
                    {log.messaggio && <p className="text-gray-400 truncate">{log.messaggio}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Azioni rapide */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Azioni rapide</h2>
          <div className="space-y-2">
            <Link href="/dashboard/calendario?filter=DA_APPROVARE" className="btn-secondary w-full justify-start">
              <CheckCircle className="w-4 h-4 text-yellow-500" />
              Approva contenuti
            </Link>
            <Link href="/dashboard/calendario?filter=ERRORE" className="btn-secondary w-full justify-start">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Gestisci errori
            </Link>
            <Link href="/dashboard/calendario" className="btn-secondary w-full justify-start">
              <Calendar className="w-4 h-4 text-blue-500" />
              Vedi calendario
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
