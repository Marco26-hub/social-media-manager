import { q } from '@/lib/db'
import { callAI, extractJSONChecked } from '@/lib/ai'
import { PRO_COPY_STANDARDS, FUNNEL_STANDARDS } from '@/lib/prompt-standards'
import { resolveContentQuality, getQualityTokenBudget, summarizeQualityForPrompt } from '@/lib/content-quality'

type Row = Record<string, unknown>

export type AdsResult = { clienteId: string; campagne: number; errori: string[] }
export type AiKeys = { model?: string; openrouterKey?: string; geminiKey?: string; opencodeKey?: string }

// SKILL: ads specialist senior per piattaforma. Genera campagne complete (struttura,
// audience/ad group, copy, A/B, KPI, policy) e le salva in ads_campaign. Anti-dati
// -finti: se l'AI fallisce l'errore si propaga. Nessuna guardia di sessione.
const PROMPTS: Record<string, string> = {
  google: `Sei un Google Ads specialist senior. Crea una campagna pubblicitaria completa per questo brand.

BRAND: {{BRAND}}
PRODOTTO: {{PRODOTTO}}
OBIETTIVO: {{OBIETTIVO}}
BUDGET: {{BUDGET}}
QUALITÀ: {{QUALITY_CONTEXT}}

Crea: campaign structure (nome, tipo Search/Display/PMax, reti, budget giornaliero); 3-5 ad group con keyword; per ad group 3 headline (30 char) + 2 description (90 char); sitelink (4-6, 25 char); callout (4-6, 25 char); negative keyword; landing page per prodotto; ipotesi KPI, test A/B copy e controlli policy.

Output SOLO JSON valido:
{"campagna":{"nome":"","tipo":"","reti":"","budget_giornaliero":""},"ad_groups":[{"nome":"","keyword":[],"headlines":[],"descriptions":[]}],"sitelinks":[],"callouts":[],"negative_keywords":[],"landing_page":"","kpi_hypothesis":{"primary_metric":"","target":"","why":""},"ab_tests":[{"nome":"","ipotesi":"","variante_a":"","variante_b":""}],"policy_checks":[],"launch_checklist":[]}`,

  facebook: `Sei un Meta (Facebook/Instagram) Ads specialist senior. Crea una campagna pubblicitaria completa ad alto CTR.

BRAND: {{BRAND}}
PRODOTTO: {{PRODOTTO}}
OBIETTIVO: {{OBIETTIVO}}
BUDGET: {{BUDGET}}
QUALITÀ: {{QUALITY_CONTEXT}}

Crea: campaign (nome, obiettivo awareness/traffic/conversion, buying type); 3 audience (interesse, lookalike, retargeting con dettagli); per audience primary text (125 char), headline (40 char), description (30 char), CTA; creative format (immagine/video/carosello) + aspect ratio; placement (Feed/Stories/Reels/Explore); creative brief per formato, test A/B e KPI.

Output SOLO JSON valido:
{"campagna":{"nome":"","obiettivo":"","buying_type":""},"audience":[{"nome":"","tipo":"","dettaglio":"","eta":"","interessi":""}],"ad_copy":[{"audience":"","primary_text":"","headline":"","description":"","cta":"","formato_creativo":"","aspect_ratio":""}],"placement_consigliati":[],"note_strategia":"","creative_briefs":[{"formato":"","hook":"","visual":"","proof":"","cta":"","kpi_target":""}],"ab_tests":[{"nome":"","ipotesi":"","variante_a":"","variante_b":""}],"risk_flags":[],"launch_checklist":[]}`,

  tiktok: `Sei un TikTok Ads specialist senior. Crea una campagna pubblicitaria completa, video-first.

BRAND: {{BRAND}}
PRODOTTO: {{PRODOTTO}}
OBIETTIVO: {{OBIETTIVO}}
BUDGET: {{BUDGET}}
QUALITÀ: {{QUALITY_CONTEXT}}

Crea: campaign (nome, obiettivo reach/traffic/conversion, budget); 2-3 ad group con targeting; per ad group video script 15-30s, hook (overlay 3-5 parole), caption, CTA, durata; trend audio (mood/genere, non nome brano); hashtag (3-5 branded + 3-5 trending); storyboard, test A/B, KPI e controlli policy.

Output SOLO JSON valido:
{"campagna":{"nome":"","obiettivo":"","budget":""},"ad_groups":[{"nome":"","targeting_eta":"","interessi":[],"video_script":"","hook":"","caption":"","cta":"","durata_secondi":0}],"trend_audio_mood":"","hashtag":{"branded":[],"trending":[]},"note_creative":"","landing_page":"","storyboard":[{"secondi":"","azione":"","overlay":"","voiceover":""}],"kpi_hypothesis":{"primary_metric":"","target":"","why":""},"ab_tests":[{"nome":"","ipotesi":"","variante_a":"","variante_b":""}],"risk_flags":[],"launch_checklist":[]}`,
}

const SYSTEM: Record<string, string> = {
  google: 'Sei un Google Ads specialist senior. Crea campagne Search/Display performanti.',
  facebook: 'Sei un Meta Ads specialist senior. Crea campagne Facebook/Instagram ad alto CTR.',
  tiktok: 'Sei un TikTok Ads specialist senior. Crea campagne video creative e performanti.',
}

async function loadContext(clienteId: string): Promise<{ cliente: Row | null; brand: Row | null; prodotti: Row[]; canali: string[]; settings: Row[] }> {
  const [cli, br, prod, acc, set] = await Promise.all([
    q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q("SELECT * FROM prodotti WHERE cliente_id = $1 AND prodotto_attivo = 'SI' ORDER BY priorita NULLS LAST, created_at DESC LIMIT 5", [clienteId]),
    q("SELECT canale FROM account_social WHERE cliente_id = $1 AND attivo = 'SI'", [clienteId]),
    q('SELECT chiave, valore FROM settings WHERE cliente_id = $1', [clienteId]),
  ])
  const canali = [...new Set((acc as Row[]).map(r => String(r.canale || '').trim().toLowerCase()).filter(Boolean))]
  return { cliente: (cli[0] as Row) || null, brand: (br[0] as Row) || null, prodotti: prod as Row[], canali, settings: set as Row[] }
}

// Piattaforme ad su cui il cliente è realmente presente/attivabile (non a caso):
// Meta se ha FB/IG, TikTok se ha TikTok, Google se ha un sito. Fallback: facebook.
function piattaformeAds(canali: string[], hasSito: boolean): string[] {
  const set = new Set<string>()
  if (canali.includes('facebook') || canali.includes('instagram')) set.add('facebook')
  if (canali.includes('tiktok')) set.add('tiktok')
  if (hasSito) set.add('google')
  if (!set.size) set.add('facebook')
  return [...set]
}

function settingVal(settings: Row[], chiave: string): string | undefined {
  const v = settings.find(s => s.chiave === chiave)?.valore
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

async function saveAdsCampaign(clienteId: string, platform: string, obiettivo: string, budget: string, brandSource: string, parsed: Row, model: string): Promise<void> {
  await q(
    `INSERT INTO ads_campaign (cliente_id, platform, obiettivo, budget, brand_source, campagna, generato_da, fonte_generazione)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, 'agente_auto')`,
    [clienteId, platform, obiettivo, budget, brandSource, JSON.stringify(parsed), model],
  )
}

export async function eseguiAdsPerCliente(
  clienteId: string,
  opts: { platforms?: string[]; obiettivo?: string; budget?: string; aiKeys?: AiKeys } = {},
): Promise<AdsResult> {
  const { cliente, brand, prodotti, canali, settings } = await loadContext(clienteId)
  const cliObj: Row = cliente || {}
  // Senza brand niente campagna reale: salta e segnala.
  if (!brand) {
    return { clienteId, campagne: 0, errori: ['Brand non configurato: campagne Ads saltate.'] }
  }
  const hasSito = Boolean((typeof brand.sito_url === 'string' && brand.sito_url) || cliObj.blog_domain)
  const platforms = opts.platforms?.length ? opts.platforms : piattaformeAds(canali, hasSito)
  const obiettivo = opts.obiettivo || settingVal(settings, 'ads_obiettivo') || 'conversion'
  const budget = opts.budget || settingVal(settings, 'ads_budget') || 'Da definire'
  const quality = resolveContentQuality({ piano: cliObj.piano })
  const maxTokens = getQualityTokenBudget(quality)
  const qualityContext = summarizeQualityForPrompt(quality)
  const prodottiJson = JSON.stringify(prodotti.slice(0, 5), null, 2)
  const brandJson = JSON.stringify({ ...brand, prodotti_attivi: prodotti.slice(0, 5) }, null, 2)

  const errori: string[] = []
  let campagne = 0

  for (const platform of platforms) {
    const tmpl = PROMPTS[platform]
    if (!tmpl) { errori.push(`${platform}: piattaforma non supportata`); continue }
    try {
      // .replace con funzione: evita interpretazione di '$' nei dati brand/prodotto.
      const userPrompt = tmpl
        .replace('{{BRAND}}', () => brandJson)
        .replace('{{PRODOTTO}}', () => prodottiJson)
        .replace('{{OBIETTIVO}}', () => obiettivo)
        .replace('{{BUDGET}}', () => budget)
        .replace('{{QUALITY_CONTEXT}}', () => qualityContext)
        + '\n\n' + PRO_COPY_STANDARDS + '\n\n' + FUNNEL_STANDARDS
      const model = opts.aiKeys?.model || 'gemini-2.5-flash'
      const raw = await callAI({
        model,
        systemPrompt: `${SYSTEM[platform]} Livello qualità: ${quality}. Grammatica e ortografia italiane impeccabili. Non inventare dati non forniti; formula ipotesi misurabili. Rispondi SOLO con JSON valido.`,
        userPrompt,
        openrouterKey: opts.aiKeys?.openrouterKey,
        geminiKey: opts.aiKeys?.geminiKey,
        opencodeKey: opts.aiKeys?.opencodeKey,
        maxTokens,
        meta: { clienteId, tipo: 'ads', agentName: 'ads' },
      })
      const { data } = extractJSONChecked(raw)
      const parsed = (data as Row) || {}
      await saveAdsCampaign(clienteId, platform, obiettivo, budget, 'auto', parsed, model)
      campagne++
    } catch (e) {
      errori.push(`${platform}: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`)
    }
  }

  return { clienteId, campagne, errori }
}
