import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q1 } from '@/lib/db'
import { isDemo } from '@/lib/demo'
import { stripeConfigured, createOneOffCheckoutSession } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const IMPORTO_CENTS = 15000 // €150

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://social-media-manager-zte4.onrender.com').replace(/\/$/, '')
}

// Prenotazione consulenza legale one-off: crea la riga pending e avvia il
// Checkout Stripe (mode=payment). Ad avvenuto pagamento il webhook la marca 'paid'.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const nome = String(body.nome || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const telefono = String(body.telefono || '').trim()
    const messaggio = String(body.messaggio || '').trim().slice(0, 1000)

    if (!nome) return NextResponse.json({ error: 'Nome richiesto' }, { status: 400 })
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email non valida' }, { status: 400 })

    if (isDemo() || !dbReady()) {
      return NextResponse.json({ ok: false, demo: true, message: 'Prenotazione non disponibile in demo. Scrivici su WhatsApp.' })
    }

    // Crea la richiesta in stato pending.
    const row = await q1(
      `INSERT INTO consulenze (nome, email, telefono, messaggio, tipo, importo_cents, status)
       VALUES ($1, $2, $3, $4, 'legale-ai', $5, 'pending')
       RETURNING id`,
      [nome, email, telefono || null, messaggio || null, IMPORTO_CENTS],
    )
    const consulenzaId = String((row as { id: string }).id)

    // Se Stripe non è configurato: registra comunque la richiesta e rimanda a WhatsApp.
    if (!stripeConfigured()) {
      return NextResponse.json({
        ok: true,
        status: 'pending',
        stripe: false,
        message: 'Richiesta registrata. Ti contattiamo per completare la prenotazione.',
      })
    }

    const session = await createOneOffCheckoutSession({
      refId: consulenzaId,
      tipo: 'consulenza',
      descrizione: 'Consulenza legale AI & GDPR (30 min) — Studio Legale BCS',
      clienteEmail: email,
      amountCents: IMPORTO_CENTS,
      successUrl: `${baseUrl()}/consulenza?esito=ok`,
      cancelUrl: `${baseUrl()}/consulenza?esito=annullato`,
      extraMetadata: { consulenza_id: consulenzaId },
    })

    // Salva il session id per riconciliazione.
    await q1('UPDATE consulenze SET stripe_session_id = $2, updated_at = now() WHERE id = $1 RETURNING id', [consulenzaId, session.id])

    if (session.url) return NextResponse.json({ ok: true, status: 'checkout', checkout_url: session.url })
    return NextResponse.json({ ok: true, status: 'pending', message: 'Richiesta registrata.' })
  } catch (e) {
    return apiError(e)
  }
}
