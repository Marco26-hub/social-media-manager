import { NextResponse } from 'next/server'
import { callAI, extractJSON } from '@/lib/ai'
import { q } from '@/lib/db'

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

function build(p: PromptSpec, brand: string, prodotto: string, canale: string, formato: string, tema: string, nomeProdotto: string) {
  return `${p.persona}

BRAND:
${brand}

PRODOTTO:
${prodotto}

IDEA: Canale: ${canale}, Formato: ${formato}, Tema: ${tema}, Prodotto: ${nomeProdotto}

GOAL: ${p.goal}
DIMENSIONE: ${p.dimensione}
STRUTTURA: ${p.struttura}
TONO: ${p.tono}
LIMITI: ${p.limiti}
HASHTAG: ${p.hashtag}
CTA: ${p.cta}
EFFETTI: ${p.effetti}

Output SOLO JSON valido. Schema:
${p.outputSchema}`
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
    dimensione: '1:1 quadrato (1080x1080px). 5-7 slide. Ogni slide = 1 concetto.',
    struttura: 'Slide 1: Hook visivo + titolo (fa venire voglia di swipe). Slide 2: Problema/dubbio che il prodotto risolve. Slide 3-4: Come usare il prodotto / styling / dettagli. Slide 5: Beneficio emotivo + social proof. Slide finale: CTA + prodotto.',
    tono: 'Autorevole, consigliere di stile. "Ecco come", "Prova così", "Il segreto è". Emoji misurate.',
    limiti: '5-7 slide. Testo per slide max 120 char. Testo sulla prima slide max 60 char.',
    hashtag: '5-6 hashtag. Inserire nella caption (non nelle slide).',
    cta: 'CTA nell\'ultima slide: "Scopri la collezione" / "Provalo ora".',
    effetti: 'Slide coerenti come palette colori. Font leggibile su mobile. Slide 1 bold e minimal.',
    outputSchema: '{"titolo_carosello":"","numero_slide":6,"slides":[{"numero":1,"testo":"testo sulla slide","visual":"descrizione immagine"}]}',
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
}

function extractCaption(parsed: Record<string, unknown>, canale: string, formato: string): string {
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

export async function POST(request: Request) {
  try {
    const { cliente_id, canale, formato, model, openrouter_key, tema, nome_prodotto, product_id } = await request.json()
    if (!cliente_id || !canale || !formato) {
      return NextResponse.json({ error: 'cliente_id, canale, formato richiesti' }, { status: 400 })
    }

    const key = `${canale}:${formato}`
    const spec = PROMPTS[key] || PROMPTS[`instagram:post`]

    const [brandRows, products] = await Promise.all([
      q('SELECT * FROM brand WHERE cliente_id = $1 LIMIT 1', [cliente_id]),
      q('SELECT * FROM prodotti WHERE cliente_id = $1', [cliente_id]),
    ])
    const brand = brandRows[0] ?? null
    const product = (products as Array<Record<string, unknown>>).find(p => p.product_id === product_id) || products[0] || {}

    const userPrompt = build(
      spec,
      JSON.stringify(brand || {}, null, 2),
      JSON.stringify(product, null, 2),
      canale, formato,
      tema || 'contenuto brand',
      nome_prodotto || (product as Record<string, unknown>)?.nome_prodotto as string || '',
    )

    const aiRes = await callAI({
      model: model || 'claude-sonnet-4-6',
      systemPrompt: 'Sei un copywriter social media senior specializzato in moda ed e-commerce. Rispondi sempre SOLO con JSON valido, nessun altro testo, nessuna spiegazione.',
      userPrompt,
      openrouterKey: openrouter_key,
      maxTokens: 4000,
    })

    const parsed = extractJSON(aiRes) as Record<string, unknown>
    const id_contenuto = `C${Date.now().toString(36).toUpperCase()}`

    const caption = extractCaption(parsed, canale, formato)
    const scenes = extractScenes(parsed)
    const slides = extractSlides(parsed)
    const tags = extractTags(parsed)
    const overlay = extractOverlay(parsed)
    const ideaVisual = (parsed.idea_visual || parsed.idea_visual_descrizione || '') as string
    const voiceover = (parsed.voiceover || '') as string
    const music = (parsed.musica_mood || parsed.music_mood || '') as string
    const titolo = (parsed.titolo || parsed.titolo_video || parsed.titolo_carosello || parsed.titolo_immagine || '') as string
    const altText = (parsed.alt_text || parsed.alt || '') as string
    const thumbnail = (parsed.thumbnail_url || parsed.immagine_cover || '') as string
    const hook = (parsed.hook || parsed.hook_0_2_sec || parsed.hook_0_3_sec || '') as string
    const hashtag = (parsed.hashtag || '') as string
    const cta = (parsed.cta || parsed.cta_finale || parsed.domanda_finale || '') as string

    await q(
      `INSERT INTO calendario (
        cliente_id, id_contenuto, data_pubblicazione, ora_pubblicazione,
        canale, formato, tema, product_id, nome_prodotto,
        hook, caption, hashtag, cta, note, status, media_type,
        scenes_json, slides_json, overlay_text, alt_text, tags, thumbnail_url,
        idea_visual, voiceover_script, music_mood
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25
      )`,
      [
        cliente_id, id_contenuto,
        new Date(Date.now() + 86400000).toISOString().split('T')[0], '10:00',
        canale, formato, tema || null, product_id || null,
        nome_prodotto || (product as Record<string, unknown>)?.nome_prodotto as string || null,
        hook || null,
        caption || null,
        hashtag || null,
        cta || null,
        JSON.stringify(parsed).slice(0, 3000),
        'DA_APPROVARE',
        formato === 'reel' || formato === 'video' || formato === 'short' ? 'video' : 'image',
        scenes, slides, overlay || null,
        altText || null,
        tags ? JSON.stringify(tags) : null,
        thumbnail || null,
        ideaVisual || null,
        voiceover || null,
        music || null,
      ],
    )

    return NextResponse.json({ ok: true, id_contenuto, tipo: 'calendario' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
