import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { cronDenied } from '@/lib/cron-auth'
import { requireAdmin } from '@/lib/auth-utils'
import { generaContenutiPerCliente, type AgentResult } from '@/lib/agents/genera-contenuti'
import { notifyAgency } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// Endpoint schedulato (scheduler ESTERNO free via CRON_SECRET, es. cron-job.org).
// Genera bozze DA_APPROVARE SOLO per i clienti che l'admin ha messo su
// generation_mode=AUTO in impostazioni. Chi è MANUALE (o senza la chiave) NON viene
// toccato: "gli agenti li attivi tu". Non pubblica nulla — l'approvazione umana resta.
export async function POST(request: Request) {
  // Auth a due vie: bearer CRON_SECRET (scheduler esterno) OPPURE sessione admin
  // (trigger manuale "Genera ora" dal dashboard). Così l'admin può lanciare la
  // generazione AUTO anche prima di aver configurato CRON_SECRET su Render.
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

    // Clienti attivi che hanno ESPLICITAMENTE attivato la generazione automatica.
    const rows = await q(
      `SELECT s.cliente_id
       FROM settings s
       JOIN clienti c ON c.id = s.cliente_id
       WHERE s.chiave = 'generation_mode' AND upper(s.valore) = 'AUTO' AND c.attivo = true`,
    )
    const clienti = rows.map(r => String((r as Record<string, unknown>).cliente_id)).filter(Boolean)

    const risultati: AgentResult[] = []
    for (const clienteId of clienti) {
      try {
        risultati.push(await generaContenutiPerCliente(clienteId, { count: 2 }))
      } catch (e) {
        risultati.push({ clienteId, generati: 0, errori: [(e instanceof Error ? e.message : String(e)).slice(0, 160)] })
      }
    }

    const totale = risultati.reduce((n, r) => n + r.generati, 0)
    const conErrori = risultati.filter(r => r.errori.length > 0)
    // Fallimento reale: c'erano clienti in AUTO ma NON è stata generata alcuna bozza.
    // Niente successo finto (HTTP 200 ok:true cieco): torna 502 + notifica errore,
    // così lo scheduler esterno segna il run come fallito e l'agenzia se ne accorge.
    const failedRun = clienti.length > 0 && totale === 0

    if (totale > 0) {
      // Avvisa l'agenzia che ci sono nuove bozze da approvare (best-effort).
      await notifyAgency({
        type: 'approvazione',
        id_contenuto: `${totale} bozze automatiche`,
        canale: `${clienti.length} clienti AUTO`,
        formato: 'DA_APPROVARE',
      }).catch(() => {})
    } else if (failedRun) {
      await notifyAgency({
        type: 'errore',
        id_contenuto: 'generazione automatica',
        canale: `${clienti.length} clienti AUTO`,
        errore: conErrori[0]?.errori[0] || 'nessun contenuto generato',
      }).catch(() => {})
    }

    return NextResponse.json({
      ok: !failedRun,
      clienti_auto: clienti.length,
      generati: totale,
      falliti: conErrori.length,
      error: failedRun ? `Nessuna bozza generata su ${clienti.length} clienti AUTO. Primo errore: ${conErrori[0]?.errori[0] || 'sconosciuto'}` : undefined,
      dettaglio: risultati,
    }, { status: failedRun ? 502 : 200 })
  } catch (e) {
    return apiError(e)
  }
}
