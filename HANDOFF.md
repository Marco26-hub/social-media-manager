# HANDOFF — Social Automation V2

> Documento per AI agent multipli (Claude CLI, Cursor/Cline, Codex). Lavoriamo come un team unificato.

**Data ultimo aggiornamento**: 2026-07-03 (sessione: fix auth+Ollama critici, upload immagini, blog SEO locale hardened)
**Progetto**: Social Automation — SaaS social media management per agenzie
**Stack**: Next.js 15.5.19 + Neon/Postgres + NextAuth + Tailwind + AI (Anthropic/OpenRouter/Gemini/OpenCode)
**Percorso locale**: `/Users/md/Documents/social_automation_v2`
**Repo**: `https://github.com/Marco26-hub/social-media-manager.git`
**Deploy live**: `https://social-media-manager-zte4.onrender.com` (Render free, service id `srv-d8up0lvavr4c73fjd1k0`)

---

## 📌 Regole per Multi-Agent Team

### Convenzioni per evitare conflitti

1. **Leggi sempre HANDOFF.md prima di iniziare** — contiene lo stato attuale.
2. **Non modificare HANDOFF.md** durante il lavoro (lo fa solo l'agente che completa una fase).
3. **Commit atomici**: un commit = una feature o un fix. Mai commit "wip" o "fix vari".
4. **Messaggi commit**: `tipo: cosa (area)` — es. `feat: brand discovery API (brand)` o `fix: TS type errors in ads page (ads)`.
5. **TypeScript**: MAI usare `as Type` in JSX (causa errori `unknown is not assignable to ReactNode`). Estrarre sempre le variabili prima del return:
   ```tsx
   // ❌ SCORRETTO
   <p>{data.valore as string}</p>

   // ✅ CORRETTO
   const valore = typeof data.valore === 'string' ? data.valore : ''
   <p>{valore}</p>
   ```
6. **Componenti**: un componente per file. Se un componente diventa >400 righe, spezzare.
7. **Client vs Server**: pagine dashboard in `app/dashboard/` possono essere `'use client'` se usano stati/hooks. API routes in `app/api/` sono server.
8. **AI provider**: tutti i generate endpoint accettano `model`, `openrouter_key`, `gemini_key`, `opencode_key` dal body. `lib/ai.ts` gestisce la cascade multi-provider: Gemini/OpenCode primario (se modello selezionato) → OpenRouter (bridge con retry su Retry-After) → Gemini/OpenCode/Anthropic fallback affidabile. Le key BYO sono validate per formato server-side; supporto anche env `GEMINI_API_KEY`/`OPENCODE_API_KEY`/`ANTHROPIC_API_KEY`/`OPENROUTER_API_KEY`.
9. **Demo mode**: ogni pagina DEVE funzionare anche senza DB (`isDemo()` → dati finti). Non rompere mai la demo.

---

## 🆕 Sessione 2026-06-27 (Claude Code) — riepilogo

Tutto su `main`, tree pulito, `tsc`+`eslint` verdi.

| Commit | Cosa |
|--------|------|
| `e1216f5` | `GenerationProvider` globale + barra progresso persistente (generazione continua cambiando pagina) |
| `86c33d6` | Migrate tutte le pagine AI al GenerationProvider (piano, social, ads, competitor, seo, brand, onboarding) |
| `c3cd86b` | **Security**: fail-closed auth/demo in prod, webhook Blotato (no bypass), SSRF media-validate (block IP privati), security headers, rate limit `/api/generate` (20/min) |
| `3d410dc` | Fix messaggio errore AI su rate-limit, stop leak `user_id` nel dump OpenRouter |
| `8e5f38f` | Demo walkthrough recorder Playwright (`npm run demo:video`, cursore animato → mp4) |
| `9856d79` | **Bridge affidabilità OpenRouter free**: su 429 attende il Retry-After (cap 28s) e ritenta — converte i 429 "retry shortly" in successi senza key a pagamento |
| `a6d893e` | **Google Gemini** provider selezionabile (free) + campo key (`aistudio.google.com/apikey`) |
| `5fa6a3d` | **OpenCode Zen/Go** provider selezionabile (DeepSeek V4, GLM-5.2, Kimi K2.6…) + campo key, OpenAI-compatible su `opencode.ai/zen/v1` |

**Stato AI provider (deploy live `social-media-manager-zte4.onrender.com`)**: `mode: production`, `openrouter: true` (ma default `:free` → 429), `anthropic: false`, `gemini`/`opencode`: da configurare key. Per generazione reale affidabile: incollare una key Gemini (free) o OpenCode (sk-) nel pannello AI, oppure settare env su Render.

**⚠️ Build sbloccata**: il commit `12832e0 "Multi-Agent Automation System"` aveva aggiunto 15 file scritti per stack **Supabase + shadcn/ui** (`app/api/ai-automation/*`, 3 componenti `*Approval.tsx`, `lib/agents/*`) — non compilavano (`@supabase/supabase-js` non installato, colonne `is_active`/`config` inesistenti, import `@/components/ui/*` mancanti) e **rompevano `next build`** da settimane → i deploy restavano al vecchio build. Erano orfani (nessuna pagina reale li importava). **Rimossi** per sbloccare la produzione. `next build` ora verde.

**TODO agenti v2** (riscrivere sullo stack reale): 4 agenti (weekly-seo, weekly-competitor, weekly-client-report, daily-ads-optimizer) usando `lib/db.ts` `q()` (NON Supabase), schema reale (`attivo`, non `is_active`), `callAI` da `lib/ai.ts`, + entry point: API route `/api/agents/<nome>` protette da secret + scheduler (cron Render `type: cron` o cron-job.org).

**Pending noti**: zero test automatici; `score-content` (calendario) ha feedback locale ma non è nel GenerationBar globale; `BLOTATO_API_KEY` mancante sul deploy (autopublish off).

---

## 🆕 Sessione 2026-07-03 (Claude Code) — fix critici auth+Ollama, upload immagini, blog SEO locale, bulk delete, audit fallback

Tutto pushato su `main` (`b9a9674`, `96b946f`, `8a5d074`, `f7ebc1a`, `2d4c7cf`, `fee3fde`), `tsc`+`build`+`lint` verdi ad ogni commit.

### Eliminazione multipla + storage generico + audit fallback (fine sessione)
- **Bulk delete calendario** (`2d4c7cf`): `DELETE /api/data/calendario` accetta `?ids=` o body `{ids:[]}` oltre a `?id=` singolo — tenant-safe (id di altri clienti ignorati + warning), cap 500, log per-contenuto, cleanup token. UI: checkbox per riga + "seleziona tutti" + barra "Elimina selezionati (N)" + modale. Serve a svuotare un piano editoriale generato non voluto. Contratto testato in demo mode (test distruttivo live saltato: DB condiviso prod).
- **Storage generico S3** (`f7ebc1a`): `lib/storage.ts` non più legato a R2 — env `STORAGE_*` (endpoint/key/bucket/public_url/region) via firma S3, funziona con **Backblaze B2** (10GB free, no carta di credito) oltre a R2. `render.yaml` aggiornato.
- **Audit fallback silenziosi** (`2d4c7cf`+`fee3fde`): codebase già solido (0 🔴). Fixati: approvazione con scheduling Blotato fallito ora risponde `scheduled:false`+errore (non `ok` secco); blog step FAQ `ok:false` se 0 domande; fetch calendario mostra errore invece di falso "nessun contenuto"; scrape-contacts espone `enrichment_ok:false`; analytics logga errore DB invece di "0 account". Legittimi confermati: demo mode, cascade AI osservabile, prospect-scraper marcato `simulated`.

### 🔴 Fix critici (bug reali, non stile)
- **`lib/auth-secret.ts`** (nuovo): unica fonte del secret NextAuth. Prima `middleware.ts` (Edge, `getToken()`) e `lib/auth.ts` (Node, `getServerSession()`) calcolavano il secret con fallback DIVERSI — se `AUTH_SECRET` è presente ma vuoto in env, il middleware finiva con secret `undefined` mentre NextAuth firmava con `'dev-secret-change-in-development'` → **ogni sessione valida veniva rifiutata con "Non autenticato"** su tutte le route protette. Riprodotto e fixato in locale con login via curl.
- **`lib/ai.ts`**: Ollama passato da endpoint OpenAI-compatible (`/v1/chat/completions`) a **nativo** (`/api/chat`) per poter alzare `num_ctx` a 16384 (default Ollama 4096) — con prompt grandi (blog/piano high-quality: brand+prodotti+standard+schema) il context finiva prima del completamento → JSON troncato/malformato ad ogni generazione. Timeout portato a 5min + errore distinto tra "timeout" e "server spento" (prima un timeout veniva mascherato da "Ollama non raggiungibile", fuorviante).
- Verificato end-to-end: rigenerato articolo blog high-quality con Ollama locale (`qwen3-vl:8b-instruct`), salvato in DB, status 200 pulito.

### Upload/modifica immagini — manuale, come richiesto (niente hotlink automatico)
- **`/dashboard/prodotti`**: bottone camera per prodotto → upload immagine dal PC + `PATCH /api/data/prodotti` (nuovo endpoint, whitelist colonne).
- **`/dashboard/piano`**: drop-zone upload multiplo (fino a 60 foto, batch da 7) prima di generare → `/api/generate/plan` le distribuisce in ordine sui contenuti (1 per post/story/reel, 5 per carosello), ricicla dall'inizio se finiscono (segnalato in UI, non nascosto).
- **`/dashboard/calendario`**: card "Immagini del post" nel dettaglio — ogni slot (1 per post, fino a 7 per carosello) con campo carica/sostituisci/rimuovi indipendente; thumb di riga cliccabile per la foto principale.
- **Story sticker link**: `PostPreview.tsx` formato story ora mostra lo sticker link cliccabile reale (icona+dominio, stile IG nativo) invece del vecchio CTA+freccia "swipe up".
- **Handle social**: `brand.social_handle` (migration 019) — default auto-derivato da `brand_name` (SILKinCOM → `@silkincom.official`), editabile a mano in `/dashboard/brand`.

### Feature: Blog SEO locale (AIM) — `/dashboard/blog`
Scrittura articoli SEO/GEO con **AI locale (Ollama)**, gratis, pipeline multi-step (keyword→outline→sezioni→FAQ→meta) per compensare modelli piccoli (`lib/blog-pipeline.ts`). Pubblicazione su `/blog` + export HTML/Markdown/JSON per Shopify/CMS terzi (`lib/blog-render.ts`, `components/BlogArticlesList.tsx`).

Review con 2 agenti paralleli (security/tenant + correttezza) → **5 bug reali trovati e fixati**, verificati live:
- 🔴 **XSS stored**: JSON-LD iniettato via `JSON.stringify` senza escape di `<` → un `</script>` nei campi generati da AI/DB spezzava il tag script. Fix: escape `<`→`<` in `app/blog/[slug]/page.tsx` e `lib/blog-render.ts` (anche nell'HTML esportato per CMS terzi).
- 🔴 **Cross-tenant**: `/blog` pubblico leggeva TUTTI i clienti senza filtro, con rischio slug-hijack (`unique` è `(cliente_id, slug)`, non solo `slug`). Fix: scoping opzionale via env `BLOG_PUBLIC_CLIENTE_ID` — **da settare su Render** per limitare il blog pubblico al cliente giusto.
- 🟡 Cover URL non validato (`javascript:`/`data:`) → `safeImageUrl()` accetta solo http(s), usato in entrambe le route blog.
- 🟡 `INSERT` senza `ON CONFLICT` → rigenerare lo stesso tema crashava (duplicate key su `unique(cliente_id, slug)`). Fix: `ON CONFLICT DO UPDATE`.
- 🟡 `/api/data/blog` GET/PATCH senza guardia `dbReady()` → 500 sporco in demo/no-DB.

### Chiarito: stato reale "Agenti v2"
`AGENTS_SCHEDULE.md` (6 agenti: content generator, lead scraper, SEO/GEO, ads optimizer, competitor watcher, client report) è documentazione della **vecchia architettura Supabase** (menziona RLS policies), mai integrata sullo stack reale Neon. Di quei 6, **solo 1 sopravvive**: `lib/agents/prospect-scraper-agent.ts` + `app/api/agents/prospect-scraper/route.ts`, riscritto su Neon dopo che l'originale rompeva la build — ma ritorna ancora **dati finti hardcoded** (commento `// (simulated)`). Gli altri 5: solo documento, zero codice.

I file `daily_content_*.md` / `editorial_plan_28d_*` in root sono output di un run di test del "Content Generator" schedulato (mai collegato a DB/email reali) — committati come riferimento, nessun codice li consuma ancora.

---

## 🆕 Sessione 2026-07-02 (Claude Code) — visual AI Blotato + AI selector + storage dual-mode

### Commit principali
| Commit | Cosa |
|--------|------|
| `467e1df` | **Generazione grafica AI via Blotato** — reel/video/carousel/immagine prodotto (vedi sezione dedicata sotto) |
| `a862c56` | HANDOFF visual AI |
| `46c2985` | AIM locale (Ollama) + canali X/Threads + Centro di Controllo AI |
| `9a17b02` | fix: badge "Consigliato" usa `TASK_RECOMMENDED_CLOUD` su cloud (non Ollama) |

### Storage dual-mode (verificato, nessuna modifica necessaria)
`app/api/assets/upload/route.ts` già funziona:
- **locale**: scrive su `public/uploads/` → URL `/api/assets/file/…`
- **cloud (Render)**: carica su Cloudflare R2 → URL pubblico permanente `https://pub-xxx.r2.dev/…`
Decide automaticamente con `isR2Configured()`. Mancano solo le 5 env su Render.

### AI Selector — 5 provider completi
`components/AIModelSelector.tsx`: Ollama locale / Anthropic / Gemini / OpenRouter free+paid / OpenCode. Key salvataggio/rimozione, env-aware (Ollama nascosto su cloud), badge Consigliato corretto per ambiente. `readAISettings()` passa tutte e 3 le key BYO ai route generate.

### Migration count attuale: 18 file (001–018, escluso 003)
Latest: `018_visual_generation.sql` (colonne visual_* su calendario).

---

## 🆕 Sessione 2026-06-29 (Claude Code) — generazione PRO + Analytics + Insights IG automatiche

### Generazione professionale (bibbia condivisa)
- `lib/prompt-standards.ts`: standard unici importati da content/plan/blog/ads — `PRO_COPY_STANDARDS` (anti-cliché+grammatica), `SEO_GEO_STANDARDS`, `DIVERSITY_STANDARDS`+`FUNNEL_STANDARDS` (per i batch/piano), `COPY_ANGLES`+`pickAngle()`. **Aggiornare gli standard solo qui.** Risolve ripetizione + errori grammatica ("Eleganzasenza"). temperature 0.85.
- Vision già attiva (sessione precedente); campo "Prodotto/i nell'immagine" + nome per-immagine prefillato dal filename.

### Analytics (gap #1 vs concorrenza)
- `/dashboard/analytics` + `/api/data/analytics`: KPI produzione, timeline 30gg, pipeline editoriale, distribuzioni canale/formato/qualità/funnel — **dati reali dal DB**, niente finti.
- `migration 017_post_metrics.sql`: tabella metriche performance.
- `/api/data/metrics` (POST/GET): **inserimento manuale** metriche reali dalle Insights → popola la sezione Performance.

### Insights Instagram AUTOMATICHE (Meta Graph API)
- `lib/meta-insights.ts`: OAuth (code→long-lived token), trova account IG Business collegati alle Pagine FB, lista media, legge insights (reach/saved/shares/interazioni).
- `/api/social/connect` + `/api/social/callback`: flusso OAuth, salva token in `social_accounts` (tenant-safe).
- `/api/data/metrics/sync`: legge Insights IG → popola `post_metrics` (match via permalink=blotato_post_url, altrimenti `ig:{mediaId}`).
- Analytics: pannello "Insights Instagram automatiche" (Collega / Sincronizza).
- `render.yaml`: `META_APP_ID` + `META_APP_SECRET` (sync:false).
- **⚠️ Blotato NON dà metriche** (verificato tutta l'API: solo status+URL). Meta Graph è l'unico modo reale. **Setup utente una tantum**: app Meta Developer + IG Business/Creator + Pagina FB + redirect URI `/api/social/callback` + 2 env. Per account terzi serve **App Review Meta** (settimane).

### Landing
- `347fbfd`+`20012d9`: bottone "Vedi landing" in sidebar + hero dashboard.
- `468f1b9`: lead generation come servizio dedicato sulla landing (card + hero).

### Stato AI provider (riepilogo operativo)
Free OpenRouter = 429 cronico; OpenCode = a pagamento; Gemini free = 15 req/min. **Affidabile = modello OpenRouter PAID** (senza `:free`, con credito) o Gemini key valida (`AIza...`). Per VISION serve modello vision (Gemini 2.5 Flash, GPT-4o mini). Tutti i fix provider della sessione precedente restano validi.

---

## 🆕 Sessione 2026-06-28 ter (Claude Code) — AI affidabile + VISION + landing/SEO + generazione PRO

Tutto su `main`, build verde a ogni commit, deploy live verificato. ~28 commit.

### Landing + SEO/GEO (era assente/rotta)
- `347fbfd`: **middleware** non reindirizza più `/` → la landing pubblica si VEDE (prima irraggiungibile, e i crawler indicizzavano /login). Link "Vedi landing" in sidebar (GESTIONE).
- `20aec0b`: landing **riscritta onesta** (via testimonial finto "Marco Ferrari", metriche inventate ROI 435% ecc., prezzi corretti €390/€1.090/€2.590) + infra SEO/GEO: `app/robots.ts` (allow crawler AI), `app/sitemap.ts`, `public/llms.txt`, `components/JsonLd.tsx` (Organization+WebSite+SoftwareApplication+FAQPage), metadata completo in `app/layout.tsx`.
- `f62d664`: creata `public/og.png` reale (era 404).

### AI provider — affidabilità (lungo debugging)
- `f33bafd`: rimossi 3 slug OpenRouter MORTI dal selettore (Qwen 2.5 72B:free, GLM 4.5 Air:free, Mistral Nemo:free → 404). Verificare sempre gli slug contro `openrouter.ai/api/v1/models`.
- `459f8e7`: key AI ora **modificabile/rimovibile** (pill verde cliccabile + "Rimuovi"). Prima bloccata dopo il salvataggio.
- `ffc4b91`: **OpenCode Go è a pagamento** → etichette corrette (non più "Free" fuorviante).
- `b57c926`/`38c19de`: **Gemini robusto** — safety BLOCK_NONE (basta blocchi silenziosi su moda/marketing), timeout, parse `retryDelay`, auto-retry su 429 finestra breve, diagnostica chiara.
- `a05229b`: **stop dump HTML 502 grezzo** negli errori (readError/readApiError riconoscono pagine gateway) + timeout provider 30s (evita 502 Render).
- `47705f5`: key formato invalido **non più scartata in silenzio** → diagnostica ("Key Gemini non valida: deve iniziare con AIza"). Regex Gemini ora richiede prefisso `AIza`.
- `c06d348`/`ff050ef`: **modelli OpenRouter a PAGAMENTO** nel selettore (il credito NON velocizza i `:free`!). Aggiunti: `meta-llama/llama-3.3-70b-instruct`, `openai/gpt-4o-mini`, `deepseek/deepseek-chat`, `google/gemini-2.5-flash-lite`, `google/gemini-2.5-flash`. ~0,001€/post.

**Lezione provider**: free OpenRouter = 429 cronico; OpenCode = a pagamento; Gemini free = 15 req/min; affidabile solo con **credito** (modello paid senza `:free`) o **Gemini key valida**. Il selettore distingue gruppo "a pagamento" (verde scuro) da "Gratis".

### VISION + prodotto reale (immagine → copy)
- `c4b6ede`: **VISION multimodale** in tutta la cascade — `callAI({images})` thread in callOpenRouter/callOpenCode (content multimodale `image_url`) e callGemini (fetch→base64 inline_data). content+blog passano le immagini caricate. Il prompt: "il prodotto reale è quello NELLE IMMAGINI, l'immagine vince sul catalogo". **Serve un modello VISION** (Gemini 2.5 Flash, GPT-4o mini); i text-only (Llama) le ignorano.
- `351ff36`/`e0267d0`/`4ce8ed6`: campo **"Prodotto/i nell'immagine"** + nome editabile **per ogni immagine** (prefillato dal filename: "camicia-riva.jpg" → "Camicia Riva"). Flusso completo: vision (vede) + nome (come si chiama) + brand identity.
- `44ac63a`: carosello multi-prodotto (ogni slide = un prodotto). Tutto su tutti i 7 social (pagina `[platform]` condivisa).

### Generazione PROFESSIONALE
- `bc0c801`+`e936532`+`0fedcb0`+`a0e1e97`: **bibbia professionale condivisa** in `lib/prompt-standards.ts` (PRO_COPY anti-cliché+grammatica, SEO_GEO, DIVERSITY, FUNNEL, COPY_ANGLES+pickAngle, proSystemPrompt). Importata da content/plan/blog/ads → coerenza in un punto solo. Risolve ripetizione ("eleganza senza sforzo" ovunque) e errori grammatica ("Eleganzasenza"). temperature 0.85 su OpenRouter/OpenCode. **Per aggiornare gli standard: modifica solo `lib/prompt-standards.ts`.**

### Audit + fix go-live
- `6549812`: stato errore UI (report/brand) invece di vuoto silenzioso; compliance cablata alla brand page; strategy rimossa (morta); `scraped_leads.status` follow-up (PATCH + dropdown).
- `95ebbcc`: **Cloudflare R2** per storage immagini persistente (`lib/storage.ts` via aws4fetch) — codice pronto, **mancano le 5 env su Render** (`R2_ACCOUNT_ID` ecc.). Senza, upload effimero.
- `f62d664`: stop fallback silenziosi che fingono dati (seo-audit non inventa più punteggi salvati; prospect-scraper marcato `simulated`+`[DEMO]`).

### Da fare (concordato: testare, poi questi)
1. **R2**: l'utente mette le 5 env su Render → immagini permanenti. Vedi memoria [[go-live-blockers]].
2. **Switch generazione manuale/automatico**: vedi memoria [[switch-generazione-manuale-auto]].
3. **prospect-scraper reale** ("AI da ricerca web", serve search API): vedi [[lead-research-rebuild]].
4. **Pagina consumi token**: vedi [[next-token-usage-page]].
5. Env Render: `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL` su dominio reale, `ANTHROPIC_API_KEY`, `BLOTATO_API_KEY`, `dry_run=FALSE`.

---

## 🆕 Sessione 2026-06-28 (Claude Code) — fix build rotto da cowork + stato switch generazione

**⚠️ PATTERN RICORRENTE (3ª volta)**: i commit di "cowork" continuano a **ri-rompere `next build`** aggiungendo codice scritto per **Supabase + shadcn** su uno stack che è **Neon + Tailwind**. Storico: `12832e0` (Multi-Agent System) → rimosso, poi `7714023`+`1fde07a` (Prospect Scraper + Leads Dashboard) → `app/api/leads/route.ts` importava `@supabase/supabase-js` (non installato). **Regola: dopo OGNI commit cowork, eseguire `npx tsc --noEmit` + `npm run build` PRIMA di considerare deployabile.**

Fix in `2034ddc` (build di nuovo verde):
- `/api/leads` riscritta su Neon (`lib/db` `q()`) + `requireAuth` + `requireClienteId` + fallback demo — niente più Supabase.
- `/api/agents/prospect-scraper`: aggiunto `requireAuth`, cliente preso dal **cookie/sessione** non dal body (no IDOR), `apiError` per status corretti.
- nuova migration `016_scraped_leads.sql` (FK `clienti`, `unique(email,cliente_id)`, indici temperature/score) — coerente con l'`INSERT` dell'agente che prima crashava (tabella inesistente).
- `app/dashboard/leads/page.tsx`: `type Lead` (no `any`), italiano, gestione errore scraper, non invia più `clienteId: 'current-user-client-id'` placeholder.

**🔴 prospect-scraper-agent.ts genera DATI FINTI**: `scrapeLinkedin/scrapeGoogleMaps/scrapeInstagram` ritornano lead **hardcoded** ("Marco Ferrari", "Francesca Moretti"…) — commento `// (simulated)`. **Viola la regola "tutto reale niente demo"**. Da riscrivere con scraping reale (o API LinkedIn/Google Places) prima di vendere lead generation.

**Switch generazione MANUALE/AUTOMATICO — NON esiste ancora.** Richiesto dall'utente, mai costruito. Stato attuale: `automation_enabled` (settings) controlla **solo la pubblicazione**, NON la generazione. La generazione è tutta manuale (click su ogni pagina). Cowork ha costruito un lead-scraper (manuale, dati finti), NON lo switch. **Prossimo task concordato**: toggle `MANUALE | AUTOMATICO`; modalità AUTO con scheduler che genera contenuti da solo (design modalità AUTO — cron vs on-trigger — da definire con l'utente).

---

## 🆕 Sessione 2026-06-27 bis (Claude Code) — debug E2E live + fix go-live

Test maniacale in produzione (curl autenticato su Render live, login `admin`/`1234567`). Trovati e fixati **4 bug, 2 critici**. Tutto su `main`, `tsc`+`next build` verdi, deploy live verificato.

| Commit | Severità | Cosa |
|--------|----------|------|
| `01e486e` `479e7a9` | 🟠 alto | **scrape-contacts** riscritto: prima passava solo l'URL all'AI (no internet) → contatti **inventati**. Ora vero `fetch` HTML + regex (email/tel/wa/tg/social/PIVA), SSRF guard, AI solo per arricchire indirizzo/orari dal testo reale. Filtra email placeholder + `facebook.com/profile.php`. Marker `fonte: real_scrape`. |
| `9ef76d7` | 🔴 CRITICO | **Portale approvazione cliente ROTTO**: `approval_tokens.cliente_id` è `text`, ma `calendario.cliente_id`/`clienti.id` sono `uuid`. Il JOIN col-col falliva con `operator does not exist: uuid = text` → ogni `GET /api/data/approve` dava 503, portale cliente inutilizzabile. Fix: `ct.cliente_id::uuid` nei due JOIN. |
| `15a9b02` | 🔴 CRITICO | **Link approvazione/asset → dominio morto**. `NEXTAUTH_URL` su Render punta a `social-automation.onrender.com` (404). Nuovo `lib/base-url.ts` `getPublicBaseUrl(request)` deriva la base URL dall'host reale (`x-forwarded-host`) → link auto-corretti. Usato in approve POST + assets upload. **+** `lib/api-error.ts`: mappa errori noti a status corretti (Non autenticato→401, Accesso negato→403, cliente mancante→400, JSON malformato→400) invece di 500 generico su 19 route. |
| `02e2105` | 🟡 medio | assets upload catch → `apiError` (no-auth → 401 non 500). |

**Verificato live OK**: DB (14 migration, admin, 2 clienti pino+silkincom), auth enforcement (401/403/307), 10 data route read, brand PATCH write+persist+revert, approval E2E (dopo fix), security headers (CSP/HSTS/X-Frame DENY/nosniff tutti presenti), SQL injection neutralizzata (query parametrizzate), rate limiter codice OK (20/60s/IP, ⚠️ per-istanza), cascade Gemini/OpenCode cablate senza key leak, frontend selettori Gemini/OpenCode deployati.

**🔴 BLOCCO GO-LIVE architetturale rimasto**: **upload immagini effimero**. `app/api/assets/upload` scrive su `public/uploads/` = filesystem Render **volatile** → le immagini **spariscono a ogni deploy/restart**. Nessun object storage configurato (no S3/R2/Cloudinary, no disk persistente in `render.yaml`). I media nei post pubblicati si rompono. **Serve Cloudflare R2** (free tier, S3-compatible) o equivalente prima di vendere self-service.

**⚠️ Config Render da sistemare (azione utente, non codice)**:
- `NEXTAUTH_URL` + `NEXT_PUBLIC_SITE_URL` → cambiare in `https://social-media-manager-zte4.onrender.com` (ora puntano al dominio morto; il codice auto-corregge i link ma le env vanno comunque fixate per NextAuth/referrer)
- `ANTHROPIC_API_KEY` mancante (no fallback Anthropic)
- `BLOTATO_API_KEY` mancante (no autopublish)
- `dry_run: TRUE` in settings silkincom → post mai pubblicati
- AI generation `/api/generate/*` fallisce con 429: OpenRouter `:free` esaurito → serve key pagante o incollare key Gemini (free) / OpenCode nel pannello AI

**Non testabile da questa sessione**: isolamento multi-tenant con utente **non-admin** (admin=super_admin bypassa `requireClienteAccess`; codice corretto ma serve utente cliente reale per prova runtime); UI/click reali (Chrome MCP + computer-use non disponibili).

**Nuovi file**: `lib/base-url.ts`, `lib/api-error.ts`.

---

## 🔜 PROSSIMA SESSIONE — Pagina Consumi Token (generazione + agenti)

Obiettivo utente: pagina che mostra **token disponibili** e **token consumati/da usare** per ogni generazione AI e per ogni agente. Visione: vedere a colpo d'occhio quanti token restano e quanto costa ogni operazione.

### Cosa serve (piano d'attacco)
1. **Tracking consumo** — `lib/ai.ts` `callAI()` deve restituire `usage` (prompt_tokens, completion_tokens, total) da OGNI provider:
   - OpenRouter: campo `usage` nella response (già OpenAI-compatible)
   - Gemini: `usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}`
   - OpenCode: `usage` (OpenAI-compatible)
   - Anthropic: `usage.{input_tokens,output_tokens}`
2. **Persistenza** — nuova migration `016_token_usage.sql`: tabella `token_usage` (`id`, `cliente_id`, `provider`, `model`, `operazione` es. content/plan/ads/agent-seo, `agent_name` nullable, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_estimate` nullable, `created_at`). Ogni route `/api/generate/*` (e gli agenti v2) scrive una riga dopo la chiamata AI.
3. **Saldo disponibile** — dove il provider lo espone:
   - OpenRouter: `GET https://openrouter.ai/api/v1/auth/key` → `{ limit, usage, limit_remaining }` (con la key dell'account)
   - Anthropic/Gemini: niente saldo token diretto via API → mostrare "consumo storico" + (se pagante) link alla console. Per i free: mostrare rate-limit/quota note, non un saldo.
4. **API** — `GET /api/data/token-usage` (aggregati per provider/operazione/agente, filtro periodo) + eventuale `GET /api/system/token-balance` (saldo OpenRouter live).
5. **UI** — `/dashboard/consumi` (o `/dashboard/token`): card "Disponibile" (saldo OpenRouter), grafico consumo per giorno, breakdown per operazione e per agente, costo stimato. Aggiungere voce in `components/Sidebar.tsx`.
6. **Collegamento agenti** — quando gli agenti v2 esistono (vedi TODO sotto), ogni run agente scrive `token_usage` con `agent_name` → la pagina separa "generazione manuale" vs "agenti automatici".

### Note implementazione
- `ConfirmModal` ha già una **stima token** pre-generazione: riusare quella logica per il preventivo, poi confrontare con il consumo reale loggato.
- Costo stimato: mantenere una mappa `model → $/1M token` in `lib/ai-pricing.ts` (free = 0, paganti con prezzo noto). Aggiornabile a mano.
- Demo mode: la pagina deve funzionare con dati sintetici (rispettare regola `isDemo()`).

---

## 1. Stato Build

```bash
npm run build                  # ✅ 48 route, 43 pagine statiche, verde
npm audit --audit-level=moderate # ✅ 0 vulnerabilità
npm run dev                    # http://localhost:3000
npm run start                  # build produzione
```

Smoke test:
```bash
bash scripts/smoke-test.sh http://localhost:3000
```

---

## 2. Architettura

```
Next.js 15 App Router
  ├── /login              → NextAuth credentials
  ├── /dashboard/*        → admin (protetto da middleware)
  ├── /servizi            → landing pubblica
  ├── /api/data/*         → CRUD Neon/Postgres
  ├── /api/generate/*     → AI generation con fallback
  ├── /api/auth/*         → NextAuth
  ├── /api/system/health  → health check
  └── /api/system/access  → credenziali demo/setup

Database (Neon/Postgres):
  14 tabelle: profiles, clienti, brand, prodotti, calendario,
  log_pubblicazioni, blog_articoli, seo_audit, settings,
  promo, account_social, user_client_access,
  generation_jobs, integration_events
Migrazioni: 15 file (001-015, excl. 003). Se Neon live non ha ancora `015`, content/plan hanno fallback insert compatibile.
```

---

## 3. Pagine Esistenti

| Pagina | Route | Descrizione |
|---|---|---|
| **Dashboard** | `/dashboard` | Control room, stats, pipeline, AI score |
| **Brand** | `/dashboard/brand` | Profilo brand + AI discovery + SEO/GEO + Lead scraping + Client/Marketing |
| **Calendario** | `/dashboard/calendario` | Lista contenuti con filtri, approva/rifiuta, AI content scoring, drag & drop tra date |
| **Social** | `/dashboard/social/[platform]` | Generatore contenuti per ogni piattaforma (6) |
| **Piano** | `/dashboard/piano` | Piano editoriale settimanale/mensile |
| **Ads** | `/dashboard/ads` | Campagne Google, FB/IG, TikTok generate da AI |
| **SEO** | `/dashboard/seo` | Audit SEO + GEO, score, miglioramenti |
| **Prodotti** | `/dashboard/prodotti` | Catalogo prodotti |
| **Clienti** | `/dashboard/clienti` | Gestione clienti multi-tenant |
| **Log** | `/dashboard/log` | Storico pubblicazioni |
| **Settings** | `/dashboard/settings` | Configurazioni operativa |
| **Report** | `/dashboard/report` | KPI, grafici per canale/formato, stampa PDF |
| **Setup Produzione** | `/dashboard/setup` | Readiness live: DB, migrations, admin, AI, Blotato, comandi Render e azioni mancanti |
| **Login** | `/login` | Auto-login in demo mode + box Accesso Admin demo/setup |
| **Preview** | `/preview/[id]` | Anteprima multi-piattaforma (IG, FB, TT, Pinterest) con condivisione WA/TG/Email + flag escludi piattaforma dalla pubblicazione |
| **Approve** | `/approve/[token]` | Client portal pubblico: approva/richiedi modifica senza login |
| **Competitor** | `/dashboard/competitor` | Analisi AI social competitor: strategy, engagement, hashtag, punti forza/debolezza, azioni |
| **Onboarding** | `/dashboard/onboarding` | Wizard 5-step: cliente → brand AI → prodotti → contenuti → fine |
| **Dettaglio Cliente** | `/dashboard/clienti/[id]` | Stats cliente, contenuti recenti, azioni rapide |
| **Landing** | `/servizi` | Pagina vendita con 5 pacchetti (Starter €390 → Dominio €2.590) |

---

## 4. API Route — Complete

### Data API (GET/PATCH)

| Route | GET | PATCH/POST |
|---|---|---|
| `/api/data/calendario` | Lista contenuti filtrata | Aggiorna status + eventuale publish Blotato |
| `/api/data/brand` | Profilo brand | Upsert brand |
| `/api/data/clienti` | Lista clienti | Crea cliente |
| `/api/data/prodotti` | Lista prodotti | Crea prodotto |
| `/api/data/settings` | Lista settings | Aggiorna valore |
| `/api/data/log` | Log pubblicazioni | — |
| `/api/data/stats` | Statistiche dashboard | — |
| `/api/data/seo-audit` | Lista audit | — |
| `/api/data/report` | Report KPI | — |
| `/api/data/approve` | GET token info (pubblico) | POST crea token / PATCH approva/rifiuta |
| `/api/data/backup` | Export JSON contenuti, blog e log cliente | — |

### Generate API (POST)

| Route | Input | Output |
|---|---|---|
| `/api/generate/content` | canale, formato, model, openrouter_key, quality | Contenuto salvato in calendario con campi strategici |
| `/api/generate/plan` | piattaforme, periodo, model, quality | Piano salvato in calendario con quality/funnel/KPI/brief |
| `/api/generate/blog` | tema, model, quality | Articolo salvato in blog_articoli |
| `/api/generate/seo-audit` | sito_url, periodo, model | Audit salvato in seo_audit |
| `/api/generate/brand-discovery` | url, model | Profilo brand (SETTORE, TONO, TARGET...) |
| `/api/generate/score-content` | canale, formato, hook, caption | Score 0-100 con suggerimenti |
| `/api/generate/ads` | platform, brand, obiettivo, budget | Campagna Google/FB/TikTok completa |
| `/api/generate/strategy` | brand, settore, target, tono | Content pillars, frequenza, best time |
| `/api/generate/scrape-contacts` | url, model | Email, WA, TG, social, indirizzo |
| `/api/generate/client-discovery` | url, settore, model | ICP, buyer personas, competitor, KPI |
| `/api/generate/brand-keywords` | brand, settore | Parole da usare/evitare, hashtag, emoji |
| `/api/generate/compliance` | brand, tipologia | Cookie Policy, GDPR, Privacy, Disclaimer, Vendita |
| `/api/generate/competitor-analysis` | competitor_nome, social | Content strategy, engagement, hashtag, gap, azioni migliorative |

### Asset API
| Route | Input | Output |
|---|---|---|
| `POST /api/assets/upload` | `cliente_id`, immagini multipart | URL pubblici `/api/assets/file/[clienteId]/[filename]` per prompt, preview e `link_media_1..7` |
| `GET /api/assets/file/[clienteId]/[filename]` | file caricato | Serve immagine dal filesystem runtime con MIME/cache sicuri |

### System API
| Route | Descrizione |
|---|---|
| `GET /api/system/health` | Stato: DB, Auth, AI, modalità demo/prod |
| `GET /api/system/access` | Hint accesso admin per demo/setup; 404 in produzione se `SHOW_LOGIN_HINT` non è attivo |
| `POST /api/webhook/blotato` | Callback Blotato: aggiorna status pubblicazione (scheduled/published/failed) |

### Admin Operations
- Backup contenuti: bottone `Backup` in `/dashboard/calendario`, scarica JSON con calendario, blog e ultimi log.
- Cancellazione admin: `DELETE /api/data/calendario?id=...` richiede profilo `super_admin`/`admin`, elimina contenuto, token approvazione collegati e scrive log.

### Ciclo Produzione Operativo
- `/dashboard` mostra il workflow collegato con primo step operativo: Piano editoriale → Brand/Regole → Prodotti/Asset → Produzione → Revisione → Pubblicazione → Report.
- Ogni step dichiara input/output e punta alla pagina operativa corretta, così i servizi non restano scollegati.
- Il CTA principale della hero punta sempre al prossimo step mancante o urgente.
- Generazioni cliente-aware: `lib/client-context.ts` risolve sempre il cliente selezionato, carica brand identity, prodotti attivi e settings, poi li passa a content/blog/plan/ads/strategy/keywords/compliance/scoring.
- Ciclo generazione/ottimizzazione: `lib/production-cycle.ts` definisce brief → concept → produzione → review → pubblicazione → learn; content, piano, blog, scoring e dashboard usano ipotesi performance, metrica da osservare, fallback e prossime azioni.
- Upload asset robusto: `/api/assets/upload` salva su disco e ritorna URL `/api/assets/file/[clienteId]/[filename]`; la UI mostra preview locale immediata anche se Render tarda a servire il file.
- SEO/GEO audit robusto: `/api/generate/seo-audit` usa cliente attivo se manca `cliente_id`, salva audit e produce fallback deterministico se AI/non-JSON fallisce.

---

## 5. Componenti

| Componente | File | Uso |
|---|---|---|
| `AIModelSelector` | `components/AIModelSelector.tsx` | Selettore modello AI con task context (dashboard, piano, seo, brand) |
| `OpenRouterKeyInput` | `components/OpenRouterKeyInput.tsx` | Input key OpenRouter (dashboard) |
| `SeoScoreGrid` | `components/SeoScoreGrid.tsx` | Card punteggi SEO/GEO a 6 colonne |
| `LeadsCard` | `components/LeadsCard.tsx` | Risultati scraping contatti (email, WA, TG) |
| `ClientsCard` | `components/ClientsCard.tsx` | Risultati client discovery (ICP, personas, competitor) |
| `PostPreview` | `components/PostPreview.tsx` | Anteprima post per canale |
| `StatusBadge` | `components/StatusBadge.tsx` | Badge colorato per status |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Modale conferma con stima token |
| `ClienteSelector` | `components/ClienteSelector.tsx` | Dropdown cambio cliente attivo |
| `Sidebar` | `components/Sidebar.tsx` | Navigazione principale |
| `GeneratorCards` | `components/GeneratorCards.tsx` | Card generazione rapida |
| `BlotatoStatusBadge` | `components/BlotatoStatusBadge.tsx` | Stato sincronizzazione Blotato |

---

## 6. Modelli AI

Provider supportati (in `lib/ai.ts`):
- **Anthropic diretto**: `claude-sonnet-4-6` solo se `ANTHROPIC_API_KEY` è configurata.
- **OpenRouter free**: `openrouter/free`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `qwen/qwen3-next-80b-a3b-instruct:free`, `openai/gpt-oss-120b:free`

**Default AI valido**: client e API usano `nvidia/nemotron-3-ultra-550b-a55b:free` come default operativo.
**Fallback automatico**: se OpenRouter fallisce, prova altri modelli gratuiti in cascade; i modelli Claude senza prefisso non vengono più provati su OpenRouter come primo tentativo.
**Fallback osservabile**: errori AI sanificati, loggati e riportati all'utente se tutti i tentativi falliscono.
**Timeout**: `callOpenRouter` e `callAnthropic` hanno AbortController con 60s timeout. Client-side: 90s timeout sul fetch piano editoriale con messaggio chiaro.

✅ **Fix 27/06/2026**: il default non è più `claude-sonnet-4-6`; resta disponibile solo per Anthropic diretto/fallback se configurato.

## 6.1 Accesso Admin

- URL login: `/login`
- URL admin: `/dashboard/clienti`
- Demo/setup senza DB: `GET /api/system/access` espone `admin` / `1234567` e la login li mostra nel box **Accesso Admin**.
- Produzione: esegui `db/migrations/011_admin_user.sql`, entra con `admin` / `1234567`, poi cambia password/crea admin reale.
- Non usare `SHOW_LOGIN_HINT=true` su siti pubblici già venduti, salvo demo controllata.

## 6.2 Sistema Qualità Contenuti

Fase completata il 26/06/2026:
- Nuovo motore `lib/content-quality.ts`: livelli `soft`, `medium`, `high` con mapping automatico da piano cliente (`free/starter → soft`, `pro/growth → medium`, `agency/enterprise/dominio → high`).
- API aggiornate: `/api/generate/content`, `/api/generate/plan`, `/api/generate/blog`, `/api/generate/ads`, `/api/generate/score-content`.
- Nuova migrazione `db/migrations/013_content_quality_ops.sql`: salva `quality_level`, `audience_segment`, `funnel_stage`, `angle`, `primary_message`, `proof_points`, `hook_variants`, `caption_long`, `cta_variants`, `creative_brief`, `production_notes`, `compliance_notes`, `risk_flags`, `platform_best_practices`, `ab_variants_json`, `kpi_target`, `expected_outcome`, `missing_inputs`, `content_checklist`.
- UI aggiornata: Social, Piano e Ads hanno selettore qualità `Auto pacchetto / Soft / Medium / High`.
- Calendario mostra badge qualità e pannello **Strategia operativa** nel dettaglio contenuto.
- Prompt memory aggiornata: `prompts/QUALITY_OPERATING_SYSTEM.txt`, `prompts/K_piano_mensile.txt`, `prompts/G_blog_article.txt`.
- Validazioni locali: `npm run build` ✅, `npm run lint` ✅ senza warning, `npm run migrate:dry` ✅, `npm audit --audit-level=moderate` ✅, smoke production locale `30 PASS / 0 FAIL`.

Nota operativa:
- Per produzione Neon/Render eseguire `npm run migrate` dopo il deploy quando `/api/system/health` segnala `latestMigrationApplied=false`.
- `quality=auto` è consigliato: decide dal pacchetto cliente; usare `quality=high` per servizi premium/elite.
- Dal 26/06/2026 il server limita la qualità richiesta al piano cliente: un piano `starter/free` non può generare `high` anche se il client prova a inviarlo dal browser.
- Nuova migrazione `db/migrations/014_visual_templates.sql`: salva `template_id`, `template_style`, `layout_spec_json`, `asset_requirements_json` per rendere producibili post/reel/story/carousel.
- Nuova migrazione `db/migrations/015_generation_optimization_cycle.sql`: salva `production_cycle_stage`, `optimization_cycle_json`, `performance_hypothesis`, `next_iteration_actions` per trasformare ogni generazione in ciclo misurabile.

## 6.3 Report Cliente Vendibile

Fase completata il 26/06/2026:
- `/api/data/report` produce ora executive report deterministico: sintesi direzionale, health servizio, risk level, blocchi, prossime azioni, highlights contenuti.
- `/dashboard/report` è stato trasformato in report stampabile/PDF per cliente: KPI, distribuzioni canale/formato/qualità/funnel, rischi, next actions e contenuti da valorizzare.
- Il report funziona anche in demo mode con dati sintetici, utile per call commerciali.

---

## 7. Flusso Brand Discovery (completo)

```
Inserisci URL → [✓] SEO Audit → [✓] GEO Audit → [✓] Trova Contatti → [✓] Clienti & Marketing
                                                                    ↓
                    ┌──────────────┬───────────────┬─────────────────┐
                    ↓              ↓               ↓                 ↓
              Profilo Brand   SEO/GEO Score    Email/WA/TG       ICP+Personas
              (Tono, Target,  (6 dimensioni)   Telefono/Social   +Competitor
               Promessa...)                                       +KPI Vendita

                    └──────────────┴───────────────┴─────────────────┘
                    Tutto in parallelo con 1 click "Analizza sito"
```

---

## 8. Flusso Pubblicazione

```
Genera contenuto (AI con contesto brand) → Calendario → Score (AI valuta) → Preview con esclusione piattaforme → Approva
→ Blotato schedulazione → Pubblicato
```

---

## 9. Cosa NON aggiungere mai

- ❌ Supabase (rimosso dal runtime)
- ❌ n8n (rimosso)
- ❌ `as Type` in JSX (usa estrazione variabili)
- ❌ `ANY` Nuove dipendenze senza approvazione

---

## 10. Sicurezza

Audit/fix P0 completato il 26/06/2026:
- **Auth AI route**: tutte le `/api/generate/*` richiedono `requireAuth()`.
- **Tenant access**: `requireClienteId()` verifica `user_client_access.attivo = true`; i super admin passano via `profiles.ruolo_globale = 'super_admin'`.
- **Payload `cliente_id`**: endpoint che ricevono `cliente_id` dal client usano `requireClienteAccess(cliente_id)`.
- **SQL dinamico**: PATCH `brand` e `calendario` usano whitelist colonne; niente nomi colonna dal body non validati.
- **IDOR fix**: PATCH `settings` e `calendario` aggiornano solo record del cliente attivo (`cliente_id` nel `WHERE`).
- **Webhook Blotato**: `POST /api/webhook/blotato` richiede `BLOTATO_WEBHOOK_SECRET` in produzione; supporta `Authorization: Bearer`, `x-blotato-signature`, `x-webhook-signature`, `x-hub-signature-256` HMAC SHA-256.
- **Dependency audit**: `next` aggiornato a `15.5.19`, `postcss` a `8.5.15`, override `uuid=11.1.1`; `npm audit --audit-level=moderate` verde.
- `GET /api/data/approve` e `PATCH /api/data/approve` restano pubblici per portal token.

## 11. Media Validation

`lib/media-validate.ts` — valida URL media prima di approvare/pubblicare:
- HEAD request con timeout 5s
- Verifica content-type (image/jpeg, png, webp, gif, avif, video/mp4, webm, quicktime)
- Integrato in:
  - `app/api/data/calendario/route.ts` PATCH — prima di APPROVATO
  - `lib/publish/schedule.ts` — prima di inviare a Blotato
- Errori salvati in `errore_tecnico` con formato `media KO code=404 — link_media_N non raggiungibile`

## 12. Notifiche Telegram

`lib/notifications.ts` — invio notifiche via Telegram Bot API:
- Per cliente: `telegram_bot_token` + `telegram_chat_id` da settings DB
- Per agenzia: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` da env
- Eventi: approvazione, pubblicato, errore, richiesta modifica
- Integrato in `app/api/data/calendario/route.ts` PATCH (status APPROVATO, ERRORE)
- Graceful fallback: se non configurato, non blocca

## 13. In Lavoro / Prossimi Step

- [x] **AI timeout fix**: AbortController 60s su OpenRouter/Anthropic, 90s client-side su piano
- [x] **maxTokens ridotti**: 12000→6000, 9500→4500, 8000→3000 per generazione piano
- [x] **Fix default model**: default spostato a `nvidia/nemotron-3-ultra-550b-a55b:free`; Claude resta solo fallback Anthropic diretto.
- [x] **extractJSON/extractJSONArray**: SyntaxError catturata, messaggio leggibile invece di 500 generico.
- [x] **insertCalendario fallback osservabile**: ritorna bool, logga colonna mancante, aggiunge `schema_fallback`+`warning` nella risposta API quando migration mancante.
- [x] **Smoke test robusto**: accetta 307 (Next.js auth redirect) e 401 (auth required) come risposte valide in produzione — ora 30/30 su Render live.
- [x] **Health migration senza falso allarme**: `/api/system/health` verifica `latestRequiredMigration=015_generation_optimization_cycle.sql` e `latestMigrationApplied=true`; `migrationCount=14` è normale perché non esiste una migration `003`.
- [x] **Generazione grafica AI via Blotato**: reel/video/carousel/immagine lifestyle prodotto. `lib/blotato-visual.ts` + `/api/generate/visual` + `/api/generate/visual/status` + UI in calendario.
- [x] **Storage dual-mode**: locale (disco) vs cloud (Cloudflare R2) automatico. Codice pronto, **mancano 5 env R2 su Render**.
- [x] **AI Selector completo**: 5 provider (Ollama/Anthropic/Gemini/OpenRouter/OpenCode), badge Consigliato env-aware.
- [x] **Fix critico auth**: secret NextAuth condiviso Node/Edge (`lib/auth-secret.ts`) — sessioni valide non più rifiutate dal middleware.
- [x] **Fix critico Ollama**: `num_ctx` 4096→16384 via API nativa — JSON non più troncato su generazioni high-quality (blog/piano).
- [x] **Upload/modifica immagini manuale**: prodotti (`/dashboard/prodotti`), piano (bulk upload + distribuzione), calendario (slot per-contenuto 1-7), sticker link story.
- [x] **Handle social**: auto-derivato da brand_name + editabile (migration 019).
- [x] **Blog SEO locale (AIM)**: `/dashboard/blog`, pipeline Ollama multi-step, export CMS, hardened (5 bug fixati: XSS JSON-LD, cross-tenant, cover URL, slug collision, dbReady).
- [x] **Eliminazione multipla contenuti**: bulk delete tenant-safe nel calendario per svuotare piani editoriali generati (checkbox + seleziona tutti + barra azioni).
- [x] **Storage generico S3-compatible**: `lib/storage.ts` supporta qualsiasi provider (R2/Backblaze B2/no-carta) via env `STORAGE_*`.
- [x] **Audit fallback silenziosi**: 0 🔴 residui; fixati approvazione-scheduling, blog FAQ ok-flag, fetch calendario, scrape-contacts enrichment, analytics DB error.
- [ ] **🔴 `BLOG_PUBLIC_CLIENTE_ID` su Render**: senza, `/blog` pubblico mostra articoli di TUTTI i clienti mischiati (nessun leak di dati privati, solo mix cross-tenant sul blog pubblico). Settare = cliente_id SILKinCOM per deploy mono-brand.
- [x] **Dati brand SILKinCOM aggiornati** (solo testo, no prodotti/immagini): `tono_voce` emozionale→elegante, `target`/`colori_brand`/`hashtag_base`/`cta_base` allineati all'identità reale (Como/seta/heritage/lusso autentico) ricercata da silkincom.com, `social_handle`='silkincom.official' esplicito. Update diretto su `brand` (nessuna migration, solo dati).
- [ ] **🔜 Reel + Caroselli SILKinCOM con Claude Design**: visual HTML/CSS animati generati da AI, preview iframe, export. Ancora da fare.
- [ ] **🔴 Env storage su Render** (azione utente, no carta di credito): creare bucket **Backblaze B2** (10GB free, solo email) → settare `STORAGE_ENDPOINT` (`https://s3.<region>.backblazeb2.com`), `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_URL`, `STORAGE_REGION`. Senza, upload effimero su Render (blocco go-live). Codice pronto e generico (`lib/storage.ts`).
- [ ] **Pagina Consumi Token**: token disponibili + consumati per generazione e agenti.
- [ ] **Agenti v2 su Neon + cron**: chiarito stato reale — `AGENTS_SCHEDULE.md` descrive 6 agenti ma è documento della vecchia architettura Supabase (RLS), mai integrata su Neon. Solo `prospect-scraper` sopravvive (riscritto su Neon) ma **ritorna dati finti hardcoded** (`// simulated`) — va reso reale (scraping vero o API LinkedIn/Google Places) prima di vendere lead generation. Gli altri 5 (content generator giornaliero, SEO/GEO, ads optimizer, competitor watcher, client report): solo documentati, zero codice — da scrivere da zero su `lib/db.ts`+`callAI`, route `/api/agents/<nome>` protette da secret, scheduler cron Render.
- [ ] **Switch generazione manuale/automatico**: richiesto dall'utente, mai costruito. `automation_enabled` (settings) controlla solo la pubblicazione, non la generazione.
- [ ] **Fix env Render**: `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL` su dominio reale, `ANTHROPIC_API_KEY`, `BLOTATO_API_KEY`, `dry_run=FALSE`.
- [ ] **API key Blotato**: per abilitare pubblicazione automatica (`blotatoApiKey=false` su Render).
- [ ] **Multi-lingua**: generazione contenuti in altre lingue
- [ ] **White-label**: logo agenzia custom
- [ ] **Stripe**: pagamenti integrati nel funnel di vendita
- [ ] **Checklist vendita**: usare `CHECKLIST-VENDITA.md` per demo call, onboarding e limiti da non promettere

---

## 14. Stato Corrente — Audit Claude Code 2026-06-27

- Repo remoto `origin/main` su commit `7b7672d` (fix: stabilizza generazione asset seo e deploy readiness).
- Working tree pulito, nessuna modifica locale pendente.
- Validazioni: `npm run lint` ✅, `npm run build` ✅ (45 route), `npm run migrate:dry` ✅ (14 file migration, latest `015_generation_optimization_cycle.sql`), `npm audit --audit-level=moderate` ✅ 0 vuln.
- Smoke test live Render: **30 PASS / 0 FAIL** su `https://social-media-manager-zte4.onrender.com`.
- Health live: `status=ready`, `mode=production`, `latestMigrationApplied=true`, `openrouter=true`, `anthropic=false`, `blotatoApiKey=false`.
- **Azione obbligatoria rimasta**: configurare `BLOTATO_API_KEY` prima di vendere pubblicazione automatica end-to-end.
- Render MCP non disponibile (`RENDER_API_KEY` assente): usare dashboard Render o Render CLI per storico deploy.

Fix applicati in `7b7672d` (già su origin):
- `lib/ai.ts`: `extractJSON`/`extractJSONArray` catturano `SyntaxError` → errore leggibile invece di 500 generico.
- `app/api/generate/content/route.ts` + `plan/route.ts`: `insertCalendario` logga colonna mancante, ritorna `schema_fallback: true` + `warning` nella risposta se fallback schema usato.
- `scripts/smoke-test.sh`: accetta 307 e 401 produzione — **30/0 su Render live**.
- `lib/ai.ts`: `canUseRequestedOnOpenRouter` previene Claude models su OpenRouter.
- `app/api/generate/seo-audit/route.ts`: fallback deterministico cliente-aware.
- `app/api/assets/upload/route.ts` + route file: upload immagini con preview locale immediata.
- `components/AIModelSelector.tsx`: mobile-first.
- Tutte le route `/api/generate/*`: `requireAuth()` su ogni endpoint.

---

## 15. Variabili Ambiente

```bash
DATABASE_URL=postgresql://...    # Neon
AUTH_SECRET=...                   # NextAuth
NEXTAUTH_URL=...                  # URL produzione — ⚠️ DEVE essere https://social-media-manager-zte4.onrender.com (NON social-automation.onrender.com che è morto/404)
NEXT_PUBLIC_SITE_URL=...          # URL pubblico per link e referrer — stesso dominio reale di NEXTAUTH_URL
ANTHROPIC_API_KEY=...             # Claude (opzionale se usi OpenRouter)
OPENROUTER_API_KEY=...            # Modelli free (opzionale se usi Claude)
NEXT_PUBLIC_DEMO_MODE=true        # Solo demo controllata, mai produzione venduta
BLOTATO_API_KEY=...               # Quando pronto
BLOTATO_API_URL=https://api.blotato.com
BLOTATO_WEBHOOK_SECRET=...        # Firma webhook Blotato in produzione
SHOW_LOGIN_HINT=true              # Solo demo controllata: mai su sito pubblico venduto
ADMIN_LOGIN_USER=admin            # Opzionale, usato da /api/system/access
ADMIN_LOGIN_PASSWORD=1234567      # Opzionale, usato da /api/system/access
```

---

## 16. Produzione Render

```bash
npm run prod:check
npm run migrate:dry
DATABASE_URL="postgresql://..." npm run migrate
npm run build
```

- `render.yaml` usa `npm ci && npm run build` e `preDeployCommand: npm run migrate`.
- `scripts/run-migrations.mjs` applica `db/migrations/*.sql` e registra checksum in `schema_migrations`.
- `scripts/render-production-check.mjs` segnala env mancanti e flag demo pericolosi.
- Guida operativa: `RENDER_PRODUCTION.md`.
- CI GitHub Actions: `.github/workflows/ci.yml` esegue install, lint, build, audit, migration dry-run e smoke test demo runtime.
- Setup live in app: `/dashboard/setup` legge `/api/system/health` e mostra checklist produzione, credenziali admin, comandi Render Shell e readiness vendita.
- **⚠️ Dopo ogni deploy**, controllare `/api/system/health`: se `latestMigrationApplied=false`, eseguire `npm run migrate` sul Neon DB.
- Upload asset contenuti: `/dashboard/social/[platform]` permette upload immagini o URL pubblici; content/blog usano gli asset nei prompt e salvano media/cover.
- **🔴 Nota storage (BLOCCO GO-LIVE)**: `public/uploads` su Render è filesystem **effimero** — le immagini caricate **spariscono a ogni deploy/restart**, rompendo i media nei post già pubblicati. Confermato 2026-06-27: nessun object storage configurato, nessun disk persistente in `render.yaml`. **Prima del go-live self-service serve Cloudflare R2** (free tier S3-compatible) o S3/Cloudinary: cambiare `assets/upload` per scrivere su bucket e ritornare URL del bucket invece di `/api/assets/file/...`.

### Controllo Deploy Render / OpenCode
- Stato live pubblico verificabile senza auth: `curl https://social-media-manager-zte4.onrender.com/api/system/health`.
- Se la prima richiesta va in timeout, è probabilmente cold start Render Free: riprovare dopo 30-60s.
- Per storico deploy riusciti/falliti serve Render Dashboard, Render CLI o MCP con `RENDER_API_KEY`.
- Comandi Render MCP consigliati se configurato: `list_services`, `list_deploys(serviceId, limit: 10)`, `list_logs(resource:[serviceId], type:["build"], limit:200)`, `list_logs(resource:[serviceId], level:["error"], limit:100)`.
- Pattern già visti e risolti: build fail per `tailwindcss`/PostCSS/devDeps mancanti, CI fail su lint, default model OpenRouter non valido.
- Stato attuale live: app ready, latest migration applicata; prima di vendere pubblicazione automatica serve `BLOTATO_API_KEY`.

### Deploy fixes applicati
- `next.config.ts` → `next.config.mjs` (non richiede TypeScript runtime)
- `typescript` spostato da `devDependencies` a `dependencies` (garantito su Render)
- `tailwindcss`, `postcss`, `autoprefixer` spostati in `dependencies` (necessari per build)
- `@types/node`, `@types/react`, `@types/react-dom` spostati in `dependencies` per evitare auto-install di Next durante build con `NODE_ENV=production`
- Render usa `npm ci` (installa tutto), non `npm install` (salta devDeps con NODE_ENV=production)
- `eslint.config.mjs` rimosso (dipendenza `@eslint/eslintrc` mancante bloccava build)

- Audit finale interconnessioni/fallback:
  - `lib/db.ts` usa il driver ufficiale `@neondatabase/serverless`, non fetch custom.
  - `app/api/data/calendario` e `app/api/data/report` hanno fallback demo/no-DB espliciti.
  - `app/api/generate/{plan,content,blog,seo-audit,competitor-analysis}` risponde con fallback demo controllato quando il DB manca.
  - `middleware.ts` restituisce `401` JSON per API data/generate protette senza sessione.
  - `app/api/data/approve` gestisce DB non disponibile con `503` controllato.

## 17. Nuove Feature (26/06/2026)

### Calendar Drag & Drop
- Week date bar con 7 giorni come drop target sopra la lista contenuti
- Ogni contenuto è `draggable`; su drop, PATCH `data_pubblicazione`
- Persistente con DB demo mode

### Onboarding Wizard (5-step)
- `/dashboard/onboarding` — Step: Cliente → Brand AI Discovery → Prodotti → Contenuti → Fine
- Crea automaticamente cliente, brand, prodotti e primi contenuti via API

### Competitor Tracking
- `/dashboard/competitor` — Form input competitor + social handles
- `/api/generate/competitor-analysis` — AI analizza: content strategy, engagement, hashtag, punti forza/debolezza, gap, azioni
- Risultati: score 0-100, azioni priorizzate per impatto/effort, contenuti suggeriti

### Preview: Esclusione piattaforme
- `/preview/[id]` — Ogni card piattaforma ha toggle "Includi/Escludi"
- Flag persistente in `localStorage` (`preview_{id}_excluded`)
- Visuale: card escluse sono opacity 40% + badge "NON SARÀ PUBBLICATO"
- Riepilogo: count da pubblicare / esclusi + pulsante "Ripristina tutti"

### Prodotti POST API
- `/api/data/prodotti` — nuovo POST per creare prodotti
- Usato dall'onboarding wizard e da UI diretta

### Sidebar aggiornata
- Aggiunti: **Onboarding** (`/dashboard/onboarding`), **Competitor** (`/dashboard/competitor`)

**Build verde, lint zero warning, 0 vulnerabilità npm.**

---

## 18. Passaggio A Claude Code — Audit Finale Maniacale

Obiettivo: fare controllo finale severo prima di commit/push/deploy. Non fidarsi del “sembra ok”: verificare codice, UI, API, DB e fallback.

### Sequenza obbligatoria
1. Leggere interamente `HANDOFF.md`, poi eseguire `git status --short` e `git diff --stat`.
2. Verificare che non ci siano segreti hardcoded: cercare `sk-`, `sk-or-`, password reali, token Render/Neon/Blotato.
3. Eseguire in locale: `npm run lint`, `npm run build`, `npm run migrate:dry`, `npm audit --audit-level=moderate`.
4. Se possibile avviare locale con env sicure e fare smoke: `bash scripts/smoke-test.sh http://localhost:3000`.
5. Controllare live health: `/api/system/health`; dopo deploy/migrate deve mostrare `latestMigrationApplied=true`.
6. Se Render MCP è configurato: controllare ultimi 10 deploy, build logs e runtime error logs.

### Flussi da testare manualmente
- Login admin → `/dashboard/clienti` → selezione cliente attivo.
- Primo step piano: `/dashboard/piano` genera piano e salva contenuti nel calendario del cliente selezionato.
- Upload asset: `/dashboard/social/facebook` o Instagram, caricare immagine, verificare preview visibile e URL `/api/assets/file/...`.
- Generazione post/reel/story/carousel/blog con asset: deve salvare `link_media_1` e campi operativi, senza fallire se `015` manca.
- SEO/GEO audit: `/dashboard/seo` deve completare con risultato AI o fallback deterministico salvato.
- Calendario: dettaglio contenuto, score AI, backup JSON, delete admin, approvazione.
- Report: `/dashboard/report` deve leggere dati reali/demo senza crash.
- Mobile: sidebar, AI selector e pagine social/piano/seo non devono sbordare.

### Controlli sicurezza/interconnessioni
- Ogni route `/api/generate/*` deve richiedere `requireAuth()`.
- Ogni route che riceve `cliente_id` deve usare `requireClienteAccess()` o `getClientGenerationContext()`.
- Nessun ritorno silenzioso che nasconde errore critico: fallback sì, ma con `warning`, `fallback` o log leggibile.
- Demo mode deve restare funzionante senza DB, ma produzione non deve avere `NEXT_PUBLIC_DEMO_MODE=true`.
- Non reintrodurre Supabase/n8n nel runtime.
- Non usare `as Type` direttamente dentro JSX; estrarre variabili prima del render.

### Criterio per chiudere
- Se tutto è verde: preparare commit atomico, messaggio consigliato `fix: stabilizza generazione asset seo e deploy readiness`.
- Dopo push: verificare GitHub Actions, Render deploy e `/api/system/health`; migrare solo se `latestMigrationApplied=false`.
- Solo dopo health `ready` con `latestMigrationApplied=true` considerare chiuso il controllo tecnico.

---

## Generazione VISUAL AI (Blotato) — commit `467e1df`

Chiude il gap vs Predis/Ocoya: l'AI scrive il testo **e** genera la grafica.

- **DB `018_visual_generation.sql`**: colonne `visual_job_id, visual_status, visual_template_id, visual_kind, visual_url, visual_image_urls(jsonb), visual_error, visual_synced_at` su `calendario`.
- **`lib/blotato-visual.ts`**: REST `POST {BACKEND}/v2/videos/from-templates` + `GET /v2/videos/creations/:id` (header `blotato-api-key`). `BACKEND` = `BLOTATO_BACKEND_URL` o default `https://backend.blotato.com`. `planVisual(row)` sceglie template:
  - reel/video/story/short → slideshow video (`5903b592…`), kind `video` → `mediaUrl`
  - carousel → carosello IG (`53cfec04…`), kind `carousel` → `imageUrls[]`
  - post con foto prodotto → product scene placement (`f524614b…`, passa `productImage`), kind `image`
  - post senza foto → 1 immagine lifestyle generata
- **`/api/generate/visual`** (POST `{cliente_id,id_contenuto}`): avvia job, salva `visual_job_id`+`generating`.
- **`/api/generate/visual/status`** (GET `?id_contenuto=`): polling; a `done` salva URL e riempie gli **slot `link_media_*` liberi** (no overwrite delle foto utente) → pronto per pubblicazione Blotato.
- **UI** `/dashboard/calendario`: card "Grafica AI" nel dettaglio — genera/rigenera, preview immagini/video, polling auto ogni 15s (max 5 min).
- **Env**: richiede `BLOTATO_API_KEY` (già in render.yaml). `BLOTATO_BACKEND_URL` opzionale.

---

## Prossima sessione: Reel + Caroselli SILKinCOM con Claude Design

Task: creare visual animati (reel 9:16 + caroselli 4:5 + post 1:1) per SILKinCOM via Claude Design (artifact HTML/CSS). NON ancora costruito — da fare nella prossima sessione.

**Brand SILKinCOM** (già in DB seed):
- Fashion e-commerce · luxury accessibile · donna 25-45 professionista
- Tono: moderno, elegante, accessibile
- Prodotti: Blazer lino €129 / Jeans dritti €89 / T-shirt cotone bio €39 (promo)
- CTA: "Scopri il look completo su silkincom.com" · Hashtag: #silkincom #modaaccessibile
- Colori: da definire in sessione (proposta: bianco/nero/oro/sabbia)

*Fine handoff. Non reintrodurre Supabase o n8n. Mantieni la demo mode funzionante.*
