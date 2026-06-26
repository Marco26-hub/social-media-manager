import { buildGenerationOptimizationCyclePrompt } from '@/lib/production-cycle'

export type ContentQuality = 'soft' | 'medium' | 'high'

export const CONTENT_QUALITY_OPTIONS: { value: 'auto' | ContentQuality; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto pacchetto', desc: 'Usa il livello corretto dal piano cliente' },
  { value: 'soft', label: 'Soft', desc: 'Output pronto, essenziale e veloce' },
  { value: 'medium', label: 'Medium', desc: 'Strategia, varianti e produzione chiara' },
  { value: 'high', label: 'High / Elite', desc: 'Brief completo, KPI, A/B e rischi' },
]

const PLAN_TO_QUALITY: Record<string, ContentQuality> = {
  free: 'soft',
  starter: 'soft',
  base: 'soft',
  presenza: 'soft',
  standard: 'soft',
  pro: 'medium',
  growth: 'medium',
  crescita: 'medium',
  business: 'medium',
  agency: 'high',
  premium: 'high',
  elite: 'high',
  dominio: 'high',
  ecommerce: 'high',
  enterprise: 'high',
}

const QUALITY_RANK: Record<ContentQuality, number> = {
  soft: 1,
  medium: 2,
  high: 3,
}

const QUALITY_RULES: Record<ContentQuality, string[]> = {
  soft: [
    'Crea un contenuto pulito, pubblicabile e coerente con il brand.',
    'Includi hook, caption, hashtag, CTA, idea visual, alt text e una checklist minima.',
    'Usa 1 angolo creativo, 1 CTA e massimo 1 variante se utile.',
    'Evidenzia input mancanti solo se bloccano davvero la produzione.',
  ],
  medium: [
    'Crea un contenuto platform-native con razionale strategico, pubblico, funnel e KPI.',
    'Includi 3 hook alternativi, 2 CTA, proof points e note produzione utilizzabili da creator/designer.',
    'Per video/reel/story dettaglia scene, timing, overlay, voiceover e mood audio.',
    'Aggiungi rischi compliance, accessibilità e fallback se asset/prodotto non sono completi.',
  ],
  high: [
    'Lavora come creative strategist elite: insight audience, angle ladder, proof, conversion path e ipotesi di risultato.',
    'Includi 5 hook alternativi, 3 CTA, 2 varianti A/B, KPI target, expected outcome e criteri di successo.',
    'Per video/reel/story produci storyboard frame-by-frame con hook nei primi secondi, ritmo, audio, overlay, CTA e safe-zone.',
    'Per carousel/blog/pin produci struttura, microcopy, visual direction, SEO/search intent e salvataggio/condivisione.',
    'Dichiara rischi, claim non verificabili, dati mancanti e checklist pre-pubblicazione completa.',
  ],
}

const PLATFORM_RULES: Record<string, string[]> = {
  instagram: [
    'Formato mobile-first; per Reel e Story usa 9:16, testo leggibile e hook immediato.',
    'Per Reel: apertura visiva nei primi 2-3 secondi, ritmo rapido, caption corta ma utile, CTA non invadente.',
    'Per carousel: slide 1 salva-scroll, una promessa per slide, finale con CTA e motivo per salvare/condividere.',
    'Per Story: 3-5 frame con sticker/interazione, link o DM trigger, testo breve in safe zone.',
  ],
  facebook: [
    'Copy più esplicativo di Instagram, CTA chiara e link diretto quando disponibile.',
    'Per video: contesto rapido, dimostrazione, benefici e social proof; sottotitoli o overlay chiari.',
    'Evita hashtag eccessivi; privilegia chiarezza, community e traffico al sito.',
  ],
  tiktok: [
    'Contenuto nativo, verticale 9:16, hook immediato, ritmo veloce e linguaggio da creator.',
    'Mostra il prodotto in uso, non come spot; usa format riconoscibili, pattern interrupt e payoff.',
    'Prevedi caption breve, keyword naturali, hashtag mirati e audio/mood trend-aware senza inventare brani specifici.',
  ],
  pinterest: [
    'Pin verticale 2:3, visual chiaro, titolo leggibile e descrizione keyword-first.',
    'Obiettivo: salvataggio e traffico; includi search intent, keyword long-tail e CTA discreta.',
    'Il visual deve comunicare valore anche senza leggere la caption.',
  ],
  linkedin: [
    'Prima riga forte e professionale; insight, dato, esperienza o tesi controintuitiva.',
    'No vendita aggressiva: posizionamento, autorevolezza e conversazione qualificata.',
    'Chiudi con domanda utile o take-away operativo.',
  ],
  youtube_shorts: [
    'Short verticale 9:16 con promessa chiara nel titolo e nei primi 3 secondi.',
    'Struttura utile/searchable: problema, soluzione, dimostrazione, CTA soft.',
    'Includi title SEO, descrizione breve, tag/keyword e script leggibile anche senza audio.',
  ],
  blog: [
    'Contenuto people-first, utile, verificabile, con risposta diretta all’intento di ricerca.',
    'Struttura SEO/GEO: H1, meta, H2, liste, FAQ, internal link, E-E-A-T e claim non inventati.',
    'Aggiungi angolo editoriale, keyword target, proof points e CTA coerente con prodotti/servizi.',
  ],
}

const FORMAT_RULES: Record<string, string[]> = {
  post: ['Hook forte, caption leggibile, CTA chiara, visual direction e alt text.'],
  carousel: ['Slide-by-slide: cover, promessa, valore progressivo, prova, recap, CTA finale.'],
  reel: ['Storyboard con timing, hook 0-2s, overlay, voiceover, transizioni, CTA e caption video.'],
  story: ['Sequenza frame, sticker/interazione, copy corto, link/DM trigger, safe-zone.'],
  video: ['Script con scene, voiceover, sottotitoli/overlay, proof e CTA visiva.'],
  short: ['Hook 0-3s, payoff veloce, title SEO, descrizione e tag.'],
  pin: ['Titolo visual, keyword, layout 2:3, CTA salvataggio/traffico e descrizione SEO.'],
  articolo: ['Brief SEO/GEO, outline, FAQ, link interni, E-E-A-T e asset editoriali.'],
}

export function normalizeContentQuality(value: unknown): ContentQuality | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === 'auto') return null
  if (['soft', 'base', 'starter', 'low', 'bassa'].includes(normalized)) return 'soft'
  if (['medium', 'medio', 'media', 'standard', 'pro', 'growth'].includes(normalized)) return 'medium'
  if (['high', 'hight', 'alta', 'elite', 'premium', 'agency', 'enterprise', 'dominio'].includes(normalized)) return 'high'
  return null
}

export function resolveContentQuality(input: { requestedQuality?: unknown; piano?: unknown }): ContentQuality {
  const requested = normalizeContentQuality(input.requestedQuality)
  if (typeof input.piano === 'string') {
    const planQuality = PLAN_TO_QUALITY[input.piano.trim().toLowerCase()] ?? 'medium'
    if (!requested) return planQuality
    return QUALITY_RANK[requested] <= QUALITY_RANK[planQuality] ? requested : planQuality
  }
  return requested ?? 'medium'
}

export function getPlanQualityCap(piano: unknown): ContentQuality {
  if (typeof piano !== 'string') return 'medium'
  return PLAN_TO_QUALITY[piano.trim().toLowerCase()] ?? 'medium'
}

export function isQualityDowngraded(requestedQuality: unknown, appliedQuality: ContentQuality): boolean {
  const requested = normalizeContentQuality(requestedQuality)
  return Boolean(requested && QUALITY_RANK[requested] > QUALITY_RANK[appliedQuality])
}

export function getQualityLabel(quality: ContentQuality): string {
  if (quality === 'soft') return 'Soft'
  if (quality === 'medium') return 'Medium'
  return 'High / Elite'
}

export function getQualityTokenBudget(quality: ContentQuality): number {
  if (quality === 'high') return 6500
  if (quality === 'medium') return 5200
  return 4000
}

export function buildQualityContext(args: {
  quality: ContentQuality
  canale: string
  formato: string
  obiettivo?: string | null
}): string {
  const platformRules = PLATFORM_RULES[args.canale] ?? PLATFORM_RULES.instagram
  const formatRules = FORMAT_RULES[args.formato] ?? FORMAT_RULES.post
  return `SISTEMA QUALITÀ CONTENUTO
Livello richiesto: ${getQualityLabel(args.quality)}
Obiettivo operativo: ${args.obiettivo || 'mix awareness/conversion'}

Regole qualità:
${QUALITY_RULES[args.quality].map(rule => `- ${rule}`).join('\n')}

Best practice ${args.canale}:
${platformRules.map(rule => `- ${rule}`).join('\n')}

Best practice formato ${args.formato}:
${formatRules.map(rule => `- ${rule}`).join('\n')}

Regole anti-allucinazione:
- Non inventare prezzi, sconti, stock, claim sanitari/legali o risultati garantiti.
- Se un dato manca, mettilo in missing_inputs e usa un fallback sicuro.
- Ogni CTA deve essere compatibile con canale, funnel e disponibilità link.
- Ogni contenuto deve includere accessibility/alt text e note compliance.
- Ogni contenuto deve proporre un template/layout producibile, con asset necessari e formato esatto.

${buildGenerationOptimizationCyclePrompt(args.quality)}`
}

export function buildExtendedOutputSchema(): string {
  return `{
  "quality_level": "soft|medium|high",
  "audience_segment": "segmento target specifico",
  "funnel_stage": "awareness|consideration|conversion|loyalty|community",
  "angle": "angolo creativo principale",
  "primary_message": "messaggio chiave in una frase",
  "proof_points": ["beneficio/prova verificabile 1", "beneficio/prova verificabile 2"],
  "hook": "hook principale",
  "hook_variants": ["hook alternativo 1", "hook alternativo 2"],
  "caption": "caption principale pronta da pubblicare",
  "caption_long": "versione estesa se utile",
  "hashtag": "hashtag già formattati",
  "cta": "CTA principale",
  "cta_variants": ["CTA alternativa 1", "CTA alternativa 2"],
  "idea_visual": "visual direction completa",
  "creative_brief": "brief per designer/creator con mood, inquadratura, asset e priorità",
  "template_id": "template operativo suggerito, es: ig-reel-hook-proof-cta",
  "template_style": "minimal|editorial|ugc|premium|bold|educational",
  "layout_spec": {"aspect_ratio":"","safe_zone":"","grid":"","visual_hierarchy":[""]},
  "asset_requirements": [{"asset":"foto prodotto","required":true,"note":"formato/uso"}],
  "scenes": [{"numero":1,"secondi":"0-3","descrizione":"","overlay_testo":"","voiceover":""}],
  "slides": [{"numero":1,"titolo":"","testo":"","visual":"","obiettivo_slide":""}],
  "overlay_text": "testo overlay principale",
  "alt_text": "alt text accessibile",
  "tags": ["keyword/tag piattaforma"],
  "thumbnail_url": "",
  "voiceover_script": "script parlato se formato video",
  "music_mood": "mood audio, non brano inventato",
  "platform_best_practices": ["regola applicata 1", "regola applicata 2"],
  "ab_variants": [{"nome":"A","ipotesi":"","hook":"","cta":"","differenza_creativa":""}],
  "kpi_target": "metrica primaria da monitorare",
  "expected_outcome": "ipotesi di risultato realistica, non promessa",
  "production_cycle_stage": "brief|creative|production|review|publish|learn",
  "optimization_cycle": {
    "hypothesis": "ipotesi da validare",
    "metric_to_watch": "metrica primaria",
    "learning_signal": "segnale che indica successo o problema",
    "next_test": "test successivo consigliato",
    "fallback_action": "cosa fare se asset/dati/performance mancano"
  },
  "performance_hypothesis": "perché questo contenuto dovrebbe funzionare",
  "next_iteration_actions": ["azione concreta 1", "azione concreta 2", "azione concreta 3"],
  "compliance_notes": "note legali/claim/privacy/accessibilità",
  "risk_flags": ["rischio o controllo necessario"],
  "production_notes": "cosa serve per produrre/pubblicare bene",
  "missing_inputs": ["dato mancante se presente"],
  "content_checklist": ["hook chiaro", "CTA verificata", "asset in formato corretto"],
  "status": "DA_APPROVARE"
}`
}

export function pickText(parsed: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = parsed[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value) && value.length) return value.map(item => String(item)).join('\n')
  }
  return ''
}

export function pickJson(parsed: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = parsed[key]
    if (value === undefined || value === null || value === '') continue
    return value
  }
  return null
}

export function jsonbParam(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      return JSON.stringify([trimmed])
    }
  }
  return JSON.stringify(value)
}

export function summarizeQualityForPrompt(quality: ContentQuality): string {
  if (quality === 'soft') return 'Soft: contenuto essenziale, pronto da approvare, senza strategia eccessiva.'
  if (quality === 'medium') return 'Medium: contenuto strategico con varianti, KPI, produzione e controlli.'
  return 'High / Elite: contenuto profondo con brief completo, A/B test, KPI, rischi, storyboard e checklist.'
}
