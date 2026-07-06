import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { getTableColumns, mediaSlotColumns, selectExistingColumns } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

// Endpoint PUBBLICO (no auth) per il link anteprima condivisibile: ritorna SOLO i
// campi visuali di UN contenuto identificato dal suo id_contenuto. Serve perché la
// pagina /preview/[id] è pensata per essere inviata a un cliente/collaboratore, che
// non ha il localStorage del browser di chi ha generato il contenuto.
// Nessun dato sensibile: hook/caption/hashtag/cta/media + display brand. Lo scoping è
// l'id stesso (serve conoscerlo). Nessun campo strategico/interno viene esposto.
export async function GET(request: Request) {
  try {
    if (!dbReady()) return NextResponse.json({ error: 'DB non disponibile' }, { status: 503 })
    const { searchParams } = new URL(request.url)
    const id = (searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

    const calendarioColumns = await getTableColumns('calendario')
    const mediaSelect = selectExistingColumns('c', mediaSlotColumns(), calendarioColumns).join(',\n              ')
    const rows = await q(
      `SELECT c.canale, c.formato, c.hook, c.caption, c.hashtag, c.cta, c.nome_prodotto,
              ${mediaSelect},
              c.link_prodotto, c.link_prodotto_finale,
              b.brand_name, b.social_handle, b.sito_url
       FROM calendario c
       LEFT JOIN brand b ON b.cliente_id = c.cliente_id
       WHERE c.id_contenuto = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [id],
    )
    if (!rows.length) return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch {
    return NextResponse.json({ error: 'Errore anteprima' }, { status: 500 })
  }
}
