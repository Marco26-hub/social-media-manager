import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteId } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { apiError } from '@/lib/api-error'
import { listInstagramMedia, getMediaInsights } from '@/lib/meta-insights'

type Row = Record<string, unknown>

// Sincronizza le Insights Instagram REALI nei post_metrics, per il cliente attivo.
export async function POST() {
  try {
    await requireAuth()
    if (isDemo() || !dbReady()) return NextResponse.json({ ok: true, demo: true, synced: 0 })
    const cid = await requireClienteId()

    // Account IG collegati (token salvati dal flusso OAuth).
    const accounts = await q(
      `SELECT platform_account_id AS ig_id, access_token, platform_username
       FROM social_accounts
       WHERE cliente_id = $1 AND platform = 'instagram' AND attivo = true`,
      [cid],
    ) as Row[]

    if (!accounts.length) {
      return NextResponse.json({ error: 'Nessun account Instagram collegato. Collega prima il profilo.' }, { status: 400 })
    }

    // Post nostri pubblicati (per associare le metriche al contenuto giusto via permalink/caption).
    const nostri = await q(
      `SELECT id_contenuto, blotato_post_url, hook, caption FROM calendario
       WHERE cliente_id = $1 AND canale = 'instagram'`,
      [cid],
    ) as Row[]
    const byUrl = new Map<string, string>()
    for (const r of nostri) {
      const u = String(r.blotato_post_url || '').trim()
      if (u) byUrl.set(u, String(r.id_contenuto))
    }

    let synced = 0
    const errors: string[] = []
    for (const acc of accounts) {
      const igId = String(acc.ig_id)
      const token = String(acc.access_token)
      try {
        const media = await listInstagramMedia(igId, token, 50)
        for (const m of media) {
          const ins = await getMediaInsights(m.id, token)
          const reach = ins.reach || 0
          const impressions = ins.impressions || 0
          const saves = ins.saved || 0
          const shares = ins.shares || 0
          const interazioni = ins.total_interactions || (m.likes + m.comments + saves + shares)
          const base = reach || impressions
          const engagement_rate = base > 0 ? Math.round((interazioni / base) * 10000) / 100 : 0
          // Associa al nostro contenuto se il permalink combacia, altrimenti id IG.
          const idContenuto = byUrl.get(m.permalink) || `ig:${m.id}`

          await q(
            `INSERT INTO post_metrics
               (cliente_id, id_contenuto, canale, blotato_post_id, impressions, reach, likes, comments, shares, saves, clicks, engagement_rate, fonte, rilevato_at)
             VALUES ($1,$2,'instagram',$3,$4,$5,$6,$7,$8,$9,0,$10,'instagram', now())
             ON CONFLICT (cliente_id, id_contenuto, canale) DO UPDATE SET
               impressions=$4, reach=$5, likes=$6, comments=$7, shares=$8, saves=$9,
               engagement_rate=$10, fonte='instagram', rilevato_at=now()`,
            [cid, idContenuto, m.id, impressions, reach, m.likes, m.comments, shares, saves, engagement_rate],
          )
          synced++
        }
      } catch (e) {
        errors.push(`${acc.platform_username || igId}: ${(e as Error).message}`)
      }
    }

    return NextResponse.json({ ok: true, synced, accounts: accounts.length, errors })
  } catch (e) {
    return apiError(e)
  }
}
