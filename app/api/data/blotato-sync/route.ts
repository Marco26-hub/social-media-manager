import { NextResponse } from 'next/server'
import { requireClienteId } from '@/lib/auth-utils'
import { q } from '@/lib/db'
import { scheduleOnBlotato, isPublishingLive } from '@/lib/publish/schedule'
import { getBlotatoKey } from '@/lib/blotato-key'
import { listBlotatoAccounts } from '@/lib/blotato-accounts'

export const dynamic = 'force-dynamic'

// GET — Verifica connessione Blotato SENZA pubblicare: key presente? account
// collegati? pubblicazione live? Serve per confermare il setup prima del go-live.
export async function GET() {
  let clienteId: string
  try {
    clienteId = await requireClienteId()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Non autorizzato' }, { status: 401 })
  }

  const blotatoKey = await getBlotatoKey(clienteId)
  if (!blotatoKey) {
    return NextResponse.json({
      configured: false,
      publishing_live: isPublishingLive(),
      connected_platforms: [],
      hint: 'API key Blotato non configurata: inseriscila in Impostazioni cliente o nella env BLOTATO_API_KEY.',
    })
  }

  try {
    const accounts = await listBlotatoAccounts(blotatoKey, true)
    return NextResponse.json({
      configured: true,
      publishing_live: isPublishingLive(),
      connected_platforms: accounts.map(a => a.platform),
      accounts: accounts.map(a => ({ platform: a.platform, username: a.username || a.name || null, subaccounts: a.subaccounts.length })),
      ...(accounts.length === 0 ? { hint: 'Key valida ma nessun account social collegato nel workspace Blotato: collega gli account da pubblicare.' } : {}),
      ...(!isPublishingLive() ? { note: 'PUBLISH_ENABLED non è "true": i sync restano dry-run (nessun post reale) finché non lo abiliti.' } : {}),
    })
  } catch (e) {
    // NIENTE fallback muto: se /v2/accounts fallisce l'utente deve saperlo (key errata,
    // endpoint irraggiungibile) invece di scoprirlo solo al primo publish fallito.
    return NextResponse.json({
      configured: true,
      publishing_live: isPublishingLive(),
      connected_platforms: [],
      error: `Verifica account Blotato fallita: ${(e as Error).message.slice(0, 180)}`,
    }, { status: 502 })
  }
}

// POST — Sincronizza con Blotato tutti i contenuti APPROVATI non ancora inviati.
// È il "tasto Sincronizza" della dashboard: calendario → Blotato → pubblicazione.
export async function POST() {
  let clienteId: string
  try {
    clienteId = await requireClienteId()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Non autorizzato' }, { status: 401 })
  }

  // Key per-cliente (settings del cliente) o env globale dell'agenzia.
  const blotatoKey = await getBlotatoKey(clienteId)
  if (!blotatoKey) {
    return NextResponse.json(
      {
        error: 'API key Blotato non configurata per questo cliente',
        hint: 'Inserisci la API key Blotato del cliente in Impostazioni, oppure la key globale in env.',
        synced: 0,
      },
      { status: 400 },
    )
  }

  // Contenuti pronti: approvati e mai sincronizzati su Blotato.
  const rows = await q(
    `SELECT * FROM calendario
     WHERE cliente_id = $1 AND status = 'APPROVATO' AND blotato_post_id IS NULL
     ORDER BY data_pubblicazione, ora_pubblicazione`,
    [clienteId],
  )

  let synced = 0
  let dryRun = 0
  let skipped = 0
  const errors: { id_contenuto: string; canale: string; error: string }[] = []

  for (const row of rows) {
    try {
      const outcome = await scheduleOnBlotato(clienteId, row)
      if (outcome.status === 'scheduled') synced++
      else if (outcome.status === 'dry_run') dryRun++
      else skipped++
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 500) || 'errore sconosciuto'
      errors.push({
        id_contenuto: String(row.id_contenuto ?? row.id ?? '?'),
        canale: String(row.canale ?? '?'),
        error: msg.slice(0, 200),
      })
      // Persisti l'errore in DB così non è solo nel response del sync manuale:
      // errore_tecnico ripulisce lo storico e log_pubblicazioni conserva l'audit
      // per il debug. Prima l'errore si perdeva appena il tab veniva chiuso.
      if (row.id) {
        try {
          await q(
            `UPDATE calendario
               SET errore_tecnico = $1, blotato_status = 'failed', blotato_sync_at = now(), publish_lock_id = NULL
             WHERE id = $2 AND cliente_id = $3`,
            [msg, row.id, clienteId],
          )
        } catch (persistErr) {
          console.warn('[Blotato sync] errore persist fallito (schema non migrato?):', (persistErr as Error).message.slice(0, 120))
        }
        try {
          await q(
            `INSERT INTO log_pubblicazioni (cliente_id, id_contenuto, canale, formato, status_finale, errore)
             VALUES ($1, $2, $3, $4, 'ERRORE', $5)`,
            [clienteId, String(row.id_contenuto ?? row.id ?? ''), String(row.canale ?? ''), String(row.formato ?? ''), msg],
          )
        } catch (logErr) {
          // Tabella log_pubblicazioni potrebbe non esistere ancora: non abortire.
          console.warn('[Blotato sync] log_pubblicazioni insert fallito:', (logErr as Error).message.slice(0, 120))
        }
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    candidates: rows.length,
    synced,
    dry_run: dryRun,
    skipped,
    failed: errors.length,
    ...(dryRun > 0 ? { note: 'Pubblicazione disattivata (PUBLISH_ENABLED=false): contenuti pronti ma NON pubblicati.' } : {}),
    errors: errors.slice(0, 20),
  })
}
