import { q } from '@/lib/db'
import { callAI, extractJSONChecked } from '@/lib/ai'
import { brandField } from '@/lib/client-context'
import { PRO_COPY_STANDARDS, proSystemPrompt } from '@/lib/prompt-standards'

type Row = Record<string, unknown>

export type ReportResult = { clienteId: string; ok: boolean; errore?: string }
export type AiKeys = { model?: string; openrouterKey?: string; geminiKey?: string; opencodeKey?: string }

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : 0
}

// Aggrega i dati FATTUALI del periodo (deterministici, dal DB) che poi l'AI traduce
// in prosa. Niente numeri inventati: se un dato manca, resta 0/vuoto.
async function raccogliDati(clienteId: string, daISO: string): Promise<Row> {
  const [statusRows, canaliRows, formatiRows, erroriRows, metrics, seo, ads] = await Promise.all([
    q('SELECT status, count(*)::int c FROM calendario WHERE cliente_id = $1 AND data_pubblicazione >= $2 GROUP BY status', [clienteId, daISO]),
    q('SELECT canale, count(*)::int c FROM calendario WHERE cliente_id = $1 AND data_pubblicazione >= $2 GROUP BY canale ORDER BY c DESC LIMIT 5', [clienteId, daISO]),
    q('SELECT formato, count(*)::int c FROM calendario WHERE cliente_id = $1 AND data_pubblicazione >= $2 GROUP BY formato ORDER BY c DESC LIMIT 5', [clienteId, daISO]),
    q("SELECT count(*)::int c FROM log_pubblicazioni WHERE cliente_id = $1 AND timestamp >= $2 AND (status_finale = 'ERRORE' OR errore IS NOT NULL)", [clienteId, daISO]),
    q('SELECT COALESCE(sum(impressions),0)::int impressions, COALESCE(sum(reach),0)::int reach, COALESCE(sum(likes),0)::int likes, COALESCE(sum(comments),0)::int comments, COALESCE(sum(shares),0)::int shares, COALESCE(round(avg(engagement_rate)::numeric,2),0)::float engagement_rate, count(*)::int post_misurati FROM post_metrics WHERE cliente_id = $1 AND rilevato_at >= $2', [clienteId, daISO]),
    q('SELECT score_globale, riepilogo FROM seo_audit WHERE cliente_id = $1 ORDER BY data_audit DESC LIMIT 1', [clienteId]),
    q('SELECT count(*)::int c, array_agg(DISTINCT platform) plats FROM ads_campaign WHERE cliente_id = $1 AND created_at >= $2', [clienteId, daISO]),
  ])
  const statusCount: Record<string, number> = {}
  for (const r of statusRows as Row[]) statusCount[String(r.status)] = n(r.c)
  return {
    contenuti_per_status: statusCount,
    top_canali: (canaliRows as Row[]).map(r => ({ canale: r.canale, n: n(r.c) })),
    top_formati: (formatiRows as Row[]).map(r => ({ formato: r.formato, n: n(r.c) })),
    errori_pubblicazione: n((erroriRows[0] as Row)?.c),
    metriche_social: metrics[0] || {},
    ultimo_seo_score: (seo[0] as Row)?.score_globale ?? null,
    ultimo_seo_riepilogo: (seo[0] as Row)?.riepilogo ?? null,
    campagne_ads_periodo: n((ads[0] as Row)?.c),
    ads_piattaforme: (ads[0] as Row)?.plats ?? [],
  }
}

function totaleContenuti(dati: Row): number {
  const s = dati.contenuti_per_status as Record<string, number>
  return Object.values(s || {}).reduce((a, b) => a + b, 0)
}

const PROMPT = `Scrivi un REPORT ESECUTIVO al cliente, in italiano, tono professionale e chiaro (non tecnico-gergale), basato SOLO sui dati reali qui sotto. Non inventare numeri: usa quelli forniti; se un dato è 0 o assente, trattalo come tale.

BRAND: {{BRAND}}
PERIODO: {{PERIODO}} (dal {{DA}} al {{A}})

DATI REALI DEL PERIODO (JSON):
{{DATI}}

Struttura il report in 3 parti: cosa è stato fatto, risultati, prossimi passi.

${PRO_COPY_STANDARDS}

Output SOLO JSON valido:
{"titolo":"","executive_summary":"2-4 frasi di sintesi per il cliente","health":{"valutazione":"ottimo|buono|da_migliorare","note":""},"highlights":["risultato/attività di rilievo"],"bottlenecks":["colli di bottiglia / criticità reali"],"next_actions":[{"azione":"","priorita":"alta|media|bassa","perche":""}]}`

export async function eseguiReportPerCliente(
  clienteId: string,
  opts: { periodo?: 'settimanale' | 'mensile'; aiKeys?: AiKeys } = {},
): Promise<ReportResult> {
  const periodo = opts.periodo || 'mensile'
  const giorni = periodo === 'settimanale' ? 7 : 30
  const a = new Date()
  const da = new Date(a.getTime() - giorni * 86400000)
  const daISO = da.toISOString().split('T')[0]
  const aISO = a.toISOString().split('T')[0]

  const [brandRows, cliRows] = await Promise.all([
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
  ])
  const brand = (brandRows[0] as Row) || {}
  const cliente = (cliRows[0] as Row) || {}
  const nomeBrand = brandField(brand, 'nome', brandField(cliente, 'nome', 'il cliente'))
  const settore = brandField(brand, 'settore', brandField(cliente, 'settore', 'generico'))

  const dati = await raccogliDati(clienteId, daISO)
  // Niente report vuoto: se nel periodo non c'è stata ALCUNA attività, salta e segnala.
  if (totaleContenuti(dati) === 0 && n((dati.metriche_social as Row)?.post_misurati) === 0) {
    return { clienteId, ok: false, errore: `Nessuna attività nel periodo (${periodo}): report saltato.` }
  }

  const brandJson = JSON.stringify({ nome: nomeBrand, settore, piano: cliente.piano }, null, 2)
  const userPrompt = PROMPT
    .replace('{{BRAND}}', () => brandJson)
    .replace('{{PERIODO}}', () => periodo)
    .replace('{{DA}}', () => daISO)
    .replace('{{A}}', () => aISO)
    .replace('{{DATI}}', () => JSON.stringify(dati, null, 2))

  const model = opts.aiKeys?.model || 'gemini-2.5-flash'
  // Niente prosa finta su dati inventati: se l'AI fallisce l'errore si propaga.
  const raw = await callAI({
    model,
    systemPrompt: proSystemPrompt('consulente social senior che scrive un report chiaro al cliente', { settore, brand: nomeBrand, quality: 'alta' }) + '\nRispondi SOLO con JSON valido.',
    userPrompt,
    openrouterKey: opts.aiKeys?.openrouterKey,
    geminiKey: opts.aiKeys?.geminiKey,
    opencodeKey: opts.aiKeys?.opencodeKey,
    maxTokens: 3000,
    meta: { clienteId, tipo: 'report', agentName: 'report' },
  })
  const { data } = extractJSONChecked(raw)
  const parsed = (data as Row) || {}

  await q(
    `INSERT INTO report (cliente_id, periodo, periodo_da, periodo_a, titolo, contenuto, generato_da, fonte_generazione)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'agente_auto')`,
    [
      clienteId, periodo, daISO, aISO,
      (parsed.titolo as string) || `Report ${periodo} — ${nomeBrand}`,
      JSON.stringify({ executive: parsed, stats: dati }),
      model,
    ],
  )
  return { clienteId, ok: true }
}
