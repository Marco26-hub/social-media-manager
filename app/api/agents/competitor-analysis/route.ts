import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { cronDenied } from '@/lib/cron-auth'
import { requireAdmin } from '@/lib/auth-utils'
import { eseguiCompetitorPerCliente, type CompetitorResult } from '@/lib/agents/competitor'
import { notifyAgency } from '@/lib/notifications'
import { isAgentEnabled } from '@/lib/agent-config'

export const dynamic = 'force-dynamic'

// Agente Competitor schedulato. Auth a due vie: bearer CRON_SECRET (scheduler
// esterno) OPPURE sessione admin (trigger manuale). Analizza i competitor SALVATI dei
// clienti su generation_mode=AUTO e salva in competitor_analysis.
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
    if (!(await isAgentEnabled('competitor'))) {
      return NextResponse.json({ ok: true, disabled: true, message: 'Agente Competitor disabilitato dal pannello.' })
    }

    const rows = await q(
      `SELECT s.cliente_id
       FROM settings s
       JOIN clienti c ON c.id = s.cliente_id
       WHERE s.chiave = 'generation_mode' AND upper(s.valore) = 'AUTO' AND c.attivo = true`,
    )
    const clienti = rows.map(r => String((r as Record<string, unknown>).cliente_id)).filter(Boolean)

    const risultati: CompetitorResult[] = []
    for (const clienteId of clienti) {
      try {
        risultati.push(await eseguiCompetitorPerCliente(clienteId))
      } catch (e) {
        risultati.push({ clienteId, analisi: 0, errori: [(e instanceof Error ? e.message : String(e)).slice(0, 160)] })
      }
    }

    const totale = risultati.reduce((n, r) => n + r.analisi, 0)
    const conErrori = risultati.filter(r => r.errori.length > 0)
    // "nessun competitor salvato" è un esito legittimo, non un crash → non è failedRun.
    const veriErrori = risultati.filter(r => r.analisi === 0 && r.errori.some(e => !/nessun competitor/i.test(e)))
    const failedRun = clienti.length > 0 && totale === 0 && veriErrori.length > 0

    if (failedRun) {
      await notifyAgency({
        type: 'errore',
        id_contenuto: 'analisi competitor automatica',
        canale: `${clienti.length} clienti AUTO`,
        errore: veriErrori[0]?.errori[0] || 'nessuna analisi prodotta',
      }).catch(() => {})
    }

    return NextResponse.json({
      ok: !failedRun,
      clienti_auto: clienti.length,
      analisi: totale,
      falliti: conErrori.length,
      dettaglio: risultati,
    }, { status: failedRun ? 502 : 200 })
  } catch (e) {
    return apiError(e)
  }
}
