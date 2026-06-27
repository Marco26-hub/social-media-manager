import { NextResponse } from 'next/server'
import { dbReady, q } from '@/lib/db'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { resolveContentQuality, summarizeQualityForPrompt } from '@/lib/content-quality'
import { getClientGenerationContext } from '@/lib/client-context'
import { buildGenerationOptimizationCyclePrompt } from '@/lib/production-cycle'

const PROMPT = `Sei un content writer SEO senior per brand fashion e-commerce.
Scrivi articolo blog 800-1200 parole in italiano, ottimizzato per SEO e GEO (AI search).

BRAND:
{{BRAND}}

TEMA:
{{TEMA}}

PRODOTTI CORRELATI:
{{PRODOTTI}}

ASSET FORNITI DALL'UTENTE:
{{ASSET_CONTEXT}}

Regole SEO:
- H1 50-60 char con keyword principale
- Meta description 140-160 char
- Slug URL-friendly con keyword
- 3-5 H2 con keyword secondarie
- 800-1200 parole totali
- Keyword density 1-2%

Regole GEO (AI citability):
- Apri con risposta diretta alla query
- Liste numerate e bulleted
- FAQ section 3-5 domande/risposte
- Dati concreti, numeri, percentuali
- Tono E-E-A-T (esperienza, competenza, autorevolezza)

QUALITÀ OPERATIVA:
{{QUALITY_CONTEXT}}

CICLO GENERAZIONE/OTTIMIZZAZIONE:
{{OPTIMIZATION_CYCLE}}

Campi strategici obbligatori nel JSON:
- angle_editoriale: tesi o angolo dell'articolo
- search_intent: intento principale e secondario
- audience_segment: pubblico specifico
- proof_points: prove, dati o elementi verificabili da usare senza inventare fonti
- conversion_path: come l'articolo porta a prodotto/lead
- performance_hypothesis: perché l'articolo dovrebbe generare traffico/lead
- optimization_cycle: cosa misurare e come iterare il prossimo articolo
- next_iteration_actions: 3 azioni concrete dopo i dati
- content_checklist: controlli SEO/GEO/accessibilità
- missing_inputs: dati mancanti da chiedere al cliente

Output SOLO JSON valido:
{"slug":"","meta_title":"50-60 char","meta_description":"140-160 char","h1":"","intro":"","sezioni":[{"h2":"","paragrafi":[],"lista_punti":[]}],"faq":[{"domanda":"","risposta":""}],"cta_finale":"","keywords_target":[],"prodotti_linkati":[],"immagine_cover":"","tempo_lettura_min":5,"angle_editoriale":"","search_intent":"","audience_segment":"","proof_points":[],"conversion_path":"","performance_hypothesis":"","optimization_cycle":{},"next_iteration_actions":[],"content_checklist":[],"missing_inputs":[],"status":"DA_APPROVARE"}`

type UserAsset = {
  name?: string
  url: string
  mime?: string
  source?: string
}

function normalizeAssets(input: unknown, fallbackUrls: unknown): UserAsset[] {
  const rawAssets = Array.isArray(input) ? input : []
  const assets = rawAssets
    .map((item): UserAsset | null => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (!url) return null
      return {
        name: typeof record.name === 'string' ? record.name : undefined,
        url,
        mime: typeof record.mime === 'string' ? record.mime : undefined,
        source: typeof record.source === 'string' ? record.source : undefined,
      }
    })
    .filter((asset): asset is UserAsset => Boolean(asset))

  const urls = Array.isArray(fallbackUrls) ? fallbackUrls : []
  for (const item of urls) {
    if (typeof item !== 'string' || !item.trim()) continue
    const url = item.trim()
    if (!assets.some(asset => asset.url === url)) assets.push({ url, source: 'url' })
  }

  return assets.slice(0, 7)
}

function buildAssetContext(assets: UserAsset[]) {
  if (!assets.length) return 'Nessun asset caricato. Suggerisci immagine_cover e asset_requirements nel contenuto.'
  return `${assets.map((asset, index) => `${index + 1}. ${asset.name || 'asset'} — ${asset.url} — tipo: ${asset.mime || 'image'} — fonte: ${asset.source || 'utente'}`).join('\n')}

Regole asset blog:
- Usa il primo asset adatto come immagine_cover.
- Cita nel piano editoriale dove usare eventuali asset secondari.
- Non inventare fonti, dati o immagini non presenti: se servono prove aggiungile in missing_inputs.`
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, model, openrouter_key, gemini_key, tema, prodotti_linkati, quality, quality_level, post_quality, qualita, uploaded_assets, media_urls } = await request.json()
    const clientContext = await getClientGenerationContext(cliente_id)
    const effectiveClienteId = clientContext.clienteId
    if (!effectiveClienteId) return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 })
    await requireClienteAccess(effectiveClienteId)
    if (isDemo() || !dbReady()) {
      const demoQuality = resolveContentQuality({ requestedQuality: quality ?? quality_level ?? post_quality ?? qualita })
      return NextResponse.json({
        ok: true,
        demo: true,
        quality_level: demoQuality,
        slug: `demo-${String(tema || 'articolo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'articolo'}`,
        warning: 'Fallback demo: DATABASE_URL non configurato, articolo non persistito su Neon.',
      })
    }

    const [brandRows, products, clientRows] = await Promise.all([
      q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [effectiveClienteId]),
      q('SELECT * FROM prodotti WHERE cliente_id = $1', [effectiveClienteId]),
      q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [effectiveClienteId]),
    ])
    const brand = brandRows[0] ?? null
    const client = (clientRows[0] ?? null) as Record<string, unknown> | null
    const contentQuality = resolveContentQuality({ requestedQuality: quality ?? quality_level ?? post_quality ?? qualita, piano: client?.piano })
    const userAssets = normalizeAssets(uploaded_assets, media_urls)
    const assetContext = buildAssetContext(userAssets)

    const userPrompt = PROMPT
      .replace('{{BRAND}}', JSON.stringify(brand || {}, null, 2))
      .replace('{{TEMA}}', tema || 'Guida prodotto')
      .replace('{{PRODOTTI}}', JSON.stringify(products || [], null, 2))
      .replace('{{ASSET_CONTEXT}}', assetContext)
      .replace('{{QUALITY_CONTEXT}}', summarizeQualityForPrompt(contentQuality))
      .replace('{{OPTIMIZATION_CYCLE}}', buildGenerationOptimizationCyclePrompt(contentQuality))

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: `Sei un content writer SEO/GEO senior. Livello qualità: ${contentQuality}. Rispondi SOLO con JSON valido. Non inventare dati o fonti esterne: segnala missing_inputs quando servono prove.`,
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key,
      maxTokens: contentQuality === 'high' ? 6500 : contentQuality === 'medium' ? 5200 : 4000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>

    await q(
      `INSERT INTO blog_articoli (
        cliente_id, slug, meta_title, meta_description, h1, intro, sezioni, faq,
        cta_finale, keywords_target, prodotti_linkati, tempo_lettura_min, immagine_cover, autore, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        effectiveClienteId,
        (parsed.slug as string) || `articolo-${Date.now()}`,
        (parsed.meta_title as string) || '',
        (parsed.meta_description as string) || null,
        (parsed.h1 as string) || '',
        (parsed.intro as string) || null,
        JSON.stringify(parsed.sezioni || []),
        JSON.stringify(parsed.faq || []),
        (parsed.cta_finale as string) || null,
        JSON.stringify(parsed.keywords_target || []),
        JSON.stringify(parsed.prodotti_linkati || prodotti_linkati || []),
        (parsed.tempo_lettura_min as number) || null,
        (parsed.immagine_cover as string) || userAssets[0]?.url || null,
        'Brand Editorial',
        (parsed.status as string) || 'DA_APPROVARE',
      ],
    )

    return NextResponse.json({ ok: true, slug: parsed.slug })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione blog'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
