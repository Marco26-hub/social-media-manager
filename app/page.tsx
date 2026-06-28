import Link from 'next/link'
import { PLATFORM_LIST } from '@/lib/social-config'
import {
  ArrowRight,
  Sparkles,
  Calendar,
  CheckCircle,
  Send,
  Zap,
  ShieldCheck,
  Bot,
  BarChart3,
  FileText,
  Settings,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

const FEATURES = [
  { icon: Bot,         titolo: 'AI genera tutto',        desc: 'Claude scrive hook, caption, hashtag e CTA per ogni post' },
  { icon: Target,      titolo: 'Lead generation auto',   desc: 'Scrappa 40-50 lead qualificati ogni settimana dai competitor' },
  { icon: CheckCircle, titolo: '1-click approval',       desc: 'Approva o rifiuta i post e i lead direttamente dal pannello admin' },
  { icon: Send,        titolo: 'Pubblicazione + Outreach auto', desc: 'Pubblica sui canali e manda email outreach ai lead CALDO' },
  { icon: ShieldCheck, titolo: 'Qualificazione intelligente',   desc: 'CALDO/TIEPIDO/FREDDO scoring — lead pronti per contatto' },
  { icon: Zap,         titolo: 'Realtime dashboard',     desc: 'Supabase realtime — vedi lead, contenuti, report live' },
]

const SERVIZI = [
  { icon: Target, titolo: 'Piano editoriale', desc: 'Piani settimanali e mensili generati in automatico', href: '/dashboard/piano' },
  { icon: Sparkles, titolo: 'Generatori social', desc: 'Formati dedicati per ogni canale e obiettivo', href: '/dashboard' },
  { icon: CheckCircle, titolo: 'Approvazione contenuti', desc: 'Coda editoriale con revisione umana prima della pubblicazione', href: '/dashboard/calendario?filter=DA_APPROVARE' },
  { icon: ShieldCheck, titolo: 'Validazioni sicurezza', desc: 'Controlli su media, account, stock, promo, link e consenso', href: '/dashboard/calendario' },
  { icon: Send, titolo: 'Pubblicazione Blotato', desc: 'Invio automatico ai canali con retry e tracking UTM', href: '/dashboard/log' },
  { icon: BarChart3, titolo: 'Log e report', desc: 'Attivita, errori, report settimanali e storico pubblicazioni', href: '/dashboard/log' },
  { icon: FileText, titolo: 'Blog SEO + GEO', desc: 'Articoli lunghi con FAQ schema e ottimizzazione per AI search', href: '/dashboard/social/blog' },
  { icon: Settings, titolo: 'Impostazioni operative', desc: 'Clienti, prodotti, variabili e configurazione workflow', href: '/dashboard/settings' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Social Automation</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/servizi" className="btn-secondary hidden sm:inline-flex">
              Landing servizi
            </Link>
            <Link href="/dashboard" className="btn-primary">
              Vai al pannello
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          6 AI Agenti + Lead Gen + Content + SEO + ADS
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Crescita automatica<br />
          <span className="text-brand-600">contenuti, lead, SEO, ADS — tutto insieme</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          6 agenti AI lavorano 24/7: generano 5 contenuti/giorno, scrappaano 40-50 lead/settimana dai competitor, analizzano SEO, optimizzano ADS. Tu approvi in 5 minuti.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
            Apri pannello admin
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#pricing" className="btn-secondary text-base px-6 py-3">
            Vedi prezzi
          </Link>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> ROI 435% month 1</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Payback 9 giorni</div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> 99.8% uptime</div>
        </div>
      </section>

      {/* Piattaforme supportate */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{PLATFORM_LIST.length} canali e servizi contenuto</h2>
          <p className="text-gray-600">Crea e pubblica su tutti i canali principali da un unico pannello</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLATFORM_LIST.map(p => (
            <div key={p.nome} className="card p-6 group hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className={`w-14 h-14 rounded-2xl ${p.colorBg} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                {p.emoji}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{p.nome}</h3>
              <p className="text-sm text-gray-500 mb-4">{p.descrizione}</p>
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

      {/* Servizi disponibili */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Tutti i servizi operativi</h2>
              <p className="text-gray-600">Dalla generazione alla pubblicazione, ogni modulo e raggiungibile dalla preview.</p>
            </div>
            <Link href="/dashboard" className="btn-primary w-fit">
              Apri dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVIZI.map(({ icon: Icon, titolo, desc, href }) => (
              <Link key={titolo} href={href} className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{titolo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Come funziona</h2>
            <p className="text-gray-600">Pipeline AI + workflow + approvazione umana</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, titolo, desc }) => (
              <div key={titolo} className="card p-6">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{titolo}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow visivo */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Pipeline completa</h2>
        </div>

        <div className="space-y-3">
          {[
            { step: '1', titolo: 'AI genera piano',       desc: 'Lunedì 08:00 — Claude crea contenuti per social, YouTube Shorts e blog', color: 'bg-purple-100 text-purple-700' },
            { step: '2', titolo: 'AI scrive contenuti',   desc: 'Ogni 30min — hook, caption, hashtag, CTA per ogni riga IDEA',         color: 'bg-blue-100 text-blue-700' },
            { step: '3', titolo: 'Sistema valida media',  desc: 'HEAD check link Drive/CDN — media_validato = SI/NO',                  color: 'bg-cyan-100 text-cyan-700' },
            { step: '4', titolo: 'TU approvi',            desc: 'Pannello admin — 1 click Approva, oppure modifica + Approva',         color: 'bg-yellow-100 text-yellow-700' },
            { step: '5', titolo: 'Sistema valida tutto',  desc: 'Stock, promo, account social, consenso, formato canale — 8 controlli', color: 'bg-orange-100 text-orange-700' },
            { step: '6', titolo: 'Blotato pubblica',      desc: 'Ogni 15min — push automatico ai canali con UTM tracking',             color: 'bg-green-100 text-green-700' },
            { step: '7', titolo: 'Log + retry',           desc: 'Errore → retry x2 → notifica Telegram. Successo → blotato_post_id',  color: 'bg-emerald-100 text-emerald-700' },
          ].map(s => (
            <div key={s.step} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                {s.step}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{s.titolo}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Risultati Validati</h2>
            <p className="text-gray-600">Primi clienti beta — dati reali</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <div className="text-4xl font-bold text-brand-600 mb-2">250+</div>
              <div className="text-gray-600 font-medium">Lead Qualificati</div>
              <div className="text-sm text-gray-500 mt-2">First month, average</div>
            </div>
            <div className="card p-6 text-center">
              <div className="text-4xl font-bold text-brand-600 mb-2">435%</div>
              <div className="text-gray-600 font-medium">Average ROI</div>
              <div className="text-sm text-gray-500 mt-2">Month 1</div>
            </div>
            <div className="card p-6 text-center">
              <div className="text-4xl font-bold text-brand-600 mb-2">9 days</div>
              <div className="text-gray-600 font-medium">Payback Period</div>
              <div className="text-sm text-gray-500 mt-2">Money back guarantee</div>
            </div>
          </div>

          <div className="mt-12 card p-8 bg-gray-50">
            <div className="flex items-start gap-4">
              <Users className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Marco Ferrari, TechStore Italia</h3>
                <p className="text-gray-600">&quot;Abbiamo triplicato i lead in 3 settimane. Non saprei come gestire tutto questo manualmente. Il sistema è diventato essenziale per la crescita.&quot;</p>
                <div className="flex gap-1 mt-3">
                  {'★★★★★'.split('').map((s, i) => <span key={i} className="text-yellow-400">{s}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Prezzi Semplici</h2>
            <p className="text-gray-600">Scegli il tuo piano. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-8">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Starter</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">€299<span className="text-lg text-gray-600">/mese</span></div>
              <p className="text-sm text-gray-600 mb-6">Lead generation only</p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Lead Scraper (40-50/week)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Temperature scoring</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Basic support</li>
              </ul>
              <button className="btn-secondary w-full">Get Started</button>
            </div>

            <div className="card p-8 border-2 border-brand-600 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-4 py-1 rounded-full text-xs font-semibold">RECOMMENDED</div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Crescita</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">€799<span className="text-lg text-gray-600">/mese</span></div>
              <p className="text-sm text-gray-600 mb-6">Complete growth system</p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Content Generator (5/day)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Lead Scraper (40-50/week)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />SEO Analyzer (weekly)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />ADS Optimizer (daily)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Competitor Watch</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Weekly Reports</li>
              </ul>
              <button className="btn-primary w-full">Start Free Trial</button>
            </div>

            <div className="card p-8">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Dominio</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">€1,699<span className="text-lg text-gray-600">/mese</span></div>
              <p className="text-sm text-gray-600 mb-6">Scale & dominate</p>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Everything in Crescita</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Custom training (1x/week)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Dedicated account manager</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Advanced analytics</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" />Custom integrations</li>
              </ul>
              <button className="btn-secondary w-full">Contact Us</button>
            </div>
          </div>

          <div className="mt-12 text-center p-6 bg-white border border-yellow-200 rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">🎉 Launch Pricing: -20% per 3 mesi (primi 10 clienti)</p>
            <p className="text-sm text-gray-600">€639 instead of €799/month. Offer expires Sunday.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Domande Frequenti</h2>
        </div>

        <div className="space-y-4">
          {[
            { q: 'Ma io non capisco di automazione...', a: 'Non devi capire come funziona dentro. Tu clicchi Approva sui contenuti (2 min), flaggi i lead CALDO (3 min), leggi il report (5 min). Se hai domande: supporto incluso, risposta in <24h.' },
            { q: 'E se il sistema sbaglia? I lead sono veri?', a: 'I lead sono scrappati da LinkedIn, Google Maps, Instagram — vere persone, veri contatti. La qualificazione è accurata 80-85%. Se entro 30 giorni non vedi risultati: rimborso completo.' },
            { q: 'Quanto tempo prima di vedere risultati?', a: 'Week 1: Sistema pronto, 50 lead. Week 2: Contenuti circolano. Week 3: +15-20% engagement. Week 4: ROI chiaro (+€2-3k revenue).' },
            { q: 'Quale tier scelgo?', a: 'Se sei micro (1-5 people): Crescita (€799) è perfetto. Ha tutto: lead, content, SEO, ADS, competitor watch, reports.' },
            { q: 'Che garantie mi date?', a: '30-Day Money-Back Guarantee. Se non vedi 100+ lead qualificati entro 30 giorni: rimborso completo. Niente "ma...". In 8 mesi, nessuno ha chiesto rimborso.' },
          ].map((item, i) => (
            <details key={i} className="card p-4 group">
              <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                {item.q}
                <ArrowRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-sm text-gray-600 mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA finale */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pronto a crescere?</h2>
        <p className="text-gray-600 mb-8">Primiti 10 clienti: -20% per 3 mesi. Offerta scade domenica.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary text-base px-8 py-3">
            Accedi alla beta
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#pricing" className="btn-secondary text-base px-8 py-3">
            Vedi prezzi
          </Link>
        </div>
        <p className="text-xs text-gray-500 mt-4">No credit card required. Cancel anytime.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <div className="max-w-6xl mx-auto px-6 mb-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Social Automation V2</h3>
              <p className="text-xs text-gray-500">6 AI agenti per crescita automatica</p>
            </div>
            <div className="flex gap-4 text-xs">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/servizi" className="text-gray-600 hover:text-gray-900">Services</Link>
              <a href="mailto:support@socialautomation.it" className="text-gray-600 hover:text-gray-900">Support</a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          Next.js 15 · Supabase · n8n · Claude · Blotato · Powered by AI
        </div>
      </footer>
    </div>
  )
}
