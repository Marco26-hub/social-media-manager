// Adattatore contenuti per cross-post: quando lo stesso contenuto viene
// duplicato su più canali (also_canali[]), evita di copiare verbatim caption
// e hashtag su piattaforme con limiti diversi. Prima X riceveva caption da
// 5000 char → API Twitter rifiutava; LinkedIn riceveva 30 hashtag → algoritmo
// penalizzava; TikTok riceveva un post foto senza video → publish falliva.
//
// USO: in generate/content per ogni altCanale → adaptRowForPlatform(base, altCanale).
// Se ritorna null → la combinazione canale/formato base è incompatibile e il
// cross-post va saltato con warning esplicito.

type Row = Record<string, unknown>

// Limiti reali (2026) per canale.
const CAPTION_LIMIT: Record<string, number> = {
  x: 280,           // Post normale su X. Verified/Premium supporta di più ma non contiamoci.
  threads: 500,
  bluesky: 300,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  tiktok: 2200,
  pinterest: 500,
  youtube_shorts: 100, // titolo Short
}

// Max hashtag consigliato per non triggerare spam-filter dell'algoritmo.
const MAX_HASHTAGS: Record<string, number> = {
  x: 2,
  linkedin: 5,
  threads: 5,
  instagram: 30,
  tiktok: 8,
  pinterest: 20,
  facebook: 3,
  youtube_shorts: 15,
}

// Formati che richiedono video (o sono video-only). Se il contenuto base è foto/post,
// il cross-post su questi canali non ha senso e va bloccato.
const VIDEO_ONLY_FORMATS = new Set(['reel', 'short', 'video'])
const VIDEO_REQUIRED_CANALI = new Set(['tiktok', 'youtube_shorts'])

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function truncateSmart(text: string, limit: number): string {
  const clean = text.trim()
  if (clean.length <= limit) return clean
  // Cerca l'ultimo spazio prima del limite per non tagliare a metà parola.
  const cut = clean.slice(0, limit - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > limit * 0.7 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

function trimHashtags(raw: string, max: number): string {
  const tags = raw.split(/\s+/).filter(t => t.startsWith('#')).slice(0, max)
  return tags.join(' ')
}

export type AdaptResult =
  | { ok: true; row: Row; warnings: string[] }
  | { ok: false; reason: string }

// Adatta la riga sorgente al canale destinazione. Restituisce ok:false se la
// combinazione è incompatibile (video richiesto ma sorgente è foto, ecc.).
export function adaptRowForPlatform(baseRow: Row, dstCanale: string): AdaptResult {
  const warnings: string[] = []
  const srcFormato = String(baseRow.formato || 'post').toLowerCase()
  const srcMediaType = String(baseRow.media_type || 'image').toLowerCase()

  // 1) Video richiesto ma il contenuto sorgente non è video.
  if (VIDEO_REQUIRED_CANALI.has(dstCanale) && srcMediaType !== 'video' && !VIDEO_ONLY_FORMATS.has(srcFormato)) {
    return {
      ok: false,
      reason: `Il canale '${dstCanale}' richiede un video: la sorgente '${srcFormato}' non è compatibile.`,
    }
  }

  // 2) YouTube Shorts vuole verticale 9:16; per Instagram post 1:1 avvisiamo.
  if (dstCanale === 'youtube_shorts' && srcFormato === 'post') {
    warnings.push('YouTube Shorts si aspetta 9:16 verticale: verifica il rapporto del video.')
  }

  // 3) Caption: tronca al limite del canale destinazione.
  const captionLimit = CAPTION_LIMIT[dstCanale] || 2200
  const srcCaption = str(baseRow.caption)
  const dstCaption = srcCaption.length > captionLimit
    ? (warnings.push(`Caption troncata a ${captionLimit} char per ${dstCanale}.`), truncateSmart(srcCaption, captionLimit))
    : srcCaption

  // 4) Hashtag: droppa sopra il limite consigliato.
  const hashtagMax = MAX_HASHTAGS[dstCanale] || 30
  const srcHashtag = str(baseRow.hashtag)
  const srcHashtagCount = srcHashtag.split(/\s+/).filter(t => t.startsWith('#')).length
  const dstHashtag = srcHashtagCount > hashtagMax
    ? (warnings.push(`Hashtag ridotti da ${srcHashtagCount} a ${hashtagMax} per ${dstCanale}.`), trimHashtags(srcHashtag, hashtagMax))
    : srcHashtag

  // 5) Hook: per X che ha 280 char totali, se hook+caption sfora, tronca hook.
  const srcHook = str(baseRow.hook)
  let dstHook = srcHook
  if (dstCanale === 'x' && (dstHook.length + 1 + dstCaption.length) > captionLimit) {
    const room = Math.max(30, captionLimit - dstCaption.length - 1)
    dstHook = truncateSmart(srcHook, room)
    warnings.push(`Hook troncato per rispettare limite ${captionLimit} char su ${dstCanale}.`)
  }

  return {
    ok: true,
    row: {
      ...baseRow,
      hook: dstHook,
      caption: dstCaption,
      hashtag: dstHashtag,
    },
    warnings,
  }
}

// Helper per uso in generate/content: mappa un array di [column, value] applicando le
// stringhe modificate. Non modifica gli array di input.
export function adaptInsertValues(
  columns: string[],
  values: unknown[],
  dstCanale: string,
): AdaptResult {
  const rowIn: Row = {}
  columns.forEach((c, i) => { rowIn[c] = values[i] })
  const res = adaptRowForPlatform(rowIn, dstCanale)
  if (!res.ok) return res
  const newValues = columns.map(c => (c in res.row ? res.row[c] : rowIn[c]))
  return { ok: true, row: { columns, values: newValues } as unknown as Row, warnings: res.warnings }
}
