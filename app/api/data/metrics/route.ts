import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { apiError } from '@/lib/api-error'

const int = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))

// GET: post pubblicati del cliente con le metriche già inserite (per il form).
export async function GET() {
  try {
    await requireAuth()
    if (isDemo() || !dbReady()) return NextResponse.json([])
    const cid = await requireClienteId()
    const rows = await q(
      `SELECT c.id_contenuto, c.canale, c.formato, c.hook, c.data_pubblicazione,
              m.impressions, m.reach, m.likes, m.comments, m.shares, m.saves, m.clicks, m.engagement_rate
       FROM calendario c
       LEFT JOIN post_metrics m ON m.cliente_id = c.cliente_id AND m.id_contenuto = c.id_contenuto AND m.canale = c.canale
       WHERE c.cliente_id = $1 AND c.status = 'PUBBLICATO'
       ORDER BY c.data_pubblicazione DESC NULLS LAST LIMIT 100`,
      [cid],
    )
    return NextResponse.json(rows)
  } catch (e) {
    return apiError(e)
  }
}

// POST: inserisce/aggiorna le metriche reali di un post (dalle Insights piattaforma).
export async function POST(request: Request) {
  try {
    await requireAuth()
    const body = await request.json() as Record<string, unknown>
    const id_contenuto = String(body.id_contenuto || '').trim()
    const canale = String(body.canale || '').trim()
    if (!id_contenuto || !canale) {
      return NextResponse.json({ error: 'id_contenuto e canale richiesti' }, { status: 400 })
    }

    if (isDemo() || !dbReady()) return NextResponse.json({ ok: true, demo: true })

    const cid = await requireClienteId()
    const impressions = int(body.impressions)
    const reach = int(body.reach)
    const likes = int(body.likes)
    const comments = int(body.comments)
    const shares = int(body.shares)
    const saves = int(body.saves)
    const clicks = int(body.clicks)
    // engagement rate = interazioni / reach (o impressions se reach 0).
    const base = reach || impressions
    const interazioni = likes + comments + shares + saves
    const engagement_rate = base > 0 ? Math.round((interazioni / base) * 10000) / 100 : 0

    await q(
      `INSERT INTO post_metrics
        (cliente_id, id_contenuto, canale, impressions, reach, likes, comments, shares, saves, clicks, engagement_rate, fonte, rilevato_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'manual', now())
       ON CONFLICT (cliente_id, id_contenuto, canale) DO UPDATE SET
         impressions = $4, reach = $5, likes = $6, comments = $7, shares = $8, saves = $9, clicks = $10,
         engagement_rate = $11, fonte = 'manual', rilevato_at = now()`,
      [cid, id_contenuto, canale, impressions, reach, likes, comments, shares, saves, clicks, engagement_rate],
    )
    return NextResponse.json({ ok: true, engagement_rate })
  } catch (e) {
    return apiError(e)
  }
}
