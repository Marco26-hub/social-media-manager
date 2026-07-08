'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { readApiError } from '@/lib/ai-client'

type PlanData = {
  cliente: {
    id: string | null
    nome: string
    piano: string
    attivo: boolean
  }
  pacchetto: {
    slug: string
    piano_legacy: string
    nome: string
    eyebrow: string
    prezzo: string
    setup: string
    sottotitolo: string
    includeDa: string | null
    features: string[]
  }
  quota: {
    inclusi: number
    usati: number
    rimanenti: number
    percentuale: number
  }
  mese: {
    inizio: string
    fine: string
    label: string
  }
  pagamenti: {
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
}

type ReportData = {
  periodo?: { da?: string; a?: string }
  stats?: {
    totale?: number
    daApprovare?: number
    approvati?: number
    pubblicati?: number
    errori?: number
    bozze?: number
    perCanale?: Record<string, number>
    perFormato?: Record<string, number>
  }
  executive?: {
    executiveSummary?: string[]
    health?: {
      approvalRate?: number
      errorRate?: number
      premiumContentShare?: number
      riskLevel?: string
    }
    nextActions?: string[]
  }
  topCanali?: { canale?: string; cnt?: number }[]
  topFormati?: { formato?: string; cnt?: number }[]
}

function formatPeriodo(report: ReportData | null) {
  const da = report?.periodo?.da
  const a = report?.periodo?.a
  if (!da || !a) return 'Ultimi 30 giorni'
  return `${da} → ${a}`
}

function formatMoney(cents: number | null | undefined, currency = 'eur') {
  if (!cents) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}

function paymentTone(status: string | null | undefined) {
  if (!status || status === 'In arrivo') return 'bg-gray-100 text-gray-600'
  if (['active', 'trialing', 'paid'].includes(status)) return 'bg-green-100 text-green-700'
  if (['past_due', 'open', 'uncollectible'].includes(status)) return 'bg-amber-100 text-amber-700'
  if (['canceled', 'failed', 'void'].includes(status)) return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

function StatCard({ label, value, tone = 'gray' }: { label: string; value: string | number; tone?: 'gray' | 'brand' | 'green' | 'amber' | 'red' }) {
  const tones = {
    gray: 'bg-gray-50 text-gray-700',
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>{label}</p>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function MiniList({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map(item => item.value))
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Nessun dato disponibile</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map(item => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-gray-700 capitalize">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function IlMioPianoPage() {
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [planRes, reportRes] = await Promise.all([
        fetch('/api/data/il-mio-piano'),
        fetch('/api/data/report'),
      ])
      if (!planRes.ok) throw new Error(await readApiError(planRes, 'Impossibile caricare il piano cliente'))
      if (!reportRes.ok) throw new Error(await readApiError(reportRes, 'Impossibile caricare il report live'))
      const planJson = await planRes.json() as PlanData
      const reportJson = await reportRes.json() as ReportData
      setPlan(planJson)
      setReport(reportJson)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function refresh() {
    setRefreshing(true)
    await load()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-950">Dashboard cliente non disponibile</p>
            <p className="mt-1 text-sm text-red-700">{error || 'Dati piano mancanti'}</p>
          </div>
        </div>
      </div>
    )
  }

  const quota = plan.quota
  const quotaLabel = `${quota.usati}/${quota.inclusi} usati`
  const quotaBarWidth = `${quota.percentuale}%`
  const stats = report?.stats || {}
  const health = report?.executive?.health || {}
  const summary = report?.executive?.executiveSummary || []
  const nextActions = report?.executive?.nextActions || []
  const canali = Object.entries(stats.perCanale || {}).map(([label, value]) => ({ label, value }))
  const formati = Object.entries(stats.perFormato || {}).map(([label, value]) => ({ label, value }))
  const riskLevel = typeof health.riskLevel === 'string' ? health.riskLevel : 'n/d'
  const approvalRate = typeof health.approvalRate === 'number' ? `${health.approvalRate}%` : '0%'
  const errorRate = typeof health.errorRate === 'number' ? `${health.errorRate}%` : '0%'

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Vista cliente
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Il mio piano</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Pacchetto attivo, quota contenuti e report live del cliente selezionato: {plan.cliente.nome}.
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="btn-secondary w-full justify-center text-sm md:w-auto">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Aggiorna dati
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.85fr]">
        <section className="card overflow-hidden border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/60 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <PackageCheck className="h-5 w-5" />
                Il tuo pacchetto
              </div>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">{plan.pacchetto.nome}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{plan.pacchetto.sottotitolo}</p>
              {plan.pacchetto.includeDa && (
                <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
                  Include tutto di {plan.pacchetto.includeDa}, più:
                </p>
              )}
            </div>
            <div className="shrink-0 rounded-2xl bg-white p-4 text-left shadow-sm sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Canone</p>
              <p className="mt-1 whitespace-nowrap text-2xl font-bold text-gray-900">{plan.pacchetto.prezzo}<span className="text-base font-medium text-gray-500">/mese</span></p>
              <p className="mt-1 text-xs text-gray-500">{plan.pacchetto.setup}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {plan.pacchetto.features.map(feature => (
              <div key={feature} className="flex items-start gap-2 rounded-xl border border-white bg-white/80 p-3 text-sm text-gray-700 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <CalendarDays className="h-5 w-5" />
                Contenuti del mese
              </div>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">{quotaLabel}</h2>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
              <p className="text-xs text-gray-500">Rimanenti</p>
              <p className="text-2xl font-bold text-gray-900">{quota.rimanenti}</p>
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-gray-500">
              <span className="capitalize">{plan.mese.label}</span>
              <span>{quota.percentuale}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all" style={{ width: quotaBarWidth }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              La quota si azzera ogni mese ({plan.mese.inizio} → {plan.mese.fine}). Contiamo i contenuti del mese, escluse bozze ed errori.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
              <BarChart3 className="h-5 w-5" />
              Report live
            </div>
            <p className="mt-1 text-sm text-gray-500">Dati reali da /api/data/report · {formatPeriodo(report)}</p>
          </div>
          <Link href="/dashboard/analytics" className="btn-secondary w-full justify-center text-sm md:w-auto">
            Apri analytics dettagliate
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Totale" value={stats.totale || 0} tone="gray" />
          <StatCard label="Da approvare" value={stats.daApprovare || 0} tone="amber" />
          <StatCard label="Approvati" value={stats.approvati || 0} tone="green" />
          <StatCard label="Pubblicati" value={stats.pubblicati || 0} tone="brand" />
          <StatCard label="Errori" value={stats.errori || 0} tone="red" />
          <StatCard label="Rischio" value={riskLevel} tone={riskLevel === 'alto' ? 'red' : riskLevel === 'medio' ? 'amber' : 'green'} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_1.2fr]">
          <MiniList title="Canali principali" items={canali} />
          <MiniList title="Formati principali" items={formati} />
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sintesi operativa</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs text-green-700">Tasso approvazione</p>
                <p className="text-xl font-bold text-green-900">{approvalRate}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs text-red-700">Tasso errore</p>
                <p className="text-xl font-bold text-red-900">{errorRate}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {(summary.length ? summary : ['Nessuna sintesi ancora disponibile: crea e pubblica più contenuti per alimentare il report.']).slice(0, 3).map(item => (
                <p key={item} className="text-sm leading-relaxed text-gray-600">{item}</p>
              ))}
            </div>
            {nextActions.length > 0 && (
              <div className="mt-4 rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prossime azioni</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  {nextActions.slice(0, 3).map(action => <li key={action}>• {action}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <CreditCard className="h-5 w-5" />
            Pagamenti
          </div>
          {plan.pagamenti.enabled ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${paymentTone(plan.pagamenti.subscription_status || plan.pagamenti.stato)}`}>
                  {plan.pagamenti.subscription_status || plan.pagamenti.stato}
                </span>
                {plan.pagamenti.cancel_at_period_end && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">Disdetta a fine periodo</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Prossimo rinnovo</p>
                  <p className="mt-1 font-semibold text-gray-900">{formatDate(plan.pagamenti.current_period_end)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Ultimo pagamento</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatMoney(plan.pagamenti.ultimo_pagamento?.amount_paid, plan.pagamenti.ultimo_pagamento?.currency || 'eur')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {plan.pagamenti.ultimo_pagamento?.hosted_invoice_url && (
                  <a href={plan.pagamenti.ultimo_pagamento.hosted_invoice_url} target="_blank" rel="noopener" className="text-brand-600 hover:underline">Apri fattura</a>
                )}
                {plan.pagamenti.ultimo_pagamento?.invoice_pdf && (
                  <a href={plan.pagamenti.ultimo_pagamento.invoice_pdf} target="_blank" rel="noopener" className="text-brand-600 hover:underline">Scarica PDF</a>
                )}
                {!plan.pagamenti.ultimo_pagamento?.hosted_invoice_url && !plan.pagamenti.ultimo_pagamento?.invoice_pdf && (
                  <span className="text-gray-500">Nessuna fattura disponibile nel portale.</span>
                )}
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-bold text-gray-900">{plan.pagamenti.stato || 'In arrivo'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {plan.pagamenti.needs_migration
                  ? 'Lo schema Stripe non risulta disponibile: applicare la migration pagamenti per mostrare fatture e abbonamenti.'
                  : 'La gestione pagamenti sarà visibile qui appena lo schema Stripe sarà applicato e il primo pagamento verrà sincronizzato.'}
              </p>
            </>
          )}
        </div>
        <div className="card flex flex-col p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
            <Sparkles className="h-5 w-5" />
            Vuoi crescere di più?
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Con un pacchetto superiore ottieni più contenuti, più canali e nuovi servizi. Ogni livello include tutto quello del precedente.
          </p>
          <Link href="/servizi#pacchetti" className="btn-secondary mt-4 w-full justify-center text-sm sm:w-auto sm:self-start">
            Confronta i pacchetti
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
