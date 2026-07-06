import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { apiError } from '@/lib/api-error'
import { blotatoVisualConfigured, getVisualStatus } from '@/lib/blotato-visual'
import { getBlotatoKey } from '@/lib/blotato-key'
import { getTableColumns, mediaSlotColumns, selectExistingColumns } from '@/lib/db-schema'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// Polling stato generazione grafica. Quando 'done', salva gli URL e li rende
// disponibili come media del contenuto (riempie gli slot link_media liberi).
export async function GET(req: Request) {
  try {
    await requireAuth()
    const url = new URL(req.url)
    const idContenuto = str(url.searchParams.get('id_contenuto'))
    if (!idContenuto) return NextResponse.json({ error: 'id_contenuto richiesto' }, { status: 400 })

    if (isDemo() || !dbReady()) {
      return NextResponse.json({ ok: true, demo: true, status: 'done', kind: 'image', imageUrls: [], mediaUrl: null })
    }
    if (!blotatoVisualConfigured()) {
      return NextResponse.json({ error: 'Generazione grafica non configurata.' }, { status: 503 })
    }

    const cid = await requireClienteAccess(str(url.searchParams.get('cliente_id')) || undefined)

    const calendarioColumns = await getTableColumns('calendario')
    const mediaColumns = mediaSlotColumns()
    const mediaSelect = selectExistingColumns('calendario', mediaColumns, calendarioColumns).join(',\n              ')
    const rows = await q(
      `SELECT id, visual_job_id, visual_kind, visual_status, visual_url, visual_image_urls,
              ${mediaSelect}
       FROM calendario WHERE cliente_id = $1 AND id_contenuto = $2 LIMIT 1`,
      [cid, idContenuto],
    ) as Row[]
    const row = rows[0]
    if (!row) return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 })

    const jobId = str(row.visual_job_id)
    if (!jobId) return NextResponse.json({ ok: true, status: 'idle', kind: str(row.visual_kind) || null })

    // Già finalizzato: non re-interrogare Blotato.
    if (row.visual_status === 'done') {
      const imgs = Array.isArray(row.visual_image_urls) ? row.visual_image_urls : []
      return NextResponse.json({ ok: true, status: 'done', kind: str(row.visual_kind) || null, mediaUrl: str(row.visual_url) || null, imageUrls: imgs })
    }

    const st = await getVisualStatus(jobId, (await getBlotatoKey(cid)) || undefined)

    if (st.failed) {
      await q(`UPDATE calendario SET visual_status = 'failed', visual_error = $1, visual_synced_at = now() WHERE cliente_id = $2 AND id_contenuto = $3`,
        [st.error || 'Generazione grafica fallita', cid, idContenuto])
      return NextResponse.json({ ok: false, status: 'failed', error: st.error || 'Generazione grafica fallita' })
    }

    if (!st.done) {
      await q(`UPDATE calendario SET visual_status = 'generating', visual_synced_at = now() WHERE cliente_id = $1 AND id_contenuto = $2`, [cid, idContenuto])
      return NextResponse.json({ ok: true, status: 'generating', stage: st.status, kind: str(row.visual_kind) || null })
    }

    // DONE: raccogli output e riempi gli slot media liberi (senza sovrascrivere foto utente).
    const outputs = st.mediaUrl ? [st.mediaUrl, ...st.imageUrls] : st.imageUrls
    const writableMediaColumns = mediaColumns.filter(column => calendarioColumns.has(column))
    const slots = writableMediaColumns.map(column => str(row[column]))
    const updates: string[] = []
    const params: unknown[] = []
    let p = 1
    let oi = 0
    for (let i = 0; i < writableMediaColumns.length && oi < outputs.length; i++) {
      if (!slots[i]) {
        updates.push(`${writableMediaColumns[i]} = $${p++}`)
        params.push(outputs[oi++])
      }
    }

    params.push(st.mediaUrl || null)
    const urlIdx = p++
    params.push(JSON.stringify(st.imageUrls))
    const imgsIdx = p++
    params.push(cid); const cidIdx = p++
    params.push(idContenuto); const idIdx = p++

    await q(
      `UPDATE calendario SET
         visual_status = 'done',
         visual_url = $${urlIdx},
         visual_image_urls = $${imgsIdx}::jsonb,
         visual_error = NULL,
         visual_synced_at = now()
         ${updates.length ? ',' + updates.join(',') : ''}
       WHERE cliente_id = $${cidIdx} AND id_contenuto = $${idIdx}`,
      params,
    )

    return NextResponse.json({ ok: true, status: 'done', kind: str(row.visual_kind) || null, mediaUrl: st.mediaUrl, imageUrls: st.imageUrls, mediaFilled: updates.length })
  } catch (e) {
    return apiError(e)
  }
}
