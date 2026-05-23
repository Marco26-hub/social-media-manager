import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { demoLogs } from '@/lib/demo-data'

export const dynamic = 'force-dynamic'

const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

export default async function LogPage() {
  let logs
  if (isDemo()) {
    logs = demoLogs
  } else {
    const supabase = await createClient()
    const res = await supabase.from('log_pubblicazioni').select('*').order('timestamp', { ascending: false }).limit(100)
    logs = res.data
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Log pubblicazioni</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-0.5">Ultimi 100 eventi</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ID Contenuto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Canale</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Messaggio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(logs ?? []).map((log: {
              id: string
              timestamp: string
              id_contenuto?: string
              canale?: string
              status_finale: string
              messaggio?: string
              errore?: string
              blotato_post_id?: string
            }) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString('it-IT', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {log.id_contenuto ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{log.canale ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={log.status_finale} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                  {log.errore
                    ? <span className="text-red-600">{log.errore}</span>
                    : (log.messaggio ?? (log.blotato_post_id ? `post_id: ${log.blotato_post_id}` : '—'))
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div className="p-12 text-center text-gray-400">Nessun log ancora.</div>
        )}
      </div>
    </div>
  )
}
