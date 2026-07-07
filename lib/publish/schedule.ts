// Publish Bridge: invia contenuto a Blotato per pubblicazione social
// Chiamato quando status → APPROVATO. Supporta tutti i formati.

import { q } from '@/lib/db'
import { isDemo } from '@/lib/demo'
import { validateMediaUrls } from '@/lib/media-validate'
import { getBlotatoKey } from '@/lib/blotato-key'
import { resolveBlotatoTarget } from '@/lib/blotato-accounts'

const BLOTATO_API_BASE = process.env.BLOTATO_API_URL || 'https://backend.blotato.com'

// Kill-switch pubblicazione, DISACCOPPIATO dal demo mode.
// Permette di girare in produzione reale (registrazione/login/dati veri) SENZA
// pubblicare davvero sui social finché non si è pronti. Pubblica solo se
// PUBLISH_ENABLED === 'true'. Demo mode non pubblica mai, comunque.
export function isPublishingLive(): boolean {
  if (isDemo()) return false
  return process.env.PUBLISH_ENABLED === 'true'
}

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

// Esito esplicito della pubblicazione: NIENTE fallback silenzioso.
// Il chiamante sa sempre se ha davvero programmato, se è dry-run o se è stato saltato.
export type PublishOutcome =
  | { status: 'scheduled'; blotatoId: string }
  | { status: 'dry_run' }
  | { status: 'skipped'; reason: string }

export async function scheduleOnBlotato(
  clienteId: string,
  row: ContentRow,
): Promise<PublishOutcome> {
  // Guardia pubblicazione: se non live (demo o PUBLISH_ENABLED != true) → dry-run.
  // Il contenuto resta APPROVATO senza blotato_post_id: verrà pubblicato quando
  // si abilita PUBLISH_ENABLED e si rilancia la sincronizzazione Blotato.
  if (!isPublishingLive()) {
    console.warn('[Blotato] pubblicazione disabilitata (PUBLISH_ENABLED != true o demo) → dry-run, nessun post reale.')
    return { status: 'dry_run' }
  }

  const blotatoKey = await getBlotatoKey(clienteId)
  if (!blotatoKey) {
    console.warn('[Blotato] key non configurata (né per cliente né env)')
    return { status: 'skipped', reason: 'Blotato API key non configurata' }
  }

  const canale = row.canale as string
  const formato = row.formato as string

  // 'blog' non è una piattaforma Blotato: va pubblicato altrove (CMS), non qui.
  const platform = CANALE_TO_BLOTATO[canale]
  if (!platform) {
    console.warn(`[Blotato] canale '${canale}' non pubblicabile via Blotato (es. blog) — saltato`)
    return { status: 'skipped', reason: `Canale '${canale}' non pubblicabile via Blotato` }
  }

  // accountId è OBBLIGATORIO per Blotato: identifica SU QUALE account social pubblicare.
  // Lo risolviamo dagli account collegati in Blotato (resolveBlotatoTarget), che
  // fornisce anche i campi target per-piattaforma (Facebook pageId, Pinterest boardId…).
  // Un platform_account_id già salvato sulla riga fa da override manuale (pin).
  const manualAccountId = (row.platform_account_id as string | null)?.trim() || ''
  let accountId = manualAccountId
  let target: Record<string, unknown> = { targetType: platform }
  try {
    const resolved = await resolveBlotatoTarget(blotatoKey, canale, row)
    target = resolved.target
    if (!accountId) accountId = resolved.accountId
  } catch (e) {
    // Nessun account risolvibile: se non c'è nemmeno un id manuale, esponi l'errore
    // azionabile (quale account collegare) invece di un fallback muto.
    if (!accountId) throw e
    console.warn(`[Blotato] resolver account fallito per '${canale}', uso platform_account_id manuale:`, (e as Error).message.slice(0, 160))
  }
  if (!accountId) {
    throw new Error(`Account Blotato non collegato per il canale '${canale}': collega l'account nel workspace Blotato`)
  }

  // Costruisci il contenuto testuale completo per la piattaforma (hook+caption+cta+hashtag).
  const text = buildPlatformContent(canale, formato, row)

  // Raccogli media disponibili (fino a 10 = max carosello Instagram)
  const mediaUrls = [
    row.link_media_1, row.link_media_2, row.link_media_3, row.link_media_4, row.link_media_5,
    row.link_media_6, row.link_media_7, row.link_media_8, row.link_media_9, row.link_media_10,
  ].filter((u): u is string => typeof u === 'string' && u.length > 0)

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
      target,
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

  if (!blotatoId) {
    console.warn('[Blotato] risposta senza id post — non confermato')
    return { status: 'skipped', reason: 'Blotato non ha restituito un id post' }
  }

  // Aggiorna status locale. Persiste anche l'accountId risolto se la riga non
  // l'aveva (così i sync successivi e la UI lo mostrano senza ririsolvere).
  if (row.id) {
    if (!manualAccountId && accountId) {
      await q(
        `UPDATE calendario
         SET blotato_post_id = $1, blotato_status = 'scheduled', blotato_scheduled_at = $2, blotato_sync_at = now(), platform_account_id = $5
         WHERE id = $3 AND cliente_id = $4`,
        [String(blotatoId), scheduledTime, row.id, clienteId, accountId],
      )
    } else {
      await q(
        `UPDATE calendario
         SET blotato_post_id = $1, blotato_status = 'scheduled', blotato_scheduled_at = $2, blotato_sync_at = now()
         WHERE id = $3 AND cliente_id = $4`,
        [String(blotatoId), scheduledTime, row.id, clienteId],
      )
    }
  }

  return { status: 'scheduled', blotatoId: String(blotatoId) }
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
