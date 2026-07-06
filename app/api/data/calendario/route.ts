import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { dbReady, q } from '@/lib/db'
import { requireAdmin, requireAuth, requireClienteId } from '@/lib/auth-utils'
import { scheduleOnBlotato } from '@/lib/publish/schedule'
import { validateMediaUrls, formatMediaError } from '@/lib/media-validate'
import { notifyAgency } from '@/lib/notifications'
import { isDemo } from '@/lib/demo'
import { demoContenuti } from '@/lib/demo-data'
import { getTableColumns } from '@/lib/db-schema'

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
  'link_media_8',
  'link_media_9',
  'link_media_10',
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
    return apiError(e)
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
    const calendarioColumns = await getTableColumns('calendario')
    const existingContent = await q('SELECT * FROM calendario WHERE id = $1 AND cliente_id = $2', [id, cid])
    if (!existingContent.length) {
      return NextResponse.json({ error: 'contenuto non trovato' }, { status: 404 })
    }

    const fields: string[] = []
    const params: unknown[] = [id, cid]
    const skippedSchemaFields: string[] = []
    for (const [key, val] of Object.entries(body)) {
      if (!CALENDARIO_UPDATE_COLUMNS.has(key)) continue
      if (!calendarioColumns.has(key)) {
        skippedSchemaFields.push(key)
        continue
      }
      params.push(val)
      fields.push(`${key} = $${params.length}`)
    }
    if (body.status === 'APPROVATO') {
      if (calendarioColumns.has('data_approvazione')) {
        params.push(new Date().toISOString())
        fields.push(`data_approvazione = $${params.length}`)
      }

      // Validate media URLs before approving
      const row = { ...(existingContent[0] as Record<string, unknown>), ...body }
      const mediaUrls = [row.link_media_1, row.link_media_2, row.link_media_3, row.link_media_4, row.link_media_5, row.link_media_6, row.link_media_7, row.link_media_8, row.link_media_9, row.link_media_10]
      if (mediaUrls.some(u => u)) {
        const validation = await validateMediaUrls(mediaUrls as (string | null | undefined)[])
        if (!validation.ok && calendarioColumns.has('errore_tecnico')) {
          const errMsg = formatMediaError(validation.errors)
          params.push(errMsg)
          fields.push(`errore_tecnico = $${params.length}`)
        }
      }
    }
    if (!fields.length) {
      if (skippedSchemaFields.length) return NextResponse.json({ ok: true, schema_fallback: true, skipped_fields: skippedSchemaFields })
      return NextResponse.json({ error: 'niente da aggiornare' }, { status: 400 })
    }
    await q(`UPDATE calendario SET ${fields.join(', ')} WHERE id = $1 AND cliente_id = $2`, params)

    // Se approvato, schedula su Blotato
    let schedulingError: string | null = null
    if (body.status === 'APPROVATO') {
      try {
        const content = await q('SELECT * FROM calendario WHERE id = $1 AND cliente_id = $2', [id, cid])
        if (content.length) {
          const row = content[0] as Record<string, unknown>
          await scheduleOnBlotato(cid, row)
        }
      } catch (scheduleError) {
        console.error('Blotato scheduling failed:', scheduleError)
        schedulingError = (scheduleError as Error).message.slice(0, 300)
        await q('UPDATE calendario SET errore_tecnico = $1 WHERE id = $2 AND cliente_id = $3', [
          `Blotato: ${schedulingError}`,
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

    // Non nascondere il fallimento di scheduling: l'approvazione è andata (status
    // salvato) ma la pubblicazione NON è stata programmata → il frontend deve avvisare.
    if (schedulingError) {
      return NextResponse.json({ ok: true, scheduled: false, scheduling_error: schedulingError, ...(skippedSchemaFields.length ? { schema_fallback: true, skipped_fields: skippedSchemaFields } : {}) })
    }
    return NextResponse.json({ ok: true, ...(body.status === 'APPROVATO' ? { scheduled: true } : {}), ...(skippedSchemaFields.length ? { schema_fallback: true, skipped_fields: skippedSchemaFields } : {}) })
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)

    // Supporta sia il delete singolo (?id=) sia il bulk (?ids=id1,id2,... oppure body {ids:[]}).
    // Il bulk serve a svuotare in un colpo i contenuti-BOZZA di un piano editoriale generato.
    let ids: string[] = []
    const singleId = searchParams.get('id')
    const idsParam = searchParams.get('ids')
    if (singleId) ids = [singleId]
    else if (idsParam) ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
    else {
      // Prova dal body JSON (DELETE con body è valido lato fetch).
      const body = await request.json().catch(() => null) as { ids?: unknown } | null
      if (Array.isArray(body?.ids)) ids = body.ids.filter((x): x is string => typeof x === 'string' && x.length > 0)
    }

    if (!ids.length) return NextResponse.json({ error: 'id o ids richiesti' }, { status: 400 })
    // Cap difensivo: evita richieste giganti accidentali.
    if (ids.length > 500) return NextResponse.json({ error: 'Massimo 500 contenuti per eliminazione' }, { status: 400 })

    if (isDemo() || !dbReady()) {
      return NextResponse.json({ ok: true, demo: true, deleted: ids.length, deleted_ids: ids })
    }

    const cid = await requireClienteId()
    // Seleziona SOLO i contenuti che appartengono davvero al cliente attivo (tenant guard).
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',')
    const rows = await q(
      `SELECT * FROM calendario WHERE cliente_id = $1 AND id IN (${placeholders})`,
      [cid, ...ids],
    ) as Record<string, unknown>[]

    if (!rows.length) {
      return NextResponse.json({ error: 'nessun contenuto trovato per gli id richiesti' }, { status: 404 })
    }

    const foundIds = rows.map(r => r.id as string)
    const foundPlaceholders = foundIds.map((_, i) => `$${i + 2}`).join(',')
    const contenutoIds = rows.map(r => r.id_contenuto).filter(Boolean) as string[]

    // Elimina i token di approvazione collegati (se presenti).
    if (contenutoIds.length) {
      const tokPlaceholders = contenutoIds.map((_, i) => `$${i + 2}`).join(',')
      await q(
        `DELETE FROM approval_tokens WHERE cliente_id = $1 AND contenuto_id IN (${tokPlaceholders})`,
        [cid, ...contenutoIds],
      )
    }
    await q(
      `DELETE FROM calendario WHERE cliente_id = $1 AND id IN (${foundPlaceholders})`,
      [cid, ...foundIds],
    )

    // Log per ogni contenuto eliminato (tracciabilità admin).
    for (const row of rows) {
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
          ids.length > 1 ? 'Contenuto cancellato da admin (eliminazione multipla)' : 'Contenuto cancellato da admin',
        ],
      )
    }

    // Segnala se alcuni id richiesti non erano del cliente / inesistenti (niente silenzio).
    const skipped = ids.filter(id => !foundIds.includes(id))
    return NextResponse.json({
      ok: true,
      deleted: foundIds.length,
      deleted_ids: foundIds,
      ...(skipped.length ? { skipped: skipped.length, warning: `${skipped.length} id ignorati (non trovati o di altro cliente)` } : {}),
    })
  } catch (e) {
    return apiError(e)
  }
}
