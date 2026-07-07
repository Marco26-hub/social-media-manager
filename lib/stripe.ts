import crypto from 'crypto'

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

export type StripeCheckoutSession = {
  id: string
  url: string | null
  customer?: string | null
  subscription?: string | null
}

export type StripePortalSession = {
  id: string
  url: string
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY non configurata')
  return key
}

function appendForm(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return
  params.append(key, String(value))
}

type StripeRequestOptions = {
  idempotencyKey?: string
  attempts?: number
}

class StripeHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function stripeRequest<T>(
  path: string,
  params: URLSearchParams,
  options: StripeRequestOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts || 2)
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${stripeKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
      if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

      const res = await fetch(`${STRIPE_API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: params,
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null) as { error?: { message?: string } } | T | null
      if (!res.ok) {
        const msg = data && typeof data === 'object' && 'error' in data ? data.error?.message : null
        const error = new StripeHttpError(msg || `Stripe error ${res.status}`, res.status)
        if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
          lastError = error
          await wait(250 * attempt)
          continue
        }
        throw error
      }
      return data as T
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stripe request failed'
      lastError = new Error(message === 'This operation was aborted' ? 'Stripe timeout dopo 10s' : message)
      if (error instanceof StripeHttpError && error.status < 500 && error.status !== 429) throw error
      if (attempt >= attempts) throw lastError
      await wait(250 * attempt)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError || new Error('Stripe request failed')
}

export function euroStringToCents(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

export async function createStripeCheckoutSession(args: {
  clienteId: string
  clienteNome: string
  clienteEmail?: string | null
  pacchettoSlug: string
  pacchettoNome: string
  amountCents: number
  successUrl: string
  cancelUrl: string
  stripeCustomerId?: string | null
}): Promise<StripeCheckoutSession> {
  if (args.amountCents <= 0) throw new Error('Importo pacchetto non valido')

  const params = new URLSearchParams()
  appendForm(params, 'mode', 'subscription')
  appendForm(params, 'success_url', args.successUrl)
  appendForm(params, 'cancel_url', args.cancelUrl)
  appendForm(params, 'client_reference_id', args.clienteId)
  appendForm(params, 'customer', args.stripeCustomerId || null)
  if (!args.stripeCustomerId) appendForm(params, 'customer_email', args.clienteEmail || null)
  appendForm(params, 'metadata[cliente_id]', args.clienteId)
  appendForm(params, 'metadata[pacchetto_slug]', args.pacchettoSlug)
  appendForm(params, 'subscription_data[metadata][cliente_id]', args.clienteId)
  appendForm(params, 'subscription_data[metadata][pacchetto_slug]', args.pacchettoSlug)
  appendForm(params, 'line_items[0][quantity]', 1)
  appendForm(params, 'line_items[0][price_data][currency]', 'eur')
  appendForm(params, 'line_items[0][price_data][unit_amount]', args.amountCents)
  appendForm(params, 'line_items[0][price_data][recurring][interval]', 'month')
  appendForm(params, 'line_items[0][price_data][product_data][name]', `Social Automation — ${args.pacchettoNome}`)
  appendForm(params, 'line_items[0][price_data][product_data][metadata][cliente_id]', args.clienteId)
  appendForm(params, 'line_items[0][price_data][product_data][metadata][pacchetto_slug]', args.pacchettoSlug)

  const hourBucket = new Date().toISOString().slice(0, 13)
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${args.clienteId}:${hourBucket}`)
    .digest('hex')

  return stripeRequest<StripeCheckoutSession>('/checkout/sessions', params, { idempotencyKey })
}

export async function createStripePortalSession(args: {
  stripeCustomerId: string
  returnUrl: string
}): Promise<StripePortalSession> {
  const params = new URLSearchParams()
  appendForm(params, 'customer', args.stripeCustomerId)
  appendForm(params, 'return_url', args.returnUrl)
  return stripeRequest<StripePortalSession>('/billing_portal/sessions', params)
}

export function stripeSecretLivemode(): boolean | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (key.startsWith('sk_live_')) return true
  if (key.startsWith('sk_test_')) return false
  return null
}

export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET non configurata')
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(part => {
      const [key, value] = part.split('=')
      return [key, value]
    }),
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > 300) return false

  const payload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const signatureBuffer = Buffer.from(signature, 'hex')
  if (expectedBuffer.length !== signatureBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}
