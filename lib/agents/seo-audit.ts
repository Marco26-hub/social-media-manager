import { q } from '@/lib/db'
import { callAI, extractJSONChecked } from '@/lib/ai'
import { SEO_GEO_STANDARDS } from '@/lib/prompt-standards'

type Row = Record<string, unknown>

export type SeoAuditResult = { clienteId: string; ok: boolean; scoreMancanti: string[]; errore?: string }
export type AiKeys = { model?: string; openrouterKey?: string; geminiKey?: string; opencodeKey?: string }

// SKILL dell'agente: auditor SEO + GEO senior. Analizza brand + contenuti reali +
// log pubblicazioni e produce un audit con score e miglioramenti concreti, salvato
// in `seo_audit`. Anti-punteggi-finti: se l'AI fallisce si propaga l'errore (niente
// score inventati che inquinano la cronologia). Nessuna guardia di sessione: il
// clienteId arriva già validato dall'endpoint cron.
const PROMPT = `Sei SEO + GEO auditor senior. Analizza performance e crea un audit con miglioramenti concreti e verificabili.

BRAND:
{{BRAND}}

PERIODO: {{PERIODO}}

CONTENUTI (ultimi dal calendario):
{{CONTENUTI}}

LOG PUBBLICAZIONI:
{{LOG}}

Aree da valutare: SEO tecnico, SEO contenuti, GEO/AI search, coerenza social, E-E-A-T, performance.

${SEO_GEO_STANDARDS}

Regole: non inventare metriche non deducibili dai dati; se un dato manca, dillo nel riepilogo invece di stimarlo come reale.

Output SOLO JSON valido, nessun altro testo:
{"data_audit":"YYYY-MM-DD","periodo":"","score_globale":0,"score_seo_tecnico":0,"score_seo_contenuti":0,"score_geo_ai_search":0,"score_social_coerenza":0,"score_eeat":0,"score_performance_social":0,"riepilogo":"","punti_forti":[],"punti_critici":[],"miglioramenti":[{"area":"","azione":"","impatto":"","effort":"","deadline_suggerita":""}],"kpi_da_monitorare":[{"metrica":"","valore_attuale":"","target":""}],"contenuti_suggeriti":[{"tema":"","formato":"","canale":"","priorita":""}]}`

// Parser score robusto: numero o stringa ("72", "72/100") → 72; null se assente/non
// interpretabile (per non salvare uno 0 finto indistinguibile da un reale 0).
function toScore(...candidates: unknown[]): number | null {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c
    if (typeof c === 'string') {
      const m = c.match(/\d+(?:[.,]\d+)?/)
      if (m) return Number(m[0].replace(',', '.'))
    }
  }
  return null
}

// Salva l'audit in seo_audit. Ritorna l'elenco dei campi score mancanti (audit
// parziale segnalato, non finto). Stessa struttura del salvataggio manuale.
async function saveAudit(clienteId: string, periodo: string, parsed: Row, model: string): Promise<string[]> {
  const scores = (parsed.scores || {}) as Row
  const scoreFields: Array<[string, unknown, unknown]> = [
    ['score_globale', parsed.score_globale, scores.globale],
    ['score_seo_tecnico', parsed.score_seo_tecnico, scores.seo_tecnico],
    ['score_seo_contenuti', parsed.score_seo_contenuti, scores.seo_contenuti],
    ['score_geo_ai_search', parsed.score_geo_ai_search, scores.geo_ai_search],
    ['score_social_coerenza', parsed.score_social_coerenza, scores.social_coerenza],
    ['score_eeat', parsed.score_eeat, scores.eeat],
    ['score_performance_social', parsed.score_performance_social, scores.performance_social],
  ]
  const values = new Map<string, number | null>()
  const missing: string[] = []
  for (const [name, a, b] of scoreFields) {
    const v = toScore(a, b)
    if (v === null) missing.push(name)
    values.set(name, v)
  }

  await q(
    `INSERT INTO seo_audit (
      cliente_id, data_audit, periodo, score_globale,
      score_seo_tecnico, score_seo_contenuti, score_geo_ai_search,
      score_social_coerenza, score_eeat, score_performance_social,
      riepilogo, punti_forti, punti_critici, miglioramenti,
      kpi_da_monitorare, contenuti_suggeriti, generato_da
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17
    )`,
    [
      clienteId,
      (parsed.data_audit as string) || new Date().toISOString().split('T')[0],
      periodo,
      values.get('score_globale') ?? 0,
      values.get('score_seo_tecnico') ?? 0,
      values.get('score_seo_contenuti') ?? 0,
      values.get('score_geo_ai_search') ?? 0,
      values.get('score_social_coerenza') ?? 0,
      values.get('score_eeat') ?? 0,
      values.get('score_performance_social') ?? 0,
      (parsed.riepilogo as string) || '',
      (parsed.punti_forti || []) as string[],
      (parsed.punti_critici || []) as string[],
      JSON.stringify(parsed.miglioramenti || parsed.miglioramenti_prioritari || []),
      JSON.stringify(parsed.kpi_da_monitorare || []),
      JSON.stringify(parsed.contenuti_suggeriti || []),
      model,
    ],
  )
  return missing
}

export async function eseguiSeoAuditPerCliente(
  clienteId: string,
  opts: { periodo?: string; aiKeys?: AiKeys } = {},
): Promise<SeoAuditResult> {
  const periodo = opts.periodo || 'settimanale'
  const [brandRows, calendario, logs, cliRows] = await Promise.all([
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM calendario WHERE cliente_id = $1 ORDER BY data_pubblicazione DESC LIMIT 30', [clienteId]),
    q('SELECT * FROM log_pubblicazioni WHERE cliente_id = $1 ORDER BY timestamp DESC LIMIT 30', [clienteId]),
    q('SELECT blog_domain FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
  ])
  const brand = (brandRows[0] as Row) || null
  // Senza brand non c'è materia per un audit reale: salta e segnala (niente audit vuoto).
  if (!brand) {
    return { clienteId, ok: false, scoreMancanti: [], errore: 'Brand non configurato: audit SEO saltato.' }
  }
  const sitoUrl = (typeof brand.sito_url === 'string' && brand.sito_url) || (cliRows[0]?.blog_domain as string) || ''

  // .replace con FUNZIONE: evita che eventuali `$` nei dati brand vengano interpretati
  // come pattern di sostituzione ($1, $&...). Più robusto del replace con stringa.
  const userPrompt = PROMPT
    .replace('{{BRAND}}', () => JSON.stringify({ ...brand, sito_url: sitoUrl }, null, 2))
    .replace('{{PERIODO}}', () => periodo)
    .replace('{{CONTENUTI}}', () => JSON.stringify(calendario || [], null, 2))
    .replace('{{LOG}}', () => JSON.stringify(logs || [], null, 2))

  const model = opts.aiKeys?.model || 'gemini-2.5-flash'
  // Niente score finti: se l'AI fallisce, l'errore si propaga (catturato dall'endpoint).
  const raw = await callAI({
    model,
    systemPrompt: 'Sei un auditor SEO/GEO senior. Rispondi con JSON valido, nessun altro testo.',
    userPrompt,
    openrouterKey: opts.aiKeys?.openrouterKey,
    geminiKey: opts.aiKeys?.geminiKey,
    opencodeKey: opts.aiKeys?.opencodeKey,
    maxTokens: 5000,
    meta: { clienteId, tipo: 'seo_audit', agentName: 'seo' },
  })
  const { data } = extractJSONChecked(raw)
  const parsed = (data as Row) || {}
  const scoreMancanti = await saveAudit(clienteId, periodo, parsed, model)
  return { clienteId, ok: true, scoreMancanti }
}
