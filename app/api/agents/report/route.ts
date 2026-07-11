import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { cronDenied } from '@/lib/cron-auth'
import { requireAdmin } from '@/lib/auth-utils'
import { eseguiReportPerCliente, type ReportResult } from '@/lib/agents/report'
import { notifyAgency } from '@/lib/notifications'
import { isAgentEnabled } from '@/lib/agent-config'

export const dynamic = 'force-dynamic'

// Agente Report schedulato. Auth a due vie: bearer CRON_SECRET (scheduler esterno)
// OPPURE sessione admin (trigger manuale). Genera un report esecutivo SOLO per i
// clienti su generation_mode=AUTO, con attività nel periodo. Salva in `report`.
export async function POST(request: Request) {
  const denied = cronDenied(request)
  if (denied) {
    try {
      await requireAdmin()
    } catch {
      return denied
    }
  }

  try {
    if (!dbReady()) return NextResponse.json({ error: 'DB non pronto' }, { status: 503 })
    if (!(await isAgentEnabled('report'))) {
      return NextResponse.json({ ok: true, disabled: true, message: 'Agente Report disabilitato dal pannello.' })
    }

    const rows = await q(
      `SELECT s.cliente_id
       FROM settings s
       JOIN clienti c ON c.id = s.cliente_id
       WHERE s.chiave = 'generation_mode' AND upper(s.valore) = 'AUTO' AND c.attivo = true`,
    )
    const clienti = rows.map(r => String((r as Record<string, unknown>).cliente_id)).filter(Boolean)

    const risultati: ReportResult[] = []
    for (const clienteId of clienti) {
      try {
        risultati.push(await eseguiReportPerCliente(clienteId, { periodo: 'mensile' }))
      } catch (e) {
        risultati.push({ clienteId, ok: false, errore: (e instanceof Error ? e.message : String(e)).slice(0, 160) })
      }
    }

    const fatti = risultati.filter(r => r.ok).length
    const conErrori = risultati.filter(r => !r.ok)
    // Fallimento reale: c'erano clienti AUTO ma nessun report prodotto → 502 + notifica.
    // (Un cliente "saltato per nessuna attività" è un esito legittimo, non un crash.)
    const failedRun = clienti.length > 0 && fatti === 0 && conErrori.some(r => !/nessuna attività/i.test(r.errore || ''))

    if (failedRun) {
      await notifyAgency({
        type: 'errore',
        id_contenuto: 'report automatico',
        canale: `${clienti.length} clienti AUTO`,
        errore: conErrori[0]?.errore || 'nessun report prodotto',
      }).catch(() => {})
    }

    return NextResponse.json({
      ok: !failedRun,
      clienti_auto: clienti.length,
      report_fatti: fatti,
      saltati: conErrori.length,
      dettaglio: risultati,
    }, { status: failedRun ? 502 : 200 })
  } catch (e) {
    return apiError(e)
  }
}
