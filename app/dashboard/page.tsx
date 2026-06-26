import { dbReady as isDbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import {
  Calendar, CheckCircle, AlertCircle, Send, Clock, TrendingUp, ChevronRight,
  Bot, Database, Rocket, ShieldCheck, Sparkles, Workflow, Package, ImagePlus,
  BarChart3, Megaphone
} from 'lucide-react'
import Link from 'next/link'
import { demoContenuti, demoLogs } from '@/lib/demo-data'
import AIModelSelector from '@/components/AIModelSelector'
import OpenRouterKeyInput from '@/components/OpenRouterKeyInput'
import { PLATFORM_LIST } from '@/lib/social-config'
import { isDemo } from '@/lib/demo'
import { GENERATION_OPTIMIZATION_CYCLE } from '@/lib/production-cycle'

export const dynamic = 'force-dynamic'

type DashboardLog = {
  id: string
  timestamp: string
  id_contenuto: string | null
  status_finale: string
  canale: string | null
  messaggio: string | null
}

async function getStats() {
  if (isDemo()) {
    return {
      brandConfigurato: true,
      prodotti: 3,
      daApprovare: demoContenuti.filter(c => c.status === 'DA_APPROVARE').length,
      pubblicati7g: demoContenuti.filter(c => c.status === 'PUBBLICATO').length,
      errori: demoContenuti.filter(c => c.status === 'ERRORE' || c.status === 'ERRORE_MANUALE').length,
      inCoda: demoContenuti.filter(c => c.status === 'APPROVATO').length,
      jobAttivi: 0,
      jobFalliti: 0,
      ultimi: demoLogs as DashboardLog[],
    }
  }
  const cid = await requireClienteId()
  await requireAuth()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [
    daRows,
    pubRows,
    errRows,
    codaRows,
    jobARows,
    jobFRows,
    ultimiRows,
    brandRows,
    productRows,
  ] = await Promise.all([
    q('SELECT count(*)::int as c FROM calendario WHERE cliente_id = $1 AND status = $2', [cid, 'DA_APPROVARE']),
    q('SELECT count(*)::int as c FROM calendario WHERE cliente_id = $1 AND status = $2 AND data_pubblicazione >= $3', [cid, 'PUBBLICATO', weekAgo]),
    q("SELECT count(*)::int as c FROM calendario WHERE cliente_id = $1 AND status IN ('ERRORE','ERRORE_MANUALE')", [cid]),
    q('SELECT count(*)::int as c FROM calendario WHERE cliente_id = $1 AND status = $2', [cid, 'APPROVATO']),
    q("SELECT count(*)::int as c FROM generation_jobs WHERE cliente_id = $1 AND status IN ('queued','running')", [cid]),
    q('SELECT count(*)::int as c FROM generation_jobs WHERE cliente_id = $1 AND status = $2', [cid, 'failed']),
    q('SELECT * FROM log_pubblicazioni WHERE cliente_id = $1 ORDER BY timestamp DESC LIMIT 5', [cid]),
    q('SELECT count(*)::int as c FROM brand WHERE cliente_id = $1', [cid]),
    q("SELECT count(*)::int as c FROM prodotti WHERE cliente_id = $1 AND prodotto_attivo = 'SI'", [cid]),
  ])

  return {
    brandConfigurato: ((brandRows[0] as { c: number } | undefined)?.c ?? 0) > 0,
    prodotti: (productRows[0] as { c: number } | undefined)?.c ?? 0,
    daApprovare: (daRows[0] as { c: number } | undefined)?.c ?? 0,
    pubblicati7g: (pubRows[0] as { c: number } | undefined)?.c ?? 0,
    errori: (errRows[0] as { c: number } | undefined)?.c ?? 0,
    inCoda: (codaRows[0] as { c: number } | undefined)?.c ?? 0,
    jobAttivi: (jobARows[0] as { c: number } | undefined)?.c ?? 0,
    jobFalliti: (jobFRows[0] as { c: number } | undefined)?.c ?? 0,
    ultimi: (ultimiRows ?? []) as DashboardLog[],
  }
}

function getSystemHealth() {
  const demo = isDemo()
  const databaseReady = demo || isDbReady()
  const authReady = Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)
  const aiReady = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY)
  const operationsReady = !demo

  return {
    demo,
    ready: databaseReady && authReady && aiReady,
    items: [
      {
        label: 'Neon DB',
        value: databaseReady ? 'DATABASE_URL attivo' : 'Da configurare',
        icon: Database,
        tone: databaseReady ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50',
      },
      {
        label: 'Auth',
        value: authReady ? 'NextAuth pronto' : 'Serve secret',
        icon: ShieldCheck,
        tone: authReady ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50',
      },
      {
        label: 'AI backend',
        value: aiReady ? 'Chiave attiva' : 'Serve chiave AI',
        icon: Bot,
        tone: aiReady ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50',
      },
      {
        label: 'Ops schema',
        value: operationsReady ? 'Migration pronta' : 'Demo mode',
        icon: Workflow,
        tone: operationsReady ? 'text-blue-700 bg-blue-50' : 'text-slate-700 bg-slate-100',
      },
    ],
  }
}

export default async function DashboardPage() {
  const { brandConfigurato, prodotti, daApprovare, pubblicati7g, errori, inCoda, jobAttivi, jobFalliti, ultimi } = await getStats()
  const systemHealth = getSystemHealth()

  const stats = [
    { label: 'Da approvare',    value: daApprovare ?? 0, icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50', href: '/dashboard/calendario?filter=DA_APPROVARE' },
    { label: 'Pubblicati 7gg',  value: pubblicati7g ?? 0,icon: TrendingUp,    color: 'text-green-600',  bg: 'bg-green-50',  href: '/dashboard/log' },
    { label: 'In coda',         value: inCoda ?? 0,      icon: Send,          color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/dashboard/calendario?filter=APPROVATO' },
    { label: 'Errori attivi',   value: errori ?? 0,      icon: AlertCircle,   color: 'text-red-600',    bg: 'bg-red-50',    href: '/dashboard/calendario?filter=ERRORE' },
  ]

  const statusColor: Record<string, string> = {
    PUBBLICATO:       'text-green-700',
    ERRORE:           'text-red-700',
    ERRORE_MANUALE:   'text-red-700',
    DRY_RUN_OK:       'text-teal-700',
    ERRORE_WORKFLOW:  'text-orange-700',
  }

  const productionFlow = [
    {
      step: '01',
      title: 'Brand & regole',
      input: 'Sito, tono, target, compliance',
      output: 'Prompt memory e vincoli creativi',
      href: '/dashboard/brand',
      icon: Sparkles,
      done: brandConfigurato,
      cta: brandConfigurato ? 'Rivedi brand' : 'Completa brand',
    },
    {
      step: '02',
      title: 'Prodotti & asset',
      input: 'Catalogo, immagini, link prodotto',
      output: 'Asset pronti per post/reel/story/blog',
      href: '/dashboard/prodotti',
      icon: Package,
      done: prodotti > 0,
      cta: prodotti > 0 ? `${prodotti} prodotti` : 'Carica prodotti',
    },
    {
      step: '03',
      title: 'Strategia & piano',
      input: 'Obiettivo, periodo, canali, qualità',
      output: 'Calendario con idee e brief',
      href: '/dashboard/piano',
      icon: Workflow,
      done: daApprovare + inCoda + pubblicati7g > 0,
      cta: 'Genera piano',
    },
    {
      step: '04',
      title: 'Produzione contenuti',
      input: 'Template, asset, qualità pacchetto',
      output: 'Post/reel/story/carousel/blog completi',
      href: '/dashboard/social/instagram',
      icon: ImagePlus,
      done: daApprovare > 0 || inCoda > 0 || pubblicati7g > 0,
      cta: 'Crea contenuti',
    },
    {
      step: '05',
      title: 'Revisione cliente',
      input: 'Preview, score AI, link approvazione',
      output: 'Contenuti approvati o da correggere',
      href: '/dashboard/calendario?filter=DA_APPROVARE',
      icon: ShieldCheck,
      done: daApprovare === 0 && (inCoda > 0 || pubblicati7g > 0),
      attention: daApprovare > 0,
      cta: daApprovare > 0 ? `${daApprovare} da approvare` : 'Tutto revisionato',
    },
    {
      step: '06',
      title: 'Pubblicazione',
      input: 'APPROVATO, media validi, Blotato',
      output: 'Post schedulati/pubblicati e log',
      href: '/dashboard/log',
      icon: Megaphone,
      done: pubblicati7g > 0,
      attention: errori > 0,
      cta: errori > 0 ? `${errori} errori` : 'Controlla log',
    },
    {
      step: '07',
      title: 'Report & rinnovo',
      input: 'KPI, log, contenuti migliori',
      output: 'PDF cliente e prossime azioni',
      href: '/dashboard/report',
      icon: BarChart3,
      done: pubblicati7g > 0,
      cta: 'Crea report',
    },
  ]

  const nextStep = productionFlow.find(step => step.attention || !step.done) || productionFlow[productionFlow.length - 1]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 md:p-8 mb-6 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.28),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.22),transparent_30%)]" />
        <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              Control room · {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              Social Automation è pronta a diventare operativa.
            </h1>
            <p className="text-sm md:text-base text-slate-300 mt-3 max-w-2xl">
              Neon/Postgres, API e frontend sono allineati sul prossimo obiettivo: generare, approvare e preparare la pubblicazione dei contenuti senza perdere visibilità sui job.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href={nextStep.href} className="btn-primary">
                <Rocket className="w-4 h-4" />
                Prossimo step: {nextStep.cta}
              </Link>
              <Link href="/dashboard/calendario?filter=DA_APPROVARE" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/15 transition-colors">
                <ShieldCheck className="w-4 h-4" />
                Approva contenuti
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">Stato sistema</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${systemHealth.ready ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                {systemHealth.ready ? 'Ready' : 'Setup'}
              </span>
            </div>
            <div className="space-y-2">
              {systemHealth.items.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-white/90 p-3 text-slate-900">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg p-2 ${tone}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-xs text-slate-500">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selettore modello AI — top dashboard */}
      <AIModelSelector />

      {/* API Key OpenRouter */}
      <OpenRouterKeyInput />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link href={href} key={label} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      {/* Ciclo produzione collegato */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-semibold text-gray-900">Ciclo produzione contenuti</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ogni servizio prende l&apos;output dello step precedente: niente pezzi scollegati, solo flusso operativo.
            </p>
          </div>
          <Link href="/dashboard/setup" className="btn-secondary text-xs py-2 px-3 self-start md:self-auto">
            <ShieldCheck className="w-4 h-4" />
            Setup produzione
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          {productionFlow.map(({ step, title, input, output, href, icon: Icon, done, attention, cta }, index) => (
            <Link
              key={step}
              href={href}
              className={`relative rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                attention
                  ? 'border-amber-200 bg-amber-50'
                  : done
                    ? 'border-emerald-100 bg-emerald-50/60'
                    : 'border-gray-100 bg-white'
              }`}
            >
              {index < productionFlow.length - 1 && (
                <ChevronRight className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 bg-white rounded-full" />
              )}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold text-gray-400">{step}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  attention
                    ? 'bg-amber-100 text-amber-700'
                    : done
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                }`}>
                  {attention ? 'azione' : done ? 'ok' : 'setup'}
                </span>
              </div>
              <Icon className={`w-5 h-5 mb-3 ${attention ? 'text-amber-600' : done ? 'text-emerald-600' : 'text-brand-600'}`} />
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-[11px] text-gray-500 mt-2">
                <span className="font-semibold text-gray-700">Input:</span> {input}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                <span className="font-semibold text-gray-700">Output:</span> {output}
              </p>
              <p className="text-xs font-semibold text-brand-600 mt-3">{cta} →</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-6 border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 mb-3">
              <Workflow className="w-3.5 h-3.5" />
              Sistema operativo contenuti
            </div>
            <h2 className="text-lg md:text-xl font-bold">Ciclo generazione → ottimizzazione</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Ogni contenuto nasce da brand identity e asset cliente, viene prodotto con template, controllato con score e torna nel report come apprendimento per il ciclo successivo.
            </p>
          </div>
          <Link href="/dashboard/social/instagram" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition-colors self-start lg:self-auto">
            <Sparkles className="w-4 h-4 text-brand-600" />
            Avvia generazione
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          {GENERATION_OPTIMIZATION_CYCLE.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <span className="text-[10px] font-bold text-emerald-200">0{index + 1}</span>
              <h3 className="font-semibold text-white mt-2">{stage.title}</h3>
              <p className="text-[11px] text-slate-300 mt-2">
                <span className="text-slate-100">Output:</span> {stage.output}
              </p>
              <p className="text-[11px] text-emerald-100/90 mt-2">{stage.qualityGate}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">Servizi collegati</h2>
              <p className="text-sm text-gray-500 mt-1">Come vendere ed erogare il servizio senza buchi operativi.</p>
            </div>
            <Link href="/api/system/health" className="text-sm text-brand-600 hover:underline">Health JSON →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { step: 'A', title: 'Pacchetto → qualità', text: 'Il piano cliente governa profondità AI, numero contenuti e report.' },
              { step: 'B', title: 'Asset → template', text: 'Immagini cliente e prodotti alimentano layout, brief e media finali.' },
              { step: 'C', title: 'Report → rinnovo', text: 'Ogni mese chiude con KPI, insight e azioni del mese successivo.' },
            ].map(item => (
              <div key={item.step} className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4">
                <span className="text-xs font-bold text-brand-600">{item.step}</span>
                <h3 className="font-semibold text-gray-900 mt-2">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Job backend</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-3xl font-bold text-blue-700">{jobAttivi ?? 0}</p>
              <p className="text-xs text-blue-700/70 mt-1">Queued/running</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-3xl font-bold text-red-700">{jobFalliti ?? 0}</p>
              <p className="text-xs text-red-700/70 mt-1">Failed</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Se i valori restano a zero prima della migration, è normale: la base è già pronta per il prossimo step async.
          </p>
        </div>
      </div>

      {/* Grid social — entry-point per ogni piattaforma */}
      <div className="mb-6 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold text-gray-900">Crea contenuto</h2>
          <Link href="/dashboard/piano" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
            Piano editoriale <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PLATFORM_LIST.map(p => (
            <Link
              key={p.key}
              href={`/dashboard/social/${p.key}`}
              className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
            >
              <div className={`w-12 h-12 mx-auto rounded-2xl ${p.colorBg} flex items-center justify-center text-2xl mb-2 shadow-sm group-hover:scale-110 transition-transform`}>
                {p.emoji}
              </div>
              <p className="font-semibold text-sm text-gray-900">{p.nome}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{p.formati.length} {p.formati.length === 1 ? 'formato' : 'formati'}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Ultimi log + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ultime attività</h2>
            <Link href="/dashboard/log" className="text-sm text-brand-600 hover:underline">Vedi tutti →</Link>
          </div>
          {ultimi.length === 0 ? (
            <p className="text-sm text-gray-400">Nessuna attività ancora.</p>
          ) : (
            <div className="space-y-3">
              {ultimi.map((log: DashboardLog) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800">{log.id_contenuto ?? '—'}</span>
                    {log.canale && <span className="text-gray-400 ml-1">· {log.canale}</span>}
                    <span className={`ml-2 font-medium ${statusColor[log.status_finale] ?? 'text-gray-600'}`}>
                      {log.status_finale}
                    </span>
                    {log.messaggio && <p className="text-gray-400 truncate">{log.messaggio}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Azioni rapide */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Azioni rapide</h2>
          <div className="space-y-2">
            <Link href="/dashboard/calendario?filter=DA_APPROVARE" className="btn-secondary w-full justify-start">
              <CheckCircle className="w-4 h-4 text-yellow-500" />
              Approva contenuti
            </Link>
            <Link href="/dashboard/calendario?filter=ERRORE" className="btn-secondary w-full justify-start">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Gestisci errori
            </Link>
            <Link href="/dashboard/calendario" className="btn-secondary w-full justify-start">
              <Calendar className="w-4 h-4 text-blue-500" />
              Vedi calendario
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
