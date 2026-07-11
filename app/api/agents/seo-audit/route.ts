import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { cronDenied } from '@/lib/cron-auth'
import { requireAdmin } from '@/lib/auth-utils'
import { eseguiSeoAuditPerCliente, type SeoAuditResult } from '@/lib/agents/seo-audit'
import { notifyAgency } from '@/lib/notifications'
import { isAgentEnabled } from '@/lib/agent-config'

export const dynamic = 'force-dynamic'

// Agente SEO/GEO schedulato. Auth a due vie: bearer CRON_SECRET (scheduler esterno)
// OPPURE sessione admin (trigger manuale). Esegue un audit SEO/GEO SOLO per i clienti
// che l'admin ha messo su generation_mode=AUTO. Salva in seo_audit (l'admin lo legge
// in dashboard). Anti-punteggi-finti: se l'AI fallisce, il cliente finisce tra gli
// errori, non viene salvato un audit inventato.
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
    if (!(await isAgentEnabled('seo'))) {
      return NextResponse.json({ ok: true, disabled: true, message: 'Agente SEO disabilitato dal pannello.' })
    }

    const rows = await q(
      `SELECT s.cliente_id
       FROM settings s
       JOIN clienti c ON c.id = s.cliente_id
       WHERE s.chiave = 'generation_mode' AND upper(s.valore) = 'AUTO' AND c.attivo = true`,
    )
    const clienti = rows.map(r => String((r as Record<string, unknown>).cliente_id)).filter(Boolean)

    const risultati: SeoAuditResult[] = []
    for (const clienteId of clienti) {
      try {
        risultati.push(await eseguiSeoAuditPerCliente(clienteId, { periodo: 'settimanale' }))
      } catch (e) {
        risultati.push({ clienteId, ok: false, scoreMancanti: [], errore: (e instanceof Error ? e.message : String(e)).slice(0, 160) })
      }
    }

    const fatti = risultati.filter(r => r.ok).length
    const conErrori = risultati.filter(r => !r.ok)
    // Fallimento reale: c'erano clienti AUTO ma nessun audit prodotto → 502 + notifica.
    const failedRun = clienti.length > 0 && fatti === 0

    if (failedRun) {
      await notifyAgency({
        type: 'errore',
        id_contenuto: 'audit SEO automatico',
        canale: `${clienti.length} clienti AUTO`,
        errore: conErrori[0]?.errore || 'nessun audit prodotto',
      }).catch(() => {})
    }

    return NextResponse.json({
      ok: !failedRun,
      clienti_auto: clienti.length,
      audit_fatti: fatti,
      falliti: conErrori.length,
      error: failedRun ? `Nessun audit SEO prodotto su ${clienti.length} clienti AUTO. Primo errore: ${conErrori[0]?.errore || 'sconosciuto'}` : undefined,
      dettaglio: risultati,
    }, { status: failedRun ? 502 : 200 })
  } catch (e) {
    return apiError(e)
  }
}
