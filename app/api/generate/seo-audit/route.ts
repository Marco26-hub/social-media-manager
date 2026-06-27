import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import { getClientGenerationContext, mergeBrandIdentity } from '@/lib/client-context'

const PROMPT = `Sei SEO + GEO auditor senior. Analizza performance e crea audit con miglioramenti concreti.

BRAND:
{{BRAND}}

PERIODO: {{PERIODO}}

CONTENUTI:
{{CONTENUTI}}

LOG:
{{LOG}}

Aree: SEO tecnico, SEO contenuti, GEO/AI search, social coerenza, E-E-A-T, performance.

Output SOLO JSON:
{"data_audit":"YYYY-MM-DD","periodo":"","score_globale":0,"score_seo_tecnico":0,"score_seo_contenuti":0,"score_geo_ai_search":0,"score_social_coerenza":0,"score_eeat":0,"score_performance_social":0,"riepilogo":"","punti_forti":[],"punti_critici":[],"miglioramenti":[{"area":"","azione":"","impatto":"","effort":"","deadline_suggerita":""}],"kpi_da_monitorare":[{"metrica":"","valore_attuale":"","target":""}],"contenuti_suggeriti":[{"tema":"","formato":"","canale":"","priorita":""}]}`

function fallbackAudit(sitoUrl: string, periodo: string, brand: Record<string, unknown> | null = null) {
  const brandName = typeof brand?.brand_name === 'string' ? brand.brand_name : 'brand'
  return {
    data_audit: new Date().toISOString().split('T')[0],
    periodo,
    score_globale: 74,
    score_seo_tecnico: 72,
    score_seo_contenuti: 76,
    score_geo_ai_search: 68,
    score_social_coerenza: 78,
    score_eeat: 70,
    score_performance_social: 74,
    riepilogo: `Audit fallback controllato per ${brandName} (${sitoUrl}). L'AI non ha restituito un JSON utilizzabile, quindi ho generato una base operativa sicura da completare con dati Search Console/Analytics.`,
    punti_forti: ['Presenza brand utilizzabile come base editoriale', 'Possibilità di collegare contenuti social, blog e prodotti'],
    punti_critici: ['Servono dati reali da Search Console/Analytics per priorità precise', 'GEO/AI search da rafforzare con FAQ, risposte dirette e proof verificabili'],
    miglioramenti: [
      { area: 'Piano editoriale', azione: 'Trasformare i contenuti suggeriti in piano settimanale collegato a prodotti e keyword', impatto: 'alto', effort: 'medio', deadline_suggerita: '7 giorni' },
      { area: 'GEO/AI search', azione: 'Aggiungere FAQ, risposta breve iniziale e sezioni citabili nei blog', impatto: 'alto', effort: 'medio', deadline_suggerita: '14 giorni' },
      { area: 'SEO contenuti', azione: 'Creare cluster keyword per categorie/prodotti e link interni verso pagine commerciali', impatto: 'medio', effort: 'medio', deadline_suggerita: '14 giorni' },
    ],
    kpi_da_monitorare: [
      { metrica: 'Impression organiche', valore_attuale: 'da collegare', target: '+15% mese su mese' },
      { metrica: 'CTR organico', valore_attuale: 'da collegare', target: '>= 2.5%' },
      { metrica: 'Contenuti citabili AI', valore_attuale: '0 baseline', target: '5 asset/mese' },
    ],
    contenuti_suggeriti: [
      { tema: `Guida completa ${brandName}: scelta prodotto e stile`, formato: 'articolo', canale: 'blog', priorita: 'alta' },
      { tema: 'FAQ prodotto con risposte dirette per AI search', formato: 'carousel', canale: 'instagram', priorita: 'alta' },
      { tema: 'Checklist acquisto e benefici verificabili', formato: 'post', canale: 'facebook', priorita: 'media' },
    ],
  }
}

async function saveAudit(clienteId: string, periodo: string, parsed: Record<string, unknown>, model: string) {
  const scores = (parsed.scores || {}) as Record<string, unknown>
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
      (parsed.score_globale as number) || 0,
      (parsed.score_seo_tecnico || scores.seo_tecnico || 0) as number,
      (parsed.score_seo_contenuti || scores.seo_contenuti || 0) as number,
      (parsed.score_geo_ai_search || scores.geo_ai_search || 0) as number,
      (parsed.score_social_coerenza || scores.social_coerenza || 0) as number,
      (parsed.score_eeat || scores.eeat || 0) as number,
      (parsed.score_performance_social || scores.performance_social || 0) as number,
      (parsed.riepilogo as string) || '',
      (parsed.punti_forti || []) as string[],
      (parsed.punti_critici || []) as string[],
      JSON.stringify(parsed.miglioramenti || parsed.miglioramenti_prioritari || []),
      JSON.stringify(parsed.kpi_da_monitorare || []),
      JSON.stringify(parsed.contenuti_suggeriti || []),
      model,
    ],
  )
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, sito_url, periodo, model, openrouter_key, gemini_key, opencode_key } = await request.json()
    if (!sito_url) {
      return NextResponse.json({ error: 'sito_url richiesto' }, { status: 400 })
    }
    const clientContext = await getClientGenerationContext(cliente_id)
    const effectiveClienteId = clientContext.clienteId
    if (!effectiveClienteId) return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 })
    await requireClienteAccess(effectiveClienteId)
    const p = periodo || 'settimanale'
    const brandIdentity = mergeBrandIdentity(clientContext, { sito_url })
    if (isDemo() || !dbReady()) {
      return NextResponse.json({
        ok: true,
        demo: true,
        ...fallbackAudit(sito_url, p, brandIdentity),
      })
    }

    const [brandRows, calendario, logs] = await Promise.all([
      q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [effectiveClienteId]),
      q('SELECT * FROM calendario WHERE cliente_id = $1 ORDER BY data_pubblicazione DESC LIMIT 30', [effectiveClienteId]),
      q('SELECT * FROM log_pubblicazioni WHERE cliente_id = $1 ORDER BY timestamp DESC LIMIT 30', [effectiveClienteId]),
    ])
    const brand = brandRows[0] ?? null

    const userPrompt = PROMPT
      .replace('{{BRAND}}', JSON.stringify({ ...brand, sito_url }, null, 2))
      .replace('{{PERIODO}}', p)
      .replace('{{CONTENUTI}}', JSON.stringify(calendario || [], null, 2))
      .replace('{{LOG}}', JSON.stringify(logs || [], null, 2))

    let parsed: Record<string, unknown>
    let fallback = false
    try {
      const aiRes = await callAI({
        model: model || 'meta-llama/llama-3.3-70b-instruct:free',
        systemPrompt: 'Sei un auditor SEO/GEO senior. Rispondi con JSON valido, nessun altro testo.',
        userPrompt,
        openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key,
        maxTokens: 4000,
      })
      parsed = extractJSON(aiRes) as Record<string, unknown>
    } catch (aiError) {
      console.warn('[seo-audit fallback]', aiError)
      parsed = fallbackAudit(sito_url, p, brandIdentity)
      fallback = true
    }

    await saveAudit(effectiveClienteId, p, parsed, fallback ? 'fallback-deterministico' : ((model as string) || 'ai'))

    return NextResponse.json({ ok: true, fallback, ...parsed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore audit'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
