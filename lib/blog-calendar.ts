import { q } from '@/lib/db'

type BlogCalendarInput = {
  clienteId: string
  slug: string
  title: string
  intro?: string | null
  metaDescription?: string | null
  cta?: string | null
  coverUrl?: string | null
  tema?: string | null
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function blogCalendarId(slug: string) {
  const safeSlug = slug.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 90)
  return `BLOG-${safeSlug || Date.now()}`
}

export async function upsertBlogCalendarEntry(input: BlogCalendarInput): Promise<string> {
  const idContenuto = blogCalendarId(input.slug)
  const caption = input.metaDescription || input.intro || 'Articolo blog generato, da revisionare e pubblicare.'

  await q(
    `INSERT INTO calendario (
       cliente_id, id_contenuto, data_pubblicazione, ora_pubblicazione, canale, formato,
       obiettivo, tema, hook, caption, cta, link_media_1, media_type,
       checked_copy, checked_media, checked_link, status, note
     )
     VALUES ($1,$2,$3,$4,'blog','articolo','seo',$5,$6,$7,$8,$9,$10,'NO',$11,'NO','DA_APPROVARE',$12)
     ON CONFLICT (cliente_id, id_contenuto) DO UPDATE SET
       data_pubblicazione = EXCLUDED.data_pubblicazione,
       ora_pubblicazione = EXCLUDED.ora_pubblicazione,
       tema = EXCLUDED.tema,
       hook = EXCLUDED.hook,
       caption = EXCLUDED.caption,
       cta = EXCLUDED.cta,
       link_media_1 = EXCLUDED.link_media_1,
       media_type = EXCLUDED.media_type,
       checked_copy = 'NO',
       checked_media = EXCLUDED.checked_media,
       checked_link = 'NO',
       status = 'DA_APPROVARE',
       note = EXCLUDED.note,
       updated_at = now()`,
    [
      input.clienteId,
      idContenuto,
      todayDate(),
      '09:00',
      input.tema || input.title,
      input.title,
      caption,
      input.cta || null,
      input.coverUrl || null,
      input.coverUrl ? 'image' : null,
      input.coverUrl ? 'SI' : 'NO',
      `Articolo blog collegato allo slug /blog/${input.slug}`,
    ],
  )

  return idContenuto
}
