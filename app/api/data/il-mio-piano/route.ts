import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { pacchettoFromPiano, pacchettoSlugFromPiano } from '@/lib/pacchetti'

export const dynamic = 'force-dynamic'

type ClienteRow = {
  id?: unknown
  nome?: unknown
  piano?: unknown
  contenuti_mese?: unknown
  attivo?: unknown
}

type PaymentSnapshot = {
  enabled: boolean
  stato: string
  needs_migration?: boolean
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  ultimo_pagamento?: {
    status: string | null
    amount_paid: number
    currency: string
    hosted_invoice_url: string | null
    invoice_pdf: string | null
    paid_at: string | null
  } | null
}

function monthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return {
    inizio: fmt(start),
    fine: fmt(end),
    label: new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(now),
  }
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function buildPayload(cliente: ClienteRow, usati: number, pagamenti?: PaymentSnapshot) {
  const piano = typeof cliente.piano === 'string' ? cliente.piano : 'free'
  const inclusi = toInt(cliente.contenuti_mese, 0)
  const pacchetto = pacchettoFromPiano(piano)
  const slug = pacchettoSlugFromPiano(piano)
  const percentuale = inclusi > 0 ? Math.min(100, Math.round((usati / inclusi) * 100)) : 0

  return {
    cliente: {
      id: typeof cliente.id === 'string' ? cliente.id : null,
      nome: typeof cliente.nome === 'string' ? cliente.nome : 'Cliente',
      piano,
      attivo: cliente.attivo !== false,
    },
    pacchetto: {
      slug,
      piano_legacy: piano,
      nome: pacchetto.nome,
      eyebrow: pacchetto.eyebrow,
      prezzo: pacchetto.prezzo,
      setup: pacchetto.setup,
      sottotitolo: pacchetto.sottotitolo,
      includeDa: pacchetto.includeDa || null,
      features: pacchetto.features,
    },
    quota: {
      inclusi,
      usati,
      rimanenti: Math.max(0, inclusi - usati),
      percentuale,
    },
    mese: monthWindow(),
    pagamenti: pagamenti || {
      enabled: false,
      stato: 'In arrivo',
    },
  }
}

function isMissingPaymentsSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  return /pagamenti|stripe_subscriptions|stripe_customer_id|stripe_subscription_id|does not exist|42703|42P01/i.test(message)
}

async function loadPaymentSnapshot(clienteId: string): Promise<PaymentSnapshot> {
  try {
    const rows = await q(
      `SELECT
         c.stripe_customer_id,
         c.stripe_subscription_id,
         ss.status AS subscription_status,
         ss.current_period_end,
         ss.cancel_at_period_end,
         p.status AS last_payment_status,
         p.amount_paid,
         p.currency,
         p.hosted_invoice_url,
         p.invoice_pdf,
         p.paid_at
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
       WHERE c.id = $1
       LIMIT 1`,
      [clienteId],
    )
    const row = rows[0] || {}
    const status = typeof row.subscription_status === 'string'
      ? row.subscription_status
      : (typeof row.last_payment_status === 'string' ? row.last_payment_status : 'Nessun pagamento registrato')
    return {
      enabled: true,
      stato: status,
      stripe_customer_id: typeof row.stripe_customer_id === 'string' ? row.stripe_customer_id : null,
      stripe_subscription_id: typeof row.stripe_subscription_id === 'string' ? row.stripe_subscription_id : null,
      subscription_status: typeof row.subscription_status === 'string' ? row.subscription_status : null,
      current_period_end: typeof row.current_period_end === 'string' ? row.current_period_end : null,
      cancel_at_period_end: row.cancel_at_period_end === true,
      ultimo_pagamento: row.last_payment_status ? {
        status: typeof row.last_payment_status === 'string' ? row.last_payment_status : null,
        amount_paid: toInt(row.amount_paid, 0),
        currency: typeof row.currency === 'string' ? row.currency : 'eur',
        hosted_invoice_url: typeof row.hosted_invoice_url === 'string' ? row.hosted_invoice_url : null,
        invoice_pdf: typeof row.invoice_pdf === 'string' ? row.invoice_pdf : null,
        paid_at: typeof row.paid_at === 'string' ? row.paid_at : null,
      } : null,
    }
  } catch (error) {
    if (isMissingPaymentsSchema(error)) {
      return {
        enabled: false,
        stato: 'Schema pagamenti non applicato',
        needs_migration: true,
      }
    }
    throw error
  }
}

export async function GET() {
  try {
    await requireAuth()

    if (isDemo() || !dbReady()) {
      return NextResponse.json(buildPayload({
        id: 'demo-silkincom',
        nome: 'SILKinCOM Demo',
        piano: 'pro',
        contenuti_mese: 20,
        attivo: true,
      }, 8, {
        enabled: true,
        stato: 'paid',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: 'active',
        current_period_end: new Date(Date.now() + 21 * 86400000).toISOString(),
        cancel_at_period_end: false,
        ultimo_pagamento: {
          status: 'paid',
          amount_paid: 109000,
          currency: 'eur',
          hosted_invoice_url: null,
          invoice_pdf: null,
          paid_at: new Date().toISOString(),
        },
      }))
    }

    const cid = await requireClienteId()
    const clienti = await q(
      `SELECT id, nome, piano, contenuti_mese, attivo
       FROM clienti
       WHERE id = $1
       LIMIT 1`,
      [cid],
    ) as ClienteRow[]

    if (!clienti.length) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
    }

    const usedRows = await q(
      `SELECT count(*)::int AS usati
       FROM calendario
       WHERE cliente_id = $1
         AND date_trunc('month', data_pubblicazione::date) = date_trunc('month', CURRENT_DATE)
         AND status NOT IN ('BOZZA', 'ERRORE')`,
      [cid],
    )
    const usati = toInt(usedRows[0]?.usati, 0)
    const pagamenti = await loadPaymentSnapshot(cid)

    return NextResponse.json(buildPayload(clienti[0], usati, pagamenti))
  } catch (e) {
    return apiError(e)
  }
}
