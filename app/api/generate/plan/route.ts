import { NextResponse } from 'next/server'
import { callAI, extractJSONArray } from '@/lib/ai'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { demoContenuti } from '@/lib/demo-data'
import {
  buildExtendedOutputSchema,
  jsonbParam,
  normalizeContentQuality,
  pickJson,
  pickText,
  resolveContentQuality,
  summarizeQualityForPrompt,
  isQualityDowngraded,
} from '@/lib/content-quality'
import { getClientGenerationContext } from '@/lib/client-context'
import { buildGenerationOptimizationCyclePrompt, normalizeProductionCycleStage } from '@/lib/production-cycle'

const PROMPT_WEEKLY = `Agisci come Social Media Manager senior per brand abbigliamento e-commerce.
Crea piano editoriale SETTIMANALE (7 giorni) per {{PIATTAFORME}}.
Genera 7-10 contenuti.

BRAND:
{{BRAND}}

PRODOTTI:
{{PRODOTTI}}

Distribuzione: alterna mattina (9-11) e sera (18-21).
Lunedi/giovedi = inspiration, venerdi = vendita/promo, weekend = community/lifestyle.
Non concentrare prodotti in pochi giorni.
Tono moderno fashion coerente con brand.

Output SOLO JSON array valido:
[{"data_pubblicazione":"YYYY-MM-DD","ora_pubblicazione":"HH:MM","canale":"instagram|facebook|tiktok|pinterest|youtube_shorts","formato":"post|carousel|reel|story|pin|short|video","obiettivo":"vendita|awareness|community|educazione|ispirazione|trending","product_id":"","nome_prodotto":"","tema":"","hook":"","caption":"","hashtag":"","cta":""}]`

const PROMPT_MONTHLY = `Agisci come Social Media Manager senior per brand abbigliamento e-commerce.
Crea piano editoriale MENSILE (30 giorni) per {{PIATTAFORME}}.
Genera 25-35 contenuti.

BRAND:
{{BRAND}}

PRODOTTI:
{{PRODOTTI}}

Distribuzione: 4-5 post Instagram/sett, 2-3 carousel/mese, 4-6 reel/mese, 2-3 post Facebook/sett, 5-8 pin Pinterest, 2-4 YouTube Shorts/mese.
Alterna mattina (9-11) e sera (18-21).
Lunedi/giovedi = inspiration, venerdi = vendita/promo, weekend = community/lifestyle.
Non concentrare prodotti in pochi giorni.
Tono moderno fashion coerente con brand.

Output SOLO JSON array valido:
[{"data_pubblicazione":"YYYY-MM-DD","ora_pubblicazione":"HH:MM","canale":"instagram|facebook|tiktok|pinterest|youtube_shorts","formato":"post|carousel|reel|story|pin|short|video","obiettivo":"vendita|awareness|community|educazione|ispirazione|trending","product_id":"","nome_prodotto":"","tema":"","hook":"","caption":"","hashtag":"","cta":""}]`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, piattaforme, obiettivo, model, openrouter_key, periodo, quality, quality_level, post_quality, qualita } = await request.json()
    if (!piattaforme?.length) {
      return NextResponse.json({ error: 'piattaforme richieste' }, { status: 400 })
    }
    const clientContext = await getClientGenerationContext(cliente_id)
    const effectiveClienteId = clientContext.clienteId
    if (!effectiveClienteId) return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 })
    await requireClienteAccess(effectiveClienteId)
    const requestedQuality = quality ?? quality_level ?? post_quality ?? qualita
    if (isDemo() || !dbReady()) {
      const demoQuality = resolveContentQuality({ requestedQuality })
      const selectedPlatforms = new Set<string>(piattaforme)
      const count = demoContenuti.filter((item) => selectedPlatforms.has(item.canale)).length || (periodo === 'mensile' ? 30 : 7)
      return NextResponse.json({
        ok: true,
        demo: true,
        count,
        quality_level: demoQuality,
        quality_downgraded: isQualityDowngraded(requestedQuality, demoQuality),
        warning: 'Fallback demo: DATABASE_URL non configurato, piano non persistito su Neon.',
      })
    }

    const [brandRows, products, clientRows] = await Promise.all([
      q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [effectiveClienteId]),
      q('SELECT * FROM prodotti WHERE cliente_id = $1', [effectiveClienteId]),
      q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [effectiveClienteId]),
    ])
    const brand = brandRows[0] ?? null
    const client = (clientRows[0] ?? null) as Record<string, unknown> | null
    const contentQuality = resolveContentQuality({ requestedQuality, piano: client?.piano })

    const promptTemplate = periodo === 'mensile' ? PROMPT_MONTHLY : PROMPT_WEEKLY
    const piattaformeStr = piattaforme.join(', ')
    const qualityPrompt = `

QUALITÀ OPERATIVA:
${summarizeQualityForPrompt(contentQuality)}

Per ogni contenuto del piano NON limitarti a idea/caption: includi anche audience_segment, funnel_stage, angle, primary_message, proof_points, hook_variants, cta_variants, creative_brief, template_id, template_style, layout_spec, asset_requirements, production_notes, compliance_notes, risk_flags, platform_best_practices, ab_variants, kpi_target, expected_outcome, missing_inputs, content_checklist.
Per Reel/Short/Video includi scenes con timing. Per Story includi frames o scenes. Per Carousel includi slides.
${buildGenerationOptimizationCyclePrompt(contentQuality)}
Schema operativo extra per ogni item:
${buildExtendedOutputSchema()}
`

    const userPrompt = promptTemplate
      .replace('{{PIATTAFORME}}', `/ ${piattaformeStr} /`)
      .replace('{{BRAND}}', JSON.stringify(brand || {}, null, 2))
      .replace('{{PRODOTTI}}', JSON.stringify(products || [], null, 2))
      + qualityPrompt

    const aiRes = await callAI({
      model: model || 'claude-sonnet-4-6',
      systemPrompt: `Sei un social media manager e creative strategist senior. Obiettivo: ${obiettivo || 'mix'}. Livello qualità: ${contentQuality}. Rispondi con JSON array valido, nessun altro testo. Non inventare prezzi, stock o claim non presenti nei dati.`,
      userPrompt,
      openrouterKey: openrouter_key,
      maxTokens: contentQuality === 'high' ? 6000 : contentQuality === 'medium' ? 4500 : 3000,
    })

    const items = extractJSONArray(aiRes) as Record<string, unknown>[]
    const inseriti: { id_contenuto: string; canale: string; data_pubblicazione: string }[] = []

    for (const item of items) {
      const id_contenuto = `C${Date.now().toString(36).toUpperCase()}_${inseriti.length}`
      const itemQuality = normalizeContentQuality(item.quality_level) ?? contentQuality
      const insertColumns = [
        'cliente_id', 'id_contenuto', 'data_pubblicazione', 'ora_pubblicazione',
        'canale', 'formato', 'obiettivo', 'product_id', 'nome_prodotto',
        'tema', 'hook', 'caption', 'hashtag', 'cta', 'status',
        'scenes_json', 'slides_json', 'overlay_text', 'alt_text', 'tags',
        'idea_visual', 'voiceover_script', 'music_mood',
        'quality_level', 'audience_segment', 'funnel_stage', 'angle', 'primary_message',
        'proof_points', 'hook_variants', 'caption_long', 'cta_variants', 'creative_brief',
        'template_id', 'template_style', 'layout_spec_json', 'asset_requirements_json',
        'production_notes', 'compliance_notes', 'risk_flags', 'platform_best_practices',
        'ab_variants_json', 'kpi_target', 'expected_outcome', 'production_cycle_stage',
        'optimization_cycle_json', 'performance_hypothesis', 'next_iteration_actions',
        'missing_inputs', 'content_checklist',
      ]
      const insertValues = [
        effectiveClienteId,
        id_contenuto,
        item.data_pubblicazione || null,
        item.ora_pubblicazione || '10:00',
        item.canale || 'instagram',
        item.formato || 'post',
        item.obiettivo || obiettivo || 'mix',
        item.product_id || null,
        item.nome_prodotto || null,
        item.tema || null,
        item.hook || null,
        item.caption || null,
        item.hashtag || null,
        item.cta || null,
        'BOZZA',
        jsonbParam(pickJson(item, ['scenes', 'scene', 'frames'])),
        jsonbParam(pickJson(item, ['slides', 'immagini'])),
        pickText(item, ['overlay_text', 'overlay_testo']) || null,
        pickText(item, ['alt_text', 'alt']) || null,
        jsonbParam(pickJson(item, ['tags', 'keywords_target', 'hashtag_array'])),
        pickText(item, ['idea_visual', 'visual']) || null,
        pickText(item, ['voiceover_script', 'voiceover']) || null,
        pickText(item, ['music_mood', 'musica_mood']) || null,
        itemQuality,
        pickText(item, ['audience_segment', 'audience', 'target_segment']) || null,
        pickText(item, ['funnel_stage', 'fase_funnel']) || null,
        pickText(item, ['angle', 'angolo_creativo']) || null,
        pickText(item, ['primary_message', 'messaggio_chiave']) || null,
        jsonbParam(pickJson(item, ['proof_points', 'prove', 'benefici_verificabili'])),
        jsonbParam(pickJson(item, ['hook_variants', 'hook_alternativi'])),
        pickText(item, ['caption_long', 'caption_estesa', 'corpo']) || null,
        jsonbParam(pickJson(item, ['cta_variants', 'cta_alternative'])),
        pickText(item, ['creative_brief', 'brief_creativo']) || null,
        pickText(item, ['template_id', 'template', 'template_operativo']) || null,
        pickText(item, ['template_style', 'stile_template', 'visual_style']) || null,
        jsonbParam(pickJson(item, ['layout_spec', 'layout_spec_json', 'layout'])),
        jsonbParam(pickJson(item, ['asset_requirements', 'asset_requirements_json', 'asset_richiesti'])),
        pickText(item, ['production_notes', 'note_produzione']) || null,
        pickText(item, ['compliance_notes', 'note_compliance']) || null,
        jsonbParam(pickJson(item, ['risk_flags', 'rischi'])),
        jsonbParam(pickJson(item, ['platform_best_practices', 'best_practices_applicate'])),
        jsonbParam(pickJson(item, ['ab_variants', 'ab_variants_json', 'varianti_ab'])),
        pickText(item, ['kpi_target', 'kpi_primario']) || null,
        pickText(item, ['expected_outcome', 'risultato_atteso']) || null,
        normalizeProductionCycleStage(pickText(item, ['production_cycle_stage', 'cycle_stage', 'fase_ciclo']), 'brief'),
        jsonbParam(pickJson(item, ['optimization_cycle', 'optimization_cycle_json', 'ciclo_ottimizzazione'])),
        pickText(item, ['performance_hypothesis', 'ipotesi_performance', 'hypothesis']) || null,
        jsonbParam(pickJson(item, ['next_iteration_actions', 'azioni_prossima_iterazione', 'next_actions'])),
        jsonbParam(pickJson(item, ['missing_inputs', 'input_mancanti'])),
        jsonbParam(pickJson(item, ['content_checklist', 'checklist'])),
      ]
      await q(
        `INSERT INTO calendario (${insertColumns.join(', ')}) VALUES (${insertColumns.map((_, index) => `$${index + 1}`).join(', ')})`,
        insertValues,
      )
      inseriti.push({ id_contenuto, canale: item.canale as string, data_pubblicazione: item.data_pubblicazione as string })
    }

    return NextResponse.json({
      ok: true,
      count: inseriti.length,
      quality_level: contentQuality,
      quality_downgraded: isQualityDowngraded(requestedQuality, contentQuality),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione piano'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
