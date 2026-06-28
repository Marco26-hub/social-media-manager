import Link from 'next/link'
import { PLATFORM_LIST } from '@/lib/social-config'
import {
  ArrowRight,
  Sparkles,
  CheckCircle,
  Zap,
  ShieldCheck,
  Bot,
  BarChart3,
  FileText,
  Search,
  Megaphone,
  Target,
  Users,
  Building2,
  Briefcase,
  Store,
  Rocket,
  Magnet,
  Eye,
} from 'lucide-react'

// Capacità reali del prodotto (niente metriche inventate)
const CAPACITA = [
  { icon: Bot, titolo: 'Generazione contenuti con AI', desc: 'Claude scrive hook, caption, hashtag e CTA su misura per ogni canale e per ogni obiettivo.' },
  { icon: FileText, titolo: 'Piano editoriale', desc: 'Calendari settimanali e mensili coerenti con il tuo brand, i tuoi prodotti e i tuoi temi.' },
  { icon: Search, titolo: 'Audit SEO + GEO', desc: 'Analisi per posizionarti sui motori di ricerca e farti citare dagli assistenti AI come ChatGPT e Perplexity.' },
  { icon: Megaphone, titolo: 'Campagne ADS', desc: 'Struttura e ottimizzazione delle campagne pubblicitarie. Il budget pubblicitario resta separato dal canone.' },
  { icon: Magnet, titolo: 'Lead generation', desc: 'Trova e qualifica contatti potenziali per settore e zona, con scoring caldo/tiepido/freddo e gestione del follow-up commerciale.' },
  { icon: Eye, titolo: 'Analisi competitor', desc: 'Monitoraggio dei concorrenti: contenuti, posizionamento e spunti per differenziarti.' },
  { icon: BarChart3, titolo: 'Analytics e report', desc: 'Produzione, pipeline editoriale e performance dei contenuti, con storico consultabile.' },
]

// Per chi è (target onesto, niente prova sociale finta)
const TARGET = [
  { icon: Building2, titolo: 'Agenzie', desc: 'Gestisci più clienti e più canali da un unico pannello, con flusso di approvazione ordinato.' },
  { icon: Store, titolo: 'PMI e attività locali', desc: 'Una presenza social costante e professionale, senza dover assumere un team interno.' },
  { icon: Briefcase, titolo: 'Liberi professionisti', desc: 'Contenuti curati e pubblicati con continuità, mentre tu ti concentri sul tuo lavoro.' },
]

// Come funziona (flusso reale con approvazione umana)
const FLUSSO = [
  { step: '1', titolo: 'Configuri il brand', desc: 'Imposti azienda, prodotti, tono di voce e canali da gestire.' },
  { step: '2', titolo: "L'AI prepara i contenuti", desc: 'Claude genera piano editoriale, testi, hashtag e CTA per ogni piattaforma.' },
  { step: '3', titolo: 'Approvi con 1 click', desc: 'Rivedi la coda editoriale, modifichi se serve e approvi prima della pubblicazione.' },
  { step: '4', titolo: 'Pubblicazione automatica', desc: 'I contenuti approvati vengono pubblicati sui canali tramite Blotato, con tracciamento UTM.' },
  { step: '5', titolo: 'Report e ottimizzazione', desc: 'Leggi i report, misuri i risultati e affini la strategia del periodo successivo.' },
]

// Prezzi reali, allineati a /servizi. I dettagli vivono su /servizi.
const PIANI = [
  {
    nome: 'Starter',
    prezzo: '€390',
    sottotitolo: 'Per iniziare con una presenza social ordinata.',
    features: [
      'Contenuti social ricorrenti',
      '1-2 canali gestiti',
      'Brand discovery automatico',
      'Anteprima multi-piattaforma',
      'Report periodico',
    ],
    consigliato: false,
  },
  {
    nome: 'Crescita',
    prezzo: '€1.090',
    sottotitolo: 'Il piano più equilibrato per PMI in crescita.',
    features: [
      'Contenuti su più canali',
      'Reel e Short premium',
      'Audit SEO + GEO completo',
      'Analisi competitor e lead',
      'Report ricorrente con call',
    ],
    consigliato: true,
  },
  {
    nome: 'Dominio',
    prezzo: '€2.590',
    sottotitolo: 'Strategia omnichannel per aziende strutturate.',
    features: [
      'Contenuti su tutti i canali',
      'Blog SEO/GEO continuativo',
      'Produzione video avanzata',
      'Strategia omnichannel',
      'Dashboard live e priorità',
    ],
    consigliato: false,
  },
]

// FAQ oneste in italiano
const FAQ = [
  {
    q: 'Devo saper usare un software o gestire le automazioni?',
    a: 'No. Social Automation è un servizio gestito: noi ci occupiamo di strategia, contenuti, pubblicazione e report. A te resta solo la decisione finale, con un’approvazione semplice quando prevista dagli accordi.',
  },
  {
    q: 'Quanto tempo serve per vedere risultati?',
    a: 'Essendo un prodotto in early access, siamo onesti: la continuità è ciò che conta. I primi segnali arrivano di norma nei primi mesi, mentre una crescita solida e dati affidabili richiedono lavoro costante nel tempo. Non promettiamo cifre o tempi miracolosi.',
  },
  {
    q: 'Il budget pubblicitario è incluso nel prezzo?',
    a: 'No. Il budget delle campagne ADS è sempre separato dal canone mensile. In questo modo i costi restano chiari e ogni voce è misurabile in modo trasparente.',
  },
  {
    q: 'Posso approvare i contenuti prima che vengano pubblicati?',
    a: 'Sì. Prima di ogni pubblicazione c’è un passaggio di approvazione umana: rivedi la coda editoriale, puoi modificare i contenuti e approvarli con un click. Ogni piano prevede un numero chiaro di revisioni.',
  },
  {
    q: 'A chi è rivolto Social Automation?',
    a: 'A agenzie che gestiscono più clienti, a PMI e attività locali che vogliono una presenza costante senza un team interno, e a liberi professionisti che vogliono delegare la parte social mantenendo il controllo.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Social Automation</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/servizi" className="btn-secondary hidden sm:inline-flex">
              Pacchetti e prezzi
            </Link>
            <Link href="/dashboard" className="btn-primary">
              Vai al pannello
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-white to-white" />
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Prodotto in early access
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            Gestione social con AI,<br />
            <span className="text-brand-600">con il controllo sempre nelle tue mani</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Social Automation è il servizio gestito che crea contenuti, piano editoriale, audit SEO e GEO,
            campagne ADS, lead generation e report per agenzie e PMI italiane. L&apos;AI prepara, tu approvi
            con un click prima di pubblicare.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary text-base px-6 py-3 w-full sm:w-auto justify-center">
              Prova il pannello
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/servizi" className="btn-secondary text-base px-6 py-3 w-full sm:w-auto justify-center">
              Pacchetti e prezzi
            </Link>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-600" /> Approvazione umana prima di pubblicare</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-600" /> Budget ADS separato dal canone</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-brand-600" /> Servizio gestito, nessun software da imparare</div>
          </div>
        </div>
      </section>

      {/* Canali supportati */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{PLATFORM_LIST.length} canali da un unico pannello</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Contenuti pensati per il formato giusto di ogni piattaforma, dalla creazione alla pubblicazione.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORM_LIST.map(p => (
            <div key={p.nome} className="card p-6 group hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className={`w-14 h-14 rounded-2xl ${p.colorBg} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                {p.emoji}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{p.nome}</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">{p.descrizione}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.formati.map(f => (
                  <span key={f.id} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                    {f.nome}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cosa fa Social Automation */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Cosa fa Social Automation</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Tutto ciò che serve per una presenza digitale continua, coordinata da una regia unica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPACITA.map(({ icon: Icon, titolo, desc }) => (
              <div key={titolo} className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{titolo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Come funziona</h2>
            <p className="text-gray-600">Un flusso chiaro, con l&apos;approvazione umana al centro.</p>
          </div>

          <div className="space-y-3">
            {FLUSSO.map(s => (
              <div key={s.step} className="card p-5 flex items-start gap-4 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{s.titolo}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per chi è */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Costruito per agenzie e PMI italiane
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Per chi è</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Pensato per chi vuole una presenza social professionale senza appesantire la propria struttura.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TARGET.map(({ icon: Icon, titolo, desc }) => (
              <div key={titolo} className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{titolo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="prezzi" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Pacchetti</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Prezzi mensili, IVA esclusa. Il budget pubblicitario è sempre separato dal canone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PIANI.map(piano => (
              <div
                key={piano.nome}
                className={`card p-8 flex flex-col h-full transition-all hover:shadow-lg ${
                  piano.consigliato ? 'border-2 border-brand-600 relative md:-translate-y-2' : ''
                }`}
              >
                {piano.consigliato && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-4 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                    Consigliato
                  </div>
                )}
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{piano.nome}</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {piano.prezzo}
                  <span className="text-lg font-medium text-gray-500">/mese</span>
                </div>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">{piano.sottotitolo}</p>
                <ul className="space-y-3 mb-8 text-sm flex-1">
                  {piano.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/servizi"
                  className={`${piano.consigliato ? 'btn-primary' : 'btn-secondary'} w-full justify-center`}
                >
                  Vedi tutti i dettagli
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Setup iniziale e moduli extra variano per pacchetto.{' '}
              <Link href="/servizi" className="text-brand-600 font-medium hover:underline">
                Confronta tutti i pacchetti su /servizi
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Domande frequenti</h2>
          <p className="text-gray-600">Trasparenza prima di iniziare.</p>
        </div>

        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <details key={i} className="card p-5 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between gap-4 list-none">
                {item.q}
                <ArrowRight className="w-4 h-4 flex-shrink-0 text-brand-600 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA finale */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
            <Rocket className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Pronto a iniziare?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
            Esplora il pannello oppure scopri quale pacchetto è adatto alla tua attività. Ti rispondiamo e ti
            aiutiamo a partire.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary text-base px-8 py-3 w-full sm:w-auto justify-center">
              Prova il pannello
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/servizi" className="btn-secondary text-base px-8 py-3 w-full sm:w-auto justify-center">
              Pacchetti e prezzi
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 text-sm text-gray-400">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 leading-tight">Social Automation</h3>
                <p className="text-xs text-gray-500">Gestione social con AI per agenzie e PMI</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Pannello</Link>
              <Link href="/servizi" className="text-gray-600 hover:text-gray-900">Pacchetti e prezzi</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Accedi</Link>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} Social Automation</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              Costruito con Next.js, Neon/Postgres, Claude e Blotato
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
