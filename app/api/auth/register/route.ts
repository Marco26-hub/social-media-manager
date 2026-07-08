import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiError } from '@/lib/api-error'
import { dbReady, q, q1 } from '@/lib/db'
import { isDemo } from '@/lib/demo'
import { PACCHETTO_SLUGS } from '@/lib/pacchetti'
import { notifyNewRegistration, sendRegistrationReceived } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const nome = String(body.nome || '').trim()
    const azienda = String(body.azienda || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const telefono = String(body.telefono || '').trim()
    const password = String(body.password || '')
    const pacchetto = String(body.pacchetto || '').trim().toLowerCase()

    // Validazione input
    if (!nome) return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 })
    if (!azienda) return NextResponse.json({ error: 'Azienda richiesta' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'La password deve avere almeno 8 caratteri' }, { status: 400 })
    if (pacchetto && !PACCHETTO_SLUGS.has(pacchetto)) return NextResponse.json({ error: 'Pacchetto non valido' }, { status: 400 })

    // Demo: risposta chiara 200 (nessuna registrazione reale).
    if (isDemo()) {
      return NextResponse.json(
        { ok: false, demo: true, message: 'Registrazione non disponibile in modalità demo. Contattaci per attivare un account reale.' },
        { status: 200 },
      )
    }
    // Produzione senza DB raggiungibile = errore server reale (503), non un 200
    // silenzioso: il cliente deve sapere che la richiesta NON è stata registrata.
    if (!dbReady()) {
      console.error('[register] DATABASE non pronto: registrazione rifiutata (503)')
      return NextResponse.json(
        { ok: false, error: 'Servizio temporaneamente non disponibile. Riprova tra poco o contattaci.' },
        { status: 503 },
      )
    }

    // Email già usata?
    const existing = await q1('SELECT id FROM profiles WHERE email = $1 LIMIT 1', [email])
    if (existing) {
      return NextResponse.json({ error: 'Esiste già un account con questa email' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await q(
      `INSERT INTO profiles (email, nome, password_hash, ruolo_globale, status, azienda, telefono, pacchetto)
       VALUES ($1, $2, $3, 'user', 'pending', $4, $5, $6)`,
      [email, nome, passwordHash, azienda, telefono || null, pacchetto || null],
    )

    // Notifiche email (no-op se RESEND_API_KEY non configurata): conferma al
    // cliente + avviso interno all'agenzia. Non bloccano la registrazione.
    await Promise.allSettled([
      sendRegistrationReceived(email, nome),
      notifyNewRegistration({ nome, email, azienda, pacchetto: pacchetto || null }),
    ])

    return NextResponse.json({
      ok: true,
      status: 'pending',
      message: 'Richiesta ricevuta. Ti attiviamo a breve e ti avvisiamo via email.',
    })
  } catch (e) {
    return apiError(e)
  }
}
