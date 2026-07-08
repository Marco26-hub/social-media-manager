import { NextResponse } from 'next/server'
import { dbReady, q, q1 } from '@/lib/db'
import { stripeSecretLivemode, verifyStripeWebhookSignature } from '@/lib/stripe'
import { activateRegistration } from '@/lib/provisioning'
import { sendAccountActivated } from '@/lib/email'

export const dynamic = 'force-dynamic'

type StripeObject = Record<string, unknown>
type StripeEvent = {
  id?: string
  type?: string
  livemode?: boolean
  data?: { object?: StripeObject }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function bool(value: unknown): boolean {
  return value === true
}

function int(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function ts(value: unknown): string | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return new Date(n * 1000).toISOString()
}

function metadata(obj: StripeObject): Record<string, unknown> {
  const meta = obj.metadata
  return meta && typeof meta === 'object' ? meta as Record<string, unknown> : {}
}

async function resolveClienteId(obj: StripeObject): Promise<string | null> {
  const meta = metadata(obj)
  const metaCliente = str(meta.cliente_id)
  if (metaCliente) return metaCliente

  // Flow-A (paga-prima): gli eventi portano profile_id, non cliente_id. Il
  // workspace, se già creato dal checkout, è collegato al profilo via
  // user_client_access. Se non ancora creato → null → 422 → Stripe ritenta.
  const profileId = str(meta.profile_id)
  if (profileId) {
    const row = await q1('SELECT cliente_id FROM user_client_access WHERE user_id = $1 LIMIT 1', [profileId])
    if (row?.cliente_id) return String(row.cliente_id)
  }

  const clientReferenceId = str(obj.client_reference_id)
  // client_reference_id nel flow-A è il profile_id: risolvilo via workspace, NON
  // usarlo direttamente come cliente_id (sarebbe l'id sbagliato).
  if (clientReferenceId) {
    const viaProfile = await q1('SELECT cliente_id FROM user_client_access WHERE user_id = $1 LIMIT 1', [clientReferenceId])
    if (viaProfile?.cliente_id) return String(viaProfile.cliente_id)
    const asCliente = await q1('SELECT id FROM clienti WHERE id = $1 LIMIT 1', [clientReferenceId])
    if (asCliente?.id) return String(asCliente.id)
  }

  const customerId = str(obj.customer)
  if (customerId) {
    const row = await q1('SELECT id FROM clienti WHERE stripe_customer_id = $1 LIMIT 1', [customerId])
    if (row?.id) return String(row.id)
  }
  return null
}

async function requireStripeClienteId(obj: StripeObject, eventType: string): Promise<string> {
  const clienteId = await resolveClienteId(obj)
  if (!clienteId) {
    const objectId = str(obj.id) || str(obj.customer) || 'unknown'
    throw new Error(`Cliente non risolto per evento Stripe ${eventType} (${objectId})`)
  }
  return clienteId
}

async function handleConsulenzaPaid(obj: StripeObject) {
  const meta = metadata(obj)
  const consulenzaId = str(meta.consulenza_id) || str(meta.ref_id)
  if (!consulenzaId) throw new Error('checkout consulenza senza consulenza_id')
  const paymentIntent = typeof obj.payment_intent === 'string'
    ? obj.payment_intent
    : str((obj.payment_intent as StripeObject | undefined)?.id)
  const paid = str(obj.payment_status) === 'paid' || str(obj.status) === 'complete'
  const rows = await q(
    `UPDATE consulenze
       SET status = $2, stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id),
           paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END, updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [consulenzaId, paid ? 'paid' : 'pending', paymentIntent || null],
  )
  if (!rows.length) throw new Error(`Consulenza ${consulenzaId} non trovata`)
}

async function handleCheckoutCompleted(obj: StripeObject) {
  const meta = metadata(obj)

  // One-off consulenza: pagamento singolo, nessun workspace da attivare.
  if (str(meta.tipo) === 'consulenza') {
    await handleConsulenzaPaid(obj)
    return
  }

  const customerId = str(obj.customer)
  const subscriptionId = str(obj.subscription)
  const profileId = str(meta.profile_id)

  // FLOW A (paga-prima): il checkout è nato da una registrazione self-serve. Il
  // workspace non esiste ancora — lo creiamo ORA che il pagamento è confermato,
  // attivando il profilo pending e collegando gli id Stripe.
  if (profileId) {
    const result = await activateRegistration({
      profileId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    })
    // Email di benvenuto (no-op senza RESEND_API_KEY).
    if (!result.alreadyActive) {
      const prof = await q1('SELECT email, nome FROM profiles WHERE id = $1', [profileId])
      if (prof?.email) {
        const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://social-media-manager-zte4.onrender.com').replace(/\/$/, '')
        await sendAccountActivated(String(prof.email), String(prof.nome || 'Cliente'), `${base}/login`).catch(() => {})
      }
    }
    return
  }

  // Percorso classico: workspace già esistente (es. checkout dall'admin).
  const clienteId = await requireStripeClienteId(obj, 'checkout.session.completed')
  const rows = await q(
    `UPDATE clienti
     SET stripe_customer_id = COALESCE($1, stripe_customer_id),
         stripe_subscription_id = COALESCE($2, stripe_subscription_id),
         updated_at = now()
     WHERE id = $3
     RETURNING id`,
    [customerId || null, subscriptionId || null, clienteId],
  )
  if (!rows.length) throw new Error(`Cliente ${clienteId} non trovato per checkout Stripe`)
}

async function handleSubscription(obj: StripeObject) {
  const clienteId = await requireStripeClienteId(obj, 'customer.subscription')
  const subscriptionId = str(obj.id)
  const customerId = str(obj.customer)
  const existing = subscriptionId
    ? await q1('SELECT cliente_id FROM stripe_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1', [subscriptionId])
    : null
  if (existing?.cliente_id && String(existing.cliente_id) !== clienteId) {
    throw new Error(`Subscription Stripe ${subscriptionId} già associata a un altro cliente`)
  }
  const meta = metadata(obj)
  const items = obj.items && typeof obj.items === 'object' ? obj.items as { data?: StripeObject[] } : null
  const firstItem = items?.data?.[0]
  const price = firstItem?.price && typeof firstItem.price === 'object' ? firstItem.price as StripeObject : null
  const priceId = str(price?.id)
  const latestInvoice = typeof obj.latest_invoice === 'string'
    ? obj.latest_invoice
    : str((obj.latest_invoice as StripeObject | undefined)?.id)

  await q(
    `INSERT INTO stripe_subscriptions (
       cliente_id, stripe_subscription_id, stripe_customer_id, status, price_id,
       pacchetto_slug, current_period_start, current_period_end, cancel_at_period_end,
       latest_invoice_id, metadata, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now())
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       status = excluded.status,
       price_id = excluded.price_id,
       pacchetto_slug = excluded.pacchetto_slug,
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       latest_invoice_id = excluded.latest_invoice_id,
       metadata = excluded.metadata,
       updated_at = now()`,
    [
      clienteId,
      subscriptionId,
      customerId || null,
      str(obj.status) || 'unknown',
      priceId || null,
      str(meta.pacchetto_slug) || null,
      ts(obj.current_period_start),
      ts(obj.current_period_end),
      bool(obj.cancel_at_period_end),
      latestInvoice || null,
      JSON.stringify(meta),
    ],
  )

  await q(
    `UPDATE clienti
     SET stripe_customer_id = COALESCE($1, stripe_customer_id),
         stripe_subscription_id = COALESCE($2, stripe_subscription_id),
         updated_at = now()
     WHERE id = $3`,
    [customerId || null, subscriptionId || null, clienteId],
  )
}

async function handleInvoice(obj: StripeObject) {
  const clienteId = await requireStripeClienteId(obj, 'invoice')
  const invoiceId = str(obj.id)
  const existing = invoiceId
    ? await q1('SELECT cliente_id FROM pagamenti WHERE stripe_invoice_id = $1 LIMIT 1', [invoiceId])
    : null
  if (existing?.cliente_id && String(existing.cliente_id) !== clienteId) {
    throw new Error(`Fattura Stripe ${invoiceId} già associata a un altro cliente`)
  }
  const lines = obj.lines && typeof obj.lines === 'object' ? obj.lines as { data?: StripeObject[] } : null
  const period = lines?.data?.[0]?.period && typeof lines.data[0].period === 'object'
    ? lines.data[0].period as StripeObject
    : {}
  const paymentIntent = typeof obj.payment_intent === 'string'
    ? obj.payment_intent
    : str((obj.payment_intent as StripeObject | undefined)?.id)
  const subscriptionId = typeof obj.subscription === 'string'
    ? obj.subscription
    : str((obj.subscription as StripeObject | undefined)?.id)

  await q(
    `INSERT INTO pagamenti (
       cliente_id, stripe_invoice_id, stripe_payment_intent_id, stripe_customer_id,
       stripe_subscription_id, amount_due, amount_paid, currency, status,
       hosted_invoice_url, invoice_pdf, paid_at, due_at, period_start, period_end,
       raw, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,now())
     ON CONFLICT (stripe_invoice_id) DO UPDATE SET
       cliente_id = excluded.cliente_id,
       stripe_payment_intent_id = excluded.stripe_payment_intent_id,
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       amount_due = excluded.amount_due,
       amount_paid = excluded.amount_paid,
       currency = excluded.currency,
       status = excluded.status,
       hosted_invoice_url = excluded.hosted_invoice_url,
       invoice_pdf = excluded.invoice_pdf,
       paid_at = excluded.paid_at,
       due_at = excluded.due_at,
       period_start = excluded.period_start,
       period_end = excluded.period_end,
       raw = excluded.raw,
       updated_at = now()`,
    [
      clienteId,
      invoiceId || null,
      paymentIntent || null,
      str(obj.customer) || null,
      subscriptionId || null,
      int(obj.amount_due),
      int(obj.amount_paid),
      str(obj.currency) || 'eur',
      str(obj.status) || 'unknown',
      str(obj.hosted_invoice_url) || null,
      str(obj.invoice_pdf) || null,
      ts(obj.status_transitions && typeof obj.status_transitions === 'object' ? (obj.status_transitions as StripeObject).paid_at : null),
      ts(obj.due_date),
      ts(period.start),
      ts(period.end),
      JSON.stringify(obj),
    ],
  )
}

async function claimWebhookEvent(event: StripeEvent, rawBody: string): Promise<'new' | 'retry' | 'duplicate'> {
  const eventId = str(event.id)
  if (!eventId) throw new Error('Evento Stripe senza id')
  const inserted = await q(
    `INSERT INTO stripe_webhook_events (event_id, event_type, livemode, raw)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId, event.type || 'unknown', event.livemode === true, rawBody],
  )
  if (inserted.length > 0) return 'new'

  const existing = await q1(
    'SELECT processed_at, processing_error FROM stripe_webhook_events WHERE event_id = $1 LIMIT 1',
    [eventId],
  )
  if (existing?.processed_at || !existing?.processing_error) return 'duplicate'

  await q(
    `UPDATE stripe_webhook_events
     SET raw = $2::jsonb, processing_error = NULL, received_at = now()
     WHERE event_id = $1`,
    [eventId, rawBody],
  )
  return 'retry'
}

async function markWebhookEventProcessed(eventId: string) {
  await q(
    `UPDATE stripe_webhook_events
     SET processed_at = now(), processing_error = NULL
     WHERE event_id = $1`,
    [eventId],
  )
}

async function markWebhookEventFailed(eventId: string, error: string) {
  await q(
    `UPDATE stripe_webhook_events
     SET processing_error = $2
     WHERE event_id = $1`,
    [eventId, error.slice(0, 1000)],
  )
}

export async function POST(request: Request) {
  if (!dbReady()) return NextResponse.json({ error: 'DB non disponibile' }, { status: 503 })

  const rawBody = await request.text()
  try {
    const ok = verifyStripeWebhookSignature(rawBody, request.headers.get('stripe-signature'))
    if (!ok) return NextResponse.json({ error: 'Firma Stripe non valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Webhook Stripe non configurato' }, { status: 503 })
  }

  try {
    const event = JSON.parse(rawBody) as StripeEvent
    const eventId = str(event.id)
    const expectedLivemode = stripeSecretLivemode()
    if (expectedLivemode !== null && typeof event.livemode === 'boolean' && event.livemode !== expectedLivemode) {
      return NextResponse.json({ error: 'Livemode Stripe non coerente con STRIPE_SECRET_KEY' }, { status: 422 })
    }
    const claim = await claimWebhookEvent(event, rawBody)
    if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true, event_id: eventId })

    const obj = event.data?.object
    if (!obj) {
      await markWebhookEventProcessed(eventId)
      return NextResponse.json({ received: true, ignored: true })
    }

    if (event.type === 'checkout.session.completed') await handleCheckoutCompleted(obj)
    else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') await handleSubscription(obj)
    else if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed' || event.type === 'invoice.finalized' || event.type === 'invoice.paid') await handleInvoice(obj)
    else {
      await markWebhookEventProcessed(eventId)
      return NextResponse.json({ received: true, ignored: true, event_type: event.type || 'unknown' })
    }

    await markWebhookEventProcessed(eventId)
    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[stripe webhook]', e)
    const message = e instanceof Error ? e.message : 'Webhook Stripe fallito'
    try {
      const parsed = JSON.parse(rawBody) as StripeEvent
      const eventId = str(parsed.id)
      if (eventId) await markWebhookEventFailed(eventId, message)
    } catch {}
    if (/Cliente non risolto|Cliente .* non trovato/.test(message)) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Webhook Stripe fallito' }, { status: 500 })
  }
}
