import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'
import { resolveContentQuality, summarizeQualityForPrompt } from '@/lib/content-quality'
import { getClientGenerationContext, mergeBrandIdentity } from '@/lib/client-context'

const PROMPTS: Record<string, string> = {
  google: `Sei un Google Ads specialist senior. Crea una campagna pubblicitaria completa per questo brand.

BRAND: {{BRAND}}
PRODOTTO: {{PRODOTTO}}
OBIETTIVO: {{OBIETTIVO}}
BUDGET: {{BUDGET}}
QUALITÀ: {{QUALITY_CONTEXT}}

Crea:
1. Campaign structure: nome campagna, tipo (Search/Display/Performance Max), reti
2. 3-5 Ad groups con keyword tematiche
3. Per ogni ad group: 3 headline (30 char max), 2 description (90 char max)
4. Sitelink extension (4-6, 25 char max ciascuno)
5. Callout extension (4-6, 25 char max)
6. Negative keywords suggeriti
7. Landing page consigliata per prodotto
8. Ipotesi KPI, test A/B copy e controlli policy

Output SOLO JSON valido:
{
  "campagna": {"nome":"","tipo":"","reti":"","budget_giornaliero":""},
  "ad_groups": [{"nome":"","keyword":[],"headlines":[],"descriptions":[]}],
  "sitelinks": [],
  "callouts": [],
  "negative_keywords": [],
  "landing_page": "",
  "kpi_hypothesis": {"primary_metric":"","target":"","why":""},
  "ab_tests": [{"nome":"","ipotesi":"","variante_a":"","variante_b":""}],
  "policy_checks": [],
  "launch_checklist": []
}`,

  facebook: `Sei un Facebook/Instagram Ads specialist senior. Crea una campagna pubblicitaria completa.

BRAND: {{BRAND}}
PRODOTTO: {{PRODOTTO}}
OBIETTIVO: {{OBIETTIVO}}
BUDGET: {{BUDGET}}
QUALITÀ: {{QUALITY_CONTEXT}}

Crea:
1. Campaign: nome, obiettivo (awareness/traffic/conversion), buying type
2. 3 audience: interesse, lookalike, retargeting con dettagli
3. Per ogni audience: primary text (125 char), headline (40 char), description (30 char)
4. Creative format consigliato (immagine/video/carousel) + aspect ratio
5. CTA consigliato per ogni creativo
6. Placement consigliati (Feeds/Stories/Reels/Explore)
7. Creative brief per ogni formato, test A/B e KPI attesi

Output SOLO JSON valido:
{
  "campagna": {"nome":"","obiettivo":"","buying_type":""},
  "audience": [{"nome":"","tipo":"","dettaglio":"","eta":"","interessi":""}],
  "ad_copy": [{"audience":"","primary_text":"","headline":"","description":"","cta":"","formato_creativo":"","aspect_ratio":""}],
  "placement_consigliati": [],
  "note_strategia": "",
  "creative_briefs": [{"formato":"","hook":"","visual":"","proof":"","cta":"","kpi_target":""}],
  "ab_tests": [{"nome":"","ipotesi":"","variante_a":"","variante_b":""}],
  "risk_flags": [],
  "launch_checklist": []
}`,

  tiktok: `Sei un TikTok Ads specialist senior. Crea una campagna pubblicitaria completa.

BRAND: {{BRAND}}
PRODOTTO: {{PRODOTTO}}
OBIETTIVO: {{OBIETTIVO}}
BUDGET: {{BUDGET}}
QUALITÀ: {{QUALITY_CONTEXT}}

Crea:
1. Campaign: nome, obiettivo (reach/traffic/conversion), budget
2. 2-3 ad group con targeting
3. Per ogni ad group: video script 15-30s, hook (testo overlay 3-5 parole), caption, CTA
4. Trend audio suggerito (mood/genere, non nome specifico)
5. Hashtag strategy (3-5 branded, 3-5 trending)
6. Creative format e durata consigliata
7. Targeting: età, interessi, comportamenti
8. Storyboard, test A/B, KPI e controlli policy

Output SOLO JSON valido:
{
  "campagna": {"nome":"","obiettivo":"","budget":""},
  "ad_groups": [{"nome":"","targeting_eta":"","interessi":[],"video_script":"","hook":"","caption":"","cta":"","durata_secondi":0}],
  "trend_audio_mood": "",
  "hashtag": {"branded":[],"trending":[]},
  "note_creative": "",
  "landing_page": "",
  "storyboard": [{"secondi":"","azione":"","overlay":"","voiceover":""}],
  "kpi_hypothesis": {"primary_metric":"","target":"","why":""},
  "ab_tests": [{"nome":"","ipotesi":"","variante_a":"","variante_b":""}],
  "risk_flags": [],
  "launch_checklist": []
}`,
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, platform, brand, product, obiettivo, budget, model, openrouter_key, gemini_key, opencode_key, quality, quality_level, post_quality, qualita } = await request.json()
    if (!platform) {
      return NextResponse.json({ error: 'platform richiesto' }, { status: 400 })
    }

    const prompt = PROMPTS[platform]
    if (!prompt) return NextResponse.json({ error: `Platform ${platform} non supportata` }, { status: 400 })
    const clientContext = await getClientGenerationContext(cliente_id)
    const brandIdentity = mergeBrandIdentity(clientContext, brand)
    const contentQuality = resolveContentQuality({ requestedQuality: quality ?? quality_level ?? post_quality ?? qualita })

    const userPrompt = prompt
      .replace('{{BRAND}}', JSON.stringify(brandIdentity, null, 2))
      .replace('{{PRODOTTO}}', product || JSON.stringify(clientContext.prodotti.slice(0, 5), null, 2) || 'Prodotto principale')
      .replace('{{OBIETTIVO}}', obiettivo || 'conversion')
      .replace('{{BUDGET}}', budget || 'Da definire')
      .replace('{{QUALITY_CONTEXT}}', summarizeQualityForPrompt(contentQuality))

    const systemPrompts: Record<string, string> = {
      google: 'Sei un Google Ads specialist senior. Crea campagne Search/Display performanti. Rispondi SOLO con JSON valido.',
      facebook: 'Sei un Meta Ads specialist senior. Crea campagne Facebook/Instagram ad alto CTR. Rispondi SOLO con JSON valido.',
      tiktok: 'Sei un TikTok Ads specialist senior. Crea campagne video creative e performanti. Rispondi SOLO con JSON valido.',
    }

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: `${systemPrompts[platform] || 'Sei un ads specialist. Rispondi SOLO con JSON valido.'} Livello qualità: ${contentQuality}. Non inventare dati non forniti; formula ipotesi misurabili.`,
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key || undefined,
      maxTokens: contentQuality === 'high' ? 5200 : contentQuality === 'medium' ? 4200 : 3000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json({ cliente_id: clientContext.clienteId, brand_source: clientContext.source, platform, ...parsed })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
