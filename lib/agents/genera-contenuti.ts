import { q } from '@/lib/db'
import { callAI, extractJSON } from '@/lib/ai'
import { brandField } from '@/lib/client-context'
import {
  TREND_MODERN_STANDARDS, PRO_COPY_STANDARDS, SEO_GEO_STANDARDS,
  DIVERSITY_STANDARDS, FUNNEL_STANDARDS, pickAngle, proSystemPrompt,
} from '@/lib/prompt-standards'
import {
  buildExtendedOutputSchema, resolveContentQuality, getQualityTokenBudget,
  buildQualityContext, pickText, pickJson, jsonbParam,
} from '@/lib/content-quality'
import { insertCalendarioRow } from '@/lib/calendario-insert'

type Row = Record<string, unknown>

export type AgentResult = { clienteId: string; generati: number; errori: string[] }
export type AiKeys = { model?: string; openrouterKey?: string; geminiKey?: string; opencodeKey?: string }

// Carica il contesto cliente SENZA guardia di sessione: il chiamante è un job
// autenticato via CRON_SECRET e il clienteId arriva già validato dalla query dei
// clienti AUTO. Non riusa getClientGenerationContext perché quella passa da
// requireClienteAccess (che richiede una sessione utente).
async function loadContext(clienteId: string): Promise<{ cliente: Row | null; brand: Row | null; prodotti: Row[]; canali: string[] }> {
  const [cli, br, prod, acc] = await Promise.all([
    q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [clienteId]),
    q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [clienteId]),
    q("SELECT * FROM prodotti WHERE cliente_id = $1 AND prodotto_attivo = 'SI' ORDER BY priorita NULLS LAST, created_at DESC LIMIT 12", [clienteId]),
    // Canali REALMENTE collegati e attivi del cliente (non un default a caso).
    q("SELECT canale FROM account_social WHERE cliente_id = $1 AND attivo = 'SI'", [clienteId]),
  ])
  const canali = [...new Set((acc as Row[]).map(r => String(r.canale || '').trim().toLowerCase()).filter(Boolean))]
  return { cliente: (cli[0] as Row) || null, brand: (br[0] as Row) || null, prodotti: prod as Row[], canali }
}

// Formati adatti al canale. PREMIUM: un piano vario mescola post/carosello/reel,
// non solo post. Si ruota su questi al crescere del contatore.
function formatiPerCanale(canale: string): string[] {
  switch (canale) {
    case 'instagram': return ['post', 'carousel', 'reel']
    case 'facebook': return ['post', 'carousel', 'video']
    case 'tiktok': return ['video']
    case 'youtube': return ['video']
    case 'pinterest': return ['pin']
    case 'linkedin': return ['post', 'carousel']
    default: return ['post']
  }
}
function mediaTypePerFormato(formato: string): string {
  return ['video', 'reel', 'short'].includes(formato) ? 'video' : 'image'
}

// Specifiche PREMIUM per formato (struttura + schema JSON specifico), allineate ai
// PROMPTS della route manuale così l'output AUTO è allo stesso livello (carosello a
// slide, reel a scene+voiceover, ecc.), non una caption generica.
const FORMAT_SPECS: Record<string, { struttura: string; schema: string }> = {
  post: {
    struttura: 'Hook 5-7 parole cattura-attenzione. Caption 150-2200 char con emoji naturale e a-capo: hook → prodotto → vantaggio emotivo → dettaglio funzionale → CTA morbida. 5-8 hashtag misti (ampi+nicchia+branded) in coda.',
    schema: '"hook":"","caption":"","hashtag":"","cta":"","idea_visual":"inquadratura, luce, mood, styling"',
  },
  carousel: {
    struttura: 'Da 3 a 5 slide (mai meno di 3, mai più di 5), 1 concetto per slide. Slide 1: hook visivo + titolo (invoglia lo swipe). Slide 2-3: problema/uso/beneficio. Slide finale: CTA + prodotto. Testo per slide max 120 char.',
    schema: '"hook":"","caption":"","hashtag":"","cta":"","slides":[{"numero":1,"testo":"testo sulla slide","visual":"descrizione immagine"}]',
  },
  reel: {
    struttura: '9:16, 15-30s. 0-2s hook potente, 2-5s contesto, 5-20s dimostrazione/styling, 20-25s wow, 25-30s CTA. Scene 3-5, overlay max 2 parole per scena. Audio/trend attuale.',
    schema: '"hook":"","caption":"","hashtag":"","cta":"","scene":[{"numero":1,"secondi":"0-2","descrizione":"","overlay_testo":""}],"voiceover":"testo parlato","musica_mood":"mood/genere audio"',
  },
  video: {
    struttura: '16:9, 30-90s con audio. Intro brand → presentazione → dimostrazione/tutorial → benefici/social proof → CTA. Scene 4-6.',
    schema: '"hook":"","caption":"","hashtag":"","cta":"","scene":[{"numero":1,"secondi":"0-5","descrizione":"","overlay_testo":""}],"voiceover":"testo parlato","musica_mood":""',
  },
  pin: {
    struttura: 'Pinterest: immagine verticale 2:3. Titolo ricco di keyword, descrizione con keyword long-tail (SEO Pinterest), CTA al sito.',
    schema: '"hook":"titolo pin keyword-rich","caption":"descrizione con keyword long-tail","hashtag":"","cta":"","idea_visual":"immagine verticale 2:3"',
  },
  story: {
    struttura: '9:16, 1-3 frame, 3-5s per frame. Frame 1 hook + testo breve; frame 2 dettaglio/dietro le quinte; frame 3 CTA con sticker/link.',
    schema: '"hook":"","caption":"","hashtag":"","cta":"","slides":[{"numero":1,"testo":"testo in sovrimpressione","visual":""}]',
  },
}

function pickStr(obj: Row, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (Array.isArray(v) && v.length) return v.filter(x => typeof x === 'string').join(' ')
  }
  return ''
}

function tomorrow(): string {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]
}

function buildSystemPrompt(settore: string, nomeBrand: string, quality: string): string {
  return [
    proSystemPrompt('social media manager senior e copywriter fashion', { settore, brand: nomeBrand, quality }),
    TREND_MODERN_STANDARDS,
    PRO_COPY_STANDARDS,
    SEO_GEO_STANDARDS,
    FUNNEL_STANDARDS,
    DIVERSITY_STANDARDS,
    'Rispondi SOLO con JSON valido, nessun altro testo prima o dopo.',
  ].join('\n\n')
}

function buildUserPrompt(p: {
  canale: string; formato: string; nomeBrand: string; settore: string; tono: string
  tema: string; prodotto?: Row; brandDesc: string; angle: string
  qualityContext: string; extendedSchema: string
}): string {
  const spec = FORMAT_SPECS[p.formato] || FORMAT_SPECS.post
  const prodInfo = p.prodotto
    ? `Prodotto in focus: ${p.prodotto.nome_prodotto || p.tema}${p.prodotto.categoria ? ` — categoria ${p.prodotto.categoria}` : ''}${p.prodotto.prezzo ? ` — prezzo ${p.prodotto.prezzo}` : ''}. Non inventare prezzi/taglie/sconti non forniti.`
    : 'Focus sul brand nel suo insieme (nessun prodotto specifico).'
  return `Crea UN contenuto social PREMIUM pronto per l'approvazione umana.

BRAND: ${p.nomeBrand} — settore: ${p.settore} — tono di voce: ${p.tono}.
${p.brandDesc ? `Contesto brand: ${p.brandDesc}` : ''}
CANALE: ${p.canale} — FORMATO: ${p.formato}.
${prodInfo}

ANGOLO CREATIVO OBBLIGATORIO (usalo come attacco/struttura): ${p.angle}

STRUTTURA DEL ${p.formato.toUpperCase()}:
${spec.struttura}

${p.qualityContext}

Output SOLO JSON valido. Includi i campi del formato:
{ ${spec.schema} }
E FONDI nel medesimo JSON questo schema operativo (campi strategici obbligatori):
${p.extendedSchema}`
}

// SKILL dell'agente: copy social brand-aware di livello PREMIUM (parità con la
// generazione manuale: struttura per formato, standard professionali, schema
// operativo esteso). Scrive nel calendario in stato DA_APPROVARE — l'umano approva
// prima di pubblicare. NON pubblica nulla.
export async function generaContenutiPerCliente(
  clienteId: string,
  opts: { count?: number; canali?: string[]; quality?: string; aiKeys?: AiKeys } = {},
): Promise<AgentResult> {
  const count = Math.max(1, Math.min(opts.count ?? 2, 5))
  const { cliente, brand, prodotti, canali: canaliCollegati } = await loadContext(clienteId)
  // Anti-contenuto-generico (coerente con la linea anti-allucinazione del prodotto):
  // senza un brand configurato NON generiamo — produrremmo copy off-brand. Skippa e
  // segnala esplicitamente invece di fingere un risultato con fallback generici.
  if (!brand) {
    return { clienteId, generati: 0, errori: ['Brand non configurato: generazione automatica saltata per evitare contenuti generici. Completa il brand del cliente.'] }
  }
  // Genera solo per i canali REALMENTE collegati del cliente (o quelli richiesti
  // esplicitamente). Nessun canale collegato → non inventare un canale a caso.
  const canali = opts.canali?.length ? opts.canali : canaliCollegati
  if (!canali.length) {
    return { clienteId, generati: 0, errori: ['Nessun canale social collegato: generazione automatica saltata. Collega almeno un account social del cliente.'] }
  }

  const brandObj: Row = brand
  const cliObj: Row = cliente || {}
  const settore = brandField(brandObj, 'settore', brandField(cliObj, 'settore', 'generico'))
  const nomeBrand = brandField(brandObj, 'nome', brandField(cliObj, 'nome', 'il brand'))
  const tono = brandField(brandObj, 'tono_voce', 'professionale')
  const brandDesc = brandField(brandObj, 'descrizione', brandField(brandObj, 'brand_promise', ''))
  // Qualità PREMIUM per piano: i clienti con piano alto ottengono lo schema/token
  // di qualità superiore (stesso capping della generazione manuale).
  // 3 livelli di ragionamento (soft | medium | high) come il manuale: livello
  // esplicito opzionale MA cappato dal piano del cliente (resolveContentQuality);
  // senza esplicito = livello del piano. Determina profondità schema + budget token.
  const quality = resolveContentQuality({ requestedQuality: opts.quality, piano: cliObj.piano })
  const maxTokens = getQualityTokenBudget(quality)
  const extendedSchema = buildExtendedOutputSchema(quality)

  const errori: string[] = []
  let generati = 0

  for (let i = 0; i < count; i++) {
    const canale = canali[i % canali.length]
    const formati = formatiPerCanale(canale)
    const formato = formati[Math.floor(i / canali.length) % formati.length]
    const prodotto = prodotti.length ? prodotti[i % prodotti.length] : undefined
    const tema = (prodotto?.nome_prodotto as string) || nomeBrand
    try {
      const systemPrompt = buildSystemPrompt(settore, nomeBrand, quality)
      const qualityContext = buildQualityContext({ quality, canale, formato })
      const userPrompt = buildUserPrompt({ canale, formato, nomeBrand, settore, tono, tema, prodotto, brandDesc, angle: pickAngle(), qualityContext, extendedSchema })
      const raw = await callAI({
        model: opts.aiKeys?.model || 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        openrouterKey: opts.aiKeys?.openrouterKey,
        geminiKey: opts.aiKeys?.geminiKey,
        opencodeKey: opts.aiKeys?.opencodeKey,
        maxTokens,
      })
      const parsed = (extractJSON(raw) as Row) || {}
      const caption = pickStr(parsed, ['caption', 'caption_adattata', 'testo', 'didascalia', 'descrizione'])
      if (!caption) { errori.push(`${canale}: caption vuota dall'AI`); continue }
      const id = `auto-${clienteId.slice(0, 8)}-${Date.now()}-${i}`
      await insertCalendarioRow(
        [
          'cliente_id', 'id_contenuto', 'data_pubblicazione', 'ora_pubblicazione', 'canale', 'formato',
          'tema', 'hook', 'caption', 'hashtag', 'cta', 'note', 'status', 'media_type',
          'idea_visual', 'scenes_json', 'slides_json', 'overlay_text', 'voiceover_script', 'music_mood',
          'quality_level', 'audience_segment', 'funnel_stage', 'angle', 'primary_message',
          'proof_points', 'hook_variants', 'caption_long', 'cta_variants', 'creative_brief',
          'production_cycle_stage', 'fonte_generazione',
        ],
        [
          clienteId, id, tomorrow(), '10:00', canale, formato,
          tema, pickStr(parsed, ['hook', 'hook_0_2_sec', 'gancio', 'titolo_video', 'titolo_carosello']) || null,
          caption, pickStr(parsed, ['hashtag', 'hashtags']) || null, pickStr(parsed, ['cta', 'cta_finale']) || null,
          JSON.stringify(parsed).slice(0, 3000), 'DA_APPROVARE', mediaTypePerFormato(formato),
          pickStr(parsed, ['idea_visual', 'descrizione_visiva']) || null,
          jsonbParam(pickJson(parsed, ['scene', 'scenes', 'scenes_json'])),
          jsonbParam(pickJson(parsed, ['slides', 'immagini', 'frames', 'slides_json'])),
          pickStr(parsed, ['overlay_testo', 'overlay_text']) || null,
          pickStr(parsed, ['voiceover', 'voiceover_script']) || null,
          pickStr(parsed, ['musica_mood', 'music_mood']) || null,
          quality,
          pickText(parsed, ['audience_segment', 'audience', 'target_segment']) || null,
          pickText(parsed, ['funnel_stage', 'fase_funnel']) || null,
          pickText(parsed, ['angle', 'angolo_creativo']) || null,
          pickText(parsed, ['primary_message', 'messaggio_chiave']) || null,
          jsonbParam(pickJson(parsed, ['proof_points', 'prove', 'benefici_verificabili'])),
          jsonbParam(pickJson(parsed, ['hook_variants', 'hook_alternativi'])),
          pickText(parsed, ['caption_long', 'caption_estesa', 'corpo']) || null,
          jsonbParam(pickJson(parsed, ['cta_variants', 'cta_alternative'])),
          pickText(parsed, ['creative_brief', 'brief_creativo']) || null,
          'review', 'agente_auto',
        ],
      )
      generati++
    } catch (e) {
      errori.push(`${canale}: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`)
    }
  }

  return { clienteId, generati, errori }
}
