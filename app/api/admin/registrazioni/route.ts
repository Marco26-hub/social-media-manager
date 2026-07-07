import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q, q1 } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'

const PACCHETTO_LABEL: Record<string, string> = {
  starter: 'Starter', presenza: 'Presenza', slancio: 'Slancio', crescita: 'Crescita', ecommerce: 'E-commerce', dominio: 'Dominio',
}

// Mappa pacchetto di vendita → piano DB (enum free/pro/agency/enterprise) + contenuti/mese.
const PACCHETTO_PIANO: Record<string, { piano: string; contenuti: number }> = {
  starter:   { piano: 'pro',        contenuti: 8 },
  presenza:  { piano: 'pro',        contenuti: 12 },
  slancio:   { piano: 'agency',     contenuti: 16 },
  crescita:  { piano: 'agency',     contenuti: 20 },
  ecommerce: { piano: 'agency',     contenuti: 30 },
  dominio:   { piano: 'enterprise', contenuti: 50 },
}

// Fallback pacchetto sconosciuto: NON regalare 30 contenuti (E-commerce) a chi
// arriva con uno slug ignoto o vuoto. Ripiegare sul minimo (Starter) → l'admin
// vede subito la discrepanza e può correggere a mano dopo l'attivazione.
const PACCHETTO_FALLBACK = { piano: 'pro', contenuti: 8 }

function slugify(value: string): string {
  return value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'cliente'
}

const DEMO_PENDING = [
  { id: 'demo-1', nome: 'Mario Rossi', email: 'mario@negoziorossi.it', azienda: 'Negozio Rossi', telefono: '+39 340 1112223', pacchetto: 'crescita', created_at: '2026-07-05T09:12:00Z' },
  { id: 'demo-2', nome: 'Laura Bianchi', email: 'laura@studiobianchi.it', azienda: 'Studio Bianchi', telefono: null, pacchetto: 'presenza', created_at: '2026-07-06T14:40:00Z' },
]

// Coda registrazioni in attesa di attivazione (solo admin).
export async function GET() {
  try {
    await requireAdmin()
    if (isDemo() || !dbReady()) return NextResponse.json(DEMO_PENDING)
    const rows = await q(
      `SELECT id, nome, email, azienda, telefono, pacchetto, created_at
       FROM profiles
       WHERE status = 'pending'
       ORDER BY created_at ASC`,
    )
    return NextResponse.json(rows)
  } catch (e) {
    return apiError(e)
  }
}

// Attiva o rifiuta una registrazione.
export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const { id, action } = (await request.json()) as { id?: string; action?: string }
    if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    if (action !== 'activate' && action !== 'reject') {
      return NextResponse.json({ error: 'action non valida (activate | reject)' }, { status: 400 })
    }
    if (isDemo() || !dbReady()) return NextResponse.json({ ok: true, demo: true })

    // Rifiuto: solo flip di stato, nessun provisioning.
    if (action === 'reject') {
      await q(`UPDATE profiles SET status = 'rejected', updated_at = now() WHERE id = $1 AND status = 'pending'`, [id])
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    // Attivazione: legge il profilo pending e crea il workspace se manca.
    const prof = (await q1(
      `SELECT id, nome, azienda, email, telefono, pacchetto, status FROM profiles WHERE id = $1`,
      [id],
    )) as { id: string; nome: string | null; azienda: string | null; email: string | null; telefono: string | null; pacchetto: string | null; status: string } | null

    if (!prof) return NextResponse.json({ error: 'Registrazione non trovata' }, { status: 404 })
    if (prof.status === 'active') return NextResponse.json({ ok: true, status: 'active', note: 'già attivo' })

    // Provisioning: se l'utente non ha ancora accesso a nessun cliente, crea
    // il cliente (workspace) e collega l'utente come owner. ORDINE SICURO:
    // prima creo il workspace, poi attivo lo stato — se qualcosa fallisce
    // il profilo resta 'pending' e l'operazione è ripetibile.
    const hasAccess = await q1('SELECT 1 FROM user_client_access WHERE user_id = $1 LIMIT 1', [id])
    let clienteId: string | null = null

    if (!hasAccess) {
      const base = slugify(prof.azienda || prof.nome || 'cliente')
      // Suffisso breve per evitare collisioni sullo slug unique.
      const slug = `${base}-${prof.id.slice(0, 6)}`
      const pkgLabel = prof.pacchetto ? (PACCHETTO_LABEL[prof.pacchetto] || prof.pacchetto) : '—'
      const pkgMap = (prof.pacchetto && PACCHETTO_PIANO[prof.pacchetto]) || PACCHETTO_FALLBACK
      const cli = await q1(
        `INSERT INTO clienti (nome, slug, email, telefono, piano, contenuti_mese, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [prof.azienda || prof.nome || 'Cliente', slug, prof.email || null, prof.telefono || null, pkgMap.piano, pkgMap.contenuti, `Pacchetto: ${pkgLabel} · da registrazione self-serve`],
      )
      clienteId = (cli as { id: string }).id
      await q(
        `INSERT INTO user_client_access (user_id, cliente_id, ruolo, attivo)
         VALUES ($1, $2, 'owner', true)`,
        [id, clienteId],
      )
    }

    await q(`UPDATE profiles SET status = 'active', updated_at = now() WHERE id = $1`, [id])
    return NextResponse.json({ ok: true, status: 'active', cliente_id: clienteId })
  } catch (e) {
    return apiError(e)
  }
}
