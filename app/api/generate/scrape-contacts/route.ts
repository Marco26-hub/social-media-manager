import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'

const SCRAPE_PROMPT = `Sei un lead generation specialist. Analizza il sito web e cerca TUTTI i contatti utili.

SITO WEB: {{URL}}

Cerca e restituisci:
1. Email (tutte: info@, assistenza@, marketing@, personali visibili)
2. WhatsApp / WhatsApp Business (numeri, link wa.me, QR code reference)
3. Telegram (username, gruppi, canali, link t.me)
4. Telefono (numeri fissi e mobile visibili sul sito)
5. Social media links (Instagram, Facebook, TikTok, LinkedIn, YouTube, Pinterest)
6. Form contatti (URL della pagina contatti, se trovata)
7. Indirizzo fisico / sede
8. Partita IVA / dati societari
9. Orari di apertura

IMPORTANTE:
- Sii preciso con i dettagli trovati
- Se non trovi un canale, lascia il campo vuoto o array vuoto
- Per WhatsApp: cerca numeri con prefisso internazionale, link wa.me/39...
- Per Telegram: cerca link t.me/, username @

Output SOLO JSON valido:
{
  "sito_analizzato": "",
  "data_estrazione": "",
  "email": [],
  "whatsapp": [{"numero":"","link":"","note":""}],
  "telegram": [{"username":"","link":"","tipo":"canale|gruppo|bot|personale","note":""}],
  "telefono": [],
  "social": [{"piattaforma":"","url":"","note":""}],
  "form_contatti_url": "",
  "indirizzo": "",
  "piva": "",
  "orari": "",
  "note_scraping": ""
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { url, model, openrouter_key, gemini_key } = await request.json()
    if (!url) {
      return NextResponse.json({ error: 'url richiesto' }, { status: 400 })
    }

    const userPrompt = SCRAPE_PROMPT.replace('{{URL}}', url)

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: 'Sei un lead generation specialist. Analizza siti web e estrai contatti. Rispondi SOLO con JSON valido, nessun altro testo.',
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key || undefined,
      maxTokens: 2000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json({
      ...parsed,
      data_estrazione: new Date().toISOString().split('T')[0],
      sito_analizzato: url,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
