import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'
import { brandField, getClientGenerationContext, mergeBrandIdentity } from '@/lib/client-context'

const KEYWORD_PROMPT = `Sei un SEO strategist e copywriter senior. Analizza il brand e genera contenuti SEO/GEO ottimizzati per contenuti social.

BRAND:
{{BRAND}}

SETTORE: {{SETTORE}}
TARGET: {{TARGET}}
TONO: {{TONO}}

Genera:

1. **Parole da usare** (15-20 keyword): 
   - SEO keywords principali (ad alto volume di ricerca)
   - GEO keywords (per AI search: ChatGPT, Perplexity, Gemini)
   - Long-tail keywords (3-4 parole)
   - Termini branded e di settore
   - Categorizza ogni keyword come: SEO|GEO|LONGTAIL|BRANDED

2. **Parole da EVITARE assolutamente** (10-15):
   - Parole che danneggiano il posizionamento
   - Termini competitivi fuori target
   - Parole associate a fast fashion / low quality
   - Termini che confondono l'AI search

3. **Hashtag strategici** (15-20):
   - 5 branded hashtag
   - 5 hashtag di settore (alto volume)
   - 5 hashtag di nicchia (bassa competizione)
   - 5 hashtag trend/seasonal
   - Per ognuno: stima reach (ALTA|MEDIA|BASSA)

4. **Emoji strategy**:
   - Emoji più performanti per il settore
   - Frequenza consigliata (per post / mai)
   - Emoji da evitare

Output SOLO JSON valido:
{
  "parole_da_usare": [{"keyword":"","categoria":"SEO|GEO|LONGTAIL|BRANDED","volume":"ALTO|MEDIO|BASSO"}],
  "parole_da_evitare": [{"keyword":"","motivo":""}],
  "hashtag": [{"tag":"","categoria":"branded|settore|nicchia|trend","reach":"ALTA|MEDIA|BASSA"}],
  "emoji_consigliate": {"brand":[""],"post":[""],"da_evitare":[""],"frequenza":"max per post"}
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, brand, settore, target, tono, model, openrouter_key, gemini_key, opencode_key } = await request.json()
    const clientContext = await getClientGenerationContext(cliente_id)
    const brandIdentity = mergeBrandIdentity(clientContext, brand)

    const userPrompt = KEYWORD_PROMPT
      .replace('{{BRAND}}', JSON.stringify(brandIdentity, null, 2))
      .replace('{{SETTORE}}', settore || brandField(brandIdentity, 'settore'))
      .replace('{{TARGET}}', target || brandField(brandIdentity, 'target'))
      .replace('{{TONO}}', tono || brandField(brandIdentity, 'tono_voce'))

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: 'Sei un SEO/GEO strategist senior. Generi keyword e hashtag ottimizzati per search engines e AI. Rispondi SOLO con JSON valido.',
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key || undefined,
      maxTokens: 3000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json({ cliente_id: clientContext.clienteId, brand_source: clientContext.source, ...parsed })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
