// Generazione visual AI via Blotato (videos/from-templates).
// L'AI scrive il testo, qui l'AI genera anche la GRAFICA: immagine lifestyle del
// prodotto, carosello, o slideshow video — a partire dal contenuto già approvato.
//
// REST:
//   POST {BACKEND}/v2/videos/from-templates   header: blotato-api-key
//   GET  {BACKEND}/v2/videos/creations/:id
// Il template Blotato accetta {templateId, inputs, prompt, render}: con inputs={}
// e un buon prompt, Blotato compila da solo gli input del template.

const BLOTATO_BACKEND = process.env.BLOTATO_BACKEND_URL || 'https://backend.blotato.com'
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY

export type VisualKind = 'image' | 'carousel' | 'video'

export type VisualStatus = {
  status: string
  done: boolean
  failed: boolean
  mediaUrl: string | null
  imageUrls: string[]
  error?: string
}

// Template Blotato selezionati (UUID nudi, niente path completo).
const TEMPLATES = {
  // Foto prodotto reale → piazzata in scena lifestyle (immagine singola).
  productScene: 'f524614b-ba01-448c-967a-ce518c52a700',
  // Carosello Instagram: più slide generate dall'AI (imageUrls[]).
  carousel: '53cfec04-2500-41cf-8cc1-ba670d2c341a',
  // Slideshow immagini con testo → render video (mediaUrl).
  slideshowVideo: '5903b592-1255-43b4-b9ac-f8ed7cbf6a5f',
}

export function blotatoVisualConfigured(): boolean {
  return Boolean(BLOTATO_API_KEY)
}

// Estrae l'UUID nudo da un path tipo /base/v2/quote-card/<uuid>/v1.
export function extractTemplateId(idOrPath: string): string {
  const m = idOrPath.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return m ? m[0] : idOrPath
}

type ContentRow = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function firstMediaUrl(row: ContentRow): string {
  for (let i = 1; i <= 10; i++) {
    const u = str(row[`link_media_${i}`])
    if (u) return u
  }
  return ''
}

// Descrittori per preset visual: iniettati nel prompt Blotato per guidare il
// template AI. Blotato non ha un flag "trending" pubblico — l'AI del template
// interpreta il prompt. Questi preset sono la nostra libreria interna.
const PRESET_HINTS: Record<string, { reel: string; carousel: string; image: string }> = {
  trending: {
    reel: 'STILE VIRALE ATTUALE: hook visivo aggressivo primi 0-2s (POV, close-up, movimento), tagli rapidi 0.5-1.5s ognuno, transizioni whip-pan/zoom-punch tra scene, testo overlay grande in kinetic-typography con pop rapido, musica beat-drop con sync sui tagli. Estetica IG Reels/TikTok 2026: satura ma coerente col brand, montaggio energico.',
    carousel: 'STILE CAROSELLO TRENDING: prima slide con hook grafico grande e chiaro (curiosity gap), slide 2-4 con dettagli in sequenza narrativa (problema → soluzione → prova), ultima slide CTA forte + prodotto. Font grande, contrast alto, colori accento coerenti. Estetica LinkedIn/IG carousel 2026 tipo Justin Welsh / Alex Garcia.',
    image: 'STILE VIRALE FOTO SINGOLA: composizione dinamica (rule-of-thirds spinta), colore accento pop, testo overlay minimal ma di forte impatto in kinetic-typography, atmosfera "scroll-stopping".',
  },
  premium: {
    reel: 'STILE PREMIUM EDITORIALE: pacing calmo (2-4s per scena), tagli morbidi (cross-fade / match-cut), grading cinematografico, camera stabile o slow-motion, testo overlay elegante minimal, musica evocativa non ritmica. Coerenza tono luxury/professional.',
    carousel: 'STILE PREMIUM EDITORIALE CAROSELLO: palette limitata (3 colori), tipografia serif elegante, generous whitespace, immagini ad alto contrasto e composizione pulita, layout coerente su tutte le slide.',
    image: 'STILE PREMIUM: composizione minimalista, luce naturale morbida, palette limitata, dettagli materici del prodotto, atmosfera editoriale luxury.',
  },
  minimal: {
    reel: 'STILE MINIMAL: 3-5 scene lunghe (3-5s), no effetti aggressivi, camera fissa o dolly lineare, testo overlay solo dove serve, focus totale sul prodotto/messaggio senza distrazioni.',
    carousel: 'STILE MINIMAL: max 4 slide, un solo elemento chiave per slide, whitespace dominante, tipografia sans-serif basic.',
    image: 'STILE MINIMAL: sfondo neutro, oggetto centrato, luce diffusa, zero decorazione.',
  },
  classico: {
    reel: 'STILE CLASSICO: presentazione prodotto in 4-6 scene, montaggio lineare, testo overlay descrittivo, musica di sottofondo neutra, coerenza editoriale col brand.',
    carousel: 'STILE CLASSICO: 4-5 slide didascaliche (hero + dettagli + CTA), tipografia leggibile, gerarchia chiara.',
    image: 'STILE CLASSICO: prodotto in evidenza, ambientazione coerente col brand, luce naturale, composizione bilanciata.',
  },
}

function normalizeVisualPreset(row: ContentRow): string {
  // Se il flag use_trending_effects è on, forza 'trending' anche se preset esplicito manca.
  const flag = Boolean(row.use_trending_effects)
  const preset = str(row.visual_preset).toLowerCase()
  if (preset && PRESET_HINTS[preset]) return preset
  if (flag) return 'trending'
  // Default: 'premium' per un tono coerente col posizionamento tipo agency premium.
  return 'premium'
}

// Effetti extra suggeriti (jsonb array di string) → appesi al prompt in coda.
function effectsSuffix(row: ContentRow): string {
  const raw = row.visual_effects
  if (!raw) return ''
  const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(String(raw)) } catch { return [] } })()
  const effects = (Array.isArray(arr) ? arr : []).map(e => String(e).trim()).filter(Boolean)
  if (!effects.length) return ''
  return ` Effetti richiesti: ${effects.slice(0, 8).join(', ')}.`
}

function enrichPrompt(basePrompt: string, row: ContentRow, kind: VisualKind): string {
  const preset = normalizeVisualPreset(row)
  const hint = PRESET_HINTS[preset]?.[kind === 'video' ? 'reel' : kind === 'carousel' ? 'carousel' : 'image'] || ''
  const suffix = effectsSuffix(row)
  return `${basePrompt}\n\n${hint}${suffix}`.trim()
}

// Sceglie template + prompt + inputs in base a formato/canale e media disponibili.
export function planVisual(row: ContentRow): { templateId: string; kind: VisualKind; prompt: string; inputs: Record<string, unknown> } {
  const formato = str(row.formato).toLowerCase()
  const canale = str(row.canale).toLowerCase()
  const nomeProdotto = str(row.nome_prodotto)
  const hook = str(row.hook)
  const caption = str(row.caption)
  const ideaVisual = str(row.idea_visual)
  const productImage = firstMediaUrl(row)

  // Descrizione ricca per guidare la grafica: prodotto + idea visual + tono del post.
  const brandHint = nomeProdotto ? `Prodotto: ${nomeProdotto}. ` : ''
  const visualHint = ideaVisual ? `${ideaVisual}. ` : ''
  const copyHint = [hook, caption].filter(Boolean).join(' — ').slice(0, 400)

  // VIDEO/REEL/STORY/SHORT → slideshow video con immagini AI.
  if (['video', 'reel', 'story', 'short'].includes(formato)) {
    const base = `${brandHint}${visualHint}Crea uno slideshow video verticale e professionale per ${canale}. Coerente col brand. Testi brevi in sovrimpressione. Contesto: ${copyHint}`
    return {
      templateId: TEMPLATES.slideshowVideo,
      kind: 'video',
      prompt: enrichPrompt(base, row, 'video'),
      inputs: { aspectRatio: '9:16' },
    }
  }

  // CAROUSEL → carosello Instagram multi-slide.
  if (formato === 'carousel' || formato === 'carosello') {
    const base = `${brandHint}${visualHint}Crea un carosello Instagram di 3-5 slide, coerente e professionale. Ogni slide mostra il prodotto o un dettaglio/styling. Contesto: ${copyHint}`
    return {
      templateId: TEMPLATES.carousel,
      kind: 'carousel',
      prompt: enrichPrompt(base, row, 'carousel'),
      inputs: { aspectRatio: '4:5' },
    }
  }

  // POST con foto prodotto reale → product scene placement (immagine lifestyle).
  if (productImage) {
    const scene = ideaVisual || 'Prodotto valorizzato in una scena lifestyle elegante e luminosa, luce naturale morbida, ambientazione coerente col brand'
    const base = `${brandHint}${scene}. ${copyHint}`
    return {
      templateId: TEMPLATES.productScene,
      kind: 'image',
      prompt: enrichPrompt(base, row, 'image'),
      inputs: { productImage, sceneDescription: scene.slice(0, 500) },
    }
  }

  // POST senza foto → singola immagine lifestyle generata dall'AI (1 slide carosello).
  const base = `${brandHint}${visualHint}Genera 1 immagine marketing professionale e fotorealistica per ${canale}. ${copyHint}`
  return {
    templateId: TEMPLATES.carousel,
    kind: 'image',
    prompt: enrichPrompt(base, row, 'image'),
    inputs: { aspectRatio: '4:5' },
  }
}

export async function createVisual(opts: { templateId: string; prompt: string; inputs?: Record<string, unknown>; title?: string; apiKey?: string }): Promise<string> {
  const key = opts.apiKey || BLOTATO_API_KEY
  if (!key) throw new Error('Key Blotato non configurata: impossibile generare la grafica.')
  const res = await fetch(`${BLOTATO_BACKEND}/v2/videos/from-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': key },
    body: JSON.stringify({
      templateId: extractTemplateId(opts.templateId),
      inputs: opts.inputs || {},
      prompt: opts.prompt,
      render: true,
      ...(opts.title ? { title: opts.title } : {}),
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Blotato visual ${res.status}: ${t.slice(0, 200) || 'errore creazione'}`)
  }
  const data = await res.json().catch(() => ({})) as Record<string, unknown>
  const item = (data.item || data) as Record<string, unknown>
  const id = str(item.id) || str(data.id)
  if (!id) throw new Error('Blotato non ha restituito un id creazione visual.')
  return id
}

export async function getVisualStatus(id: string, apiKey?: string): Promise<VisualStatus> {
  const key = apiKey || BLOTATO_API_KEY
  if (!key) throw new Error('Key Blotato non configurata.')
  const res = await fetch(`${BLOTATO_BACKEND}/v2/videos/creations/${encodeURIComponent(id)}`, {
    headers: { 'blotato-api-key': key },
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Blotato status ${res.status}: ${t.slice(0, 200) || 'errore stato'}`)
  }
  const data = await res.json().catch(() => ({})) as Record<string, unknown>
  const item = (data.item || data) as Record<string, unknown>
  const status = str(item.status) || 'queueing'
  const mediaUrl = str(item.mediaUrl) || null
  const imageUrls = Array.isArray(item.imageUrls) ? (item.imageUrls as unknown[]).map(str).filter(Boolean) : []
  return {
    status,
    done: status === 'done',
    failed: status === 'creation-from-template-failed' || status === 'insufficient-credits',
    mediaUrl,
    imageUrls,
    error: status === 'insufficient-credits' ? 'Crediti Blotato insufficienti per generare la grafica.' : (str(item.error) || undefined),
  }
}
