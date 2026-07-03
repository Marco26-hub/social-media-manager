// Publish Bridge: invia contenuto a Blotato per pubblicazione social
// Chiamato quando status → APPROVATO. Supporta tutti i formati.

import { q } from '@/lib/db'
import { validateMediaUrls } from '@/lib/media-validate'
import { getBlotatoKey } from '@/lib/blotato-key'

const BLOTATO_API_BASE = process.env.BLOTATO_API_URL || 'https://backend.blotato.com'

type ContentRow = Record<string, unknown>

// Mapping canale interno → nome piattaforma atteso da Blotato (schema MCP blotato_create_post).
// X interno = 'twitter' per Blotato; youtube_shorts = 'youtube'. 'blog' NON ha target Blotato.
const CANALE_TO_BLOTATO: Record<string, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  pinterest: 'pinterest',
  linkedin: 'linkedin',
  threads: 'threads',
  x: 'twitter',
  youtube_shorts: 'youtube',
}

// Timestamp ISO 8601 con timezone (Blotato richiede scheduledTime ISO).
function toIso(data: unknown, ora: unknown): string {
  const d = String(data || '').trim()
  const t = String(ora || '00:00').slice(0, 5)
  if (!d) throw new Error('data_pubblicazione mancante: impossibile programmare il post')
  const dt = new Date(`${d}T${t}:00`)
  if (isNaN(dt.getTime())) throw new Error(`data/ora non valide: ${d} ${t}`)
  return dt.toISOString()
}

export async function scheduleOnBlotato(
  clienteId: string,
  row: ContentRow,
) {
  const blotatoKey = await getBlotatoKey(clienteId)
  if (!blotatoKey) {
    console.warn('[Blotato] key non configurata (né per cliente né env)')
    return null
  }

  const canale = row.canale as string
  const formato = row.formato as string

  // 'blog' non è una piattaforma Blotato: va pubblicato altrove (CMS), non qui.
  const platform = CANALE_TO_BLOTATO[canale]
  if (!platform) {
    console.warn(`[Blotato] canale '${canale}' non pubblicabile via Blotato (es. blog) — saltato`)
    return null
  }

  // accountId è OBBLIGATORIO per Blotato: identifica SU QUALE account social pubblicare.
  // Va salvato in calendario.platform_account_id (da blotato_list_accounts → mappa canale→accountId).
  const accountId = (row.platform_account_id as string | null)?.trim()
  if (!accountId) {
    throw new Error(`Account Blotato non collegato per il canale '${canale}': imposta platform_account_id (vedi blotato_list_accounts)`)
  }

  // Costruisci il contenuto testuale completo per la piattaforma (hook+caption+cta+hashtag).
  const text = buildPlatformContent(canale, formato, row)

  // Raccogli media disponibili (fino a 7)
  const mediaUrls = [row.link_media_1, row.link_media_2, row.link_media_3, row.link_media_4, row.link_media_5, row.link_media_6, row.link_media_7]
    .filter((u): u is string => typeof u === 'string' && u.length > 0)

  // Validate media URLs before sending to Blotato
  if (mediaUrls.length > 0) {
    const validation = await validateMediaUrls(mediaUrls)
    if (!validation.ok) {
      const invalid = validation.errors.map(e => `[media_${e.index}] ${e.url}: ${e.reason}`).join('; ')
      throw new Error(`Media validation failed before Blotato: ${invalid}`)
    }
  }

  const scheduledTime = toIso(row.data_pubblicazione, row.ora_pubblicazione)

  // Payload contratto Blotato v2 (POST /v2/posts): post{ accountId, target, content } + scheduledTime.
  // Campi confermati dallo schema MCP blotato_create_post: accountId, platform, text, mediaUrls, scheduledTime.
  const payload: Record<string, unknown> = {
    post: {
      accountId,
      target: { targetType: platform },
      content: {
        platform,
        text,
        mediaUrls,
      },
    },
    scheduledTime,
  }

  console.log(`[Blotato] Sending ${canale}→${platform} account=${accountId} scheduled at ${scheduledTime}`)

  const res = await fetch(`${BLOTATO_API_BASE}/v2/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${blotatoKey}`,
      'blotato-api-key': blotatoKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error')
    throw new Error(`Blotato ${res.status}: ${error.slice(0, 200)}`)
  }

  const result = await res.json()
  const blotatoId = result.id || result.postSubmissionId || result.submissionId || result.scheduled_id

  // Aggiorna status locale
  if (blotatoId && row.id) {
    await q(
      `UPDATE calendario
       SET blotato_post_id = $1, blotato_status = 'scheduled', blotato_scheduled_at = $2, blotato_sync_at = now()
       WHERE id = $3 AND cliente_id = $4`,
      [String(blotatoId), scheduledTime, row.id, clienteId],
    )
  }

  return blotatoId
}

function buildPlatformContent(canale: string, formato: string, row: ContentRow): string {
  const hook = (row.hook || '') as string
  const caption = (row.caption || '') as string
  const cta = (row.cta || '') as string
  const hashtag = (row.hashtag || '') as string
  const nomeProdotto = (row.nome_prodotto || '') as string

  const parts: string[] = []

  if (hook) parts.push(hook)

  if (caption && caption !== hook) {
    // Per reel/short/story: caption breve
    if (['reel', 'short', 'story'].includes(formato)) {
      parts.push(caption.slice(0, 300))
    } else {
      parts.push(caption)
    }
  }

  if (cta && !['story'].includes(formato)) {
    parts.push(`\n${cta}`)
  }

  if (hashtag) {
    // Instagram: hashtag nel primo commento (metadata.first_comment)
    // Facebook/TikTok/Pinterest/LinkedIn/Threads/X: hashtag nella caption
    // (per X/Threads l'AI ne genera già pochi/mirati, vedi PLATFORM_RULES)
    if (['facebook', 'tiktok', 'pinterest', 'linkedin', 'threads', 'x'].includes(canale)) {
      parts.push(`\n${hashtag}`)
    }
  }

  if (nomeProdotto && !parts.some(p => p.includes(nomeProdotto))) {
    parts.push(`\n📦 ${nomeProdotto}`)
  }

  const content = parts.join('\n\n').trim()
  return content || hook || caption || ''
}
