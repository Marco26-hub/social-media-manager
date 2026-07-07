'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PostPreview from '@/components/PostPreview'
import type { Contenuto } from '@/lib/types'
import { Ban, Check, ArrowLeft, LayoutDashboard, ArrowUp } from 'lucide-react'

// La preview mostra il contenuto REALE (il suo canale + formato dal DB), non una
// lista fissa di piattaforme. Così l'anteprima combacia con il calendario.
const CANALE_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', pinterest: 'Pinterest',
  linkedin: 'LinkedIn', youtube_shorts: 'YouTube Shorts', threads: 'Threads', x: 'X', blog: 'Blog',
}
const FORMATO_LABEL: Record<string, string> = {
  post: 'Post', carousel: 'Carosello', reel: 'Reel', story: 'Story', video: 'Video',
  pin: 'Pin', short: 'Short', articolo: 'Articolo',
}

const CANALE_KEYS = new Set(Object.keys(CANALE_LABEL))
const FORMATO_KEYS = new Set(Object.keys(FORMATO_LABEL))

const DEMO_DATA = {
  cliente_nome: 'SILKinCOM',
  hook: 'Il capo che rende elegante anche il look più semplice',
  caption: 'Un blazer leggero, una base pulita e il look è fatto.\nScoprilo ora sul sito.',
  hashtag: '#outfit #moda #fashion #blazer #stileitaliano #ootd',
  cta: 'Scoprilo ora sul sito',
  link_media_1: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
  nome_prodotto: 'Blazer in lino',
  tema: 'Outfit elegante da giorno',
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function jsonTextValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value == null) return null
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function mediaSlotValues(data: Record<string, unknown>): (string | null)[] {
  return Array.from({ length: 10 }, (_, i) => textValue(data[`link_media_${i + 1}`]) || null)
}

function canaleValue(value: unknown): Contenuto['canale'] | null {
  const raw = textValue(value)
  if (!CANALE_KEYS.has(raw)) return null
  return raw as Contenuto['canale']
}

function formatoValue(value: unknown): Contenuto['formato'] | null {
  const raw = textValue(value)
  if (!FORMATO_KEYS.has(raw)) return null
  return raw as Contenuto['formato']
}

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState('')
  const [showTop, setShowTop] = useState(false)
  const [hook, setHook] = useState(DEMO_DATA.hook)
  const [caption, setCaption] = useState(DEMO_DATA.caption)
  const [hashtag, setHashtag] = useState(DEMO_DATA.hashtag)
  const [cta, setCta] = useState(DEMO_DATA.cta)
  const [mediaUrl, setMediaUrl] = useState(DEMO_DATA.link_media_1)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [brandName, setBrandName] = useState(DEMO_DATA.cliente_nome)
  const [socialHandle, setSocialHandle] = useState('')
  const [linkProdotto, setLinkProdotto] = useState('')
  const [canale, setCanale] = useState<Contenuto['canale']>('instagram')
  const [formato, setFormato] = useState<Contenuto['formato']>('post')
  const [mediaSlots, setMediaSlots] = useState<(string | null)[]>([])
  const [nomeProdotto, setNomeProdotto] = useState(DEMO_DATA.nome_prodotto)
  const [tema, setTema] = useState(DEMO_DATA.tema)
  const [note, setNote] = useState('')
  const [scenesJson, setScenesJson] = useState<string | null>(null)
  const [slidesJson, setSlidesJson] = useState<string | null>(null)
  const [overlayText, setOverlayText] = useState<string | null>(null)
  const [altText, setAltText] = useState<string | null>(null)
  const [tags, setTags] = useState<string[] | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [ideaVisual, setIdeaVisual] = useState<string | null>(null)
  const [voiceoverScript, setVoiceoverScript] = useState<string | null>(null)
  const [musicMood, setMusicMood] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])

  // Mostra il bottone "torna su" dopo un po' di scroll.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 1) localStorage: anteprima locale istantanea per chi ha appena generato.
  useEffect(() => {
    if (!id) return
    try {
      const raw = localStorage.getItem(`preview_${id}`)
      if (raw) {
        const d = JSON.parse(raw) as Record<string, unknown>
        if (textValue(d.hook)) setHook(textValue(d.hook))
        if (textValue(d.caption)) setCaption(textValue(d.caption))
        if (textValue(d.hashtag)) setHashtag(textValue(d.hashtag))
        if (textValue(d.cta)) setCta(textValue(d.cta))
        if (textValue(d.link_media_1)) setMediaUrl(textValue(d.link_media_1))
        if (textValue(d.brand_name)) setBrandName(textValue(d.brand_name))
        if (textValue(d.social_handle)) setSocialHandle(textValue(d.social_handle))
        if (textValue(d.link_prodotto_finale)) setLinkProdotto(textValue(d.link_prodotto_finale))
        const localCanale = canaleValue(d.canale)
        const localFormato = formatoValue(d.formato)
        const localMediaSlots = mediaSlotValues(d)
        if (localCanale) setCanale(localCanale)
        if (localFormato) setFormato(localFormato)
        if (localMediaSlots.some(Boolean)) setMediaSlots(localMediaSlots)
        if (textValue(d.nome_prodotto)) setNomeProdotto(textValue(d.nome_prodotto))
        if (textValue(d.tema)) setTema(textValue(d.tema))
        if (textValue(d.note)) setNote(textValue(d.note))
        setScenesJson(jsonTextValue(d.scenes_json))
        setSlidesJson(jsonTextValue(d.slides_json))
        setOverlayText(textValue(d.overlay_text) || null)
        setAltText(textValue(d.alt_text) || null)
        setThumbnailUrl(textValue(d.thumbnail_url) || null)
        setIdeaVisual(textValue(d.idea_visual) || null)
        setVoiceoverScript(textValue(d.voiceover_script) || null)
        setMusicMood(textValue(d.music_mood) || null)
        if (Array.isArray(d.tags)) setTags(d.tags.filter((tag): tag is string => typeof tag === 'string'))
      }
      const exRaw = localStorage.getItem(`preview_${id}_excluded`)
      if (exRaw) setExcluded(new Set(JSON.parse(exRaw)))
    } catch {}
  }, [id])

  // 2) DB: il link condiviso NON porta il localStorage → carica il contenuto REALE
  //    (testi + immagini) dal server. Vince sui dati locali se presente.
  useEffect(() => {
    if (!id) return
    let annullato = false
    fetch(`/api/data/preview?id=${encodeURIComponent(id)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: Record<string, unknown> | null) => {
        if (!d || annullato) return
        const s = textValue
        // Contenuto REALE trovato → è la fonte di verità: sovrascrive i dati demo,
        // ANCHE quando un campo è vuoto (es. nessuna foto → mostra placeholder, non
        // l'immagine demo finta). Prima il ripiego demo restava se il reale era vuoto.
        setHook(s(d.hook))
        setCaption(s(d.caption))
        setHashtag(s(d.hashtag))
        setCta(s(d.cta))
        setMediaUrl(s(d.link_media_1))
        if (s(d.brand_name)) setBrandName(s(d.brand_name))
        if (s(d.social_handle)) setSocialHandle(s(d.social_handle))
        const dbCanale = canaleValue(d.canale)
        const dbFormato = formatoValue(d.formato)
        if (dbCanale) setCanale(dbCanale)
        if (dbFormato) setFormato(dbFormato)
        setMediaSlots(mediaSlotValues(d))
        setLinkProdotto(s(d.link_prodotto_finale) || s(d.link_prodotto))
        setNomeProdotto(s(d.nome_prodotto))
        setTema(s(d.tema))
        setNote(s(d.note))
        setScenesJson(jsonTextValue(d.scenes_json))
        setSlidesJson(jsonTextValue(d.slides_json))
        setOverlayText(s(d.overlay_text) || null)
        setAltText(s(d.alt_text) || null)
        setThumbnailUrl(s(d.thumbnail_url) || null)
        setIdeaVisual(s(d.idea_visual) || null)
        setVoiceoverScript(s(d.voiceover_script) || null)
        setMusicMood(s(d.music_mood) || null)
        if (Array.isArray(d.tags)) setTags(d.tags.filter((tag): tag is string => typeof tag === 'string'))
      })
      .catch(() => {})
    return () => { annullato = true }
  }, [id])

  function toggleExclude(key: string) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try { localStorage.setItem(`preview_${id}_excluded`, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const platforms = [{ canale, formato, label: `${CANALE_LABEL[canale] || canale} ${FORMATO_LABEL[formato] || formato}` }]
  const excludedCount = excluded.size
  const publishableCount = platforms.length - excludedCount
  const resolvedMediaSlots = Array.from({ length: 10 }, (_, index) => (
    mediaSlots[index] || (index === 0 ? mediaUrl : null) || null
  ))

  const baseContenuto: Contenuto = {
    id, cliente_id: '', id_contenuto: id,
    data_pubblicazione: '', ora_pubblicazione: '',
    canale, formato,
    hook, caption, hashtag, cta,
    link_media_1: resolvedMediaSlots[0], link_media_2: resolvedMediaSlots[1], link_media_3: resolvedMediaSlots[2],
    link_media_4: resolvedMediaSlots[3], link_media_5: resolvedMediaSlots[4], link_media_6: resolvedMediaSlots[5], link_media_7: resolvedMediaSlots[6],
    link_media_8: resolvedMediaSlots[7], link_media_9: resolvedMediaSlots[8], link_media_10: resolvedMediaSlots[9],
    nome_prodotto: nomeProdotto || null, tema: tema || null,
    obiettivo: null, product_id: null,
    link_prodotto: null, link_prodotto_finale: linkProdotto || null,
    status: 'DA_APPROVARE', media_type: 'image', retry_count: 0,
    approvato_da: null, data_approvazione: null,
    blotato_post_id: null, blotato_scheduled_at: null,
    blotato_status: null, blotato_post_url: null, blotato_sync_at: null,
    errore: null, note: note || null,
    platform_account_id: null, publish_lock_id: null,
    media_validato: null,
    last_retry_at: null, errore_tecnico: null,
    checked_copy: null, checked_media: null, checked_link: null, checked_price: null,
    checked_by: null, checked_at: null,
    utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null,
    promo_id: null, promo_codice: null, promo_validata: null,
    fonte_media: null, consenso_utilizzo: null,
    scenes_json: scenesJson, slides_json: slidesJson, overlay_text: overlayText,
    alt_text: altText, tags, thumbnail_url: thumbnailUrl,
    idea_visual: ideaVisual, voiceover_script: voiceoverScript, music_mood: musicMood,
    checked_alt_text: null, checked_aspect_ratio: null, checked_media_valid: null,
    created_at: '', updated_at: '',
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Navigazione: indietro + calendario */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => router.back()} className="btn-secondary py-1.5 px-3 text-sm inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Indietro
          </button>
          <button onClick={() => router.push('/dashboard/calendario')} className="btn-secondary py-1.5 px-3 text-sm inline-flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4" /> Calendario
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Anteprima Contenuto</h1>
          <p className="text-sm text-gray-500 mt-1">{platforms[0]?.label} · come apparirà una volta pubblicato</p>
        </div>

        {/* Form inputs per modificare il contenuto in tempo reale */}
        <div className="card p-4 mb-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Modifica contenuto</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400">Hook</label>
              <input value={hook} onChange={e => setHook(e.target.value)} className="input text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">CTA</label>
              <input value={cta} onChange={e => setCta(e.target.value)} className="input text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">Handle social (opzionale, sovrascrive default)</label>
              <input value={socialHandle} onChange={e => setSocialHandle(e.target.value)} placeholder={`derivato da "${brandName}"`} className="input text-xs mt-0.5" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-gray-400">Caption</label>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} className="input text-xs mt-0.5 h-16 resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-gray-400">Hashtag</label>
              <input value={hashtag} onChange={e => setHashtag(e.target.value)} className="input text-xs mt-0.5" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] text-gray-400">URL Media</label>
              <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="input text-xs mt-0.5" />
            </div>
          </div>
        </div>

        {/* Condividi link */}
        <div className="card p-4 mb-6 max-w-3xl mx-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-indigo-100">
          <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5"> Condividi anteprima con il cliente</p>
          <div className="flex flex-wrap gap-2">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`📱 Anteprima contenuto per ${DEMO_DATA.cliente_nome}\n\nHook: ${hook}\n\n${typeof window !== 'undefined' ? window.location.href : ''}\n\n---\nSocial Automation V2`)}`}
              target="_blank" rel="noopener"
              className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white text-xs font-medium rounded-full hover:bg-green-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`📱 Anteprima contenuto: ${hook}`)}`}
              target="_blank" rel="noopener"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram
            </a>

            {/* Email */}
            <a
              href={`mailto:?subject=${encodeURIComponent(`Anteprima contenuto - ${DEMO_DATA.cliente_nome}`)}&body=${encodeURIComponent(`Ciao,\n\nti inviamo l'anteprima del contenuto per ${DEMO_DATA.cliente_nome}.\n\nHook: ${hook}\n\nLink: ${typeof window !== 'undefined' ? window.location.href : ''}\n\n---\nSocial Automation V2`)}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white text-xs font-medium rounded-full hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
              Email
            </a>

            {/* Copia link */}
            <button
              onClick={() => navigator.clipboard?.writeText(typeof window !== 'undefined' ? window.location.href : '')}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-xs font-medium rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copia link
            </button>
          </div>
        </div>

        {/* Anteprima del contenuto reale (canale + formato dal DB) */}
        <div className={platforms.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex justify-center'}>
          {platforms.map(({ canale, formato, label }) => {
            const key = `${canale}-${formato}`
            const isExcluded = excluded.has(key)
            const c: Contenuto = {
              ...baseContenuto,
              canale,
              formato,
              link_media_1: resolvedMediaSlots[0],
            }
            return (
              <div
                key={key}
                className={`card p-3 transition-all relative w-full max-w-sm ${isExcluded ? 'opacity-40 border-red-300' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
                  <label className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => toggleExclude(key)}
                      className="sr-only peer"
                    />
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${
                      isExcluded
                        ? 'bg-red-100 text-red-600 peer-checked:bg-red-500 peer-checked:text-white'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }`}>
                      {isExcluded ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {isExcluded ? 'Escluso' : 'Includi'}
                    </span>
                  </label>
                </div>
                <PostPreview c={c} brand={{ brand_name: brandName, social_handle: socialHandle || null }} />
                {isExcluded && (
                  <div className="absolute inset-0 bg-red-50/30 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      NON SARÀ PUBBLICATO
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Riepilogo pubblicazione */}
        <div className="card p-4 mt-6 max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-gray-700 font-medium">{publishableCount} da pubblicare</span>
            </div>
            {excludedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-sm text-gray-500">{excludedCount} esclusi</span>
              </div>
            )}
          </div>
          <button
            onClick={() => { setExcluded(new Set()); try { localStorage.removeItem(`preview_${id}_excluded`) } catch {} }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Ripristina tutti
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6">
          Anteprima in tempo reale · Modifica i campi sopra per vedere le modifiche · Seleziona quali piattaforme escludere
        </p>
      </div>

      {/* Torna su — flottante, appare dopo lo scroll */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Torna su"
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
