import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiError } from '@/lib/api-error'
import { dbReady, q, q1 } from '@/lib/db'
import { isDemo } from '@/lib/demo'
import { PACCHETTO_SLUGS, pacchettoBySlug } from '@/lib/pacchetti'
import { notifyNewRegistration, sendRegistrationReceived } from '@/lib/email'
import { verifyTurnstile } from '@/lib/turnstile'
import { stripeConfigured, createStripeCheckoutSession, euroStringToCents } from '@/lib/stripe'

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://social-media-manager-zte4.onrender.com').replace(/\/$/, '')
}

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
    const turnstileToken = typeof body.turnstile_token === 'string' ? body.turnstile_token : ''
    const honeypot = typeof body.website === 'string' ? body.website : ''
    const elapsedMs = typeof body.elapsed_ms === 'number' ? body.elapsed_ms : 99999

    // Anti-bot a zero dipendenze esterne:
    // 1) honeypot: campo nascosto compilato solo dai bot → scarta (200 finto ok
    //    per non far capire al bot che è stato individuato).
    // 2) submit troppo veloce (<1.5s dall'apertura) = quasi certamente bot.
    if (honeypot.trim() !== '' || elapsedMs < 1500) {
      console.warn('[register] richiesta scartata (honeypot/timing)', { honeypot: Boolean(honeypot), elapsedMs })
      return NextResponse.json({ ok: true, status: 'pending', message: 'Richiesta ricevuta.' })
    }

    // Captcha Turnstile (layer opzionale aggiuntivo: no-op se non configurato).
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verifica anti-bot fallita. Riprova.' }, { status: 400 })
    }

    // Validazione input
    if (!nome) return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 })
    if (!azienda) return NextResponse.json({ error: 'Azienda richiesta' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email non valida' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'La password deve avere almeno 8 caratteri' }, { status: 400 })
    // Tetto lunghezza: bcrypt tronca a 72 byte (oltre non aggiunge sicurezza) e
    // hashare input enormi è un vettore DoS CPU. 200 char è ampio per una passphrase.
    if (password.length > 200) return NextResponse.json({ error: 'La password è troppo lunga (max 200 caratteri)' }, { status: 400 })
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

    // Email già usata? Se il profilo è già ATTIVO/rifiutato → 409. Se è PENDING
    // (registrato ma checkout non completato) → riusa il profilo e rigenera un
    // checkout, così chi ha abbandonato il pagamento può riprovare senza bloccarsi.
    const existing = await q1('SELECT id, status FROM profiles WHERE email = $1 LIMIT 1', [email]) as
      { id: string; status: string } | null
    let profileId: string
    if (existing) {
      if (existing.status !== 'pending') {
        return NextResponse.json({ error: 'Esiste già un account con questa email. Accedi.' }, { status: 409 })
      }
      // Aggiorna i dati e la password del profilo pending, riusandolo.
      const passwordHash = await bcrypt.hash(password, 12)
      await q(
        `UPDATE profiles SET nome = $2, azienda = $3, telefono = $4, pacchetto = $5, password_hash = $6, updated_at = now()
         WHERE id = $1`,
        [existing.id, nome, azienda, telefono || null, pacchetto || null, passwordHash],
      )
      profileId = String(existing.id)
    } else {
      const passwordHash = await bcrypt.hash(password, 12)
      const inserted = await q1(
        `INSERT INTO profiles (email, nome, password_hash, ruolo_globale, status, azienda, telefono, pacchetto)
         VALUES ($1, $2, $3, 'user', 'pending', $4, $5, $6)
         RETURNING id`,
        [email, nome, passwordHash, azienda, telefono || null, pacchetto || null],
      )
      profileId = String((inserted as { id: string }).id)
    }

    // FLOW A — paga-prima: se Stripe è configurato e il pacchetto ha un prezzo
    // valido, crea subito una Checkout Session. Il cliente viene reindirizzato a
    // Stripe; ad avvenuto pagamento il webhook checkout.session.completed attiva
    // automaticamente l'account (crea il workspace). client_reference_id +
    // metadata[profile_id] legano il pagamento alla registrazione pending.
    const pkg = pacchettoBySlug(pacchetto)
    const amountCents = pkg ? euroStringToCents(pkg.prezzo) : 0
    if (stripeConfigured() && pkg && amountCents > 0) {
      try {
        const session = await createStripeCheckoutSession({
          clienteId: profileId, // qui è il profile_id (workspace non ancora creato)
          profileId,
          clienteNome: azienda || nome,
          clienteEmail: email,
          pacchettoSlug: pacchetto,
          pacchettoNome: pkg.nome,
          amountCents,
          successUrl: `${baseUrl()}/login?attivato=1`,
          cancelUrl: `${baseUrl()}/register?annullato=1&piano=${encodeURIComponent(pacchetto)}`,
        })
        // Notifica interna (il cliente riceverà la conferma dopo il pagamento).
        await notifyNewRegistration({ nome, email, azienda, pacchetto }).catch(() => {})
        if (session.url) {
          return NextResponse.json({ ok: true, status: 'checkout', checkout_url: session.url })
        }
      } catch (e) {
        // Stripe fallito: NON bloccare la registrazione, degrada al flusso pending
        // (attivazione manuale admin). Logga per debug.
        console.error('[register] creazione checkout Stripe fallita, degrado a pending:', e instanceof Error ? e.message : e)
      }
    }

    // Fallback (Stripe non configurato o checkout fallito): pending + notifiche.
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
