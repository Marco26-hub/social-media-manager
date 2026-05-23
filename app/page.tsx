import Link from 'next/link'
import { ArrowRight, Sparkles, Calendar, CheckCircle, Send, Zap, ShieldCheck, Bot } from 'lucide-react'

const PIATTAFORME = [
  {
    nome: 'Instagram',
    icon: '📸',
    formati: ['Post', 'Carousel', 'Reel', 'Story'],
    color: 'from-pink-500 to-purple-600',
    desc: 'Foto, caroselli multi-slide, reel verticali, story 24h',
  },
  {
    nome: 'Facebook',
    icon: '🔵',
    formati: ['Post', 'Carousel', 'Video'],
    color: 'from-blue-500 to-blue-700',
    desc: 'Pagine business, post con CTA, video native',
  },
  {
    nome: 'TikTok',
    icon: '🎵',
    formati: ['Video', 'Reel'],
    color: 'from-gray-800 to-black',
    desc: 'Video verticali 9:16, trending audio, hashtag virali',
  },
  {
    nome: 'Pinterest',
    icon: '📌',
    formati: ['Pin'],
    color: 'from-red-500 to-red-700',
    desc: 'Pin verticali con link prodotto, board categorizzate',
  },
  {
    nome: 'YouTube Shorts',
    icon: '▶️',
    formati: ['Short'],
    color: 'from-red-600 to-red-800',
    desc: 'Video corti verticali, descrizione + tag automatici',
  },
]

const FEATURES = [
  { icon: Bot,         titolo: 'AI genera tutto',        desc: 'Claude scrive hook, caption, hashtag e CTA per ogni post' },
  { icon: Calendar,    titolo: 'Piano settimanale auto', desc: 'Ogni lunedì alle 8:00 genera 7-10 contenuti per i 5 canali' },
  { icon: CheckCircle, titolo: '1-click approval',       desc: 'Approva o rifiuta i post direttamente dal pannello admin' },
  { icon: Send,        titolo: 'Pubblicazione auto',     desc: 'Blotato pubblica sui canali ogni 15 minuti' },
  { icon: ShieldCheck, titolo: '8 validazioni',          desc: 'Stock, media, link, promo, account, consenso, dry-run, retry' },
  { icon: Zap,         titolo: 'Realtime dashboard',     desc: 'Supabase realtime — vedi pubblicazioni e errori live' },
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
            <span className="font-bold text-gray-900">Social Admin</span>
          </div>
          <Link href="/dashboard" className="btn-primary">
            Vai al pannello
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Powered by Claude + Blotato + n8n
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Automazione social<br />
          <span className="text-brand-600">per brand di abbigliamento</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          AI scrive i post. Tu approvi con 1 click. Sistema pubblica automaticamente su 5 canali.
          Senza pensare a niente.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
            Apri pannello admin
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard/calendario" className="btn-secondary text-base px-6 py-3">
            Vedi calendario
          </Link>
        </div>
      </section>

      {/* Piattaforme supportate */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">5 piattaforme supportate</h2>
          <p className="text-gray-600">Crea e pubblica su tutti i canali principali da un unico pannello</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PIATTAFORME.map(p => (
            <div key={p.nome} className="card p-6 group hover:shadow-lg transition-all hover:-translate-y-0.5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                {p.icon}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{p.nome}</h3>
              <p className="text-sm text-gray-500 mb-4">{p.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.formati.map(f => (
                  <span key={f} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Card CTA "altri canali" */}
          <div className="card p-6 border-dashed border-2 border-gray-200 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-4">
              ✨
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-1">Threads, LinkedIn...</h3>
            <p className="text-sm text-gray-500">Disponibili su richiesta Blotato</p>
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
            { step: '1', titolo: 'AI genera piano',       desc: 'Lunedì 08:00 — Claude crea 7-10 post per IG/FB/TikTok/Pinterest/YT',  color: 'bg-purple-100 text-purple-700' },
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

      {/* CTA finale */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Pronto a partire?</h2>
        <p className="text-gray-600 mb-8">Apri il pannello admin e vedi i contenuti da approvare</p>
        <Link href="/dashboard" className="btn-primary text-base px-8 py-3">
          Apri pannello admin
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        Social Automation V2 · Next.js 15 · Supabase · n8n · Claude · Blotato
      </footer>
    </div>
  )
}
