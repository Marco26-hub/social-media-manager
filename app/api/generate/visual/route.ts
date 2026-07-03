import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { apiError } from '@/lib/api-error'
import { blotatoVisualConfigured, planVisual, createVisual } from '@/lib/blotato-visual'
import { getBlotatoKey } from '@/lib/blotato-key'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>

// Avvia la generazione della GRAFICA AI per un contenuto già creato.
// Asincrono: ritorna job_id + stato; il client fa polling su /status.
export async function POST(req: Request) {
  try {
    await requireAuth()
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const idContenuto = typeof body.id_contenuto === 'string' ? body.id_contenuto.trim() : ''
    if (!idContenuto) return NextResponse.json({ error: 'id_contenuto richiesto' }, { status: 400 })

    if (isDemo() || !dbReady()) {
      return NextResponse.json({ ok: true, demo: true, status: 'generating', job_id: 'demo-job', kind: 'image' })
    }
    if (!blotatoVisualConfigured()) {
      return NextResponse.json({ error: 'Generazione grafica non configurata: manca BLOTATO_API_KEY sul server.' }, { status: 503 })
    }

    const cid = await requireClienteAccess(typeof body.cliente_id === 'string' ? body.cliente_id : undefined)

    const rows = await q(
      `SELECT * FROM calendario WHERE cliente_id = $1 AND id_contenuto = $2 LIMIT 1`,
      [cid, idContenuto],
    ) as Row[]
    const row = rows[0]
    if (!row) return NextResponse.json({ error: 'Contenuto non trovato' }, { status: 404 })

    const plan = planVisual(row)
    const title = `${row.canale || 'social'} ${row.formato || ''} ${idContenuto}`.trim()
    const apiKey = (await getBlotatoKey(cid)) || undefined
    const jobId = await createVisual({ templateId: plan.templateId, prompt: plan.prompt, inputs: plan.inputs, title, apiKey })

    await q(
      `UPDATE calendario
       SET visual_job_id = $1, visual_status = 'generating', visual_template_id = $2,
           visual_kind = $3, visual_error = NULL, visual_synced_at = now()
       WHERE cliente_id = $4 AND id_contenuto = $5`,
      [jobId, plan.templateId, plan.kind, cid, idContenuto],
    )

    return NextResponse.json({ ok: true, job_id: jobId, status: 'generating', kind: plan.kind })
  } catch (e) {
    return apiError(e)
  }
}
