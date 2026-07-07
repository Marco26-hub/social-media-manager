import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { dbReady, q } from '@/lib/db'
import { requireAuth, requireClienteAccess } from '@/lib/auth-utils'
import { isDemo } from '@/lib/demo'
import {
  buildExtendedOutputSchema,
  buildQualityContext,
  getQualityTokenBudget,
  jsonbParam,
  normalizeContentQuality,
  pickJson,
  pickText,
  resolveContentQuality,
  isQualityDowngraded,
  type ContentQuality,
} from '@/lib/content-quality'
import { getClientGenerationContext } from '@/lib/client-context'
import { normalizeProductionCycleStage } from '@/lib/production-cycle'
import { PRO_COPY_STANDARDS, SEO_GEO_STANDARDS, pickAngle } from '@/lib/prompt-standards'
import { filterExistingColumnPairs, getTableColumns } from '@/lib/db-schema'
import { adaptRowForPlatform } from '@/lib/social-adapt'

type PromptSpec = {
  persona: string
  goal: string
  dimensione: string
  struttura: string
  tono: string
  limiti: string
  hashtag: string
  cta: string
  effetti: string
  outputSchema: string
}

type UserAsset = {
  name?: string
  url: string
  mime?: string
  source?: string
}

function isVideoUrl(url: string) {
  return url.split('?')[0].toLowerCase().endsWith('.mp4')
}

function isVideoAsset(asset: UserAsset) {
  return asset.mime?.startsWith('video/') || isVideoUrl(asset.url)
}

function normalizeAssets(input: unknown, fallbackUrls: unknown): UserAsset[] {
  const rawAssets = Array.isArray(input) ? input : []
  const assets = rawAssets
    .map((item): UserAsset | null => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (!url) return null
      return {
        name: typeof record.name === 'string' ? record.name : undefined,
        url,
        mime: typeof record.mime === 'string' ? record.mime : undefined,
        source: typeof record.source === 'string' ? record.source : undefined,
      }
    })
    .filter((asset): asset is UserAsset => Boolean(asset))

  const urls = Array.isArray(fallbackUrls) ? fallbackUrls : []
  for (const item of urls) {
    if (typeof item !== 'string' || !item.trim()) continue
    const url = item.trim()
    if (!assets.some(asset => asset.url === url)) assets.push({ url, source: 'url' })
  }

  return assets.slice(0, 10)
}

function buildAssetContext(assets: UserAsset[]) {
  if (!assets.length) return 'ASSET FORNITI: nessun asset caricato. Genera anche asset_requirements chiari.'
  return `ASSET FORNITI DALL'UTENTE (USALI COME BASE VISIVA, SENZA INVENTARE MEDIA NON PRESENTI):
${assets.map((asset, index) => `${index + 1}. ${asset.name || 'asset'} — ${asset.url} — tipo: ${asset.mime || 'image'} — fonte: ${asset.source || 'utente'}`).join('\n')}

⚠️ PRODOTTO REALE = QUELLO NEI MEDIA CARICATI:
- Le immagini caricate vengono allegate alla vision: guardale e scrivi il contenuto sul prodotto effettivamente mostrato.
- Gli MP4 caricati sono media finali già pronti per reel/video: usali come video principale, non inventare un altro video.
- NON scrivere su altri prodotti del catalogo (es. un blazer) se NON sono quelli nel media. Il media caricato vince sempre sui dati del catalogo.
- Descrivi dettagli concreti che osservi nelle immagini: tipo di capo, colore, vestibilità, accessori, contesto/luogo.
- Usa il NOME indicato accanto a ogni media come nome ufficiale del prodotto.
- PIÙ PRODOTTI: se ci sono più media con prodotti/nomi diversi, in carosello/album dedica UNA slide a ciascun prodotto (nome corretto + descrizione dall'asset corrispondente). In post singolo, scegli il prodotto principale o raccontali come look coordinato.

Regole asset:
- Il contenuto deve indicare quale asset usare in ogni post/slide/frame/scena.
- Per post/story/carousel usa gli asset come visual principale o dettaglio prodotto.
- Per reel/video usa gli asset come product hero, B-roll, cutaway o cover quando non è disponibile video.
- Se un asset non è adatto al formato, segnala il problema in missing_inputs e proponi un fallback produttivo.
- Non inventare foto, loghi, UGC, claim o prove non contenuti negli asset/dati forniti.`
}

async function insertCalendario(columns: string[], values: unknown[]): Promise<boolean> {
  const existing = await getTableColumns('calendario')
  const { columns: finalColumns, values: finalValues, skipped } = filterExistingColumnPairs(columns, values, existing)
  if (!finalColumns.length) throw new Error('Nessuna colonna valida per insert su calendario (schema DB inatteso)')
  await q(
    `INSERT INTO calendario (${finalColumns.join(', ')}) VALUES (${finalColumns.map((_, index) => `$${index + 1}`).join(', ')})`,
    finalValues,
  )
  return skipped.length > 0
}

// Standard professionali applicati a OGNI generazione: alzano la qualità da
// "didascalia AI generica" a copy da professionista. Vietano i cliché ricorrenti.
// Standard professionali/anti-cliché/grammatica e angoli: ora condivisi in
// lib/prompt-standards.ts (la "bibbia" usata anche da plan/blog/ads).

function build(p: PromptSpec, brand: string, prodotto: string, canale: string, formato: string, tema: string, nomeProdotto: string, qualityContext: string, assetContext: string, angle: string, quality: ContentQuality) {
  return `${p.persona}

${PRO_COPY_STANDARDS}

${SEO_GEO_STANDARDS}

ANGOLO CREATIVO OBBLIGATORIO PER QUESTO CONTENUTO (usalo come attacco/struttura):
→ ${angle}

BRAND:
${brand}

PRODOTTO:
${prodotto}

IDEA: Canale: ${canale}, Formato: ${formato}, Tema: ${tema}, Prodotto: ${nomeProdotto}

${assetContext}

GOAL: ${p.goal}
DIMENSIONE: ${p.dimensione}
STRUTTURA: ${p.struttura}
TONO: ${p.tono}
LIMITI: ${p.limiti}
HASHTAG: ${p.hashtag}
CTA: ${p.cta}
EFFETTI: ${p.effetti}

${qualityContext}

Output SOLO JSON valido.
Schema base storico:
${p.outputSchema}

Schema operativo obbligatorio da includere o fondere nel JSON:
${buildExtendedOutputSchema(quality)}`
}

const PROMPTS: Record<string, PromptSpec> = {
  // ===================== INSTAGRAM =====================
  'instagram:post': {
    persona: 'Sei un copywriter Instagram fashion. Scriviti contenuti per un brand abbigliamento e-commerce italiano.',
    goal: 'Ispirare e convertire. Il post deve mostrare il prodotto in modo desiderabile, far venire voglia di cliccare e comprare.',
    dimensione: '1:1 quadrato (1080x1080px). L\'immagine è il protagonista, testo come accompagnamento.',
    struttura: 'Hook in 5-7 parole cattura-attenzione. Caption 150-2200 caratteri con emoji. Inizia con hook, poi descrivi il prodotto, vantaggio emotivo, dettaglio funzionale, chiusura con CTA morbida. A capo frequenti.',
    tono: 'Fashion, fresco, italiano. Amichevole ma autorevole. Emoji naturale. No corporate.',
    limiti: 'Caption 150-2200 char. Hook max 60 char. Non inventare prezzi, taglie, sconti.',
    hashtag: '5-8 hashtag misti: 2-3 ampi (#fashion #moda), 2-3 di nicchia (#blazerestate), 1-2 branded. In coda alla caption.',
    cta: 'CTA morbida: "Scopri il look" / "Disponibile ora" / "Salva per dopo". Link in bio.',
    effetti: 'Immagine pulita, luce naturale. Il prodotto occupa >60% del frame. Sfondo neutro o contestuale. Nessun testo sull\'immagine.',
    outputSchema: '{"hook":"","caption":"","hashtag":"","cta":"","idea_visual":"descrivi lo scatto fotografico: inquadratura, luce, mood, styling","status":"DA_APPROVARE"}',
  },

  'instagram:carousel': {
    persona: 'Sei un content strategist Instagram carousel per brand fashion e-commerce.',
    goal: 'Educare e ispirare. Il carosello deve creare un mini-racconto che fa scorrere le slide, con CTA finale che porta al prodotto.',
    dimensione: '1:1 quadrato (1080x1080px). Da 3 a 5 slide (mai meno di 3, mai più di 5). Ogni slide = 1 concetto.',
    struttura: 'Slide 1: Hook visivo + titolo (fa venire voglia di swipe). Slide 2-3: problema/dubbio che il prodotto risolve e come usarlo (styling, dettagli, beneficio). Slide finale: CTA + prodotto. Usa da 3 a 5 slide in totale.',
    tono: 'Autorevole, consigliere di stile. "Ecco come", "Prova così", "Il segreto è". Emoji misurate.',
    limiti: 'Esattamente da 3 a 5 slide. Testo per slide max 120 char. Testo sulla prima slide max 60 char.',
    hashtag: '5-6 hashtag. Inserire nella caption (non nelle slide).',
    cta: 'CTA nell\'ultima slide: "Scopri la collezione" / "Provalo ora".',
    effetti: 'Slide coerenti come palette colori. Font leggibile su mobile. Slide 1 bold e minimal.',
    outputSchema: '{"titolo_carosello":"","numero_slide":4,"slides":[{"numero":1,"testo":"testo sulla slide","visual":"descrizione immagine"}]}',
  },

  'instagram:reel': {
    persona: 'Sei un creator TikTok/Reel fashion. Realizzi script per video brevi ad alto tasso di completamento.',
    goal: 'Viralità + awareness. Il reel deve intrattenere nei primi 2 secondi e mostrare il prodotto in azione.',
    dimensione: '9:16 verticale (1080x1920px). Durata 15-30 secondi.',
    struttura: '0-2s: Hook visivo potente (trasformazione, POV, risultato). 2-5s: Contesto/problema. 5-20s: Dimostrazione prodotto / styling / 3 modi. 20-25s: Momento wow / risultato. 25-30s: CTA.',
    tono: 'Autentico, veloce, trend-aware. Parla come un creator, non come un brand. "POV:", "Non sapete che...", "Ok ma questo..."',
    limiti: '15-30 secondi totali. Scene: 3-5. Overlay testo: max 2 parole per screen.',
    hashtag: 'Hashtag nella caption: 3-5 hashtag trending + 1-2 branded.',
    cta: 'CTA orale nell\'ultima scena o testo overlay: "Link in bio".',
    effetti: 'Transizioni veloci (cut, whip pan). Trend audio attuale. Testo overlay grande al centro. Colori saturi.',
    outputSchema: '{"titolo_video":"","durata":"20s","hook_0_2_sec":"","scene":[{"numero":1,"secondi":"0-2","descrizione":"","overlay_testo":""}],"voiceover":"","musica_mood":"","cta_finale":""}',
  },

  'instagram:story': {
    persona: 'Sei un social media manager Instagram. Crei story 24h per mantenere engagement quotidiano.',
    goal: 'Engagement quotidiano. La story deve creare connessione e portare traffico al sito via swipe-up/link.',
    dimensione: '9:16 verticale (1080x1920px). 1-3 frame. Durata visualizzazione 3-5s per frame.',
    struttura: 'Frame 1: Hook visivo + testo breve. Frame 2 (opzionale): Dettaglio prodotto / dietro le quinte. Frame 3: CTA con sticker/link.',
    tono: 'Intimo, dietro le quinte, personale. "Guardate questa...", "Novità di oggi...", "Solo per voi...".',
    limiti: '1-3 frame. Testo per frame max 80 char. Totale story max 15 secondi.',
    hashtag: '1-2 hashtag o sticker location.',
    cta: 'Sticker swipe-up o link. "Scopri ora" / "Solo oggi".',
    effetti: 'Sfondo brand. Sticker interattivi (poll, domande). Colori brand come overlay. Font pulito.',
    outputSchema: '{"frames":[{"numero":1,"hook":"testo in sovrimpressione","immagine_descrizione":""}],"cta":"testo sticker link","status":"DA_APPROVARE"}',
  },

  // ===================== FACEBOOK =====================
  'facebook:post': {
    persona: 'Sei un copywriter Facebook per brand fashion e-commerce.',
    goal: 'Informare e convertire. Il post deve descrivere il prodotto in dettaglio, convincere e portare al sito.',
    dimensione: '1.91:1 landscape (1200x628px). Immagine orizzontale con spazio per testo descrittivo.',
    struttura: 'Hook + descrizione dettagliata + benefici + CTA esplicito con link. Testo più lungo di Instagram, 2-3 paragrafi. Link nativo (non in bio).',
    tono: 'Professionale ma caldo. Più descrittivo di IG. Adatto a pubblico 25-55. Frasi complete, punteggiatura corretta.',
    limiti: 'Caption 200-5000 char. Link esplicito al prodotto. Non inventare prezzi/taglie.',
    hashtag: '1-2 hashtag massimo. Facebook non premia gli hashtag. Solo branded.',
    cta: 'CTA esplicito con link: "Acquista ora su [sito]" / "Scopri di più ➡️ [link]".',
    effetti: 'Immagine orizzontale professionale. Prodotto in contesto reale. Luce naturale. Testo eventuale solo se elegante.',
    outputSchema: '{"hook":"","caption":"","hashtag":"","cta":"","descrizione_prodotto":"testo descrittivo 2-3 frasi","status":"DA_APPROVARE"}',
  },

  'facebook:carousel': {
    persona: 'Sei un content manager Facebook per brand fashion. Crei album prodotto multi-immagine.',
    goal: 'Mostrare la collezione completa. Ogni immagine = 1 prodotto o 1 angolazione. L\'album deve invogliare a esplorare.',
    dimensione: 'Immagini 1:1 o 1.91:1. 3-7 immagini. Ogni immagine con didascalia.',
    struttura: 'Immagine 1: Hero prodotto. Immagine 2-3: Dettagli (tessuto, taglio). Immagine 4-5: Styling / indossato. Immagine 6: Lifestyle. Immagine 7: CTA.',
    tono: 'Descrittivo, elegante. Ogni didascalia 1-2 frasi. Testo principale sotto l\'album: 2-3 paragrafi.',
    limiti: '3-7 immagini. Didascalia per immagine max 200 char.',
    hashtag: '1-2 hashtag branded.',
    cta: 'CTA nell\'ultima immagine e nella caption: link al prodotto/collezione.',
    effetti: 'Coerenza visiva tra tutte le immagini. Stessa palette. Stesso stile fotografico.',
    outputSchema: '{"titolo_album":"","caption_principale":"","immagini":[{"numero":1,"didascalia":"","descrizione_visiva":""}],"cta":"","status":"DA_APPROVARE"}',
  },

  'facebook:video': {
    persona: 'Sei un video creator per Facebook business. Produci video landscape nativi per la pagina aziendale.',
    goal: 'Educare e mostrare il prodotto in dettaglio. Video più lunghi di IG/TT perché il pubblico FB guarda con audio.',
    dimensione: '16:9 landscape. Durata 30-90 secondi.',
    struttura: '0-5s: Intro brand + prodotto. 5-20s: Presentazione dettagliata. 20-50s: Dimostrazione / tutorial styling. 50-70s: Benefici / social proof. 70-90s: CTA.',
    tono: 'Professionale, informativo. Voce fuori campo chiara. Parla a un pubblico che vuole capire il prodotto.',
    limiti: '30-90 secondi. Scene 4-6. Voiceover o parlato.',
    hashtag: '1-2 hashtag nella descrizione.',
    cta: 'CTA esplicito nel video (testo overlay) e nella descrizione: link.',
    effetti: 'Qualità video professionale. Luci morbide. Brand logo watermark opzionale.',
    outputSchema: '{"titolo_video":"","durata":"60s","scene":[{"numero":1,"secondi":"0-5","descrizione":"","testo_overlay":""}],"voiceover":"testo parlato","descrizione_video":"testo sotto il video","cta_finale":""}',
  },

  'facebook:reel': {
    persona: 'Sei un content creator. Adatti reel da Instagram a Facebook mantenendo lo stesso stile ma con contesto diverso.',
    goal: 'Cross-post da IG. Stesso contenuto ma caption adattata al pubblico Facebook.',
    dimensione: '9:16 verticale. 15-30 secondi.',
    struttura: 'Stessa struttura del reel Instagram. Caption più descrittiva per FB.',
    tono: 'Simile a IG ma meno slang. Più chiaro e diretto.',
    limiti: '15-30 secondi. Caption adattata: aggiungere 1-2 frasi di contesto.',
    hashtag: '1-2 hashtag.',
    cta: 'CTA esplicito nella caption con link.',
    effetti: 'Stessi del reel. Adattare solo la caption.',
    outputSchema: '{"caption_adattata":"","cta":"","note_reel":"riferimento al reel IG","status":"DA_APPROVARE"}',
  },

  // ===================== TIKTOK =====================
  'tiktok:video': {
    persona: 'Sei un TikTok creator fashion. Parli alla Gen Z e Millennials con autenticità e velocità.',
    goal: 'Viralità pura. Il video deve intrattenere immediatamente, usare trend audio, e inserire il prodotto in modo nativo.',
    dimensione: '9:16 verticale (1080x1920px). Durata 15-30 secondi.',
    struttura: '0-2s: Hook visivo ESTREMO (POV, risultato wow, errore, curiosità). 2-5s: Contesto veloce. 5-20s: Contenuto principale (3 modi di usare, before/after, try-on). 20-30s: Chiusura con CTA morbida.',
    tono: 'Parla come un creator, MAI come un brand. Usa slang TikTok. Autentico, imperfetto, divertente. "POV:", "Non ci crederai ma...", "Ok questo cambia tutto"',
    limiti: '15-30 secondi. Scene: 3-6. Overlay testo: brevi, 2-4 parole, font bold al centro.',
    hashtag: '3-5 hashtag trending + 1 branded. Inserire nella caption TikTok (non nel video).',
    cta: 'CTA nativa: "Link in bio" nel testo overlay finale. Mai forzato.',
    effetti: 'Tagli rapidi (jump cut). Trend audio MUST. Testo overlay bold centrale. Colori vivaci e saturi. Effetti nativi TikTok (green screen, slow zoom).',
    outputSchema: '{"titolo_video":"","durata":"20s","hook_0_2_sec":"","trend_audio_suggerito":"","scene":[{"numero":1,"secondi":"0-2","descrizione":"","overlay_testo":""}],"caption_tiktok":"testo sotto il video","cta_finale":""}',
  },

  'tiktok:reel': {
    persona: 'Sei un TikTok creator specializzato in contenuti fashion scriptati.',
    goal: 'Intrattenere con uno script strutturato. Il prodotto è il protagonista ma non si deve sentire la vendita.',
    dimensione: '9:16 verticale. 15-30 secondi.',
    struttura: '0-2s: Sorpresa / curiosità. 2-5s: Setup della situazione. 5-25s: Sviluppo con 3-5 micro-scene. 25-30s: Risultato / payoff.',
    tono: 'Ironico, relatable, trend-aware. Usa format virali: "GRWM", "POV", "Things that...", "Rating outfits".',
    limiti: '15-30 secondi. Scene 4-6. Parlato o voiceover.',
    hashtag: 'Hashtag trending nella caption (non nel video).',
    cta: 'CTA solo se naturale. Spesso non serve: il prodotto parla da solo.',
    effetti: 'Transizioni creative. Trend audio. Green screen se utile. Testo overlay solo se essenziale.',
    outputSchema: '{"titolo_video":"","durata":"25s","hook_0_2_sec":"","scene":[{"numero":1,"secondi":"0-2","descrizione":"","audio":"","parlato":""}],"cta_finale":""}',
  },

  // ===================== PINTEREST =====================
  'pinterest:pin': {
    persona: 'Sei un Pinterest strategist per brand e-commerce. I tuoi pin devono essere trovati dalla search e salvati.',
    goal: 'Traffico organico dal search Pinterest. Il pin deve essere SEO-optimized, visivamente verticale e portare al sito.',
    dimensione: '2:3 verticale (1000x1500px). Pin statico o video. Layout pensato per essere letto su mobile in griglia.',
    struttura: 'Immagine verticale con: titolo grande in alto (font elegante), prodotto al centro (60% spazio), CTA in basso. Descrizione pin: SEO-optimized, 200-500 char, keyword naturali, link al prodotto.',
    tono: 'Ispirazionale, pulito, utile. "Come abbinare...", "Idee outfit per...", "Guida stile...".',
    limiti: 'Descrizione 200-500 char. Titolo sull\'immagine max 40 char. Link diretto al prodotto.',
    hashtag: '2-3 hashtag rilevanti alla fine della descrizione. Pinterest premia le keyword, non gli hashtag.',
    cta: 'CTA sull\'immagine: "Save for later" / "Shop now". Link diretto nella descrizione.',
    effetti: 'Font grande e leggibile. Palette colori calda o pastello (funziona meglio su Pinterest). Sfondo chiaro. Overlay testo con contrasto alto.',
    outputSchema: '{"titolo_immagine":"testo sul pin","descrizione_seo":"200-500 char descrizione ottimizzata","hashtag":"2-3 keyword","cta":"testo CTA sull\'immagine","link":"","idea_visual":"composizione visiva","status":"DA_APPROVARE"}',
  },

  // ===================== LINKEDIN =====================
  'linkedin:post': {
    persona: 'Sei un thought leader B2B nel settore fashion/retail. Scrivi per professionisti e imprenditori.',
    goal: 'Autorevolezza e network. Il post deve dimostrare competenza, condividere insight di settore, e posizionare il brand come leader.',
    dimensione: '1:1 o 1.91:1. Testo nativo LinkedIn (no immagine necessaria). Immagine opzionale come supporto.',
    struttura: 'Hook: 1 frase impattante (riga 1 = tutto ciò che si vede prima di "...see more"). Corpo: 3-5 paragrafi brevi, 2-4 righe ciascuno. Insight, dato, esperienza. Chiusura: domanda o riflessione. NO CTA commerciale esplicita.',
    tono: 'Professionale, competente, misurato. Zero emoji o max 1. Niente slang. Niente "compra ora". Frasi strutturate.',
    limiti: 'Testo 500-3000 char. NO hashtag (LinkedIn non li premia, max 2-3 alla fine).',
    hashtag: '2-3 hashtag alla fine, separati dal testo. Solo hashtag di settore.',
    cta: 'CTA morbida: domanda aperta per engagement. "Cosa ne pensate?" / "Qual è la vostra esperienza?".',
    effetti: 'Testo pulito, formattazione con spazi bianchi. Immagine (se presente) professionale e sobria.',
    outputSchema: '{"hook":"prima frase visibile","corpo":"testo completo con paragrafi separati da \\n\\n","hashtag":"","domanda_finale":"CTA morbida per engagement","status":"DA_APPROVARE"}',
  },

  'linkedin:articolo': {
    persona: 'Sei un content writer LinkedIn per leadership thought nel settore moda/retail. Scrivi articoli long-form.',
    goal: 'Thought leadership. L\'articolo deve dimostrare deep expertise, fornire insight unici, e generare discussione.',
    dimensione: 'Testo nativo LinkedIn. 800-1500 parole. Copertina 16:9.',
    struttura: 'Titolo: provocatorio o informativo. Sottotitolo: contesto. Intro: problema/domanda. 3-5 sezioni con H2. Ogni sezione: tesi + argomento + esempio. Chiusura: takeaway + domanda.',
    tono: 'Giornalistico, analitico. Dati e citazioni quando possibile. Personale ma autorevole.',
    limiti: '800-1500 parole. 3-5 H2. Paragrafi 3-5 righe.',
    hashtag: '2-3 hashtag alla fine.',
    cta: 'Domanda aperta: "Qual è la vostra opinione su...?" / "Avete sperimentato...?"',
    effetti: 'Copertina professionale. Immagini interne opzionali come supporto dati.',
    outputSchema: '{"titolo":"","sottotitolo":"","intro":"","sezioni":[{"h2":"","paragrafi":[],"esempio":""}],"takeaway":"","domanda_finale":"","hashtag":"","status":"DA_APPROVARE"}',
  },

  // ===================== YOUTUBE SHORTS =====================
  'youtube_shorts:short': {
    persona: 'Sei un YouTube Shorts creator fashion. Crei video corti ottimizzati per la search YouTube.',
    goal: 'Discoverability su YouTube search + engagement veloce. Lo short deve essere trovato e riguardato.',
    dimensione: '9:16 verticale (1080x1920px). Durata 15-60 secondi.',
    struttura: '0-3s: Hook visivo potente (il titolo del video deve corrispondere all\'hook). 3-10s: Contenuto principale. 10-55s: Dettaglio / dimostrazione / 3 consigli. 55-60s: Chiusura.',
    tono: 'Utile, pratico. "How to...", "3 modi per...", "Guida rapida...". Pensa alla search intent.',
    limiti: '15-60 secondi. Descrizione: 100-300 char SEO-optimized. Tag: 5-10 keyword.',
    hashtag: '3-5 tag nella descrizione. Usare #shorts.',
    cta: 'CTA morbido: "Iscriviti per altri consigli" / "Guarda il video completo".',
    effetti: 'Pulito e diretto. Meno effetti di TikTok. Buona illuminazione. Sfondo ordinato.',
    outputSchema: '{"titolo":"titolo SEO 50-70 char","durata":"30s","hook_0_3_sec":"","scene":[{"numero":1,"secondi":"0-3","descrizione":"","overlay_testo":""}],"descrizione_seo":"100-300 char","tags":["keyword1","keyword2"],"cta_finale":""}',
  },

  // ===================== BLOG =====================
  'blog:articolo': {
    persona: 'Sei un content writer SEO senior per brand fashion e-commerce. Scrivi articoli che rankano su Google e vengono citati dalle AI.',
    goal: 'SEO + GEO. L\'articolo deve posizionarsi per keyword commerciali, essere citato da ChatGPT/Perplexity, e convertire in vendita.',
    dimensione: 'Testo 800-1200 parole. Hero image 16:9. Mobile-first readable.',
    struttura: 'H1: 50-60 char, keyword principale all\'inizio. Meta description: 140-160 char. Intro: 2-3 frasi, risposta diretta alla query. 3-5 H2 con keyword secondarie. Ogni H2: 2-4 paragrafi + 1 lista puntata. FAQ section: 3-5 domande/risposte. CTA finale collegato ai prodotti.',
    tono: 'Autorevole, esperienziale (E-E-A-T). "In questa guida scoprirai...", "Secondo la nostra esperienza...", "I nostri clienti ci dicono che...". Usa dati, percentuali, esempi concreti.',
    limiti: '800-1200 parole. H1 50-60 char. Meta 140-160 char. Paragrafi 2-4 righe. Keyword density 1-2%.',
    hashtag: 'Nessun hashtag. Usare keyword nel testo in modo naturale.',
    cta: 'CTA finale morbida: "Scopri la collezione [nome prodotto]" con link interno. "Leggi anche: [articolo correlato]".',
    effetti: 'Hero image pertinente e di qualità. Link interni a prodotti citati (2-4). Anchor text descrittivo.',
    outputSchema: '{"slug":"url-friendly","meta_title":"50-60 char","meta_description":"140-160 char","h1":"","intro":"","sezioni":[{"h2":"","paragrafi":[],"lista_punti":[]}],"faq":[{"domanda":"","risposta":""}],"cta_finale":"","keywords_target":[],"prodotti_linkati":[],"tempo_lettura_min":5,"status":"DA_APPROVARE"}',
  },

  // ===================== THREADS =====================
  'threads:post': {
    persona: 'Sei un social media manager Threads per un brand fashion e-commerce italiano. Scrivi come una persona reale, non come un brand.',
    goal: 'Conversazione e community. Il post deve suonare autentico, far venire voglia di rispondere e commentare, non di comprare subito.',
    dimensione: '1:1 quadrato o foto verticale. Testo-first ma con foto di supporto. Tono casual.',
    struttura: 'Apri con un\'osservazione genuina, un dietro-le-quinte o una domanda. 1-3 frasi brevi, dirette, conversazionali. Chiudi invitando alla risposta, senza CTA commerciale aggressiva.',
    tono: 'Autentico, informale, diretto. Come parli a un amico. Poche emoji, naturali. Niente linguaggio da spot.',
    limiti: 'Testo 100-500 char. Frasi brevi. Niente muri di testo. Niente hard-sell.',
    hashtag: '0-2 hashtag massimo, solo se naturali. Niente spam.',
    cta: 'CTA conversazionale: "Voi cosa ne pensate?" / "Ditemi la vostra". Nessun "compra ora".',
    effetti: 'Foto autentica, poco patinata, vera. Luce naturale. Dietro le quinte > prodotto in posa.',
    outputSchema: '{"hook":"prima frase","caption":"testo completo conversazionale","hashtag":"0-2 hashtag o vuoto","cta":"invito alla conversazione","idea_visual":"descrivi una foto autentica e naturale","status":"DA_APPROVARE"}',
  },

  'threads:reel': {
    persona: 'Sei un creator Threads fashion. Realizzi brevi clip foto-first verticali con caption autentica.',
    goal: 'Awareness visiva. La clip deve mostrare il prodotto in movimento/contesto reale con una caption breve e diretta.',
    dimensione: '9:16 verticale. Clip breve o foto in sequenza. Caption essenziale.',
    struttura: 'Visual che cattura nei primi istanti (movimento del tessuto, contesto reale). Caption di 1-2 frasi che commenta in modo genuino. Chiusura leggera.',
    tono: 'Casual, spontaneo, foto-first. Niente script da spot.',
    limiti: 'Caption 80-300 char. Tono informale.',
    hashtag: '0-2 hashtag naturali.',
    cta: 'CTA soft o domanda. Niente hard-sell.',
    effetti: 'Movimento reale, luce naturale, estetica autentica non patinata.',
    outputSchema: '{"titolo_video":"","hook":"","caption":"testo breve","hashtag":"0-2 o vuoto","scene":[{"numero":1,"descrizione":"","overlay_testo":""}],"cta":"","status":"DA_APPROVARE"}',
  },

  // ===================== X (Twitter) =====================
  'x:post': {
    persona: 'Sei un social media manager X (Twitter) per un brand fashion e-commerce italiano. Scrivi conciso e incisivo.',
    goal: 'Reach e conversazione rapida. Il post deve colpire in una frase, essere condivisibile e invitare alla risposta/retweet.',
    dimensione: 'Testo conciso (max 280 caratteri) + immagine 16:9 in timeline.',
    struttura: 'Una sola idea forte, espressa in modo netto e memorabile. Niente preamboli. Se serve approfondire, prevedi un thread (campo thread_aggiuntivi con i tweet successivi).',
    tono: 'Diretto, tempestivo, intelligente. Asciutto. Può avere una punta di personalità. Niente corporate.',
    limiti: 'Post singolo MAX 280 caratteri (vincolo rigido). Hook fortissimo. Niente emoji-spam.',
    hashtag: '1-2 hashtag massimo, in caption, solo se rilevanti. Niente spam di hashtag.',
    cta: 'CTA leggera: "Scopri" / "Per saperne di più" + link, oppure invito a risposta/retweet.',
    effetti: 'Immagine 16:9 pulita e d\'impatto, leggibile in piccolo nella timeline.',
    outputSchema: '{"hook":"il tweet completo max 280 char","caption":"stesso testo del tweet","hashtag":"1-2 hashtag o vuoto","cta":"","thread_aggiuntivi":["eventuali tweet successivi del thread, ognuno max 280 char"],"idea_visual":"descrivi immagine 16:9 d\'impatto","status":"DA_APPROVARE"}',
  },

  'x:video': {
    persona: 'Sei un creator X (Twitter) fashion. Realizzi video brevi nativi 16:9 con hook immediato.',
    goal: 'Engagement e visualizzazioni. Il video deve agganciare nei primi secondi e far fermare lo scroll.',
    dimensione: '16:9 nativo (anche 1:1 accettato). Durata 15-45 secondi. Caption concisa.',
    struttura: '0-2s: hook visivo immediato. 2-30s: dimostrazione/contesto del prodotto. Chiusura con CTA leggera. Caption max 280 char.',
    tono: 'Diretto, dinamico, autentico. Niente spot patinato.',
    limiti: 'Caption max 280 char. Video 15-45s. Hook nei primi 2 secondi.',
    hashtag: '1-2 hashtag in caption.',
    cta: 'CTA leggera in caption o a fine video.',
    effetti: 'Video 16:9 nitido, sottotitoli/overlay leggibili, primo frame forte.',
    outputSchema: '{"titolo_video":"","hook_0_2_sec":"","caption":"max 280 char","hashtag":"1-2 o vuoto","scene":[{"numero":1,"secondi":"0-2","descrizione":"","overlay_testo":""}],"cta_finale":"","status":"DA_APPROVARE"}',
  },
}

function extractCaption(parsed: Record<string, unknown>): string {
  if (parsed.caption_tiktok) return parsed.caption_tiktok as string
  if (parsed.caption_adattata) return parsed.caption_adattata as string
  if (parsed.descrizione_seo) return parsed.descrizione_seo as string
  if (parsed.descrizione_video) return parsed.descrizione_video as string
  if (parsed.corpo) return parsed.corpo as string
  if (parsed.caption_principale) return parsed.caption_principale as string
  if (parsed.caption) return parsed.caption as string
  if (parsed.intro) return parsed.intro as string
  return ''
}

function extractScenes(parsed: Record<string, unknown>): string | null {
  const scenes = parsed.scene || parsed.scenes
  if (!scenes) return null
  return JSON.stringify(scenes)
}

function extractSlides(parsed: Record<string, unknown>): string | null {
  const slides = parsed.slides || parsed.immagini || parsed.slides_json
  if (!slides) return null
  return JSON.stringify(slides)
}

function extractTags(parsed: Record<string, unknown>): string[] | null {
  const tags = parsed.tags || parsed.tag || parsed.keywords_target || parsed.hashtag_array
  if (Array.isArray(tags)) return tags
  return null
}

function extractOverlay(parsed: Record<string, unknown>): string | null {
  if (parsed.overlay_testo) return parsed.overlay_testo as string
  if (parsed.overlay_text) return parsed.overlay_text as string
  const scenes = parsed.scene || parsed.scenes
  if (Array.isArray(scenes) && scenes[0]?.overlay_testo) return scenes[0].overlay_testo as string
  return null
}

function buildBrandContext(brand: Record<string, unknown> | null): string {
  if (!brand || !brand.brand_name) return ''
  return `CONTESTO BRAND (USA SEMPRE QUESTI DATI):
Nome: ${brand.brand_name || ''}
Settore: ${brand.settore || 'moda e-commerce'}
Tono di voce: ${brand.tono_voce || 'elegante e professionale'}
Target: ${brand.target || 'adulti 25-55'}
Promessa: ${brand.promessa_brand || 'qualità e stile'}
Colori brand: ${brand.colori_brand || ''}
Parole da usare: ${brand.parole_da_usare || ''}
Parole da EVITARE: ${brand.parole_da_evitare || ''}
Emoji consentiti: ${brand.emoji_policy || ''}
Hashtag base: ${brand.hashtag_base || ''}
CTA base: ${brand.cta_base || ''}
`
}

function buildSystemPrompt(brand: Record<string, unknown> | null, quality: string): string {
  const settore = (brand as Record<string, string>)?.settore || 'moda ed e-commerce'
  const nome = (brand as Record<string, string>)?.brand_name || 'brand'
  return `Sei un creative strategist e copywriter social media senior (10+ anni, brand premium) specializzato in ${settore} per il brand ${nome}. Livello qualità: ${quality}. Il tuo copy deve sembrare scritto da un professionista, non da un'AI: hook che fermano lo scroll, specificità concreta, zero cliché e zero frasi-riempitivo. Ogni contenuto deve essere moderno, trend-aware e social-native: ritmo da feed 2026, POV/micro-storia/swipe tension quando utile, mai tono brochure. Evita le formule generiche da didascalia automatica. GRAMMATICA E ORTOGRAFIA ITALIANE IMPECCABILI: mai parole attaccate (es. "Eleganzasenza"), accenti e apostrofi corretti, nessun refuso — rileggi prima di restituire. Rispondi SEMPRE e SOLO con JSON valido, nessun altro testo. Usa tono di voce, parole-chiave e stile del contesto brand. Non inventare claim, prezzi, stock, canzoni virali o dati non forniti.`
}

export async function POST(request: Request) {
  try {
    await requireAuth()
    const { cliente_id, canale, formato, model, openrouter_key, gemini_key, opencode_key, tema, nome_prodotto, product_id, quality, quality_level, post_quality, qualita, obiettivo, uploaded_assets, media_urls, also_canali, visual_effects, visual_preset, use_trending_effects, consenso_utilizzo } = await request.json()
    if (!canale || !formato) {
      return NextResponse.json({ error: 'canale, formato richiesti' }, { status: 400 })
    }
    // Cross-post opt-in: canali extra su cui pubblicare LO STESSO contenuto (scelti in dashboard).
    const CANALI_VALIDI = new Set(['instagram','facebook','tiktok','pinterest','linkedin','threads','x','youtube_shorts'])
    const alsoCanali: string[] = Array.isArray(also_canali)
      ? [...new Set(also_canali.filter((c): c is string => typeof c === 'string' && CANALI_VALIDI.has(c) && c !== canale))]
      : []
    const clientContext = await getClientGenerationContext(cliente_id)
    const effectiveClienteId = clientContext.clienteId
    if (!effectiveClienteId) return NextResponse.json({ error: 'Nessun cliente selezionato' }, { status: 400 })
    await requireClienteAccess(effectiveClienteId)
    const requestedQuality = quality ?? quality_level ?? post_quality ?? qualita
    if (isDemo() || !dbReady()) {
      const demoQuality = resolveContentQuality({ requestedQuality })
      const id_contenuto = `DEMO_${Date.now().toString(36).toUpperCase()}`
      return NextResponse.json({
        ok: true,
        demo: true,
        id_contenuto,
        tipo: 'calendario',
        quality_level: demoQuality,
        quality_downgraded: isQualityDowngraded(requestedQuality, demoQuality),
        warning: 'Fallback demo: DATABASE_URL non configurato, contenuto non persistito su Neon.',
      })
    }

    // Avvisi osservabili raccolti durante la generazione (non nascondere ripieghi).
    const warnings: string[] = []

    const key = `${canale}:${formato}`
    const spec = PROMPTS[key] || PROMPTS[`instagram:post`]
    // Formato non-nativo (es. pinterest:reel): usiamo il template IG generico → l'utente
    // deve saperlo, il contenuto non segue le regole native di quel canale/formato.
    if (!PROMPTS[key]) warnings.push(`Formato ${canale}/${formato} non nativo: generato con template generico Instagram post.`)

    const [brandRows, products, clientRows] = await Promise.all([
      q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [effectiveClienteId]),
      q('SELECT * FROM prodotti WHERE cliente_id = $1', [effectiveClienteId]),
      q('SELECT * FROM clienti WHERE id = $1 LIMIT 1', [effectiveClienteId]),
    ])
    const brand = (brandRows[0] ?? null) as Record<string, unknown> | null
    const client = (clientRows[0] ?? null) as Record<string, unknown> | null
    const contentQuality = resolveContentQuality({ requestedQuality, piano: client?.piano })
    const matchedProduct = (products as Array<Record<string, unknown>>).find(p => p.product_id === product_id)
    // product_id fornito ma inesistente → ripieghiamo sul primo prodotto, MA lo diciamo.
    if (product_id && !matchedProduct) warnings.push(`product_id "${product_id}" non trovato: usato il primo prodotto del catalogo.`)
    const product = matchedProduct || products[0] || {}

    const brandContext = buildBrandContext(brand)
    const qualityContext = buildQualityContext({ quality: contentQuality, canale, formato, obiettivo })
    const userAssets = normalizeAssets(uploaded_assets, media_urls)
    const mediaUrls = userAssets.map(asset => asset.url)
    const visionUrls = userAssets.filter(asset => !isVideoAsset(asset)).map(asset => asset.url)
    const assetContext = buildAssetContext(userAssets)

    const basePrompt = build(
      spec,
      JSON.stringify(brand || {}, null, 2),
      JSON.stringify(product, null, 2),
      canale, formato,
      tema || 'contenuto brand',
      nome_prodotto || (product as Record<string, unknown>)?.nome_prodotto as string || '',
      qualityContext,
      assetContext,
      pickAngle(),
      contentQuality,
    )

    // Prepend brand context for richer generation
    const userPrompt = brandContext ? `${brandContext}\n---\n${basePrompt}` : basePrompt

    const aiRes = await callAI({
      model: model || 'meta-llama/llama-3.3-70b-instruct:free',
      systemPrompt: buildSystemPrompt(brand, contentQuality),
      userPrompt,
      openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key,
      maxTokens: getQualityTokenBudget(contentQuality),
      // VISION: passa le immagini caricate così il modello GUARDA il prodotto reale
      // e scrive su quello (non sul blazer del catalogo). Serve un modello vision
      // (Gemini 2.5 Flash, GPT-4o mini). I modelli text-only le ignorano.
      images: visionUrls,
    })

    let parsed = extractJSON(aiRes) as Record<string, unknown>

    // VALIDAZIONE HARD carosello: Instagram/Facebook carousel deve avere 3-5 slide.
    // Se il modello ne genera meno di 3 o più di 5, ritentiamo UNA volta con una
    // richiesta esplicita del numero. Prima il vincolo era solo nel prompt (soft) →
    // capitava di pubblicare caroselli con 1 o 8 slide.
    if (formato === 'carousel') {
      const countSlides = (p: Record<string, unknown>): number => {
        const s = p.slides || p.immagini || p.slides_json || p.scene || p.scenes
        return Array.isArray(s) ? s.length : 0
      }
      let n = countSlides(parsed)
      if (n < 3 || n > 5) {
        warnings.push(`Carosello con ${n} slide fuori range 3-5: rigenerato.`)
        try {
          const retryRes = await callAI({
            model: model || 'meta-llama/llama-3.3-70b-instruct:free',
            systemPrompt: buildSystemPrompt(brand, contentQuality),
            userPrompt: `${userPrompt}\n\nVINCOLO ASSOLUTO: il carosello deve avere ESATTAMENTE da 3 a 5 slide nel campo "slides" (mai meno di 3, mai più di 5). La generazione precedente ne aveva ${n}. Rigenera rispettando il vincolo.`,
            openrouterKey: openrouter_key, geminiKey: gemini_key, opencodeKey: opencode_key,
            maxTokens: getQualityTokenBudget(contentQuality),
            images: visionUrls,
          })
          const retryParsed = extractJSON(retryRes) as Record<string, unknown>
          const rn = countSlides(retryParsed)
          if (rn >= 3 && rn <= 5) { parsed = retryParsed; n = rn }
          else warnings.push(`Anche il retry ha prodotto ${rn} slide: salvato comunque, verifica manuale consigliata.`)
        } catch (e) {
          warnings.push(`Retry carosello fallito: ${(e as Error).message.slice(0, 100)}. Salvato il primo tentativo.`)
        }
      }
    }

    const id_contenuto = `C${Date.now().toString(36).toUpperCase()}`

    const caption = extractCaption(parsed)
    const scenes = extractScenes(parsed)
    const slides = extractSlides(parsed)
    const tags = extractTags(parsed)
    const overlay = extractOverlay(parsed)
    const ideaVisual = (parsed.idea_visual || parsed.idea_visual_descrizione || '') as string
    const voiceover = (parsed.voiceover || '') as string
    const voiceoverScript = pickText(parsed, ['voiceover_script', 'voiceover'])
    const music = (parsed.musica_mood || parsed.music_mood || '') as string
    const titolo = (parsed.titolo || parsed.titolo_video || parsed.titolo_carosello || parsed.titolo_immagine || '') as string
    const altText = (parsed.alt_text || parsed.alt || '') as string
    const thumbnail = (parsed.thumbnail_url || parsed.immagine_cover || '') as string
    const hook = (parsed.hook || parsed.hook_0_2_sec || parsed.hook_0_3_sec || titolo || '') as string
    const hashtag = (parsed.hashtag || '') as string
    const cta = (parsed.cta || parsed.cta_finale || parsed.domanda_finale || '') as string
    const generatedQuality = normalizeContentQuality(parsed.quality_level) ?? contentQuality
    const insertColumns = [
      'cliente_id', 'id_contenuto', 'data_pubblicazione', 'ora_pubblicazione',
      'canale', 'formato', 'obiettivo', 'tema', 'product_id', 'nome_prodotto',
      'hook', 'caption', 'hashtag', 'cta', 'note', 'status', 'media_type',
      'link_prodotto', 'link_prodotto_finale',
      'visual_preset', 'use_trending_effects', 'visual_effects',
      'link_media_1', 'link_media_2', 'link_media_3', 'link_media_4', 'link_media_5', 'link_media_6', 'link_media_7',
      'link_media_8', 'link_media_9', 'link_media_10',
      'fonte_media', 'consenso_utilizzo',
      'scenes_json', 'slides_json', 'overlay_text', 'alt_text', 'tags', 'thumbnail_url',
      'idea_visual', 'voiceover_script', 'music_mood',
      'quality_level', 'audience_segment', 'funnel_stage', 'angle', 'primary_message',
      'proof_points', 'hook_variants', 'caption_long', 'cta_variants', 'creative_brief',
      'template_id', 'template_style', 'layout_spec_json', 'asset_requirements_json',
      'production_notes', 'compliance_notes', 'risk_flags', 'platform_best_practices',
      'ab_variants_json', 'kpi_target', 'expected_outcome', 'production_cycle_stage',
      'optimization_cycle_json', 'performance_hypothesis', 'next_iteration_actions',
      'missing_inputs', 'content_checklist',
    ]
    const insertValues = [
      effectiveClienteId, id_contenuto,
      new Date(Date.now() + 86400000).toISOString().split('T')[0], '10:00',
      canale, formato, obiettivo || null, tema || null, product_id || null,
      nome_prodotto || (product as Record<string, unknown>)?.nome_prodotto as string || null,
      hook || null,
      caption || null,
      hashtag || null,
      cta || null,
      JSON.stringify(parsed).slice(0, 3000),
      'DA_APPROVARE',
      formato === 'reel' || formato === 'video' || formato === 'short' ? 'video' : 'image',
      (product as Record<string, unknown>)?.link_prodotto as string || null,
      (product as Record<string, unknown>)?.link_prodotto as string || null,
      typeof visual_preset === 'string' ? visual_preset : null,
      Boolean(use_trending_effects),
      jsonbParam(Array.isArray(visual_effects) ? visual_effects : null),
      mediaUrls[0] || null,
      mediaUrls[1] || null,
      mediaUrls[2] || null,
      mediaUrls[3] || null,
      mediaUrls[4] || null,
      mediaUrls[5] || null,
      mediaUrls[6] || null,
      mediaUrls[7] || null,
      mediaUrls[8] || null,
      mediaUrls[9] || null,
      mediaUrls.length ? (userAssets.some(asset => asset.source === 'upload') ? 'upload_cliente' : 'url_cliente') : null,
      // Consenso all'utilizzo: gli asset caricati dal cliente (upload) implicano
      // consenso; i media da URL ESTERNO richiedono consenso ESPLICITO (body
      // consenso_utilizzo) altrimenti restano 'DA_VERIFICARE' (gate publish a valle).
      (() => {
        if (!mediaUrls.length) return null
        const allUploaded = userAssets.every(a => a.source === 'upload')
        if (allUploaded) return 'SI'
        return consenso_utilizzo === true || consenso_utilizzo === 'SI' ? 'SI' : 'DA_VERIFICARE'
      })(),
      scenes, slides, overlay || null,
      altText || null,
      tags ? JSON.stringify(tags) : null,
      thumbnail || mediaUrls[0] || null,
      ideaVisual || null,
      voiceoverScript || voiceover || null,
      music || null,
      generatedQuality,
      pickText(parsed, ['audience_segment', 'audience', 'target_segment']) || null,
      pickText(parsed, ['funnel_stage', 'fase_funnel']) || null,
      pickText(parsed, ['angle', 'angolo_creativo']) || null,
      pickText(parsed, ['primary_message', 'messaggio_chiave']) || null,
      jsonbParam(pickJson(parsed, ['proof_points', 'prove', 'benefici_verificabili'])),
      jsonbParam(pickJson(parsed, ['hook_variants', 'hook_alternativi'])),
      pickText(parsed, ['caption_long', 'caption_estesa', 'corpo']) || null,
      jsonbParam(pickJson(parsed, ['cta_variants', 'cta_alternative'])),
      pickText(parsed, ['creative_brief', 'brief_creativo']) || null,
      pickText(parsed, ['template_id', 'template', 'template_operativo']) || null,
      pickText(parsed, ['template_style', 'stile_template', 'visual_style']) || null,
      jsonbParam(pickJson(parsed, ['layout_spec', 'layout_spec_json', 'layout'])),
      jsonbParam(pickJson(parsed, ['asset_requirements', 'asset_requirements_json', 'asset_richiesti'])),
      pickText(parsed, ['production_notes', 'note_produzione']) || null,
      pickText(parsed, ['compliance_notes', 'note_compliance']) || null,
      jsonbParam(pickJson(parsed, ['risk_flags', 'rischi'])),
      jsonbParam(pickJson(parsed, ['platform_best_practices', 'best_practices_applicate'])),
      jsonbParam(pickJson(parsed, ['ab_variants', 'ab_variants_json', 'varianti_ab'])),
      pickText(parsed, ['kpi_target', 'kpi_primario']) || null,
      pickText(parsed, ['expected_outcome', 'risultato_atteso']) || null,
      normalizeProductionCycleStage(pickText(parsed, ['production_cycle_stage', 'cycle_stage', 'fase_ciclo']), 'review'),
      jsonbParam(pickJson(parsed, ['optimization_cycle', 'optimization_cycle_json', 'ciclo_ottimizzazione'])),
      pickText(parsed, ['performance_hypothesis', 'ipotesi_performance', 'hypothesis']) || null,
      jsonbParam(pickJson(parsed, ['next_iteration_actions', 'azioni_prossima_iterazione', 'next_actions'])),
      jsonbParam(pickJson(parsed, ['missing_inputs', 'input_mancanti'])),
      jsonbParam(pickJson(parsed, ['content_checklist', 'checklist'])),
    ]

    const schemaFallback = await insertCalendario(insertColumns, insertValues)

    // Cross-post: stesso contenuto duplicato sui canali extra scelti.
    // Ogni canale destinazione riceve caption/hashtag/hook ADATTATI (troncati a
    // limite piattaforma, hashtag ridotti sotto la soglia anti-spam). Combinazioni
    // incompatibili (es. YouTube Shorts con sorgente post foto) sono bloccate con
    // reason esplicita — l'utente vede in warnings perché il cross-post è saltato.
    const canaleIdx = insertColumns.indexOf('canale')
    const idIdx = insertColumns.indexOf('id_contenuto')
    const hookIdx = insertColumns.indexOf('hook')
    const captionIdx = insertColumns.indexOf('caption')
    const hashtagIdx = insertColumns.indexOf('hashtag')
    const crossPosted: string[] = []
    const crossFailed: string[] = []
    for (const altCanale of alsoCanali) {
      // Costruisci una vista row-like dei valori per far girare l'adapter.
      const srcRow: Record<string, unknown> = {}
      insertColumns.forEach((c, i) => { srcRow[c] = insertValues[i] })
      const adapt = adaptRowForPlatform(srcRow, altCanale)
      if (!adapt.ok) {
        warnings.push(`Cross-post ${altCanale}: ${adapt.reason}`)
        crossFailed.push(altCanale)
        continue
      }
      if (adapt.warnings.length) warnings.push(...adapt.warnings.map(w => `[${altCanale}] ${w}`))

      const altValues = [...insertValues]
      altValues[idIdx] = `${id_contenuto}-${altCanale}`
      altValues[canaleIdx] = altCanale
      if (hookIdx >= 0) altValues[hookIdx] = adapt.row.hook ?? altValues[hookIdx]
      if (captionIdx >= 0) altValues[captionIdx] = adapt.row.caption ?? altValues[captionIdx]
      if (hashtagIdx >= 0) altValues[hashtagIdx] = adapt.row.hashtag ?? altValues[hashtagIdx]
      try {
        await insertCalendario(insertColumns, altValues)
        crossPosted.push(altCanale)
      } catch (e) {
        console.warn(`[content cross-post] fallito su ${altCanale}:`, (e as Error).message.slice(0, 150))
        crossFailed.push(altCanale)
      }
    }
    // Cross-post fallito: l'utente DEVE saperlo (altrimenti scopre il buco solo dal calendario).
    if (crossFailed.length) warnings.push(`Cross-post non riuscito su: ${crossFailed.join(', ')}.`)
    if (schemaFallback) warnings.push('Alcuni campi qualità non salvati: eseguire npm run migrate.')

    return NextResponse.json({
      ok: true,
      id_contenuto,
      tipo: 'calendario',
      quality_level: generatedQuality,
      quality_downgraded: isQualityDowngraded(requestedQuality, generatedQuality),
      ...(crossPosted.length ? { cross_posted: crossPosted } : {}),
      ...(crossFailed.length ? { cross_post_failed: crossFailed } : {}),
      ...(schemaFallback ? { schema_fallback: true } : {}),
      ...(warnings.length ? { warnings } : {}),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
