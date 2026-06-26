import type { ContentQuality } from '@/lib/content-quality'

export type ProductionCycleStage = {
  id: string
  title: string
  input: string
  output: string
  qualityGate: string
}

export const GENERATION_OPTIMIZATION_CYCLE: ProductionCycleStage[] = [
  {
    id: 'brief',
    title: 'Brief cliente',
    input: 'brand identity, prodotti, asset, obiettivo, vincoli legali',
    output: 'angolo creativo, audience, funnel stage, messaggio chiave',
    qualityGate: 'nessun claim/prezzo/stock inventato; input mancanti esplicitati',
  },
  {
    id: 'creative',
    title: 'Concept creativo',
    input: 'brief + canale + formato + qualità pacchetto',
    output: 'hook, caption, CTA, template, layout, asset richiesti',
    qualityGate: 'contenuto platform-native, producibile e coerente con brand',
  },
  {
    id: 'production',
    title: 'Produzione asset',
    input: 'immagini/video cliente, template, safe-zone, storyboard',
    output: 'creative brief eseguibile, scene/slide/frame, alt text',
    qualityGate: 'formato corretto, accessibilità, media validi, fallback asset',
  },
  {
    id: 'review',
    title: 'Review qualità',
    input: 'contenuto generato + brand rules + checklist',
    output: 'score, rischi, fix copy/visual, readiness approvazione',
    qualityGate: 'score minimo consigliato 80/100 prima della pubblicazione',
  },
  {
    id: 'publish',
    title: 'Pubblicazione',
    input: 'APPROVATO, media pubblici, account social connessi',
    output: 'scheduled/published, log tecnico, errori tracciati',
    qualityGate: 'se scheduling fallisce, fallback manuale e log leggibile',
  },
  {
    id: 'learn',
    title: 'Ottimizzazione',
    input: 'KPI, commenti, salvataggi, CTR, errori, top/worst content',
    output: 'azioni prossima iterazione, A/B test, template vincenti',
    qualityGate: 'ogni ciclo produce almeno 3 decisioni operative misurabili',
  },
]

export function normalizeProductionCycleStage(value: unknown, fallback: ProductionCycleStage['id'] = 'review') {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, '')
  if (normalized.includes('brief')) return 'brief'
  if (normalized.includes('concept') || normalized.includes('creative') || normalized.includes('creativ')) return 'creative'
  if (normalized.includes('production') || normalized.includes('produzione') || normalized.includes('asset')) return 'production'
  if (normalized.includes('review') || normalized.includes('revisione') || normalized.includes('score')) return 'review'
  if (normalized.includes('publish') || normalized.includes('pubblic')) return 'publish'
  if (normalized.includes('learn') || normalized.includes('ottim') || normalized.includes('iter')) return 'learn'
  return fallback
}

export function buildGenerationOptimizationCyclePrompt(quality: ContentQuality): string {
  const depth =
    quality === 'high'
      ? 'massima profondità: includi ipotesi KPI, A/B test, rischi, fallback, prossima iterazione e criteri di successo'
      : quality === 'medium'
        ? 'profondità operativa: includi KPI, checklist, rischi principali e azioni di miglioramento'
        : 'profondità essenziale: includi checklist minima, rischio principale e prossimo passo'

  return `CICLO GENERAZIONE E OTTIMIZZAZIONE
Ogni contenuto deve seguire questo ciclo chiuso: brief → concept → produzione → review → pubblicazione → ottimizzazione.
Livello richiesto: ${depth}.

Step operativi:
${GENERATION_OPTIMIZATION_CYCLE.map((stage, index) => `${index + 1}. ${stage.title}: input=${stage.input}; output=${stage.output}; gate=${stage.qualityGate}.`).join('\n')}

Campi obbligatori per rendere il ciclo misurabile:
- production_cycle_stage: step corrente suggerito per il contenuto.
- optimization_cycle: oggetto con hypothesis, metric_to_watch, learning_signal, next_test, fallback_action.
- performance_hypothesis: ipotesi realistica su cosa dovrebbe migliorare e perché.
- next_iteration_actions: 3 azioni concrete per migliorare il prossimo contenuto dopo i dati.
- content_checklist: controlli pre-pubblicazione davvero operativi.`
}
