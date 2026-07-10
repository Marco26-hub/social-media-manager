import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { cronDenied } from '@/lib/cron-auth'
import { generaContenutiPerCliente, type AgentResult } from '@/lib/agents/genera-contenuti'
import { notifyAgency } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// Endpoint schedulato (scheduler ESTERNO free via CRON_SECRET, es. cron-job.org).
// Genera bozze DA_APPROVARE SOLO per i clienti che l'admin ha messo su
// generation_mode=AUTO in impostazioni. Chi è MANUALE (o senza la chiave) NON viene
// toccato: "gli agenti li attivi tu". Non pubblica nulla — l'approvazione umana resta.
export async function POST(request: Request) {
  const denied = cronDenied(request)
  if (denied) return denied

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
    if (totale > 0) {
      // Avvisa l'agenzia che ci sono nuove bozze da approvare (best-effort).
      await notifyAgency({
        type: 'approvazione',
        id_contenuto: `${totale} bozze automatiche`,
        canale: `${clienti.length} clienti AUTO`,
        formato: 'DA_APPROVARE',
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, clienti_auto: clienti.length, generati: totale, dettaglio: risultati })
  } catch (e) {
    return apiError(e)
  }
}
