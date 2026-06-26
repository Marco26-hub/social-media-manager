import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'
import { brandField, getClientGenerationContext, mergeBrandIdentity } from '@/lib/client-context'

const STRATEGY_PROMPT = `Sei un social media strategist senior. Analizza il brand e crea una strategia editoriale completa.

BRAND:
{{BRAND}}

SETTORE: {{SETTORE}}
TARGET: {{TARGET}}
TONO: {{TONO}}

Analizza e restituisci:
1. Content pillars (3-5 temi principali)
2. Frequenza di pubblicazione consigliata per piattaforma
3. Mix di formati consigliato (% post, reel, story, carousel)
4. Best time to post per ogni piattaforma
5. Hashtag strategy (branded, di settore, trending)
6. Campagne stagionali (eventi, festività, trend)
7. KPI da monitorare
8. Competitor da osservare

Output SOLO JSON valido:
{
  "content_pillars": [{"nome":"","descrizione":"","frequenza_settimanale":0}],
  "frequenza": {"instagram":{"post":0,"reel":0,"story":0},"facebook":{"post":0},"tiktok":{"video":0},"pinterest":{"pin":0}},
  "mix_formati": {"post":0,"reel":0,"story":0,"carousel":0,"pin":0},
  "best_time": {"instagram":"12:00-14:00","facebook":"18:00-20:00","tiktok":"19:00-21:00","pinterest":"21:00-23:00"},
  "hashtag_strategy": {"branded":[],"settore":[],"trending":[]},
  "campagne_stagionali": [{"periodo":"","tema":"","azione":""}],
  "kpi": [{"metrica":"","target":"","perche":""}],
  "competitor": [{"nome":"","perche_osservare":""}]
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, brand, settore, target, tono, model, openrouter_key } = await request.json()
    const clientContext = await getClientGenerationContext(cliente_id)
    const brandIdentity = mergeBrandIdentity(clientContext, brand)

    const userPrompt = STRATEGY_PROMPT
      .replace('{{BRAND}}', JSON.stringify(brandIdentity, null, 2))
      .replace('{{SETTORE}}', settore || brandField(brandIdentity, 'settore'))
      .replace('{{TARGET}}', target || brandField(brandIdentity, 'target'))
      .replace('{{TONO}}', tono || brandField(brandIdentity, 'tono_voce'))

    const aiRes = await callAI({
      model: model || 'claude-sonnet-4-6',
      systemPrompt: 'Sei un social media strategist senior. Crei strategie editoriali data-driven. Rispondi SOLO con JSON valido.',
      userPrompt,
      openrouterKey: openrouter_key || undefined,
      maxTokens: 3000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json({ cliente_id: clientContext.clienteId, brand_source: clientContext.source, ...parsed })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
