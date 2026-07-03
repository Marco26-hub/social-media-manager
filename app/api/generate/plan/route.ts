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
import { PRO_COPY_STANDARDS, SEO_GEO_STANDARDS, DIVERSITY_STANDARDS, FUNNEL_STANDARDS } from '@/lib/prompt-standards'
import { buildGenerationOptimizationCyclePrompt, normalizeProductionCycleStage } from '@/lib/production-cycle'

// Standard del piano: composti dalla "bibbia" condivisa (lib/prompt-standards).
// Forza DIVERSITÀ + funnel strategico + SEO/GEO + copy professionale.
const PLAN_STANDARDS = `
STANDARD DEL PIANO (vincolanti):

${DIVERSITY_STANDARDS}

${FUNNEL_STANDARDS}

${SEO_GEO_STANDARDS}

${PRO_COPY_STANDARDS}

Non inventare prezzi, stock, sconti o claim non presenti nei dati brand/prodotti.`

// VISION: stesso principio di generate/content (buildAssetContext) applicato al piano
// multi-contenuto. Mostriamo alla AI le foto DAVVERO allegate a QUESTO chunk (in ordine
// — lo stesso ordine con cui nextChunkMediaSlots() le assegnerà dopo), così hook/caption/
// tema descrivono quello che è VERAMENTE nella foto (capo, colore, ambientazione) invece
// di restare generici.
function buildPlanAssetContext(shown: string[]) {
  if (!shown.length) return ''
  return `

FOTO CARICATE DALL'UTENTE PER QUESTO BLOCCO (le vedi in allegato, in ordine):
${shown.map((url, index) => `${index + 1}. ${url}`).join('\n')}

⚠️ VISION — istruzioni vincolanti:
- GUARDA ogni foto allegata e scrivi il contenuto (hook/caption/tema) SU QUELLO CHE VEDI DAVVERO: capo, colore, materiale, ambientazione, mood.
- Assegna la foto N al contenuto N-esimo che generi in questo blocco, nello stesso ordine (foto 1 → primo contenuto, foto 2 → secondo, ecc.) — verranno allegate esattamente in questo ordine.
- Per i contenuti oltre le ${shown.length} foto mostrate, resta comunque coerente con lo stile/prodotti visti finora + i dati brand/prodotti sopra.
- Non inventare dettagli visivi non presenti nelle foto.`
}

// --- Date helpers -----------------------------------------------------------
// Prima il modello doveva INDOVINARE le date (placeholder "YYYY-MM-DD" nel prompt,
// nessun ancoraggio a "oggi"). Ora ogni blocco riceve un range di date REALE e
// verificabile: il modello ci scrive dentro, e sanitizeItem() lo forza comunque
// a restare nel range se sbaglia.
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const VALID_CANALI = new Set(['instagram', 'facebook', 'tiktok', 'pinterest', 'linkedin', 'threads', 'x', 'youtube_shorts', 'blog'])
const VALID_FORMATI = new Set(['post', 'carousel', 'reel', 'story', 'pin', 'short', 'video', 'articolo'])

type Chunk = { start: string; end: string; label: string; targetMin: number; targetMax: number; images: string[] }

// --- Schema DB: introspection dinamica invece di due liste hardcoded --------
// Prima c'erano DUE elenchi di colonne mantenuti a mano (insertColumns completo +
// retryColumns "base" per il fallback): sono andati fuori sync — le colonne extra
// aggiunte dopo (audience_segment, kpi_target, ecc.) non erano nella retry list,
// quindi un DB non ancora migrato le perdeva silenziosamente invece di avvisare.
// Ora leggiamo UNA volta le colonne vere da information_schema e filtriamo su quelle.
let calendarioColumnsCache: Set<string> | null = null
async function getCalendarioColumns(): Promise<Set<string>> {
  if (calendarioColumnsCache) return calendarioColumnsCache
  const rows = await q(`SELECT column_name FROM information_schema.columns WHERE table_name = 'calendario'`)
  calendarioColumnsCache = new Set(rows.map(r => String(r.column_name)))
  return calendarioColumnsCache
}

async function insertCalendario(columns: string[], values: unknown[]): Promise<boolean> {
  const existing = await getCalendarioColumns()
  const pairs = columns.map((col, i) => [col, values[i]] as const).filter(([col]) => existing.has(col))
  if (!pairs.length) throw new Error('Nessuna colonna valida per insert su calendario (schema DB inatteso)')
  const finalColumns = pairs.map(([col]) => col)
  const finalValues = pairs.map(([, v]) => v)
  await q(
    `INSERT INTO calendario (${finalColumns.join(', ')}) VALUES (${finalColumns.map((_, index) => `$${index + 1}`).join(', ')})`,
    finalValues,
  )
  return pairs.length < columns.length
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, piattaforme, obiettivo, model, openrouter_key, gemini_key, opencode_key, periodo, quality, quality_level, post_quality, qualita, media_urls } = await request.json()
    const mediaPool: string[] = Array.isArray(media_urls) ? media_urls.filter((u): u is string => typeof u === 'string' && u.length > 0) : []

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
    const piattaformeStr = piattaforme.join(', ')
    const brandJson = JSON.stringify(brand || {}, null, 2)
    const productsJson = JSON.stringify(products || [], null, 2)

    const qualityPrompt = `

QUALITÀ OPERATIVA:
${summarizeQualityForPrompt(contentQuality)}

Per ogni contenuto del piano NON limitarti a idea/caption: includi anche audience_segment, funnel_stage, angle, primary_message, proof_points, hook_variants, cta_variants, creative_brief, template_id, template_style, layout_spec, asset_requirements, production_notes, compliance_notes, risk_flags, platform_best_practices, ab_variants, kpi_target, expected_outcome, missing_inputs, content_checklist.
Per Reel/Short/Video includi scenes con timing. Per Story includi frames o scenes. Per Carousel includi slides.
${buildGenerationOptimizationCyclePrompt(contentQuality)}
Schema operativo extra per ogni item:
${buildExtendedOutputSchema()}
`

    // --- Chunking: 1 blocco per settimanale, 4 per mensile -------------------
    // Un piano mensile intero (25-35 item con lo schema esteso sopra) in UNA
    // chiamata AI può arrivare a 25-30K token di output: sui modelli free il
    // rischio concreto è il troncamento a metà risposta → JSON malformato →
    // l'intera generazione falliva e l'utente non riceveva NULLA. Spezzare in
    // 4 blocchi settimanali (stessa forma del piano settimanale, che già
    // funzionava) elimina il problema alla radice invece di sperare in un
    // maxTokens abbastanza alto. Bonus: ogni blocco riceve una fetta diversa
    // delle foto caricate, quindi la vision copre molte più immagini nel mese
    // invece delle sole prime 7 di sempre.
    const today = new Date()
    const IMAGES_PER_CHUNK = 7
    const chunks: Chunk[] = []
    if (periodo === 'mensile') {
      for (let i = 0; i < 4; i++) {
        chunks.push({
          start: fmtDate(addDays(today, i * 7)),
          end: fmtDate(addDays(today, i * 7 + 6)),
          label: `Settimana ${i + 1} del piano mensile`,
          targetMin: 6, targetMax: 9,
          images: mediaPool.slice(i * IMAGES_PER_CHUNK, (i + 1) * IMAGES_PER_CHUNK),
        })
      }
    } else {
      chunks.push({
        start: fmtDate(today),
        end: fmtDate(addDays(today, 6)),
        label: 'Piano settimanale',
        targetMin: 7, targetMax: 10,
        images: mediaPool.slice(0, IMAGES_PER_CHUNK),
      })
    }

    const systemPrompt = `Sei un social media manager, creative strategist e SEO/GEO specialist senior (10+ anni, brand premium). Obiettivo: ${obiettivo || 'mix'}. Livello qualità: ${contentQuality}. Crei piani editoriali dove OGNI contenuto è unico, professionale e strategico: hook diversi, angoli ruotati, funnel bilanciato, keyword SEO/GEO sfruttate, zero cliché, grammatica italiana impeccabile. Rispondi con JSON array valido, nessun altro testo. Non inventare prezzi, stock o claim non presenti nei dati.`

    async function generateChunk(chunk: Chunk): Promise<{ ok: true; items: Record<string, unknown>[] } | { ok: false; error: string }> {
      const userPrompt = `Agisci come Social Media Manager senior per brand abbigliamento e-commerce.
Crea contenuti per ${chunk.label}, dal ${chunk.start} al ${chunk.end}, per / ${piattaformeStr} /.
Genera TRA ${chunk.targetMin} E ${chunk.targetMax} contenuti (mai meno di ${chunk.targetMin}). Ogni data_pubblicazione DEVE cadere dentro il range ${chunk.start}..${chunk.end} incluso — mai fuori, mai un placeholder generico.

BRAND:
${brandJson}

PRODOTTI:
${productsJson}

Distribuzione: alterna mattina (9-11) e sera (18-21).
Lunedi/giovedi = inspiration, venerdi = vendita/promo, weekend = community/lifestyle.
Non concentrare prodotti in pochi giorni.
Tono moderno fashion coerente con brand.

Output SOLO JSON array valido:
[{"data_pubblicazione":"YYYY-MM-DD (dentro ${chunk.start}..${chunk.end})","ora_pubblicazione":"HH:MM","canale":"USA SOLO un canale tra quelli in / ${piattaformeStr} / (valori ammessi: instagram|facebook|tiktok|pinterest|linkedin|threads|x|youtube_shorts|blog)","formato":"post|carousel|reel|story|pin|short|video|articolo","obiettivo":"vendita|awareness|community|educazione|ispirazione|trending","product_id":"","nome_prodotto":"","tema":"","hook":"","caption":"","hashtag":"","cta":""}]`
        + '\n' + PLAN_STANDARDS + '\n' + qualityPrompt
        + buildPlanAssetContext(chunk.images)

      try {
        const aiRes = await callAI({
          model: model || 'meta-llama/llama-3.3-70b-instruct:free',
          systemPrompt,
          userPrompt,
          openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key,
          // VISION: solo le foto di QUESTO blocco, stesso ordine con cui
          // nextChunkMediaSlots() le assegnerà ai contenuti generati qui.
          images: chunk.images,
          maxTokens: contentQuality === 'high' ? 8000 : contentQuality === 'medium' ? 6000 : 4000,
          timeoutMs: 90000,
        })
        const items = extractJSONArray(aiRes) as Record<string, unknown>[]
        return { ok: true, items }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Errore generazione blocco' }
      }
    }

    // Blocchi indipendenti eseguiti in parallelo: se uno fallisce (rate limit,
    // JSON malformato) gli altri proseguono comunque invece di perdere tutto il
    // mese per un solo blocco sfortunato.
    const chunkResults = await Promise.all(chunks.map(generateChunk))
    const failedChunks = chunkResults.filter((r): r is { ok: false; error: string } => !r.ok)
    const itemChunkPairs: { item: Record<string, unknown>; chunk: Chunk }[] = []
    chunkResults.forEach((r, i) => {
      if (r.ok) r.items.forEach(item => itemChunkPairs.push({ item, chunk: chunks[i] }))
    })

    if (!itemChunkPairs.length) {
      return NextResponse.json({
        error: failedChunks.length
          ? `Generazione fallita su tutti i ${chunks.length} blocchi: ${failedChunks.map(f => f.error).join(' | ')}`
          : 'Nessun contenuto generato',
      }, { status: 502 })
    }

    // --- Validazione + sanitizzazione: mai fidarsi ciecamente del JSON AI ---
    // Prima canale/formato/data/ora finivano diretti nella query INSERT: un
    // valore fuori standard (es. "Instagram" maiuscolo, o una data fuori range)
    // faceva fallire il CHECK constraint A METÀ del loop, perdendo il resto.
    const piattaformeSet = new Set<string>(piattaforme)
    const fallbackCanale = piattaforme[0] || 'instagram'
    const globalStart = chunks[0].start
    const globalEnd = chunks[chunks.length - 1].end

    function sanitizeItem(raw: Record<string, unknown>, chunk: Chunk): Record<string, unknown> {
      const out = { ...raw }
      const rawDate = typeof out.data_pubblicazione === 'string' ? out.data_pubblicazione : ''
      if (!DATE_RE.test(rawDate) || rawDate < globalStart || rawDate > globalEnd) {
        out.data_pubblicazione = chunk.start
      }
      const rawTime = typeof out.ora_pubblicazione === 'string' ? out.ora_pubblicazione : ''
      out.ora_pubblicazione = TIME_RE.test(rawTime) ? rawTime : '10:00'
      const rawCanale = typeof out.canale === 'string' ? out.canale.toLowerCase().trim() : ''
      out.canale = VALID_CANALI.has(rawCanale) && piattaformeSet.has(rawCanale) ? rawCanale : fallbackCanale
      const rawFormato = typeof out.formato === 'string' ? out.formato.toLowerCase().trim() : ''
      out.formato = VALID_FORMATI.has(rawFormato) ? rawFormato : 'post'
      return out
    }

    // Media: assegnati per-blocco (le foto che QUEL blocco ha davvero visto),
    // non più un cursore globale — così l'ordine foto-vista/foto-assegnata
    // resta coerente con quello che l'AI ha effettivamente descritto.
    const chunkMediaCursor = new Map<Chunk, number>()
    let anyRecycled = false
    function nextChunkMediaSlots(chunk: Chunk, formato: string): (string | null)[] {
      if (!chunk.images.length) return [null, null, null, null, null]
      const count = formato === 'carousel' ? 5 : 1
      let cursor = chunkMediaCursor.get(chunk) ?? 0
      const picked: string[] = []
      for (let i = 0; i < count; i++) {
        if (cursor > 0 && cursor % chunk.images.length === 0) anyRecycled = true
        picked.push(chunk.images[cursor % chunk.images.length])
        cursor++
      }
      chunkMediaCursor.set(chunk, cursor)
      return [...picked, ...Array(5 - picked.length).fill(null)]
    }

    const inseriti: { id_contenuto: string; canale: string; data_pubblicazione: string }[] = []
    const scartati: string[] = []
    let schemaFallbackUsed = false

    // Insert per-item con try/catch: un item rotto (constraint violation, tipo
    // dato inatteso) viene loggato e saltato, MAI abortisce l'intero batch —
    // prima un solo errore a metà loop faceva perdere anche gli item già validi.
    for (const { item: rawItem, chunk } of itemChunkPairs) {
      const item = sanitizeItem(rawItem, chunk)
      const id_contenuto = `C${Date.now().toString(36).toUpperCase()}_${inseriti.length}_${scartati.length}`
      const itemQuality = normalizeContentQuality(item.quality_level) ?? contentQuality
      const [media1, media2, media3, media4, media5] = nextChunkMediaSlots(chunk, String(item.formato || 'post'))
      const insertColumns = [
        'cliente_id', 'id_contenuto', 'data_pubblicazione', 'ora_pubblicazione',
        'canale', 'formato', 'obiettivo', 'product_id', 'nome_prodotto',
        'tema', 'hook', 'caption', 'hashtag', 'cta', 'status',
        'link_media_1', 'link_media_2', 'link_media_3', 'link_media_4', 'link_media_5',
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
        media1, media2, media3, media4, media5,
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
      try {
        const usedFallback = await insertCalendario(insertColumns, insertValues)
        if (usedFallback) schemaFallbackUsed = true
        inseriti.push({ id_contenuto, canale: item.canale as string, data_pubblicazione: item.data_pubblicazione as string })
      } catch (error) {
        console.warn('[plan] insert item fallito, salto e continuo:', error instanceof Error ? error.message : error)
        scartati.push(error instanceof Error ? error.message : 'errore insert sconosciuto')
      }
    }

    return NextResponse.json({
      ok: true,
      count: inseriti.length,
      requested_range: periodo === 'mensile' ? '25-35' : '7-10',
      chunks_total: chunks.length,
      chunks_failed: failedChunks.length,
      ...(failedChunks.length && { chunks_failed_detail: failedChunks.map(f => f.error) }),
      ...(scartati.length && { items_scartati: scartati.length }),
      quality_level: contentQuality,
      quality_downgraded: isQualityDowngraded(requestedQuality, contentQuality),
      images_provided: mediaPool.length,
      images_recycled: anyRecycled,
      ...(schemaFallbackUsed && { schema_fallback: true, warning: 'Eseguire npm run migrate per abilitare tutti i campi qualità e ottimizzazione' }),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione piano'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
