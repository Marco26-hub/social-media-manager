import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'

const DISCOVERY_PROMPT = `Sei un brand strategist senior. Analizza questo sito e-commerce e restituisci un profilo brand completo.

SITO WEB DA ANALIZZARE:
{{URL}}

Analizza:
1. Settore/nicchia di mercato
2. Tone of voice (elegante, casual, ironico, professionale, emozionale, tecnico, luxury, friendly, sostenibile)
3. Target audience (età, genere, interessi, stile di vita)
4. Brand promise / value proposition
5. Palette colori dominante
6. Parole chiave e frasi ricorrenti da usare nei contenuti
7. Parole/frasi da EVITARE (competitive, fuori target)
8. Emoji policy (quali emoji, frequenza, stile)
9. Hashtag strategici (3-5 branded, 3-5 di settore)
10. CTA efficaci per il pubblico
11. Prodotti principali / categorie
12. Stagionalità (se rilevante)

Output SOLO JSON valido:
{
  "settore": "",
  "brand_name": "",
  "tono_voce": "",
  "target": "",
  "promessa_brand": "",
  "colori_brand": "",
  "parole_da_usare": "",
  "parole_da_evitare": "",
  "emoji_policy": "",
  "hashtag_base": "",
  "cta_base": "",
  "categorie_prodotti": "",
  "stagionalita": "",
  "note_osservazioni": ""
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { url, model, openrouter_key, gemini_key, opencode_key } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'url richiesto' }, { status: 400 })
    }

    const userPrompt = DISCOVERY_PROMPT.replace('{{URL}}', url)

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: 'Sei un brand strategist senior specializzato in analisi e-commerce. Rispondi SOLO con JSON valido, nessun altro testo.',
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key || undefined,
      maxTokens: 2000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
