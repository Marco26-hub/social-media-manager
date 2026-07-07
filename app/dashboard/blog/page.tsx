'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { PenLine, Search, ListTree, FileText, HelpCircle, Tag, Loader2, CheckCircle2, Sparkles, AlertCircle, Clock, Cloud, Image as ImageIcon, X } from 'lucide-react'
import { readClienteId } from '@/lib/use-data'
import { readApiError } from '@/lib/ai-client'
import BlogArticlesList from '@/components/BlogArticlesList'

type Step = { name: string; label: string; ok: boolean; detail?: string }
type Article = {
  slug: string; meta_title: string; meta_description: string; h1: string; intro: string
  sezioni: { h2: string; paragrafi: string[]; lista_punti?: string[] }[]
  faq: { domanda: string; risposta: string }[]
  cta_finale: string; keywords_target: string[]; tempo_lettura_min: number
  immagine_cover?: string | null
}

// I 5 passi spiegati in parole semplici (mostrati prima e durante).
const PASSI = [
  { icon: Search,   t: 'Trovo le parole chiave', d: 'Cosa cercano le persone su Google e ChatGPT' },
  { icon: ListTree, t: 'Preparo la scaletta',     d: 'Titoli e struttura dell\'articolo' },
  { icon: FileText, t: 'Scrivo sezione per sezione', d: 'Ogni parte curata singolarmente' },
  { icon: HelpCircle, t: 'Aggiungo le FAQ',        d: 'Domande e risposte (ottime per le AI)' },
  { icon: Tag,      t: 'Ottimizzo titolo e meta', d: 'Per farti trovare sui motori di ricerca' },
]

export default function BlogPage() {
  const [tema, setTema] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [article, setArticle] = useState<Article | null>(null)
  const [genBy, setGenBy] = useState('')
  const [error, setError] = useState('')
  const [localEnv, setLocalEnv] = useState<boolean | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [cover, setCover] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  async function uploadCover(file: File) {
    setUploadingCover(true); setError('')
    try {
      const fd = new FormData()
      fd.append('cliente_id', readClienteId() || '')
      fd.append('files', file)
      const r = await fetch('/api/assets/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Upload immagine fallito'); return }
      setCover(d.assets?.[0]?.url || '')
    } catch { setError('Errore upload immagine') }
    finally { setUploadingCover(false) }
  }

  // Questa pagina usa l'AI LOCALE (sul Mac). Su cloud va segnalato chiaramente.
  useEffect(() => {
    fetch('/api/system/local/ollama')
      .then(r => r.json())
      .then(d => setLocalEnv(d.localEnv === true))
      .catch(() => setLocalEnv(false))
  }, [])

  async function genera() {
    if (!tema.trim()) { setError('Scrivi prima di cosa parla l\'articolo.'); return }
    setLoading(true); setError(''); setArticle(null); setSteps([])
    try {
      const res = await fetch('/api/generate/blog-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: readClienteId(), tema: tema.trim(), model: 'ollama/gemma4:e4b', cover_image: cover.trim() || null }),
      })
      if (!res.ok) { setError(await readApiError(res, 'Generazione non riuscita')); return }
      const data = await res.json()
      setSteps(data.steps || [])
      setArticle(data.article || null)
      setGenBy(data.generated_by || 'AI locale')
      setReloadKey(k => k + 1) // ricarica la lista articoli col nuovo pezzo
    } catch {
      setError('Errore di rete. Verifica che la tua AI locale sia accesa (Centro di Controllo).')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Intestazione */}
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <PenLine className="w-7 h-7 text-brand-600" /> Scrivi un articolo per il blog
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          La tua <strong>AI locale</strong> scrive un articolo SEO completo — <span className="text-green-700 font-medium">gratis, privato, sul tuo Mac</span>. Nessun costo, nessuna chiave.
        </p>
      </div>

      {/* Avviso ambiente cloud: questa funzione richiede l'AI locale */}
      {localEnv === false && (
        <div className="card p-4 mb-6 bg-amber-50 border-amber-200 flex items-start gap-3">
          <Cloud className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Sei sulla versione cloud</p>
            <p className="text-xs mt-0.5">La scrittura blog locale (gratis) gira solo sulla <strong>tua installazione sul Mac</strong> con Ollama. Su questo server cloud usa la generazione contenuti con un modello cloud, oppure apri l&apos;app in locale.</p>
          </div>
        </div>
      )}

      {/* Come funziona — 5 passi */}
      <div className="card p-4 md:p-5 mb-6 bg-gradient-to-br from-white to-gray-50">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mb-3">Come funziona — 5 passi automatici</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {PASSI.map((p, i) => {
            const done = steps[i]?.ok
            const active = loading && steps.length === i
            return (
              <div key={p.t} className={`rounded-lg border p-2.5 text-center ${done ? 'border-green-300 bg-green-50' : active ? 'border-brand-300 bg-brand-50' : 'border-gray-150 bg-white'}`}>
                <div className="flex justify-center mb-1.5">
                  {done ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : active ? <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                    : <p.icon className="w-5 h-5 text-gray-400" />}
                </div>
                <p className="text-[11px] font-semibold text-gray-800 leading-tight">{p.t}</p>
                <p className="text-[9px] text-gray-400 mt-0.5 leading-tight hidden sm:block">{p.d}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Input tema */}
      <div className="card p-4 md:p-5 mb-6">
        <label className="block text-sm font-semibold text-gray-800 mb-1">Di cosa parla l&apos;articolo?</label>
        <p className="text-xs text-gray-500 mb-2">Scrivi l&apos;argomento in parole tue. Esempio: &ldquo;come abbinare un foulard di seta in estate&rdquo;.</p>
        <textarea
          value={tema}
          onChange={e => setTema(e.target.value)}
          placeholder="Es: i vantaggi della seta di Como per le sciarpe di lusso"
          className="input w-full min-h-[80px] resize-y"
          disabled={loading}
        />

        {/* Immagine di copertina (opzionale) — upload o URL */}
        <div className="mt-3">
          <label className="block text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /> Immagine di copertina <span className="text-xs text-gray-400 font-normal">(opzionale)</span>
          </label>
          {cover ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="copertina" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
              <button onClick={() => setCover('')} className="btn-secondary text-xs py-1 px-2" disabled={loading}>
                <X className="w-3 h-3" /> Rimuovi
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <label className={`btn-secondary text-xs py-2 px-3 justify-center cursor-pointer ${uploadingCover ? 'opacity-50' : ''}`}>
                {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                {uploadingCover ? 'Carico…' : 'Carica immagine'}
                <input type="file" accept="image/*" className="hidden" disabled={loading || uploadingCover}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }} />
              </label>
              <input type="url" value={cover} onChange={e => setCover(e.target.value)} disabled={loading}
                placeholder="…oppure incolla un URL immagine" className="input flex-1 text-sm" />
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-1">Diventa la copertina dell&apos;articolo (in cima + nei dati SEO).</p>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Tempo stimato: 1-3 minuti
          </span>
          <button onClick={genera} disabled={loading || localEnv === false} className="btn-primary disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sto scrivendo…</> : <><PenLine className="w-4 h-4" /> Scrivi l&apos;articolo</>}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded-lg p-2.5 text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}
        {loading && (
          <p className="text-[11px] text-gray-400 mt-2">Sto lavorando in locale, sezione per sezione. Non chiudere la pagina.</p>
        )}
      </div>

      {/* Risultato */}
      {article && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5" />
            <span>Articolo pronto e salvato in <strong>Blog</strong> + <strong>Calendario</strong> (DA_APPROVARE). Scritto da {genBy}.</span>
          </div>

          {/* Scheda SEO */}
          <div className="card p-4 md:p-5">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mb-3">Ottimizzazione SEO</p>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-400 text-xs">Titolo (title tag)</span><p className="font-medium text-gray-900">{article.meta_title} <span className="text-[10px] text-gray-400">({article.meta_title.length} car.)</span></p></div>
              <div><span className="text-gray-400 text-xs">Descrizione (meta description)</span><p className="text-gray-700">{article.meta_description} <span className="text-[10px] text-gray-400">({article.meta_description.length} car.)</span></p></div>
              <div><span className="text-gray-400 text-xs">Indirizzo pagina (slug)</span><p className="text-gray-700 font-mono text-xs">/{article.slug}</p></div>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.tempo_lettura_min} min lettura</span>
                <div className="flex flex-wrap gap-1">
                  {article.keywords_target.slice(0, 6).map(k => (
                    <span key={k} className="text-[10px] px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full border border-brand-100">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Anteprima articolo */}
          <article className="card p-5 md:p-7 prose-sm max-w-none">
            {article.immagine_cover && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={article.immagine_cover} alt={article.h1} className="w-full h-48 md:h-64 object-cover rounded-xl mb-4" />
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{article.h1}</h1>
            <p className="text-gray-700 mb-4 leading-relaxed">{article.intro}</p>
            {article.sezioni.map((s, i) => (
              <div key={i} className="mb-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2">{s.h2}</h2>
                {s.paragrafi.map((p, j) => <p key={j} className="text-gray-700 mb-2 leading-relaxed">{p}</p>)}
                {s.lista_punti && (
                  <ul className="list-disc pl-5 text-gray-700 space-y-1">{s.lista_punti.map((li, k) => <li key={k}>{li}</li>)}</ul>
                )}
              </div>
            ))}
            {article.faq.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Domande frequenti</h2>
                {article.faq.map((f, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-semibold text-gray-800">{f.domanda}</p>
                    <p className="text-gray-700">{f.risposta}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-5 text-brand-700 font-medium">{article.cta_finale}</p>
          </article>
        </div>
      )}

      {/* Libreria articoli: pubblica sul sito o esporta per Shopify/CMS */}
      <div className="mt-6">
        <BlogArticlesList reloadKey={reloadKey} />
      </div>
    </div>
  )
}
