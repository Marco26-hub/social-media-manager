import { q } from '@/lib/db'
import { callAI, extractJSONChecked } from '@/lib/ai'
import { PRO_COPY_STANDARDS } from '@/lib/prompt-standards'

type Row = Record<string, unknown>

export type CompetitorResult = { clienteId: string; analisi: number; errori: string[] }
export type AiKeys = { model?: string; openrouterKey?: string; geminiKey?: string; opencodeKey?: string }

// SKILL: social media analyst senior. Analizza i competitor SALVATI del cliente e
// produce report azionabili (strategia, engagement, punti forza/debolezza, azioni per
// superarli), salvati in competitor_analysis. Anti-dati-finti: errore propagato.
const PROMPT = `Sei un social media analyst senior. Analizza i profili social di un competitor e produci un report dettagliato e azionabile.

BRAND CLIENTE:
{{BRAND}}

COMPETITOR:
Nome: {{COMPETITOR_NOME}}
Sito: {{COMPETITOR_SITO}}
Social: {{COMPETITOR_SOCIAL}}

Analizza: content strategy (tipo, temi, stile, tono); frequenza per piattaforma e orari; engagement stimato; hashtag strategy; punti di forza; punti deboli; 5 azioni concrete per il cliente per superarlo.

${PRO_COPY_STANDARDS}

Regole: non inventare metriche precise non deducibili; usa stime dichiarate come tali.

Output SOLO JSON valido:
{"competitor_nome":"","data_analisi":"YYYY-MM-DD","content_strategy":{"tipo":"","temi":[],"stile_visivo":"","tono_voce":""},"frequenza":{"instagram":"","facebook":"","tiktok":"","pinterest":"","migliori_ore":[]},"engagement":{"rate_stimato":"","tipo_interazioni":[],"crescita":"","note":""},"hashtag_strategy":{"principali":[],"branded":[],"note":""},"punti_forti":[],"punti_deboli":[],"miglioramenti_per_cliente":[{"azione":"","impatto":"","effort":"","canale":""}],"score_competitor":0,"gap_analysis":"","contenuti_suggeriti":[{"tema":"","formato":"","canale":"","perche":""}]}`

function toInt(v: unknown): number | null {
  const x = typeof v === 'number' ? v : Number(String(v).match(/\d+/)?.[0])
  return Number.isFinite(x) ? Math.round(x) : null
}

export async function eseguiCompetitorPerCliente(
  clienteId: string,
  opts: { aiKeys?: AiKeys } = {},
): Promise<CompetitorResult> {
  const [brandRows, competitorRows] = await Promise.all([
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM competitor WHERE cliente_id = $1 AND attivo = true ORDER BY created_at DESC LIMIT 10', [clienteId]),
  ])
  const brand = (brandRows[0] as Row) || {}
  const competitors = competitorRows as Row[]
  // Niente lista competitor → nulla da analizzare: salta e segnala (l'admin aggiunge
  // competitor dalla dashboard /dashboard/competitor).
  if (!competitors.length) {
    return { clienteId, analisi: 0, errori: ['Nessun competitor salvato: analisi saltata. Aggiungi competitor dalla dashboard.'] }
  }

  const brandJson = JSON.stringify(brand, null, 2)
  const model = opts.aiKeys?.model || 'gemini-2.5-flash'
  const errori: string[] = []
  let analisi = 0

  for (const comp of competitors) {
    const nome = String(comp.nome || '').trim()
    if (!nome) continue
    const social = Array.isArray(comp.social) ? (comp.social as unknown[]).map(String).join(', ') : 'non disponibile'
    try {
      // .replace con funzione: evita interpretazione di '$' nei dati brand/competitor.
      const userPrompt = PROMPT
        .replace('{{BRAND}}', () => brandJson)
        .replace('{{COMPETITOR_NOME}}', () => nome)
        .replace('{{COMPETITOR_SITO}}', () => String(comp.sito || 'non disponibile'))
        .replace('{{COMPETITOR_SOCIAL}}', () => social)
      const raw = await callAI({
        model,
        systemPrompt: 'Sei un social media analyst senior. Rispondi SOLO con JSON valido.',
        userPrompt,
        openrouterKey: opts.aiKeys?.openrouterKey,
        geminiKey: opts.aiKeys?.geminiKey,
        opencodeKey: opts.aiKeys?.opencodeKey,
        maxTokens: 4000,
        meta: { clienteId, tipo: 'competitor', agentName: 'competitor' },
      })
      const { data } = extractJSONChecked(raw)
      const parsed = (data as Row) || {}
      await q(
        `INSERT INTO competitor_analysis (cliente_id, competitor_id, competitor_nome, analisi, score_competitor, generato_da, fonte_generazione)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'agente_auto')`,
        [clienteId, comp.id, nome, JSON.stringify(parsed), toInt(parsed.score_competitor), model],
      )
      analisi++
    } catch (e) {
      errori.push(`${nome}: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`)
    }
  }

  return { clienteId, analisi, errori }
}
