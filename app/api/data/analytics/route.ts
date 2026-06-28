import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { apiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

type Row = Record<string, unknown>
const num = (v: unknown) => Number(v || 0)

function demoAnalytics() {
  return {
    demo: true,
    kpi: { totale: 6, daApprovare: 3, approvati: 1, pubblicati: 2, errori: 0, tassoApprovazione: 50, tassoErrore: 0 },
    timeline: [
      { giorno: '2026-06-24', creati: 1 }, { giorno: '2026-06-25', creati: 2 },
      { giorno: '2026-06-26', creati: 1 }, { giorno: '2026-06-27', creati: 2 },
    ],
    perCanale: { instagram: 3, facebook: 2, tiktok: 1 },
    perFormato: { post: 4, carousel: 1, reel: 1 },
    perQualita: { soft: 2, medium: 3, high: 1 },
    perFunnel: { awareness: 2, consideration: 3, conversion: 1 },
    pipeline: { IDEA: 0, BOZZA: 0, DA_APPROVARE: 3, APPROVATO: 1, PUBBLICATO: 2, ERRORE: 0 },
    performance: { hasData: false, totali: null, topPost: [] },
  }
}

function tally(rows: Row[], col: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = String(r[col] || '—')
    out[k] = (out[k] || 0) + 1
  }
  return out
}

export async function GET() {
  try {
    await requireAuth()
    if (isDemo() || !dbReady()) return NextResponse.json(demoAnalytics())

    const cid = await requireClienteId()

    // Tutti i contenuti del cliente (ultimi 90gg per i grafici temporali).
    const contenuti = await q(
      `SELECT id_contenuto, canale, formato, status, quality_level, funnel_stage,
              created_at, data_pubblicazione
       FROM calendario WHERE cliente_id = $1
       ORDER BY created_at DESC NULLS LAST LIMIT 1000`,
      [cid],
    ) as Row[]

    const totale = contenuti.length
    const byStatus = tally(contenuti, 'status')
    const pubblicati = num(byStatus['PUBBLICATO'])
    const approvati = num(byStatus['APPROVATO'])
    const daApprovare = num(byStatus['DA_APPROVARE'])
    const errori = num(byStatus['ERRORE']) + num(byStatus['ERRORE_MANUALE'])
    const tassoApprovazione = totale ? Math.round(((approvati + pubblicati) / totale) * 100) : 0
    const tassoErrore = totale ? Math.round((errori / totale) * 100) : 0

    // Timeline: contenuti creati per giorno (ultimi 30gg).
    const timelineRows = await q(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS giorno, count(*)::int AS creati
       FROM calendario
       WHERE cliente_id = $1 AND created_at >= now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`,
      [cid],
    ) as Row[]

    // Performance reale da post_metrics (se presente).
    let performance: { hasData: boolean; totali: Row | null; topPost: Row[] } = { hasData: false, totali: null, topPost: [] }
    try {
      const totali = await q(
        `SELECT count(*)::int AS post, coalesce(sum(impressions),0)::int AS impressions,
                coalesce(sum(reach),0)::int AS reach, coalesce(sum(likes),0)::int AS likes,
                coalesce(sum(comments),0)::int AS comments, coalesce(sum(shares),0)::int AS shares,
                coalesce(sum(clicks),0)::int AS clicks,
                round(avg(nullif(engagement_rate,0)),2) AS engagement_rate_medio
         FROM post_metrics WHERE cliente_id = $1`,
        [cid],
      ) as Row[]
      const top = await q(
        `SELECT id_contenuto, canale, impressions, reach, likes, comments, shares, clicks, engagement_rate
         FROM post_metrics WHERE cliente_id = $1
         ORDER BY engagement_rate DESC NULLS LAST, reach DESC NULLS LAST LIMIT 5`,
        [cid],
      ) as Row[]
      const hasData = num(totali[0]?.post) > 0
      performance = { hasData, totali: hasData ? totali[0] : null, topPost: top }
    } catch {
      // tabella post_metrics non ancora migrata: performance vuota (non finta)
      performance = { hasData: false, totali: null, topPost: [] }
    }

    return NextResponse.json({
      demo: false,
      kpi: { totale, daApprovare, approvati, pubblicati, errori, tassoApprovazione, tassoErrore },
      timeline: timelineRows.map(r => ({ giorno: r.giorno, creati: num(r.creati) })),
      perCanale: tally(contenuti, 'canale'),
      perFormato: tally(contenuti, 'formato'),
      perQualita: tally(contenuti, 'quality_level'),
      perFunnel: tally(contenuti, 'funnel_stage'),
      pipeline: {
        IDEA: num(byStatus['IDEA']), BOZZA: num(byStatus['BOZZA']),
        DA_APPROVARE: daApprovare, APPROVATO: approvati,
        PUBBLICATO: pubblicati, ERRORE: errori,
      },
      performance,
    })
  } catch (e) {
    return apiError(e)
  }
}
