import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { requireAuth } from '@/lib/auth-utils'
import { brandField, getClientGenerationContext, mergeBrandIdentity } from '@/lib/client-context'

const LEGAL_PROMPT = `Sei un legal compliance specialist per e-commerce e brand digitali italiani.
Genera documenti legali completi, conformi a GDPR UE 2016/679, Cookie Law (ePrivacy Directive),
Codice del Consumo (D.Lgs. 206/2005), D.Lgs. 70/2003 (commercio elettronico), e Linee Guida Garante Privacy.

BRAND: {{BRAND}}
SETTORE: {{SETTORE}}
SITO: {{URL}}
TARGET: {{TARGET}}
PAESI: Italia (UE)

Genera per il brand:

1. **COOKIE POLICY** — completa e operativa:
   - Cosa sono i cookie (definizione chiara per utente)
   - Cookie tecnici (elencare: PHPSESSID, __cfduid, ecc.)
   - Cookie di profilazione/marketing (se usati)
   - Cookie analytics (Google Analytics 4, anonimizzazione IP)
   - Cookie di terze parti (social, pixel, ecc.)
   - Gestione consenso (opt-in esplicito, opt-out, revoca)
   - Durata cookie
   - Link a impostazioni browser
   - Riferimento a GDPR e Provvedimento Garante n.229/2014

2. **GDPR — INFORMATIVA TRATTAMENTO DATI** (Art. 13 Reg. UE 2016/679):
   - Titolare del trattamento (nome, sede, email, P.IVA/CF)
   - DPO / Responsabile protezione dati (se nominato)
   - Dati personali raccolti (nome, email, telefono, indirizzo IP, dati navigazione, dati acquisto)
   - Finalità del trattamento (erogazione servizio, marketing, profilazione, analisi)
   - Base giuridica (consenso, esecuzione contratto, legittimo interesse, obbligo legale)
   - Periodo di conservazione
   - Diritti dell'interessato (Art. 15-22): accesso, rettifica, cancellazione, limitazione, portabilità, opposizione
   - Modalità esercizio diritti (email, PEC, raccomandata)
   - Reclamo al Garante
   - Comunicazione dati a terzi e trasferimenti extra-UE
   - Processo decisionale automatizzato (se presente)
   - Data breach notification

3. **PRIVACY POLICY** (sintesi operativa):
   - Chi siamo (brand + contatti)
   - Quali dati raccogliamo e perché
   - Cookie e tecnologie simili
   - Con chi condividiamo i dati
   - I tuoi diritti
   - Modifiche alla policy
   - Contatti per richieste privacy

4. **DISCLAIMER / LIMITAZIONE RESPONSABILITÀ**:
   - Contenuti del sito a scopo informativo
   - Accuratezza delle informazioni
   - Link esterni
   - Proprietà intellettuale
   - Limitazione responsabilità per uso improprio
   - Legge applicabile e foro competente (Italia)

5. **CONDIZIONI GENERALI DI VENDITA / SERVIZIO** (sintesi):
   - Accettazione condizioni
   - Prezzi e pagamenti
   - Spedizioni e consegne (se e-commerce)
   - Diritto di recesso (Art. 52-59 Codice del Consumo)
   - Garanzie e assistenza
   - Reclami e risoluzione controversie

Output SOLO JSON valido con campi markdown:
{
  "cookie_policy": "Testo completo della Cookie Policy in italiano...",
  "gdpr_informativa": "Testo completo dell'Informativa GDPR...",
  "privacy_policy": "Testo sintetico Privacy Policy...",
  "disclaimer": "Testo Disclaimer...",
  "condizioni_vendita": "Testo Condizioni Generali...",
  "data_generazione": "",
  "normative_riferimento": ["Reg. UE 2016/679", "ePrivacy Directive", "D.Lgs. 206/2005", "D.Lgs. 70/2003"],
  "note": "Documenti generati automaticamente. Si consiglia revisione legale prima dell'uso."
}`

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, brand, settore, url, target, model, openrouter_key, gemini_key, opencode_key } = await request.json()
    const clientContext = await getClientGenerationContext(cliente_id)
    const brandIdentity = mergeBrandIdentity(clientContext, brand)

    const userPrompt = LEGAL_PROMPT
      .replace('{{BRAND}}', JSON.stringify(brandIdentity, null, 2))
      .replace('{{SETTORE}}', settore || brandField(brandIdentity, 'settore'))
      .replace('{{URL}}', url || brandField(brandIdentity, 'sito_url'))
      .replace('{{TARGET}}', target || brandField(brandIdentity, 'target'))

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: 'Sei un legal compliance specialist italiano. Generi documenti legali conformi a GDPR, Cookie Law e normative italiane. Rispondi SOLO con JSON valido. Non dare consulenza legale personalizzata senza revisione.',
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key || undefined,
      maxTokens: 8000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    return NextResponse.json({
      ...parsed,
      cliente_id: clientContext.clienteId,
      brand_source: clientContext.source,
      data_generazione: new Date().toISOString().split('T')[0],
      brand_generato: brandField(brandIdentity, 'brand_name', 'Brand'),
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
