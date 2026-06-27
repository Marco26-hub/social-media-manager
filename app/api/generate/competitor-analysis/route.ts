import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'

const PROMPT = `Sei un social media analyst senior. Analizza i profili social di un competitor e produci un report dettagliato.

BRAND CLIENTE:
{{BRAND}}

COMPETITOR:
Nome: {{COMPETITOR_NOME}}
Sito: {{COMPETITOR_SITO}}
Social: {{COMPETITOR_SOCIAL}}

Analizza:
1. Content strategy: tipo di contenuti, temi, stile visivo, tono di voce
2. Post frequency: frequenza per piattaforma, giorni/orari migliori
3. Engagement: stima engagement rate, tipo di interazioni, crescita
4. Hashtag strategy: hashtag usati, branded vs generali
5. Punti di forza: cosa fanno bene, cosa li differenzia
6. Punti deboli: gap, opportunità per superare
7. Miglioramenti per il cliente: 5 azioni concrete per battere questo competitor

Output SOLO JSON valido:
{
  "competitor_nome":"",
  "data_analisi":"YYYY-MM-DD",
  "content_strategy":{"tipo":"","temi":[],"stile_visivo":"","tono_voce":""},
  "frequenza":{"instagram":"","facebook":"","tiktok":"","pinterest":"","migliori_ore":[]},
  "engagement":{"rate_stimato":"","tipo_interazioni":[],"crescita":"","note":""},
  "hashtag_strategy":{"principali":[],"branded":[],"note":""},
  "punti_forti":[],
  "punti_deboli":[],
  "miglioramenti_per_cliente":[{"azione":"","impatto":"","effort":"","canale":""}],
  "score_competitor":0,
  "gap_analysis":"Come il cliente può differenziarsi",
  "contenuti_suggeriti":[{"tema":"","formato":"","canale":"","perche":""}]
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, competitor_nome, competitor_sito, competitor_social, model, openrouter_key, gemini_key } = await request.json()
    if (!cliente_id || !competitor_nome) {
      return NextResponse.json({ error: 'cliente_id e competitor_nome richiesti' }, { status: 400 })
    }
    await requireClienteAccess(cliente_id)
    if (isDemo() || !dbReady()) {
      return NextResponse.json({
        competitor_nome,
        data_analisi: new Date().toISOString().split('T')[0],
        content_strategy: {
          tipo: 'Fallback demo',
          temi: ['prodotto', 'lifestyle', 'educazione'],
          stile_visivo: 'pulito, verticale, orientato a reel e carousel',
          tono_voce: 'diretto e aspirazionale',
        },
        frequenza: { instagram: '4-5/settimana', facebook: '2/settimana', tiktok: '3/settimana', pinterest: '8-12 pin/settimana', migliori_ore: ['09:00', '12:30', '19:00'] },
        engagement: { rate_stimato: 'medio', tipo_interazioni: ['salvataggi', 'commenti', 'click'], crescita: 'stabile', note: 'Configura Neon per analisi su profilo brand reale.' },
        hashtag_strategy: { principali: ['#brand', '#settore', '#nicchia'], branded: [], note: 'Mix demo ampio/nicchia/branded.' },
        punti_forti: ['Presenza visual coerente', 'Buona frequenza contenuti'],
        punti_deboli: ['Poche CTA misurabili', 'Scarso riuso SEO/GEO dei contenuti'],
        miglioramenti_per_cliente: [
          { azione: 'Creare serie video ricorrente', impatto: 'alto', effort: 'medio', canale: 'tiktok' },
          { azione: 'Trasformare carousel in blog FAQ', impatto: 'medio', effort: 'basso', canale: 'blog' },
        ],
        score_competitor: 74,
        gap_analysis: 'Fallback demo: opportunità su formati verticali, contenuti educativi e CTA tracciabili.',
        contenuti_suggeriti: [
          { tema: 'Prima/dopo prodotto', formato: 'reel', canale: 'instagram', perche: 'Aumenta salvataggi e prova sociale' },
        ],
        demo: true,
      })
    }

    const brandRows = await q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [cliente_id])
    const brand = brandRows[0] ?? null

    const userPrompt = PROMPT
      .replace('{{BRAND}}', JSON.stringify(brand || {}, null, 2))
      .replace('{{COMPETITOR_NOME}}', competitor_nome)
      .replace('{{COMPETITOR_SITO}}', competitor_sito || 'non disponibile')
      .replace('{{COMPETITOR_SOCIAL}}', Array.isArray(competitor_social) ? competitor_social.join(', ') : (competitor_social || 'non disponibile'))

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: 'Sei un social media analyst senior. Rispondi SOLO con JSON valido.',
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key,
      maxTokens: 4000,
    })

    const parsed = extractJSON(aiRes)
    return NextResponse.json(parsed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore analisi competitor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
