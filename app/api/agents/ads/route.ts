import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { cronDenied } from '@/lib/cron-auth'
import { requireAdmin } from '@/lib/auth-utils'
import { eseguiAdsPerCliente, type AdsResult } from '@/lib/agents/ads'
import { notifyAgency } from '@/lib/notifications'
import { isAgentEnabled } from '@/lib/agent-config'

export const dynamic = 'force-dynamic'

// Agente Ads schedulato. Auth a due vie: bearer CRON_SECRET (scheduler esterno)
// OPPURE sessione admin (trigger manuale). Genera campagne SOLO per i clienti che
// l'admin ha messo su generation_mode=AUTO, sulle piattaforme ad su cui sono
// realmente presenti. Salva in ads_campaign (l'admin le legge in dashboard).
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
    if (!(await isAgentEnabled('ads'))) {
      return NextResponse.json({ ok: true, disabled: true, message: 'Agente Ads disabilitato dal pannello.' })
    }

    const rows = await q(
      `SELECT s.cliente_id
       FROM settings s
       JOIN clienti c ON c.id = s.cliente_id
       WHERE s.chiave = 'generation_mode' AND upper(s.valore) = 'AUTO' AND c.attivo = true`,
    )
    const clienti = rows.map(r => String((r as Record<string, unknown>).cliente_id)).filter(Boolean)

    const risultati: AdsResult[] = []
    for (const clienteId of clienti) {
      try {
        risultati.push(await eseguiAdsPerCliente(clienteId))
      } catch (e) {
        risultati.push({ clienteId, campagne: 0, errori: [(e instanceof Error ? e.message : String(e)).slice(0, 160)] })
      }
    }

    const totale = risultati.reduce((n, r) => n + r.campagne, 0)
    const clientiSenzaCampagne = risultati.filter(r => r.campagne === 0).length
    const conErrori = risultati.filter(r => r.errori.length > 0)
    // Fallimento reale: c'erano clienti AUTO ma 0 campagne prodotte → 502 + notifica.
    const failedRun = clienti.length > 0 && totale === 0

    if (failedRun) {
      await notifyAgency({
        type: 'errore',
        id_contenuto: 'campagne Ads automatiche',
        canale: `${clienti.length} clienti AUTO`,
        errore: conErrori[0]?.errori[0] || 'nessuna campagna prodotta',
      }).catch(() => {})
    }

    return NextResponse.json({
      ok: !failedRun,
      clienti_auto: clienti.length,
      campagne: totale,
      falliti: clientiSenzaCampagne,
      error: failedRun ? `Nessuna campagna Ads prodotta su ${clienti.length} clienti AUTO. Primo errore: ${conErrori[0]?.errori[0] || 'sconosciuto'}` : undefined,
      dettaglio: risultati,
    }, { status: failedRun ? 502 : 200 })
  } catch (e) {
    return apiError(e)
  }
}
