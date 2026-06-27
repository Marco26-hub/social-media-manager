import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'

const CLIENT_PROMPT = `Sei un marketing strategist e growth hacker. Analizza il sito web e il settore per identificare il profilo cliente ideale e le opportunità di vendita.

SITO WEB: {{URL}}

Analizza e restituisci:
1. ICP (Ideal Customer Profile): descrizione dettagliata del cliente perfetto
2. Buyer personas (2-3): nome, età, ruolo, obiettivi, pain point, canali dove trovarlo
3. Mercato target: dimensione stimata, trend, stagionalità
4. Competitor principali (3-5): nome, sito, punto di forza, punto debole
5. Opportunità di vendita: cross-sell, upsell, bundle suggeriti
6. Canali di acquisizione consigliati: organici e paid
7. Lead magnet suggeriti: cosa offrire per catturare contatti
8. Sales pitch: elevator pitch in 2 frasi per questo brand
9. Obiezioni comuni e come superarle
10. KPI suggeriti per monitorare la crescita

Output SOLO JSON valido:
{
  "brand_analizzato": "",
  "icp": "",
  "buyer_personas": [{"nome":"","eta":"","ruolo":"","obiettivi":"","pain_point":"","canali":"","citazione":""}],
  "mercato_target": {"dimensione":"","trend":"","stagionalita":""},
  "competitor": [{"nome":"","sito":"","punto_forte":"","punto_debole":""}],
  "opportunita_vendita": [],
  "canali_acquisizione": [],
  "lead_magnet": [],
  "sales_pitch": "",
  "obiezioni": [{"obiezione":"","risposta":""}],
  "kpi_suggeriti": []
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { url, settore, model, openrouter_key, gemini_key, opencode_key } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'url richiesto' }, { status: 400 })
    }

    const userPrompt = CLIENT_PROMPT
      .replace('{{URL}}', url)
      .replace('{{SETTORE}}', settore || 'non specificato')

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: `Sei un marketing strategist e growth hacker senior. Analizzi siti e-commerce e produci strategie di acquisizione clienti. Settore: ${settore || 'generalista'}. Rispondi SOLO con JSON valido.`,
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key || undefined,
      maxTokens: 3000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json({ ...parsed, brand_analizzato: url })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
