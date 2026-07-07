'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Pause, Volume2, Link2, ChevronLeft, ChevronRight, Music2 } from 'lucide-react'
import type { Contenuto } from '@/lib/types'
import { resolveHandle } from '@/lib/social-handle'

// Reel/short/tiktok: se link_media_1 punta a un video vero (mp4/webm/mov) lo
// renderizziamo con <video autoplay muted loop>. Se invece sono solo immagini
// (comune: il video finale non è stato ancora composto), le facciamo scorrere
// automaticamente come slideshow — così il cliente capisce che tutte le foto
// caricate andranno nel reel finale.
function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const clean = url.split('?')[0].toLowerCase()
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.m4v')
}

type VisualItem = Record<string, unknown>

function isVisualItem(value: unknown): value is VisualItem {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseVisualItems(value: unknown): VisualItem[] {
  if (!value) return []
  let raw: unknown = value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      raw = JSON.parse(trimmed)
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw.filter(isVisualItem)
  if (!isVisualItem(raw)) return []
  for (const key of ['slides', 'immagini', 'scene', 'scenes', 'frames', 'sezioni']) {
    if (Array.isArray(raw[key])) return raw[key].filter(isVisualItem)
  }
  return [raw]
}

function itemText(item: VisualItem | undefined, keys: string[]): string {
  if (!item) return ''
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value)) {
      const text = value.filter(part => typeof part === 'string' && part.trim()).join(' ')
      if (text) return text
    }
  }
  return ''
}

function mediaUrls(c: Contenuto): string[] {
  return [
    c.link_media_1, c.link_media_2, c.link_media_3, c.link_media_4, c.link_media_5,
    c.link_media_6, c.link_media_7, c.link_media_8, c.link_media_9, c.link_media_10,
  ].filter(Boolean) as string[]
}

function VisualBriefCard({ icon, title, description, accent = 'from-gray-700 to-gray-950' }: {
  icon: string
  title: string
  description?: string | null
  accent?: string
}) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${accent} flex flex-col items-center justify-center text-center text-white p-5`}>
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm font-bold leading-tight line-clamp-3">{title}</p>
      {description && <p className="text-[11px] text-white/75 mt-2 leading-snug line-clamp-4">{description}</p>}
    </div>
  )
}

function ReelPlayer({ imgs, storyboard, handle, caption, hook, hashtag, aspect, canale, formato, canaleIcon }: {
  imgs: string[]
  storyboard?: VisualItem[]
  handle: string
  caption: string | null | undefined
  hook: string | null | undefined
  hashtag: string | null | undefined
  aspect: string
  canale: string
  formato: string
  canaleIcon: string
}) {
  const videoUrl = useMemo(() => imgs.find(isVideoUrl), [imgs])
  const stills = useMemo(() => imgs.filter(u => !isVideoUrl(u)), [imgs])
  const frames = storyboard ?? []
  const total = Math.max(1, stills.length || frames.length)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const PER_SLIDE_MS = 2600

  // Slideshow autoplay per multipli still (mock reel). Il video vero non serve
  // slideshow — lo gestisce l'elemento <video> con loop.
  useEffect(() => {
    if (videoUrl || total < 2 || !playing) return
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const p = (elapsed % PER_SLIDE_MS) / PER_SLIDE_MS
      setProgress(p)
      if (elapsed > 0 && Math.floor(elapsed / PER_SLIDE_MS) !== Math.floor((elapsed - 60) / PER_SLIDE_MS)) {
        setIndex(i => (i + 1) % total)
      }
    }, 60)
    return () => clearInterval(tick)
  }, [videoUrl, total, playing, index])

  const currentStill = stills[index]
  const currentFrame = currentStill ? undefined : frames[index]
  const currentFrameTitle = itemText(currentFrame, ['overlay_testo', 'testo_overlay', 'testo', 'hook', 'titolo', 'h2'])
  const currentFrameDescription = itemText(currentFrame, ['descrizione', 'visual', 'descrizione_visiva', 'immagine_descrizione', 'parlato', 'audio'])
  const playerLabel = formato === 'short' ? 'Short' : formato === 'video' ? 'Video' : 'Reel'

  return (
    <div className="max-w-[280px] mx-auto">
      <div className={`relative ${aspect} bg-black rounded-2xl overflow-hidden shadow-xl`}>
        {/* Media principale */}
        {videoUrl ? (
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={stills[0]}
          />
        ) : currentStill ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentStill} alt="" className="w-full h-full object-cover transition-opacity duration-300" />
        ) : currentFrame ? (
          <VisualBriefCard
            icon={canaleIcon}
            title={currentFrameTitle || hook || playerLabel}
            description={currentFrameDescription || caption}
            accent="from-slate-800 via-gray-900 to-black"
          />
        ) : (
          <VisualBriefCard icon={canaleIcon} title={hook || playerLabel} description={caption} />
        )}

        {/* Progress bar segmentata (IG stories/reels style) */}
        {total > 1 && !videoUrl && (
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-[width] duration-100 ease-linear"
                  style={{ width: i < index ? '100%' : i === index ? `${Math.round(progress * 100)}%` : '0%' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Overlay gradient + top bar */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70 pointer-events-none" />
        <div className={`absolute ${total > 1 && !videoUrl ? 'top-5' : 'top-3'} left-3 right-3 flex items-center justify-between text-white text-xs z-10`}>
          <span className="font-semibold drop-shadow">{handle}</span>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 drop-shadow" />
            <span className="text-[10px] uppercase tracking-wide font-bold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
              {videoUrl ? 'Video' : playerLabel}
            </span>
          </div>
        </div>

        {/* Play/pause centrale (solo per slideshow still) */}
        {!videoUrl && total > 1 && (
          <button
            type="button"
            onClick={() => setPlaying(p => !p)}
            aria-label={playing ? 'Pausa' : 'Riproduci'}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity z-10"
          >
            <span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white">
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
            </span>
          </button>
        )}

        {/* Solo 1 still e nessun video: badge chiaro che è anteprima statica */}
        {!videoUrl && total === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-16 h-16 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white shadow-2xl">
              <Play className="w-7 h-7 translate-x-0.5" />
            </span>
          </div>
        )}

        {/* Caption sovrapposta in fondo */}
        <div className="absolute bottom-3 left-3 right-12 text-white text-xs z-10">
          <p className="font-semibold mb-1 drop-shadow">{handle}</p>
          <p className="line-clamp-3 leading-snug drop-shadow">{caption ?? hook ?? currentFrameTitle}</p>
          {hashtag && <p className="text-[10px] opacity-90 mt-1 truncate drop-shadow">{hashtag}</p>}
          <p className="text-[10px] mt-1.5 flex items-center gap-1 opacity-90">
            <Music2 className="w-3 h-3" /> audio originale · {handle}
          </p>
        </div>

        {/* Sidebar azioni */}
        <div className="absolute right-2 bottom-24 flex flex-col gap-3.5 items-center text-white z-10">
          <div className="flex flex-col items-center">
            <Heart className="w-6 h-6 drop-shadow" />
            <span className="text-[9px] font-semibold mt-0.5 drop-shadow">1.2K</span>
          </div>
          <div className="flex flex-col items-center">
            <MessageCircle className="w-6 h-6 drop-shadow" />
            <span className="text-[9px] font-semibold mt-0.5 drop-shadow">48</span>
          </div>
          <div className="flex flex-col items-center">
            <Send className="w-6 h-6 drop-shadow" />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">
        Preview {canale} · {formato}
        {!videoUrl && total > 1 && ` · ${total} scene`}
        {!videoUrl && total === 1 && ' · anteprima statica'}
      </p>
    </div>
  )
}

// Galleria carosello IG-style: swipe orizzontale + frecce cliccabili +
// contatore "1/N" in alto + dots indicator centrati sotto le azioni.
// Prima l'utente non capiva ci fossero altre foto (nascoste dallo scroll).
function CarouselGallery({ imgs, canale }: { imgs: string[]; canale: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  function onScroll() {
    const el = scrollerRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }

  function goTo(i: number) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {imgs.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="w-full h-full object-cover flex-shrink-0 snap-center" />
        ))}
      </div>

      {/* Contatore "1/3" in alto a destra — chiaro subito che il post ha più foto */}
      <div className="absolute top-2 right-2 bg-black/65 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
        {index + 1}/{imgs.length}
      </div>

      {/* Freccia sinistra (nascosta sulla prima slide) */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Foto precedente"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 text-gray-800 flex items-center justify-center shadow-md hover:bg-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Freccia destra (nascosta sull'ultima) */}
      {index < imgs.length - 1 && (
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Foto successiva"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 text-gray-800 flex items-center justify-center shadow-md hover:bg-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Dots in basso centrati (stile IG) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
        {imgs.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Vai a foto ${i + 1}`}
            className={`transition-all rounded-full ${
              i === index ? 'w-1.5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/55'
            }`}
          />
        ))}
      </div>

      {/* Fallback icona canale se non ci sono immagini (mai qui, ma per safety) */}
      {imgs.length === 0 && (
        <div className="w-full h-full flex items-center justify-center text-5xl">{CANALE_ICON[canale]}</div>
      )}
    </>
  )
}

function StructuredCarouselGallery({ items, canale }: { items: VisualItem[]; canale: string }) {
  const slides = items.length ? items : [{}]
  return (
    <div className="flex h-full overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {slides.map((item, index) => {
        const title = itemText(item, ['testo', 'titolo', 'didascalia', 'hook', 'h2']) || `Slide ${index + 1}`
        const description = itemText(item, ['visual', 'descrizione_visiva', 'immagine_descrizione', 'descrizione', 'paragrafi'])
        return (
          <div key={index} className="w-full h-full flex-shrink-0 snap-center">
            <VisualBriefCard
              icon={CANALE_ICON[canale] || '📸'}
              title={title}
              description={description}
              accent="from-indigo-600 via-purple-700 to-slate-950"
            />
          </div>
        )
      })}
      {slides.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/65 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {slides.length} slide
        </div>
      )}
    </div>
  )
}

type BrandHandleInfo = { brand_name?: string | null; social_handle?: string | null; sito_url?: string | null } | null

// Testo sticker link stile IG: dominio nudo maiuscolo ("https://silkincom.com/x" -> "SILKINCOM.COM")
function domainLabel(url: string): string {
  try {
    const host = new URL(url.includes('://') ? url : `https://${url}`).hostname
    return host.replace(/^www\./, '').toUpperCase()
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').toUpperCase()
  }
}

const CANALE_ICON: Record<string, string> = {
  instagram: '📸', facebook: '🔵', tiktok: '🎵', pinterest: '📌', youtube_shorts: '▶️',
  linkedin: '💼', threads: '🧵', x: '✖️', blog: '✍️',
}

// Aspect ratios standard per canale/formato
const ASPECT: Record<string, string> = {
  'instagram-post':      'aspect-square',       // 1:1
  'instagram-carousel':  'aspect-square',       // 1:1
  'instagram-reel':      'aspect-[9/16]',       // 9:16
  'instagram-story':     'aspect-[9/16]',       // 9:16
  'facebook-post':       'aspect-[1.91/1]',     // landscape
  'facebook-carousel':   'aspect-square',
  'facebook-video':      'aspect-video',        // 16:9
  'facebook-reel':       'aspect-[9/16]',       // 9:16
  'tiktok-video':        'aspect-[9/16]',
  'tiktok-reel':         'aspect-[9/16]',
  'pinterest-pin':       'aspect-[2/3]',        // 2:3 pin
  'youtube_shorts-short':'aspect-[9/16]',
  'linkedin-post':       'aspect-square',       // 1:1
  'linkedin-articolo':   'aspect-video',        // 16:9
  'blog-articolo':       'aspect-video',        // 16:9
  'threads-post':        'aspect-square',       // 1:1
  'threads-reel':        'aspect-[9/16]',       // 9:16
  'x-post':              'aspect-video',        // 16:9
  'x-video':             'aspect-video',        // 16:9
}

export default function PostPreview({ c, brand }: { c: Contenuto; brand?: BrandHandleInfo }) {
  const key = `${c.canale}-${c.formato}`
  const aspect = ASPECT[key] ?? 'aspect-square'
  const handle = resolveHandle(c.canale, brand)
  const linkUrl = c.link_prodotto_finale || c.link_prodotto || brand?.sito_url || ''
  const media = mediaUrls(c)
  const slideItems = parseVisualItems(c.slides_json)
  const sceneItems = parseVisualItems(c.scenes_json)
  const fallbackVisualTitle = c.overlay_text || c.hook || c.idea_visual || c.nome_prodotto || `${c.canale} ${c.formato}`
  const fallbackVisualDescription = c.idea_visual || c.alt_text || c.caption

  // Layout Instagram Story — verticale con progress bar + stickers
  if (c.formato === 'story') {
    return (
      <div className="max-w-[260px] mx-auto">
        <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-xl">
          {c.link_media_1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.link_media_1} alt="" className="w-full h-full object-cover" />
          ) : sceneItems[0] || slideItems[0] ? (
            <VisualBriefCard
              icon={CANALE_ICON[c.canale] || '📸'}
              title={itemText(sceneItems[0] || slideItems[0], ['hook', 'overlay_testo', 'testo_overlay', 'testo']) || fallbackVisualTitle}
              description={itemText(sceneItems[0] || slideItems[0], ['immagine_descrizione', 'descrizione', 'visual']) || fallbackVisualDescription}
              accent="from-pink-600 via-purple-700 to-slate-950"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-700 flex items-center justify-center text-5xl">📸</div>
          )}
          {/* Progress bar */}
          <div className="absolute top-2 left-2 right-2 flex gap-1">
            {[1,2,3].map(i => (
              <div key={i} className={`flex-1 h-0.5 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
          {/* Profile header */}
          <div className="absolute top-5 left-3 right-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs">📸</div>
            </div>
            <span className="text-white text-xs font-semibold">{handle}</span>
            <span className="text-white/60 text-[10px]">2h</span>
          </div>
          {/* Sticker hook */}
          {c.hook && (
            <div className="absolute top-1/3 left-3 right-3">
              <div className="bg-white text-black text-sm font-bold p-3 rounded-lg shadow-lg leading-tight transform -rotate-2">
                {c.hook}
              </div>
            </div>
          )}
          {/* Sticker link cliccabile (nativo IG, nessuna soglia follower dal 2023) */}
          {linkUrl ? (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center">
              <div className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                <Link2 className="w-3.5 h-3.5" />
                {domainLabel(linkUrl)}
              </div>
            </div>
          ) : c.cta && (
            <div className="absolute bottom-16 left-0 right-0 text-center">
              <div className="inline-flex flex-col items-center text-white">
                <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-xs">↑</span>
                </div>
                <span className="text-xs font-semibold mt-1">{c.cta}</span>
              </div>
            </div>
          )}
          {/* Reply input */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
            <div className="border border-white/40 rounded-full px-3 py-1.5 text-white/70 text-xs">
              Invia messaggio...
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Preview {c.canale} story</p>
      </div>
    )
  }

  // Layout Blog articolo
  if (c.canale === 'blog' || c.formato === 'articolo') {
    const articleLabel = c.canale === 'linkedin' ? 'LinkedIn' : 'Blog'
    const articleAccent = c.canale === 'linkedin' ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50'
    return (
      <div className="max-w-[380px] mx-auto bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
        {c.link_media_1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.link_media_1} alt="" className="w-full aspect-[16/9] object-cover" />
        ) : (
          <div className="aspect-video">
            <VisualBriefCard
              icon={CANALE_ICON[c.canale] || '✍️'}
              title={c.hook || c.nome_prodotto || 'Articolo'}
              description={c.idea_visual || c.caption}
              accent={c.canale === 'linkedin' ? 'from-blue-700 via-sky-800 to-slate-950' : 'from-amber-600 via-orange-700 to-slate-950'}
            />
          </div>
        )}
        <div className="p-4">
          <p className={`inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold mb-1.5 ${articleAccent}`}>
            {articleLabel} · {c.tema || 'Articolo'}
          </p>
          <h2 className="font-bold text-gray-900 leading-snug mb-2">{c.hook || 'Titolo articolo'}</h2>
          <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{c.caption}</p>
          {c.hashtag && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {c.hashtag.split(' ').slice(0, 4).map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
            <span>{c.note || 'Brand Editorial'}</span>
            <span>~4 min lettura</span>
          </div>
          {c.cta && (
            <button className="w-full mt-3 text-xs font-semibold py-2 bg-amber-600 text-white rounded-lg">
              {c.cta}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Layout Video/Reel/Short — player video reale o storyboard/slide quando il video non è ancora composto.
  if (c.formato === 'reel' || c.formato === 'short' || c.formato === 'video' || c.canale === 'tiktok') {
    return (
      <ReelPlayer
        imgs={media}
        storyboard={sceneItems.length ? sceneItems : slideItems}
        handle={handle}
        caption={c.caption}
        hook={c.hook}
        hashtag={c.hashtag}
        aspect={aspect}
        canale={c.canale}
        formato={c.formato}
        canaleIcon={CANALE_ICON[c.canale] || '📸'}
      />
    )
  }

  // Layout Pinterest pin
  if (c.canale === 'pinterest') {
    return (
      <div className="max-w-[260px] mx-auto">
        <div className={`${aspect} bg-gray-100 rounded-2xl overflow-hidden shadow-lg relative`}>
          {c.link_media_1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.link_media_1} alt="" className="w-full h-full object-cover" />
          ) : (
            <VisualBriefCard icon="📌" title={fallbackVisualTitle} description={fallbackVisualDescription} accent="from-red-600 via-rose-700 to-slate-950" />
          )}
          <button className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            Salva
          </button>
        </div>
        <div className="mt-2 px-1">
          <p className="text-sm font-semibold text-gray-900 line-clamp-2">{c.hook}</p>
          <p className="text-xs text-gray-500 mt-1">{handle}</p>
        </div>
      </div>
    )
  }

  // Layout Instagram/Facebook post
  const isFB = c.canale === 'facebook'
  return (
    <div className={`max-w-[360px] mx-auto rounded-xl overflow-hidden shadow-lg ${isFB ? 'bg-white border border-gray-200' : 'bg-white border border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${isFB ? 'bg-blue-600' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'} p-0.5`}>
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs">
              {CANALE_ICON[c.canale]}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{handle}</p>
            <p className="text-[10px] text-gray-400">Sponsorizzato · {c.canale}</p>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-400" />
      </div>

      {/* Media */}
      <div className={`${aspect} bg-gray-100 relative`}>
        {c.formato === 'carousel' ? (() => {
          if (!media.length && slideItems.length) return <StructuredCarouselGallery items={slideItems} canale={c.canale} />
          if (!media.length) return <VisualBriefCard icon={CANALE_ICON[c.canale] || '📸'} title={fallbackVisualTitle} description={fallbackVisualDescription} />
          const imgs = media
          return <CarouselGallery imgs={imgs} canale={c.canale} />
        })() : c.link_media_1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.link_media_1} alt="" className="w-full h-full object-cover" />
        ) : (
          <VisualBriefCard icon={CANALE_ICON[c.canale] || '📸'} title={fallbackVisualTitle} description={fallbackVisualDescription} />
        )}
      </div>

      {/* Azioni IG-style */}
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-3">
        <Heart className="w-5 h-5" />
        <MessageCircle className="w-5 h-5" />
        <Send className="w-5 h-5" />
        <Bookmark className="w-5 h-5 ml-auto" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-xs text-gray-900">
          <span className="font-semibold mr-1">{handle}</span>
          <span className="font-medium">{c.hook}</span>
        </p>
        {c.caption && (
          <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap line-clamp-4">{c.caption}</p>
        )}
        {c.hashtag && (
          <p className="text-xs text-blue-700 mt-1 truncate">{c.hashtag}</p>
        )}
        {c.cta && (
          <button className={`mt-2 w-full text-xs font-semibold py-2 rounded-lg ${isFB ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-900'}`}>
            {c.cta}
          </button>
        )}
      </div>
    </div>
  )
}
