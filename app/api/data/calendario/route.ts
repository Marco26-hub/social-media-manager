import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAdmin, requireAuth, requireClienteId } from '@/lib/auth-utils'
import { scheduleOnBlotato } from '@/lib/publish/schedule'
import { validateMediaUrls, formatMediaError } from '@/lib/media-validate'
import { notifyAgency } from '@/lib/notifications'
import { isDemo } from '@/lib/demo'
import { demoContenuti } from '@/lib/demo-data'

const CALENDARIO_UPDATE_COLUMNS = new Set([
  'data_pubblicazione',
  'ora_pubblicazione',
  'canale',
  'formato',
  'obiettivo',
  'product_id',
  'nome_prodotto',
  'tema',
  'hook',
  'caption',
  'hashtag',
  'cta',
  'link_media_1',
  'link_media_2',
  'link_media_3',
  'link_media_4',
  'link_media_5',
  'link_media_6',
  'link_media_7',
  'link_prodotto',
  'link_prodotto_finale',
  'status',
  'approvato_da',
  'errore',
  'note',
  'platform_account_id',
  'media_type',
  'media_validato',
  'errore_tecnico',
  'checked_copy',
  'checked_media',
  'checked_link',
  'checked_price',
  'checked_by',
  'checked_at',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'promo_id',
  'promo_codice',
  'promo_validata',
  'fonte_media',
  'consenso_utilizzo',
  'scenes_json',
  'slides_json',
  'overlay_text',
  'alt_text',
  'tags',
  'thumbnail_url',
  'idea_visual',
  'voiceover_script',
  'music_mood',
  'quality_level',
  'audience_segment',
  'funnel_stage',
  'angle',
  'primary_message',
  'proof_points',
  'hook_variants',
  'caption_long',
  'cta_variants',
  'creative_brief',
  'template_id',
  'template_style',
  'layout_spec_json',
  'asset_requirements_json',
  'production_notes',
  'compliance_notes',
  'risk_flags',
  'platform_best_practices',
  'ab_variants_json',
  'kpi_target',
  'expected_outcome',
  'production_cycle_stage',
  'optimization_cycle_json',
  'performance_hypothesis',
  'next_iteration_actions',
  'missing_inputs',
  'content_checklist',
  'checked_alt_text',
  'checked_aspect_ratio',
  'checked_media_valid',
])

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const canale = searchParams.get('canale')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (isDemo() || !dbReady()) {
      let rows = demoContenuti
      if (status && status !== 'tutti') rows = rows.filter((item) => item.status === status)
      if (canale && canale !== 'tutti') rows = rows.filter((item) => item.canale === canale)
      return NextResponse.json(rows.slice(0, limit))
    }

    const cid = await requireClienteId()
    let query: string
    const params: unknown[] = [cid]

    if (status && status !== 'tutti' && canale && canale !== 'tutti') {
      query = 'SELECT * FROM calendario WHERE cliente_id = $1 AND status = $2 AND canale = $3 ORDER BY data_pubblicazione ASC LIMIT $4'
      params.push(status, canale, limit)
    } else if (status && status !== 'tutti') {
      query = 'SELECT * FROM calendario WHERE cliente_id = $1 AND status = $2 ORDER BY data_pubblicazione ASC LIMIT $3'
      params.push(status, limit)
    } else if (canale && canale !== 'tutti') {
      query = 'SELECT * FROM calendario WHERE cliente_id = $1 AND canale = $2 ORDER BY data_pubblicazione ASC LIMIT $3'
      params.push(canale, limit)
    } else {
      query = 'SELECT * FROM calendario WHERE cliente_id = $1 ORDER BY data_pubblicazione ASC LIMIT $2'
      params.push(limit)
    }
    const rows = await q(query, params)
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuth()
    const body = await request.json() as Record<string, unknown>
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

    if (isDemo() || !dbReady()) {
      return NextResponse.json({ ok: true, demo: true })
    }

    const cid = await requireClienteId()
    const existingContent = await q('SELECT * FROM calendario WHERE id = $1 AND cliente_id = $2', [id, cid])
    if (!existingContent.length) {
      return NextResponse.json({ error: 'contenuto non trovato' }, { status: 404 })
    }

    const fields: string[] = []
    const params: unknown[] = [id, cid]
    for (const [key, val] of Object.entries(body)) {
      if (!CALENDARIO_UPDATE_COLUMNS.has(key)) continue
      params.push(val)
      fields.push(`${key} = $${params.length}`)
    }
    if (body.status === 'APPROVATO') {
      params.push(new Date().toISOString())
      fields.push(`data_approvazione = $${params.length}`)

      // Validate media URLs before approving
      const row = { ...(existingContent[0] as Record<string, unknown>), ...body }
      const mediaUrls = [row.link_media_1, row.link_media_2, row.link_media_3, row.link_media_4, row.link_media_5, row.link_media_6, row.link_media_7]
      if (mediaUrls.some(u => u)) {
        const validation = await validateMediaUrls(mediaUrls as (string | null | undefined)[])
        if (!validation.ok) {
          const errMsg = formatMediaError(validation.errors)
          params.push(errMsg)
          fields.push(`errore_tecnico = $${params.length}`)
        }
      }
    }
    if (!fields.length) return NextResponse.json({ error: 'niente da aggiornare' }, { status: 400 })
    await q(`UPDATE calendario SET ${fields.join(', ')} WHERE id = $1 AND cliente_id = $2`, params)

    // Se approvato, schedula su Blotato
    if (body.status === 'APPROVATO') {
      try {
        const content = await q('SELECT * FROM calendario WHERE id = $1 AND cliente_id = $2', [id, cid])
        if (content.length) {
          const row = content[0] as Record<string, unknown>
          await scheduleOnBlotato(cid, row)
        }
      } catch (scheduleError) {
        console.error('Blotato scheduling failed:', scheduleError)
        await q('UPDATE calendario SET errore_tecnico = $1 WHERE id = $2 AND cliente_id = $3', [
          `Blotato: ${(scheduleError as Error).message.slice(0, 300)}`,
          id,
          cid,
        ])
      }
    }

    // Notifiche Telegram
    if (body.status) {
      const content = await q('SELECT * FROM calendario WHERE id = $1 AND cliente_id = $2', [id, cid])
      if (content.length) {
        const row = content[0] as Record<string, unknown>
        const statusStr = body.status as string
        if (statusStr === 'APPROVATO') {
          notifyAgency({ type: 'pubblicato', id_contenuto: row.id_contenuto as string, canale: row.canale as string, formato: row.formato as string }).catch(() => {})
        } else if (statusStr === 'ERRORE' || statusStr === 'ERRORE_MANUALE') {
          notifyAgency({ type: 'errore', id_contenuto: row.id_contenuto as string, canale: row.canale as string, errore: (row.errore_tecnico as string) || 'Errore sconosciuto' }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

    if (isDemo() || !dbReady()) {
      return NextResponse.json({ ok: true, demo: true, deleted_id: id })
    }

    const cid = await requireClienteId()
    const rows = await q('SELECT * FROM calendario WHERE id = $1 AND cliente_id = $2 LIMIT 1', [id, cid])
    if (!rows.length) {
      return NextResponse.json({ error: 'contenuto non trovato' }, { status: 404 })
    }

    const row = rows[0] as Record<string, unknown>
    await q('DELETE FROM approval_tokens WHERE cliente_id = $1 AND contenuto_id = $2', [cid, row.id_contenuto])
    await q('DELETE FROM calendario WHERE id = $1 AND cliente_id = $2', [id, cid])
    await q(
      `INSERT INTO log_pubblicazioni (cliente_id, id_contenuto, canale, formato, status_precedente, status_finale, messaggio)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        cid,
        row.id_contenuto || null,
        row.canale || null,
        row.formato || null,
        row.status || null,
        'ARCHIVIATO',
        'Contenuto cancellato da admin',
      ],
    )

    return NextResponse.json({ ok: true, deleted_id: id })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
