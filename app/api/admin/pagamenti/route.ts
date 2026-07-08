import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getPublicBaseUrl } from '@/lib/base-url'
import { dbReady, q } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { pacchettoFromPiano, pacchettoSlugFromPiano } from '@/lib/pacchetti'
import { createStripeCheckoutSession, createStripePortalSession, euroStringToCents, stripeConfigured } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function demoPayload() {
  return {
    stripe_configured: false,
    needs_migration: false,
    clienti: [
      {
        id: 'demo-silkincom',
        nome: 'SILKinCOM Demo',
        email: 'demo@silkincom.local',
        piano: 'pro',
        pacchetto_slug: 'crescita',
        pacchetto_nome: 'Crescita',
        canone: '€1.090',
        attivo: true,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: 'demo',
        current_period_end: null,
        last_payment_status: 'paid',
        last_amount_paid: 109000,
        last_invoice_url: null,
      },
    ],
  }
}

function isMissingPaymentsSchema(error: unknown): boolean {
  // pg code preciso: 42P01 undefined_table, 42703 undefined_column.
  const code = (error as { code?: string })?.code || ''
  if (code === '42P01' || code === '42703') return true
  // Fallback messaggio: identificatore-pagamenti E "does not exist" INSIEME.
  const message = error instanceof Error ? error.message : String(error || '')
  return /(pagamenti|stripe_subscriptions|stripe_customer_id|stripe_subscription_id)/i.test(message)
    && /does not exist/i.test(message)
}

export async function GET() {
  try {
    await requireAdmin()
    if (isDemo() || !dbReady()) return NextResponse.json(demoPayload())

    try {
      const rows = await q(
        `SELECT
           c.id, c.nome, c.email, c.piano, c.contenuti_mese, c.attivo,
           c.stripe_customer_id, c.stripe_subscription_id,
           ss.status AS subscription_status,
           ss.current_period_end,
           ss.cancel_at_period_end,
           ss.pacchetto_slug AS subscription_pacchetto_slug,
           p.status AS last_payment_status,
           p.amount_paid AS last_amount_paid,
           p.currency AS last_payment_currency,
           p.hosted_invoice_url AS last_invoice_url,
           p.invoice_pdf AS last_invoice_pdf,
           p.paid_at AS last_paid_at
         FROM clienti c
         LEFT JOIN stripe_subscriptions ss
           ON ss.cliente_id = c.id
          AND ss.stripe_subscription_id = c.stripe_subscription_id
         LEFT JOIN LATERAL (
           SELECT status, amount_paid, currency, hosted_invoice_url, invoice_pdf, paid_at
           FROM pagamenti
           WHERE cliente_id = c.id
           ORDER BY created_at DESC
           LIMIT 1
         ) p ON true
         ORDER BY c.nome ASC`,
      ) as Row[]

      return NextResponse.json({
        stripe_configured: stripeConfigured(),
        needs_migration: false,
        clienti: rows.map(row => {
          const piano = str(row.piano) || 'free'
          const pacchetto = pacchettoFromPiano(piano)
          return {
            ...row,
            pacchetto_slug: pacchettoSlugFromPiano(piano),
            pacchetto_nome: pacchetto.nome,
            canone: pacchetto.prezzo,
          }
        }),
      })
    } catch (error) {
      if (isMissingPaymentsSchema(error)) {
        return NextResponse.json({
          stripe_configured: stripeConfigured(),
          needs_migration: true,
          clienti: [],
          error: 'Schema pagamenti non applicato: esegui npm run migrate.',
        })
      }
      throw error
    }
  } catch (e) {
    return apiError(e)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    if (isDemo() || !dbReady()) return NextResponse.json({ ok: true, demo: true, url: null })
    if (!stripeConfigured()) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY non configurata' }, { status: 503 })
    }

    const body = await request.json() as { action?: string; cliente_id?: string }
    const clienteId = str(body.cliente_id)
    if (!clienteId) return NextResponse.json({ error: 'cliente_id richiesto' }, { status: 400 })

    const rows = await q(
      `SELECT id, nome, email, piano, stripe_customer_id
       FROM clienti
       WHERE id = $1
       LIMIT 1`,
      [clienteId],
    ) as Row[]
    const cliente = rows[0]
    if (!cliente) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })

    const baseUrl = getPublicBaseUrl(request)
    const action = body.action || 'checkout'
    if (action === 'portal') {
      const customerId = str(cliente.stripe_customer_id)
      if (!customerId) return NextResponse.json({ error: 'Cliente senza Stripe customer: crea prima un checkout.' }, { status: 400 })
      const portal = await createStripePortalSession({
        stripeCustomerId: customerId,
        returnUrl: `${baseUrl}/dashboard/pagamenti`,
      })
      return NextResponse.json({ ok: true, url: portal.url, id: portal.id })
    }

    if (action !== 'checkout') return NextResponse.json({ error: 'action non valida (checkout | portal)' }, { status: 400 })

    const piano = str(cliente.piano) || 'free'
    const pacchetto = pacchettoFromPiano(piano)
    const session = await createStripeCheckoutSession({
      clienteId,
      clienteNome: str(cliente.nome) || 'Cliente',
      clienteEmail: str(cliente.email) || null,
      pacchettoSlug: pacchettoSlugFromPiano(piano),
      pacchettoNome: pacchetto.nome,
      amountCents: euroStringToCents(pacchetto.prezzo),
      successUrl: `${baseUrl}/dashboard/pagamenti?stripe=success`,
      cancelUrl: `${baseUrl}/dashboard/pagamenti?stripe=cancel`,
      stripeCustomerId: str(cliente.stripe_customer_id) || null,
    })

    return NextResponse.json({ ok: true, url: session.url, id: session.id })
  } catch (e) {
    return apiError(e)
  }
}
