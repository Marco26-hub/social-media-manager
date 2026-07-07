import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { getTableColumns, mediaSlotColumns } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

// Endpoint PUBBLICO (no auth) per il link anteprima condivisibile: ritorna SOLO i
// campi visuali di UN contenuto identificato dal suo id_contenuto. Serve perché la
// pagina /preview/[id] è pensata per essere inviata a un cliente/collaboratore, che
// non ha il localStorage del browser di chi ha generato il contenuto.
// Nessun dato sensibile: hook/caption/hashtag/cta/media + display brand. Lo scoping è
// l'id stesso (serve conoscerlo). Nessun campo strategico/interno viene esposto.
// UUID v4 pattern per riconoscere un preview_token opaco.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  try {
    if (!dbReady()) return NextResponse.json({ error: 'DB non disponibile' }, { status: 503 })
    const { searchParams } = new URL(request.url)
    const token = (searchParams.get('token') || '').trim()
    const id = (searchParams.get('id') || '').trim()
    if (!token && !id) return NextResponse.json({ error: 'token o id richiesto' }, { status: 400 })

    const calendarioColumns = await getTableColumns('calendario')
    const hasPreviewToken = calendarioColumns.has('preview_token')

    // Preferisci SEMPRE il token opaco (anti-IDOR). Il fallback per id_contenuto
    // resta per i link inviati prima della migration 026, ma è deprecato.
    let whereClause: string
    let param: string
    if (token && UUID_RE.test(token) && hasPreviewToken) {
      whereClause = 'c.preview_token = $1'
      param = token
    } else {
      whereClause = 'c.id_contenuto = $1'
      param = id || token
    }

    const optionalText = (column: string) => (
      calendarioColumns.has(column)
        ? `c.${column}::text AS ${column}`
        : `NULL::text AS ${column}`
    )
    const mediaSelect = mediaSlotColumns().map(optionalText).join(',\n              ')
    const visualSelect = [
      'tema',
      'note',
      'media_type',
      'scenes_json',
      'slides_json',
      'overlay_text',
      'alt_text',
      'tags',
      'thumbnail_url',
      'idea_visual',
      'voiceover_script',
      'music_mood',
    ].map(optionalText).join(',\n              ')
    const tokenSelect = hasPreviewToken ? 'c.preview_token::text AS preview_token,' : ''
    const rows = await q(
      `SELECT c.canale, c.formato, c.hook, c.caption, c.hashtag, c.cta, c.nome_prodotto,
              ${mediaSelect},
              c.link_prodotto, c.link_prodotto_finale,
              ${visualSelect},
              ${tokenSelect}
              b.brand_name, b.social_handle, b.sito_url
       FROM calendario c
       LEFT JOIN brand b ON b.cliente_id = c.cliente_id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [param],
    )
    if (!rows.length) return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('[preview:data] errore caricamento anteprima', error)
    return NextResponse.json({ error: 'Errore anteprima' }, { status: 500 })
  }
}
