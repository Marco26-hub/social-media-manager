# HANDOFF — Social Automation V2

> Documento per AI agent multipli (Claude CLI, Cursor/Cline, Codex). Lavoriamo come un team unificato.

**Data ultimo aggiornamento**: 2026-07-10 (Claude CLI: area cliente `/portale` separata dall'admin + landing premium/mobile-first + review dashboard cliente)
**Progetto**: Social Automation — SaaS social media management per agenzie
**Stack**: Next.js 15.5.19 + Neon/Postgres + NextAuth + Tailwind + AI (Gemini/OpenRouter/Anthropic/OpenCode/Ollama)
**Percorso locale**: `/Users/md/Documents/social_automation_v2`
**Repo**: `https://github.com/Marco26-hub/social-media-manager.git`
**Deploy live**: `https://social-media-manager-zte4.onrender.com` (Render free, service id `srv-d8up0lvavr4c73fjd1k0`)

---

## 🆕 Sessione 2026-07-10 (Claude CLI) — area cliente `/portale`, landing premium + mobile-first

### 🟢 Area CLIENTE separata `/portale` (nuova) — il cliente NON entra nella dashboard operatore
- **`app/portale/`** (layout + page) = spazio del cliente finale, topbar minima (brand + Esci), **niente sidebar di gestione**. Mostra SOLO: piano attivo + features, quota contenuti del mese (X/Y), abbonamento (stato + prossimo rinnovo + ultimo pagamento) con bottone **"Paga e gestisci"**, e "I tuoi risultati" (report reale: pubblicati/in lavorazione, canali/formati top, sintesi). **Nessuna azione di approvazione** — i contenuti li approva l'agenzia, non il cliente.
- **`app/api/stripe/portal/route.ts`** (nuovo): POST → `requireClienteId` → `stripe_customer_id` del cliente → `createStripePortalSession` (lib/stripe.ts) → apre lo **Stripe Customer Portal** (carta, fatture, insoluti, disdetta). Il "mensile" NON è un pagamento manuale: l'abbonamento è **ricorrente** (`createStripeCheckoutSession` `mode=subscription interval=month`, creato alla registrazione flow A) e Stripe rinnova da solo; il portale serve a gestirlo/saldare.
- **`middleware.ts`**: `/portale` richiede login; il **cliente non-admin viene sempre reindirizzato da `/dashboard` → `/portale`**; post-login: admin → `/dashboard/clienti`, cliente → `/portale`. (Prima i client-role vedevano un sottoinsieme di `/dashboard`; ora hanno l'area dedicata.)
- Riusa `/api/data/il-mio-piano` + `/api/data/report` (già sicuri multi-tenant). `/dashboard/il-mio-piano` resta come **preview admin** del piano di un cliente.
- ⚠️ Il "Paga e gestisci" richiede `STRIPE_SECRET_KEY` + un `stripe_customer_id` sul cliente (esiste dopo la registrazione con pagamento). In demo mostra errore controllato.

### Landing — premium + mobile-first
- Pass premium completato (bordi gradient card, a11y hit-area 44px, ritmo, nav "Prova gratis"+Accedi, hover composto col tilt 3D). Copy italiano pro anti-slop, pacchetti scala cumulativa 3×2 con nota "Ogni pacchetto include tutto del precedente" + box "Include tutto di X".
- **Mobile-first**: nav mobile pulita (brand + CTA, link ancora nascosti), hero e h2 ridimensionati → hero completo visibile in una schermata.

### Review dashboard cliente `/dashboard/il-mio-piano` (costruita da OpenCode/Codex)
- Sicurezza multi-tenant OK. Rimossa card "Nota mapping piano" (gergo tecnico esposto al cliente) → upsell. Fix canone tagliato.

---

## 🆕 Sessione 2026-07-08 sera (Claude CLI) — go-live hardening, legale, pagamenti one-off

### 🚨 FIX DEPLOY (era ROTTO)
I deploy Render fallivano con "Exited with status 1 while running your code": il gate admin CRIT-7 faceva `exit 1` su OGNI deploy prod senza `ADMIN_EMAIL`/`ADMIN_PASSWORD`, bloccando anche il setup. **Fixato** (`766a260`): hardening admin ancorato a `PUBLISH_ENABLED=true` (go-live reale), non a `NODE_ENV=production`. In setup → warning, deploy procede. Al go-live reale → creds admin obbligatorie. Deploy ora verde (`/api/system/health` espone `version` = commit SHA per confermare quale build è live).

### ✅ Audit go-live multi-agente (10 scout paralleli + verify adversariale)
**121/135 blocker confermati** su 10 dimensioni. Tutti gli 8 CRITICAL chiusi + HIGH principali. Vedi sezione "COSA RESTA PER IL GO-LIVE" in fondo.

### ✅ Chiuso in questa sessione (commit su `main`)
- **8 CRITICAL** (`2b533ed`→`806114d`): host Blotato `backend.blotato.com`, auth fail-closed DB assente, dry_run per-cliente nel publisher, link_prodotto persistito+in caption, pacchetto Slancio mappato+fallback Starter, admin default fatale (ora al go-live), AGENTS_SCHEDULE marcato roadmap.
- **HIGH publish** (`c914c9f` cowork + `732cee0`+altri): publish lock atomico (`publish_lock_id`), errori sync persistiti (`errore_tecnico`+`log_pubblicazioni`), Blotato 2xx-senza-id → throw, cross-post adattato per canale (`lib/social-adapt.ts`: tronca caption/hashtag per piattaforma).
- **HIGH Stripe** (cowork `c914c9f` + verificati): idempotency `stripe_webhook_events` (mig 025), timestamp tolerance 300s, livemode check, ON CONFLICT no cliente_id, Idempotency-Key checkout, timeout+retry.
- **HIGH security** (`f964faa`+`21f0fac`+`0336689`): mask secret keys in GET settings, `preview_token` opaco anti-IDOR (mig 026), SSRF con risoluzione DNS reale (`lib/media-validate.ts`).
- **HIGH ops** (`412c193`+`35b7332`+`ffc13ff`): health 503 su fallimento critico DB (200 su env opzionali → non boccia deploy), check Stripe/Meta/email, email onboarding Resend (`lib/email.ts`, no-op senza key).
- **HIGH AI** (`ec390f7`): carosello 3-5 slide validato HARD + retry, `extractJSONChecked` truncated flag; **fix merge cowork**: `visual_preset`/`use_trending_effects` erano hardcoded `'trending'`/`true`, ora dal body.
- **MEDIUM** (`35b7332`): `isMissingPaymentsSchema` regex→pg code, `extractJSONArray` bilanciato, register 503 se DB down.
- **H15 captcha** (`c4fbc33`+`5e91de7`): Turnstile code-ready (opzionale) + **honeypot+timing anti-bot a zero dipendenze** (no Cloudflare/Supabase necessari).

### ✅ Effetti visual reel/carosello (`bd6b704`)
Migration `024_visual_effects.sql`: `visual_preset` (trending/premium/minimal/classico) + `use_trending_effects` + `visual_effects[]`. `lib/blotato-visual.ts::planVisual` arricchisce il prompt Blotato con descrittori virali/premium. **UI selector NON ancora fatta** in `/dashboard/piano` (task aperto).

### ✅ Pagine legali (compliance del sito stesso)
`/privacy` (GDPR art.13), `/cookie-policy` (Garante 2021), `/termini` (recesso, AI), `/trasparenza-ai` (AI Act art.50) + **cookie banner** (solo tecnici) + link footer + sitemap. Fonte dati `lib/legal-config.ts` con placeholder `[DA COMPILARE]`. Layout `components/LegalShell.tsx`. **Sono BOZZE da validare con Studio BCS.** Vedi `CHECKLIST_LEGALE.md`.

### ✅ Partnership Studio BCS + consulenza €150
- Sezione legale linkata in nav ("Legale & AI"). Partnership BCS = blocco autorevolezza (monogramma, badge "Partner verificato", Avv. Vincenzo Sapone Cassazionista).
- **Pricing consulenza €150/30min** su landing+servizi (Cassazionista + parere scritto incluso).

### ✅ Flow A — registrazione paga-prima (`b370101`)
Cliente si registra → paga subito su Stripe Checkout → account attivato AUTOMATICAMENTE dal webhook `checkout.session.completed`. `lib/provisioning.ts::activateRegistration()` = logica condivisa (admin-attiva + webhook). Retry-safe (email pending riusa profilo). Degrada a pending+admin se Stripe non configurato.

### ✅ Consulenza one-off €150 in DB + UI admin (`a208395`+`20bdf7b`+`4b74218`)
- Migration `027_consulenze.sql`: tabella `consulenze` (pending|paid|cancelled).
- `lib/stripe.ts::createOneOffCheckoutSession` (mode=payment, non subscription).
- `/consulenza` pagina booking → Stripe → webhook marca `paid`.
- `POST /api/consulenza` + webhook branch `tipo=consulenza`.
- **UI admin**: sezione "Consulenze legali" in `/dashboard/pagamenti` (KPI incasso/pagate/in-attesa + lista). API `/api/admin/consulenze`.
- CTA landing = solo "Prenota e paga · €150" (rimosso WhatsApp).

### ⚠️ NOTA MULTI-AGENT: Codex lavora in parallelo su questo repo
Durante la sessione Codex ha committato in parallelo (commit inglese lowercase: "harden Stripe and Blotato", "support manual mp4 uploads", ecc.). Il repo si è riconciliato in storia lineare. **Verificare sempre `npm run build` dopo commit cowork** (vedi memoria cowork-breaks-build). Un artefatto merge trovato e fixato: visual_preset hardcoded.

---

## 🎯 COSA RESTA PER IL GO-LIVE

### 🔴 AZIONI UTENTE su Render (obbligatorie) — nessuna riga di codice
1. **`ADMIN_EMAIL` + `ADMIN_PASSWORD`** (≥8 char) reali. **Obbligatorie quando metti `PUBLISH_ENABLED=true`** (altrimenti deploy fallisce di proposito → sicurezza).
2. **`NEXT_PUBLIC_DEMO_MODE=false`** esplicito (rebuild: Clear cache & deploy).
3. **`BLOTATO_API_URL=https://backend.blotato.com`** (verifica non sia `api.blotato.com`).
4. **Stripe**: `STRIPE_SECRET_KEY` (sk_live_) + `STRIPE_WEBHOOK_SECRET`. Crea webhook Stripe → `/api/stripe/webhook` con eventi: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`. **Serve sia per abbonamenti che per consulenze €150.**
5. **`STORAGE_REGION`** corretta per Backblaze B2 (es. `us-west-004`) + verifica `STORAGE_*` presenti (senza, immagini spariscono a ogni deploy).
6. **Migrations su prod**: 024, 025, 026, 027 si applicano in auto (`preDeployCommand: npm run migrate`). Verifica dopo deploy che `/api/system/health` → `latestMigrationApplied:true`.
7. Compila **`lib/legal-config.ts`** con dati reali azienda (P.IVA, ragione sociale, sede, PEC) — vedi `CHECKLIST_LEGALE.md`.

### 🟡 AZIONI UTENTE — opzionali / quando pronti
- `BLOTATO_API_KEY` + `PUBLISH_ENABLED=true` (kill-switch pubblicazione reale). Prima resta dry-run.
- `RESEND_API_KEY` + `EMAIL_FROM` + `AGENCY_NOTIFY_EMAIL` (email onboarding, altrimenti no-op).
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (captcha extra; honeypot+rate-limit già proteggono).
- `META_APP_ID`+`META_APP_SECRET` (Insights IG automatiche).
- Far **validare le 4 pagine legali allo Studio BCS** + accettare i DPA (art.28) dei fornitori (Stripe, Neon, Render, Blotato, Meta).
- `dry_run` per-cliente in settings: metterlo a FALSE per i clienti da pubblicare davvero (default = dry_run per sicurezza).

### 🟢 TASK CODICE ancora aperti (backlog, non bloccanti)
- **UI selector effetti visual** in `/dashboard/piano`: "🔥 Trending / ✨ Premium / ⚪ Minimal / 📰 Classico" + checkbox "effetti virali" → passa `visual_preset`+`use_trending_effects` a `/api/generate/{content,plan}` (backend già pronto).
- **Cron scheduler**: i 4 agenti weekly (weekly-seo, competitor, client-report, ads-optimizer) NON esistono. O implementarli su Neon + `type:cron` in render.yaml + `CRON_SECRET`, oppure lasciare com'è (i pacchetti NON promettono cron autonomi — è human-in-the-loop).
- **MEDIUM/LOW residui** (basso ROI): logging strutturato `lib/logger.ts`, timezone drift (`date-fns-tz`), `generaVisual` mirroring su storage, story sticker link a Blotato, timeout gateway AI totale, `charge.refunded` handler webhook, ~50 LOW cosmetici (aria-*, key React, cookie flags).
- **Lead generation reale** (search API) — ancora simulato (vedi memoria lead-research-rebuild).

### ✅ Test E2E consigliato prima di aprire ai clienti
1. Registra cliente reale → checkout Stripe → verifica account attivato + login.
2. Prenota consulenza €150 → paga → verifica riga `paid` in `/dashboard/pagamenti` sezione Consulenze.
3. Genera piano/contenuto con foto → approva → (con PUBLISH_ENABLED=true su 1 cliente non-dry_run) pubblica 1 post/canale → verifica link prodotto cliccabile + webhook status PUBBLICATO.
4. Soft-launch 1-2 clienti pilota, monitora `/api/system/health` + Stripe + Blotato per 2 settimane, poi apri self-serve.

---

## 🆕 Sessione 2026-07-08 — calendario premium + default AI trend-first

### ✅ Fatto da Codex
- **Calendario premium**: `/dashboard/calendario` ora apre con hero "Regia editoriale", KPI rapidi (da approvare, oggi, approvati, pubblicati, errori, reel/video, trend/premium, canali), prossimo contenuto e mix canali.
- **Timeline più chiara**: lista contenuti ordinata per data/orario, separatori sticky per giorno con conteggio e breakdown status; card mantenute compatibili con upload MP4/foto, preview, dettagli, scoring, approva/rifiuta/elimina.
- **Generazioni sempre moderne**: `lib/prompt-standards.ts` aggiunge `TREND_MODERN_STANDARDS` dentro la bibbia copy condivisa, quindi content/plan/blog/ads ereditano istruzioni trend-aware e social-native.
- **Default visual trend-first**: `generate/content`, `generate/plan` e `lib/blotato-visual.ts` salvano/interpretano di default `visual_preset='trending'` e `use_trending_effects=true`; non inventano trend specifici, canzoni o eventi se non forniti.

### 🔎 Validazioni
- `git diff --check` ✅, `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅.
- Non committare salvo richiesta: `daily_content_options_2026-07-04.md` e `daily_content_options_2026-07-04_EMAIL_DRAFT.txt`.

---

## 🆕 Sessione 2026-07-07 sera (Claude CLI) — audit go-live + 8 CRITICAL chiusi + effetti reel/carosello

### 🎯 Contesto
Audit multi-agente parallelo (10 scout + verify adversariale, ~150 subagenti Opus) su 10 dimensioni: env Render, Stripe, publish Blotato, storage, AI generation, security, content flow, dashboard cliente, onboarding, monitoring. **121/135 blocker confermati**. Piano d'azione ordinato prodotto e allegato qui sotto.

### ✅ CRITICAL chiusi in questa sessione (8/8)
Commit atomici su `main`, build+lint verdi ad ogni step.

| Commit | CRIT | Fix |
|--------|------|-----|
| `2b533ed` | 2 | `BLOTATO_API_URL` allineato a `backend.blotato.com` in `render.yaml` + `.env*.example`. Prima `api.blotato.com` in config vs `backend.blotato.com` nel codice → publish morto silenziosamente in prod. Aggiunta anche `BLOTATO_BACKEND_URL`. |
| `380b8e0` | 8 | `lib/auth.ts` fail-closed: se `!dbReady() && NODE_ENV=production && !NEXT_PUBLIC_DEMO_MODE` → `return null`. Prima `DATABASE_URL` rimossa/vuota promuoveva chiunque a `super_admin`. |
| `732cee0` | 1+3 | `isDryRunForCliente(clienteId)` legge `settings.dry_run` in `scheduleOnBlotato` → cliente in dry_run NON pubblica anche con `PUBLISH_ENABLED=true`. Default fail-safe: valore assente/schema assente = dry_run. **Colonne `link_prodotto` + `link_prodotto_finale` persistite** in `insertColumns` di `generate/content` e `generate/plan`. `buildPlatformContent()` appende l'URL prodotto al testo Blotato (escluso `story`). |
| `6905a6b` | 4+5 | `app/api/admin/registrazioni/route.ts`: aggiunto `slancio: {piano:'agency', contenuti:16}` in `PACCHETTO_PIANO` + `PACCHETTO_LABEL`. Fallback pacchetto ignoto ora `{piano:'pro', contenuti:8}` Starter (prima regalava 30 contenuti E-commerce). |
| `d55bc30` | 7 | `scripts/render-start.mjs` + `scripts/ensure-admin.mjs`: in produzione (non demo) `ADMIN_EMAIL`+`ADMIN_PASSWORD` (≥8 char) sono FATALI. Verify post-upsert + double-check default `admin` non-attivo. Errore DB in prod → `exit 2`. Prima non-fatale → deploy live con default `admin/1234567`. |
| `806114d` | 6 | `AGENTS_SCHEDULE.md` marcato come roadmap non-implementata con header WIP esplicito. Nessuna feature venduta promette cron autonomi (le feature sono human-in-the-loop). |

### 🎨 Nuova feature: effetti visual reel/carosello (`ae66f30`... prossimi commit)
- **Migration `024_visual_effects.sql`**: `calendario.visual_preset` (text: `trending|premium|minimal|classico|null`) + `use_trending_effects` (boolean) + `visual_effects` (jsonb array).
- **`lib/blotato-visual.ts::enrichPrompt()`**: iniziato `PRESET_HINTS` con descrittori virali/premium/minimal/classico per reel + carosello + immagine. Es. trending reel: "hook visivo aggressivo 0-2s, cuts 0.5-1.5s, whip-pan/zoom-punch, kinetic-typography, beat-drop". Blotato non ha flag "viral" pubblico: il prompt del template AI interpreta i descrittori.
- **`planVisual(row)`** ora chiama `enrichPrompt(base, row, kind)` per reel + carosello + immagine.
- **Body params**: `generate/content` e `generate/plan` accettano `visual_preset`, `use_trending_effects`, `visual_effects[]` e li persistono in `calendario`.
- **Nessuna UI ancora** (solo API-side). Default = `premium` se nessun preset è settato.

### ✅ Continuazione Codex — HIGH chiusi in working tree (da committare)
- **Publish pipeline #1/#2/#3/#5**: `scheduleOnBlotato()` usa lock atomico `publish_lock_id`, rilascia il lock su successo/errore, persiste errori Blotato su `errore_tecnico`/`log_pubblicazioni`, tratta 2xx senza id come errore esplicito e usa fallback id estesi; cross-post ora passa da `lib/social-adapt.ts` per limiti canale e combo incompatibili.
- **Stripe #6/#7/#8/#9/#10/#11/#12**: aggiunta migration `025_stripe_webhook_events.sql`; webhook idempotente su `event.id` con retry degli eventi falliti; firma Stripe rifiuta replay oltre 300s; upsert subscription/fatture non può cambiare `cliente_id`; date Unix normalizzate; Checkout usa `Idempotency-Key`; REST Stripe ha timeout 10s + retry; webhook verifica coerenza `livemode` vs prefisso `sk_live_/sk_test_`.
- **Dashboard cliente #28**: `app/api/data/il-mio-piano/route.ts` normalizza `timestamptz` Neon sia come `Date` sia come stringa, quindi rinnovo e ultimo pagamento non spariscono più in UI.
- **Health #21**: `/api/system/health` espone `checks.stripeSecret`, `checks.stripeWebhook`, `checks.publishEnabled` e richiede come latest migration `025_stripe_webhook_events.sql`.
- **Validazioni Codex**: `git diff --check` ✅, `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅, `npm run migrate:dry` ✅ (vede 024 + 025).

### ✅ Fix screenshot 2026-07-07 notte — calendario/blog/AI
- **Calendario leggibile**: `/dashboard/calendario` ora mostra data + orario in formato umano su ogni card, include canale Blog e aggiunge filtri per ricerca, canale, formato, categoria/obiettivo e stato. API `/api/data/calendario` supporta `formato`, `obiettivo`, `q` e ordina per data+ora.
- **Blog nel calendario**: sia `/api/generate/blog-local` sia `/api/generate/blog` salvano/aggiornano una riga `calendario` (`canale='blog'`, `formato='articolo'`, `status='DA_APPROVARE'`) tramite `lib/blog-calendar.ts`, così l'articolo generato compare davvero nel calendario oltre che in `blog_articoli`.
- **Default AI anti-errore OpenRouter**: `AIModelSelector` e `readAISettings()` non restano più su modelli OpenRouter senza key; default a Gemini nativo e auto-heal del modello salvato se manca `openrouter_key`. OpenRouter resta opzionale.
- **Validazioni**: `git diff --check` ✅, `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅.

### ✅ Fix screenshot 2026-07-07 tarda notte — preview tutti tipi post
- **Preview shared completa (#17 chiuso)**: `/api/data/preview` ora ritorna anche `scenes_json`, `slides_json`, `overlay_text`, `idea_visual`, `alt_text`, `thumbnail_url`, `music_mood`, `tema`, `note` e tutti gli slot `link_media_1..10`, con fallback `NULL` se una migration non è ancora sul DB.
- **Preview dal calendario fedele**: il localStorage del link `/preview/[id]` salva canale/formato, 10 media slot e metadata visuali; il fallback locale non trasforma più Facebook video/carousel/reel in Instagram post.
- **Renderer tutti formati**: `PostPreview` copre post, carousel, reel, story, video, pin, short e articolo per Instagram/Facebook/TikTok/Pinterest/LinkedIn/YouTube Shorts/Blog/Threads/X; video Facebook/X passano nel player video, caroselli senza immagini mostrano le slide AI, reel/story senza video mostrano storyboard da `scenes_json`.
- **Validazioni**: `git diff --check` ✅, `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅, `npm run migrate:dry` ✅.

### ✅ Feature 2026-07-07 tarda notte — upload MP4 manuale reel/video
- **Backend upload**: `/api/assets/upload` accetta immagini già supportate + `video/mp4` (`.mp4`) fino a 100MB; ritorna `kind: 'video'` e mantiene il limite immagini a 8MB.
- **Playback proxy**: `/api/assets/file/[clienteId]/[filename]` serve `.mp4` con `Content-Type: video/mp4`, `Accept-Ranges` e risposte `206` per anteprime HTML video affidabili.
- **UI Social/Piano/Calendario**: input file accettano foto + MP4; le griglie mostrano `<video>` per MP4; il calendario può sostituire `link_media_1..10` con MP4 e marca `media_type='video'` quando carichi un video.
- **AI bridge sicuro**: gli MP4 restano salvati/assegnati come media finali, ma non vengono inviati ai provider come `image input`; la vision riceve solo immagini compatibili.
- **Validazioni**: `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅.

### 🔴 HIGH ancora aperti dopo questa continuation
- **Publish #4 da riverificare**: `resolveBlotatoTarget()` già rifiuta Facebook senza Page e imposta privacy TikTok, ma va verificato contro contratto reale Blotato.
- **Security #13-#16/#18/#19**, **Health/Monitoring #20/#22/#23/#24**, **AI #25/#26 + #27 parziale** restano aperti.
- **Nota working tree**: `app/page.tsx` + `app/home.module.css` contengono modifiche landing/pacchetti di Claude; non mischiarle con commit Stripe/Blotato se si vogliono commit atomici.

### 🛠️ Task per Codex — HIGH residui go-live (28 blocker)

Priorità dall'audit. Ordinare per business impact + accessibilità dei file.

#### Publish pipeline (5 blocker)
1. **Publish lock atomico**: `publish_lock_id` esiste già nello schema ma non è usato. Aggiungere `UPDATE calendario SET publish_lock_id=<uuid> WHERE id=$1 AND publish_lock_id IS NULL RETURNING id` prima di `POST /v2/posts`; se 0 righe → skip (post già in fly). Elimina race duplicati.
2. **Sync manuale Blotato non persiste errori**: `app/api/data/blotato-sync/route.ts` catch write `errore_tecnico` + `log_pubblicazioni`. Ora silenzioso in DB.
3. **Blotato 2xx senza id → skipped**: `lib/publish/schedule.ts` linea 157-160 attualmente `return { status: 'skipped' }`. Cambiare in `throw new Error('Blotato ok senza id: contratto rotto')` + allargare fallback id (`postId`, `data.id`, `submission_id`, `scheduled_id`, `post.id`).
4. **`resolveBlotatoTarget` parziale su TikTok/Facebook**: rifiutare (throw) se mancano `pageId`/`privacyLevel` invece di ritornare target incompleto. `lib/blotato-accounts.ts`.
5. **Cross-post per-canale**: `app/api/generate/content/route.ts` copia caption/hashtag verbatim su ogni `alsoCanali`. Tagliare caption a 280 per X, droppare hashtag oltre limite LinkedIn (5-10), short-circuit combo incompatibili (es. IG post→TikTok senza video). Aggiungere `lib/social-adapt.ts` con `adaptForPlatform(row, canale)`.

#### Stripe (7 blocker)
6. **Idempotency event.id**: migration `025_stripe_webhook_events.sql` con tabella `stripe_webhook_events(event_id text primary key, ...)`. In `app/api/stripe/webhook/route.ts` `INSERT ... ON CONFLICT DO NOTHING` come primo step; se già processato → return 200 duplicato.
7. **Timestamp tolerance webhook**: `lib/stripe.ts::verifyStripeWebhookSignature` — aggiungere `if (Math.abs(nowSeconds() - t) > 300) return false` per rejectare replay attack.
8. **ON CONFLICT sovrascrive cliente_id**: nella query upsert `stripe_subscriptions` togliere `cliente_id` dalla `SET` list. Un webhook con `metadata.cliente_id` malformato potrebbe cambiare la subscription di un altro tenant.
9. **`current_period_end`/`paid_at` sempre null**: valori arrivano da Stripe come stringhe unix. Normalizzare con `new Date(v * 1000).toISOString()` prima di persist. `lib/stripe.ts` + `app/api/stripe/webhook/route.ts`. Rompe UI dashboard cliente `il-mio-piano`.
10. **`Idempotency-Key` header su Checkout**: `lib/stripe.ts::createStripeCheckoutSession` aggiungere `Idempotency-Key: sha256(cliente_id + timestamp_ora)` per evitare doppio charge se il POST fallisce.
11. **Timeout/retry stripeRequest**: wrap con `AbortController` timeout 15s + 1 retry su `AbortError`. Ora appende in un fetch senza timeout.
12. **`livemode` check webhook**: verificare `event.livemode === true` in prod (o `false` in dev). Prefisso `sk_live_` in `STRIPE_SECRET_KEY` in prod. Guardia contro test key in prod.

#### Security (7 blocker)
13. **`preview_token` opaco**: `id_contenuto` enumerabile (`C{timestamp_b36}_{n}_{n}`) su `/preview/[id]` pubblico. Aggiungere colonna `preview_token uuid` in migration + generare in `generate/content|plan` + rate-limit + sostituire URL preview con token.
14. **Mask secret keys in `/api/data/settings`**: attualmente `GET` ritorna `blotato_api_key` in chiaro. Mask lato server (`****last4`) tranne quando l'utente sta editando (POST). Considera AES-GCM at-rest.
15. **`/api/auth/register` rate-limit + captcha**: già rate-limit generico 10/IP/5min, ma serve captcha (hCaptcha/Turnstile) contro botnet. Env `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.
16. **SSRF `isPrivateHost` lessicale**: in `lib/media-validate.ts` e `scrape-contacts` — ora blocca solo se hostname *sembra* privato. Fare DNS resolution reale + blocklist IPv4 privati/link-local (10./172.16./192.168./127./169.254.) + IPv6 (::1, fc00::/7, fe80::/10) prima E dopo redirect.
17. ✅ **CHIUSO — Preview shared ignora `slides_json`/`scenes_json`**: `app/api/data/preview/route.ts` include campi visuali/scene/slide + 10 slot media, e `PostPreview` usa questi dati come fallback visivo per reel/caroselli/story/video.
18. **`consenso_utilizzo` hardcoded `'SI'`**: `app/api/generate/content/route.ts` linea 610 mette `'SI'` in automatico quando ci sono media. Serve checkbox esplicita in UI upload + gate `publish` se `!= 'SI'` per URL esterni (rischio copyright).
19. **Sync manuale Blotato senza signature**: `app/api/webhook/blotato/route.ts` in demo mode accetta senza firma. Fail-closed se `NODE_ENV=production` anche con demo flag.

#### Health/Monitoring (5 blocker)
20. **Health torna sempre 200**: `/api/system/health` — cambiare `status: 'needs_setup'` a HTTP 503 se DB down / migration mancante. Split `/api/system/health` (public 200/503 minimale) vs `/api/system/health/full` (admin-only con dettagli).
21. **Stripe checks in health**: aggiungere `checks.stripeSecret` + `checks.stripeWebhook` + `checks.publishEnabled` (informativo). Ora health verde con Stripe rotto.
22. **Sentry + logger strutturato**: integrare `@sentry/nextjs` (init con `SENTRY_DSN` env), wrap webhook Stripe/Blotato con `Sentry.captureException`. `lib/logger.ts` JSON con `x-request-id` middleware.
23. **Email notifica onboarding**: integrare Resend o Postmark. Su `POST /api/auth/register` → email conferma + notifica admin. Su `PATCH activate` → email cliente "attivato + link login".
24. **Registrazione senza gate Stripe**: implementare uno dei due flow: (a) checkout Stripe pre-activate (cliente paga, poi admin approva), (b) admin activate → auto-genera Stripe Checkout session e invia link email al cliente. Ora clienti attivati senza pagamento.

#### AI generation (4 blocker)
25. **Carosello 3-5 slide non validato hard**: `app/api/generate/content/route.ts` dopo `extractJSON` — se `formato='carousel'` e `slides.length < 3 || > 5` → retry con prompt "riprova con esattamente N slide". `lib/social-config.ts` ha già i limiti.
26. **`extractJSON` silenzia troncamento**: `lib/ai.ts` — se il JSON è chiuso a graffe forzate, ritornare `{ data, truncated: true }`. Chiamante fa retry con `maxTokens*1.5` o modello con output maggiore.
27. 🟡 **PARZIALE — Upload video**: MP4 manuale implementato (`video/mp4`, `.mp4`, cap 100MB) su upload route + UI Social/Piano/Calendario + preview video. Restano eventuali estensioni future: `webm/mov` e presigned direct-to-S3 per upload molto grandi.
28. **Dashboard cliente `il-mio-piano` bug date**: `current_period_end`/`paid_at` timestamptz castato a string in `app/api/data/il-mio-piano/route.ts` → sempre `null` in UI. Normalizzare con `instanceof Date ? toISOString() : String(v)`. Correlato al #9.

### ⚠️ Da configurare fuori codice (Render)
- 🔴 `ADMIN_EMAIL` + `ADMIN_PASSWORD` (≥8 char) — **deploy fallisce senza dopo `d55bc30`**
- 🔴 `BLOTATO_API_URL=https://backend.blotato.com` (rimuovi `api.blotato.com` se già impostata)
- 🔴 `NEXT_PUBLIC_DEMO_MODE=false` esplicito
- 🟡 `STRIPE_SECRET_KEY` (sk_live_) + `STRIPE_WEBHOOK_SECRET` + webhook Stripe → `/api/stripe/webhook` con eventi checkout.session.completed, customer.subscription.*, invoice.*
- 🟡 `STORAGE_REGION` corretta per B2 (es. `us-west-004`)
- 🟢 `CRON_SECRET` (per prospect-scraper quando abilitato)
- 🟢 `SENTRY_DSN` (dopo integrazione #22)
- 🟢 Migration `024_visual_effects.sql` + `025_stripe_webhook_events.sql` da applicare su prod

### 📌 Handoff rapido per Claude/Codex — prossimo passaggio
- **8 CRITICAL chiusi. HIGH chiusi in working tree da Codex**: #1, #2, #3, #5, #6, #7, #8, #9, #10, #11, #12, #21, #28. Restano #4 da verificare e #13-#20/#22-#27 da implementare.
- **Il DB prod deve ricevere migration 024 + 025** prima del prossimo deploy pubblico.
- **La UI per il flag effetti virali NON esiste ancora**: aggiungere in `/dashboard/piano` un selector "Stile visual: 🔥 Trending / ✨ Premium / ⚪ Minimal / 📰 Classico" + checkbox "Usa effetti virali del momento" che passa `visual_preset` + `use_trending_effects` a POST `/api/generate/{content,plan}`.

### 🤖 Nota operativa per OpenCode
- **Prima azione**: rileggere `HANDOFF.md` da questa sezione, poi eseguire `git status --short` e separare commit atomici. Non mischiare landing/copy con Stripe/Blotato.
- **Commit suggerito 1 — publish/Stripe HIGH**: includere `app/api/data/blotato-sync/route.ts`, `app/api/generate/content/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/system/health/route.ts`, `app/api/data/il-mio-piano/route.ts`, `lib/publish/schedule.ts`, `lib/stripe.ts`, `lib/social-adapt.ts`, `db/migrations/025_stripe_webhook_events.sql`, `HANDOFF.md`.
- **Commit suggerito 2 — landing pricing copy**: includere solo `app/page.tsx` + `app/home.module.css` se il cliente conferma la nota visuale cumulativa pacchetti.
- **Non committare salvo richiesta**: `daily_content_options_2026-07-04.md` e `daily_content_options_2026-07-04_EMAIL_DRAFT.txt` sono output generati/contenuto editoriale, non codice app.
- **Validazioni minime prima di passare mano**: `git diff --check`, `npm run lint`, `npm run build`, `npm run migrate:dry`; poi smoke manuale `/dashboard/pagamenti`, `/dashboard/il-mio-piano`, `/api/system/health`.
- **Prossimi HIGH consigliati**: #13 preview token opaco, #14 mask secret settings, #17 preview `slides_json/scenes_json`, #20 health 503/full admin split, #25/#26 retry/validazione AI.

---

## 🆕 Sessione 2026-07-07 (Claude CLI) — copy pro, pacchetti cumulativi, fix generazione/preview

### 📌 Handoff rapido per Claude — prossimo passaggio
- **Non rifare da zero**: dashboard cliente e pagamenti Stripe sono già implementati in working tree. Verificare e committare in modo atomico.
- **Prima del commit**: controllare `git diff` e NON includere modifiche preesistenti/non correlate se non volute (`app/home.module.css`, `app/page.tsx`, `daily_content_options_2026-07-04*` risultavano già sporchi).
- **Validazioni già passate da Codex**: `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅, `npm run migrate:dry` ✅, smoke headless su `/dashboard/il-mio-piano` e `/dashboard/pagamenti` ✅.
- **DB locale Neon**: migration `023_stripe_payments.sql` già applicata nel DB usato da questa sessione; su Render/produzione va applicata se non presente.
- **Credenziali test**: admin `admin` / `1234567`; cliente non-admin `cliente` / `1234567`, associato solo a `Pino` come viewer per test multi-tenant.
- **Da configurare fuori codice**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, webhook Stripe verso `/api/stripe/webhook`, più env AI/R2/Blotato indicati da `/api/system/health`.

### Landing (commit `05ce34a` + modifiche working tree non ancora committate)
- **Copy in italiano professionale (anti-slop)**: hero full-stack "Social, siti ed e-commerce gestiti dall'AI. Il controllo resta tuo"; sezione storia "Perché esistiamo"; blog dedicato (sotto i canali); glossario termini (SEO/GEO/UTM/omnichannel/funnel/cross-post…); canali = **8 social** (Blog separato); incipit dei canali variati.
- **Pacchetti a scala cumulativa**: ogni tier mostra "Tutto di X, più:" e le `features` elencano solo i differenziali (nuovo campo `includeDa` in `lib/pacchetti.ts`, fonte unica). Nuovo tier **Slancio €790** (tra Presenza e Crescita). Layout pricing **3×2** (landing + /servizi). Canoni validati invariati (390/590/790/1.090/1.690/2.590). ⚠️ **Slancio €790/setup €390 = proposta da validare** con l'utente.
- Fix nome "E-commerce" a capo (`white-space: nowrap`).

### Fix prodotto / generazione (working tree — DA COMMITTARE)
- **Carosello 5-7 → 3-5 slide** (`app/api/generate/content/route.ts` prompt `instagram:carousel` + `lib/social-config.ts`). NB: ancora **nessuna validazione hard** del numero slide post-generazione (affidato al prompt).
- **Errore story "No JSON object found"**: `extractJSON` (`lib/ai.ts`) reso robusto — toglie code-fence ```json, isola l'oggetto bilanciando le graffe, e **chiude i JSON troncati**. ⚠️ Se un modello free tronca pesantemente, MANCA ancora un **retry con più token** per la story.
- **Preview `/preview/[id]`**: mostrava **9 piattaforme hardcoded** (ALL_PLATFORMS) → ora mostra il **contenuto REALE** (canale+formato dal DB), 1 card. `PostPreview` carosello → **galleria swipe** di tutte le foto (`link_media_1..7`); la preview ora carica tutti gli slot media. Risolve l'incongruenza calendario↔preview e la falsa impressione "genera tutto".
- **Back-to-top** aggiunto a tutte le dashboard (`app/dashboard/layout.tsx` → `<BackToTop />`).

### 🎯 TASK per OpenCode/Codex — DASHBOARD CLIENTE (client-facing) — poi Claude CLI verifica
Costruire una **vista cliente** dove il cliente finale vede in un unico posto:
1. **Pacchetto attivo**: nome + canone + features incluse. Join `clienti.piano` con `lib/pacchetti.ts`. ⚠️ `clienti.piano` usa `free/pro/agency/enterprise` — va **mappato agli slug reali** (`starter/presenza/slancio/crescita/ecommerce/dominio`) oppure aggiungere colonna `pacchetto_slug` su `clienti` (migration).
2. **Quota contenuti del mese**: inclusi (`clienti.contenuti_mese`) vs usati. Query: `COUNT(*)` su `calendario WHERE cliente_id=$1 AND data_pubblicazione nel mese corrente AND status NOT IN ('BOZZA','ERRORE')`. UI barra "8/20 usati". ⚠️ manca `contenuti_usati_mese` e il reset a inizio mese → calcolarlo a runtime.
3. **Report live**: riusare `/api/data/report` + `/dashboard/analytics` (reach/engagement, inseriti a mano oggi).
4. **Pagamenti (FASE 2, NON ora)**: effettuati + prossima scadenza. **Non esiste NULLA** (nessuna tabella/gateway). Richiede nuova tabella `pagamenti` + eventuale Stripe. Per la v1 lasciare placeholder/ometterla.

**Riusabile**: `user_client_access` (ruoli owner/admin/editor/viewer) + `requireClienteAccess()` (`lib/auth-utils.ts`) + `ACTIVE_CLIENTE_COOKIE`; `app/dashboard/layout.tsx`; `lib/pacchetti.ts`. **Da creare**: pagina vista cliente (es. `app/dashboard/il-mio-piano/`), endpoint quota, mapping piano→pacchetto, (fase 2) tabella pagamenti.
**Vincoli**: no metriche finte; multi-tenant sicuro; demo mode funzionante (`isDemo()` → dati finti); `npm run build` verde.

### ✅ Dashboard cliente — completata da Codex (2026-07-07)
- **Pagina client-facing**: `app/dashboard/il-mio-piano/page.tsx`, voce sidebar "Il mio piano" in `components/Sidebar.tsx`.
- **Endpoint tenant-safe**: `app/api/data/il-mio-piano/route.ts` usa `requireAuth()` + `requireClienteId()` (cookie cliente attivo + `requireClienteAccess`) e solo `q()` Neon. Demo mode funziona senza DB con dati finti coerenti.
- **Quota contenuti mese**: calcolata runtime da `calendario` nel mese corrente con `status NOT IN ('BOZZA','ERRORE')`; quota inclusa da `clienti.contenuti_mese`.
- **Mapping scelto (opzione b, no migration)**: aggiunto in `lib/pacchetti.ts` (`free→starter`, `pro→crescita`, `agency→ecommerce`, `enterprise→dominio`; se `clienti.piano` è già uno slug reale viene usato direttamente). La quota resta sempre quella reale del DB, quindi eventuali override contrattuali via `contenuti_mese` vincono sul testo marketing.
- **Report live**: la pagina chiama `/api/data/report` e mostra KPI/sintesi, con CTA a `/dashboard/analytics` per i dettagli; nessuna metrica inventata.
- **Pagamenti**: la card mostra dati reali Stripe/fatture quando presenti; degrada a stato vuoto leggibile se non ci sono pagamenti.
- **Validazioni**: `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅, `npm run migrate:dry` ✅.

### ✅ Pagamenti Stripe — Fase 2 completata da Codex (2026-07-07)
- **Schema DB**: `db/migrations/023_stripe_payments.sql` aggiunge `clienti.stripe_customer_id`, `clienti.stripe_subscription_id`, tabella `stripe_subscriptions` e tabella `pagamenti` per fatture/storico.
- **Backend Stripe senza SDK extra**: `lib/stripe.ts` usa REST Stripe con `STRIPE_SECRET_KEY`, crea Checkout subscription mensile, Customer Portal e verifica webhook HMAC con `STRIPE_WEBHOOK_SECRET`.
- **Admin dashboard**: `app/dashboard/pagamenti/page.tsx` + voce sidebar admin-only. Lista clienti con ricerca/filtri (testo, stato cliente, subscription, pagamento), stato Stripe/schema, abbonamento, ultimo pagamento, link fattura/PDF, azioni Checkout/Portal.
- **API admin**: `app/api/admin/pagamenti/route.ts` protetta da `requireAdmin()`. Demo mode coerente; se schema non migrato risponde `needs_migration:true`.
- **Webhook Stripe**: `app/api/stripe/webhook/route.ts` gestisce `checkout.session.completed`, `customer.subscription.*`, `invoice.*` e upserta subscription/pagamenti tenant-scoped.
- **Vista cliente aggiornata**: `app/api/data/il-mio-piano/route.ts` e `app/dashboard/il-mio-piano/page.tsx` mostrano stato subscription, rinnovo, ultimo pagamento e link fattura/PDF quando presenti; fallback "In arrivo" se migration non applicata.
- **Env documentate**: `.env.example`, `.env.local.example`, `render.yaml` con `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`.
- **Debug finale fallback silenziosi**: `app/api/stripe/webhook/route.ts` ora risponde 422 se un evento supportato non risolve `cliente_id` (niente ignore muto); eventi non supportati tornano `ignored:true` con `event_type`. `app/api/data/il-mio-piano/route.ts` espone `needs_migration:true` se lo schema pagamenti manca e la UI lo mostra chiaramente. `app/api/system/access` torna `{enabled:false}` 200 quando il login hint è disattivo, evitando 404 rumorosi in console.
- **Validazioni**: `npm run lint` ✅ (0 errori, 7 warning storici), `npm run build` ✅, `npm run migrate:dry` ✅ (vede `023_stripe_payments.sql`), smoke Playwright headless ✅ (`/dashboard/il-mio-piano`, `/dashboard/pagamenti`, zero console error/404), webhook Stripe test ✅ (firma invalida 400, evento supportato senza cliente 422).
- **Da fare su Render/Stripe**: configurare env Stripe, applicare migration, creare webhook Stripe verso `/api/stripe/webhook` con eventi checkout/session, subscription e invoice.

---

## 🆕 Sessione 2026-07-06 (Claude CLI) — landing premium, funnel vendita, security, fix mobile

Working tree su `main`, `build` verde ad ogni commit. Deploy live verificato (`health.mode=production`). Ultimi commit chiave: `372ada5` (servizi auto-fit), `7ba0027` (5 servizi + capacità 12), `33ca153` (pacchetti fonte unica), `d1e2ed1`, `bc19e50`, `f9f584f`, `1c0648a`.

### Landing — servizi attivi/in-arrivo + effetti + torna-su (ultimissimo blocco)
- **Servizi separati per disponibilità**: sezione "Servizi" = 3 ATTIVI (Social, Siti & E-commerce, Visibilità & Crescita); nuova sezione **"In arrivo"** (pannello scuro premium con aurora) = Voce AI & Reception + Automazione & Agenti AI, badge "Accesso anticipato" + CTA "Entra in lista d'attesa" (WhatsApp). Onestà SEO: `OfferCatalog` in `JsonLd.tsx` = solo i 3 attivi.
- **Nuovi effetti** (`components/RevealOnScroll.tsx`, `CountUp.tsx`, aurora CSS): scroll-reveal su intro+griglie (`[data-reveal]`, no-FOUC via `html[data-reveal-ready]`), count-up numeri hero, aurora rotante su "In arrivo". Tutti reduced-motion-safe.
- **`components/BackToTop.tsx`**: pulsante "torna su" flottante.
- Contesto pacchetti/servizi confermato dall'utente: **tutti e 5 i servizi sono offerti** (social+siti+visibilità attivi ora; voce AI/automazione in arrivo, voce AI già su richiesta con partner Vapi/Synthflow). Lead generation nei pacchetti = oggi **simulato** (da rifare reale).

### Landing — 5 servizi aziendali + capacità complete (blocco precedente)
- **`socialwebautomation.com` ("Aether") = stessa azienda.** La landing ora rappresenta l'INTERA offerta. Nuova sezione **"Servizi"** (`#servizi` in `app/page.tsx`, const `SERVIZI`): 5 pilastri IT, brand invariato "Social Automation", raggruppati **Automazione** (Agenti AI, Voce AI & Reception) + **Strategia & Crescita** (Siti & E-commerce, Social automatizzato, Visibilità & Crescita). Card numerate 01-05, `.serviceGrid` auto-fit (`app/home.module.css`).
- **Sezione "Cosa include"** (ex "Cosa fa", id `#capacita` invariato): capacità **espansa 7→12** con l'inventario reale del prodotto: + Blog, Campagne ADS, Scoperta brand, Catalogo prodotti, Immagini AI, Documenti legali GDPR. **Lead generation resta** (testo più chiaro). Linguaggio semplice per non esperti, niente gergo/metriche finte.
- **Onestà**: le 12 capacità sono feature reali collegate a DB/backend TRANNE **Lead generation = SIMULATO** (genera lead con temperatura, non scraping live — vedi memoria `lead-research-rebuild`; da rifare reale con search API). I 5 pilastri sono servizi offerti dall'azienda: Social+Visibilità coperti dall'app, Automazione/Voce AI/Siti erogati come servizio (non schermate del pannello). L'utente conferma: **tutti e 5 i servizi sono offerti davvero**.
- **SEO/GEO**: `components/JsonLd.tsx` — `OfferCatalog`/5×`Service`, descrizioni Organization/SoftwareApplication allargate, +1 FAQ "Quali servizi offre", **fix `offerCount` 3→5**. `app/layout.tsx` metadata allargati. HTML semantico (`aria-labelledby`, `h2 id`, `<article>`).

### Pacchetti — fonte unica (anti-drift)
- **`lib/pacchetti.ts`** = 5 pacchetti (slug/nome/eyebrow/prezzo/setup/sottotitolo/features/consigliato) importati da landing + servizi + register + API. Prima 3 fonti separate divergenti (landing 3 vs servizi/register 5, nomi diversi). Ora **stessi 5 ovunque**: Starter €390 · Presenza €590 · Crescita €1.090 ⭐ · E-commerce €1.690 · Dominio €2.590. Setup: incluso/290/490/990/1.490.

### Fix mobile + AI + sicurezza + publish (blocchi precedenti della sessione)
- **Sicurezza** (audit, nessun GRAVE): rate-limit login+register (`middleware.ts`, 10/IP/5min), SSRF scraper `redirect:manual` (`scrape-contacts`), `apiError` non espone `Error.message` grezzo (ma fa passare i msg AI sanificati come 502). **`lib/base-url.ts` host-first** (x-forwarded-host validato): era env-first e con NEXTAUTH_URL=`social-automation.onrender.com` (dominio MORTO) le immagini davano 404 → generazione fallita. ⚠️ Immagini caricate PRIMA di questo fix hanno URL vecchio in DB → ricaricarle.
- **`PUBLISH_ENABLED`** (default false) disaccoppia pubblicazione dal demo (`lib/publish/schedule.ts`, `isPublishingLive()`): produzione reale SENZA pubblicare finché non pronto. `scheduleOnBlotato` ritorna `PublishOutcome` tipizzato (no fallback silenzioso).
- **Admin sicuro**: `scripts/ensure-admin.mjs` (da `ADMIN_EMAIL`/`ADMIN_PASSWORD`, disabilita `admin/1234567`). **Ruolo in sessione** + `AuthProvider` → voce sidebar "Registrazioni" solo admin. Tasto landing nella top-bar mobile.
- **Mobile/UX**: ordine prezzi, icone azioni calendario (Info vs Eye + title + "Valuta"), card calendario `flex-wrap`, "Crea contenuti"→`/dashboard/piano`, hero "controllo" non più tagliata, "Vedi demo live"→"Come funziona" (demo costi eccessivi), CTA "Ricevi 1 contenuto gratis" (WhatsApp), link "Pacchetti"→`/servizi#pacchetti`, clienti 401→redirect login.

### Registrazione self-serve + provisioning (blocco precedente)
- `/register` (pacchetto preselezionato) → account `pending` → `/dashboard/registrazioni` (admin, requireAdmin) → **Attiva crea il workspace** (`clienti` + `user_client_access` owner). Gate login fail-closed. Migration `022_onboarding_signup.sql`.

### 🎯 PROSSIMA SESSIONE — Upgrade landing "premium elite"
Obiettivo utente: **landing premium, elite, professionale, moderna** (livello agenzia top). Stato attuale già buono (editoriale Fraunces, cream/forest/gold, TiltCard 3D, orbs, scroll-reveal, count-up, aurora, back-to-top) ma da portare a livello superiore. Aree su cui lavorare:
- **Type scale & spacing**: ritmo verticale più arioso, gerarchia più netta, micro-tipografia (tracking, leading) rifinita.
- **Hero**: valutare visual più ricco/animato, eventuale immagine/mockup reale, motion più curato.
- **Card & sezioni**: shine/spotlight su hover, bordi gradient animati, ombre multi-layer più profonde, glassmorphism dove serve.
- **Coerenza premium** anche su `/servizi` e `/register` (oggi la landing è la più curata).
- **Bug noti da fixare nel pass premium**:
  - Prezzi: su card strette (`auto-fit`) il suffisso `/mese` va a capo/sborda su "€1.090/mese" e "€1.690/mese" (Crescita/E-commerce) — vedi `.priceAmount` in `home.module.css`, serve `white-space: nowrap` o size responsive.
  - Verifica visiva effetti (scroll-reveal/aurora/count-up) mai fatta a schermo (Chrome ext era giù) — controllare il movimento e tarare.
- Considerare: dark mode, sezione "come lavoriamo"/case study, loghi/prova sociale (quando disponibili, niente finti), favicon/OG image curati.
- Il pulsante `BackToTop.tsx` usa stile inline — se si vuole coerenza totale, spostarlo su CSS module.

### ⚠️ TODO utente (env Render + azioni)
- 🔴 `ADMIN_EMAIL`+`ADMIN_PASSWORD` (default `admin/1234567` ancora attivo, non aprire al pubblico).
- 🔴 Lead reale (search API) — sostituisce il simulato.
- 🟡 `BLOTATO_API_KEY`, `PUBLISH_ENABLED=true` quando pronti a pubblicare. `NEXT_PUBLIC_DEMO_MODE=false` già fatto. Ricaricare immagini vecchie.
- Vedi `GO_LIVE_CHECKLIST.md`, `ANALISI_CONCORRENZA_2026.md`.

### Landing & prezzi
- **Landing `/` ridisegnata premium** (nuovo `app/home.module.css`): stile editoriale Fraunces + palette cream/forest/gold, hero 3D tilt (`components/TiltCard.tsx`), orbs, motion. Coerente con `/servizi`.
- **`/servizi`**: fix impaginazione (pricing 5 card `auto-fit`, timeline metodo full-width titoli su 1 riga), scala testi ridotta (hero 118→76px), setup ridotti, blocco confronto valore "Non paghi i post. Paghi un sistema.".
- **Prezzi validati vs concorrenza reale 2026** (`ANALISI_CONCORRENZA_2026.md`): Doctor Web (€249/490/940), Basile (€590/890/1.290). Canoni **invariati** (390/590/1.090/1.690/2.590), **setup ridotti** (incluso/290/490/990/1.490). Strategia = valore, non prezzo. `PACCHETTI-VENDITA.md` allineato.

### Registrazione self-serve (onboarding con pacchetto)
- `/register` (`app/register/`) — pacchetto preselezionato da `?piano=`, form, stato `pending`. `POST /api/auth/register` (validazione + bcrypt cost 12 + insert `pending`).
- **Gate login fail-closed** (`lib/auth.ts`): entra solo `status='active'`; `pending`/`rejected`/altro bloccati con messaggio.
- **Approvazione admin**: `/dashboard/registrazioni` + `/api/admin/registrazioni` (requireAdmin). All'attivazione **crea il workspace** (`clienti` con piano/contenuti mappati dal pacchetto + `user_client_access` owner) — prima l'utente attivato entrava in pannello vuoto.
- Migration `022_onboarding_signup.sql`: `status/azienda/telefono/pacchetto/note` su `profiles` (esistenti → `active`).
- **Ruolo in sessione** (`lib/auth.ts` + `components/AuthProvider.tsx` SessionProvider): voce sidebar "Registrazioni" solo admin.
- CTA: hero/consulenza → WhatsApp (freddo); card pacchetti → `/register` (caldo). Split voluto (B2B: prima contatto, register per chi è deciso).

### Sicurezza / admin
- **Admin default**: `scripts/ensure-admin.mjs` (hook in `render-start`) crea admin reale da `ADMIN_EMAIL`/`ADMIN_PASSWORD` e **disabilita** `admin/1234567`. Env aggiunte in `render.yaml`.
- **Audit sicurezza** (nessun GRAVE): rate-limit su `/api/auth/callback/credentials` + `/api/auth/register` (10/IP/5min, `middleware.ts`); SSRF scraper `redirect:'manual'` + rivalida host (`scrape-contacts`); `apiError` non espone più `Error.message` grezzo sul 500.

### Publish disaccoppiato dal demo + no fallback silenzioso
- **`PUBLISH_ENABLED`** (default `false`): `isPublishingLive()` in `lib/publish/schedule.ts` = `!isDemo() && PUBLISH_ENABLED==='true'`. Permette produzione reale (registrazione/dati veri) SENZA pubblicare sui social finché non pronto.
- `scheduleOnBlotato` ritorna `PublishOutcome` tipizzato (`scheduled|dry_run|skipped`): calendario approve/blotato-sync surface lo stato reale (prima ritornava sempre `scheduled:true` → falso "pubblicato").

### Fix mobile + AI (fine sessione)
- Landing prezzi: rimosso `.priceCardFeatured { order:-1 }` → su mobile i prezzi restavano fuori ordine (1.090 prima di 390).
- Calendario: icona "Dettagli" era identica a "Preview" (entrambe `Eye`) → ora `Info`. Aggiunti `title` a tutti i pulsanti azione + label "Valuta" al pulsante AI-scoring (✨). Card: `flex-wrap` così le azioni vanno full-width sotto su schermo stretto (prima schiacciavano il testo a 1 parola/riga).
- Dashboard step "4. Crea contenuti": era hardcodato `/dashboard/social/instagram` → ora `/dashboard/piano` (genera per tutti i social, non solo IG).
- **`lib/ai.ts`**: (a) se la BYO key ha formato invalido MA esiste una key server, NON mostra più "Key Gemini/OpenRouter non valida" (fuorviante quando usi OpenRouter) — solo log; (b) `formatHttpError` slice 160→260 (tagliava a metà gli URL nei messaggi errore).
- `apiError`: fa **passare** i messaggi del bridge AI (già sanificati: "modelli sovraccarichi", ecc.) come 502 invece del 500 generico → l'AI-scoring mostra la causa reale.
- **⚠️ `lib/base-url.ts` — REGRESSIONE mia corretta**: avevo messo env-first (per sicurezza host-header), ma con `NEXTAUTH_URL` = dominio morto `social-automation.onrender.com` gli URL immagine finivano lì → **404 → l'AI non scaricava le foto → generazione falliva**. Ripristinato **host-first** (x-forwarded-host validato, Render lo imposta corretto), env fallback. ⚠️ Le immagini caricate PRIMA del fix hanno l'URL vecchio salvato in DB → vanno ricaricate.

### Ancora da fare (env utente su Render)
- 🔴 `NEXT_PUBLIC_DEMO_MODE=false` ✅ già fatto (health=production). `PUBLISH_ENABLED=false` (o assente).
- 🔴 `ADMIN_EMAIL` + `ADMIN_PASSWORD` (non ancora messe → default `admin/1234567` attivo, **non aprire al pubblico**).
- 🟡 `BLOTATO_API_KEY` (manca), `ANTHROPIC_API_KEY` (opz, hai OpenRouter+Gemini). Piano Render free = cold start.
- Vedi `GO_LIVE_CHECKLIST.md`.

---

## 🆕 Sessione 2026-07-03 (parte 2, sera) — storage reale, Gemini 2.5, interconnessioni UI, hardening

Working tree pulito, allineato con origin, `tsc`+`build`+`lint` verdi ad ogni commit. **OpenCode ha lavorato in parallelo** sui robustezza-piano (commit `4b1650b`→`d11584f`): timeout, 402 bridge, chunking, retry — tutti revisionati e corretti, integrati via rebase.

### 🟢 STORAGE IMMAGINI PERMANENTE — RISOLTO (era il blocco go-live #1)
- `lib/storage.ts` generico S3-compatible (non più solo R2). Supporta **bucket PRIVATO via proxy**: `STORAGE_PUBLIC_URL` assente → l'upload ritorna URL al nostro `/api/assets/file/…` che scarica da S3 con le credenziali e streama. Serve per **Backblaze B2 privato** (10GB free, no carta di credito — il bucket PUBBLICO su B2 richiede carta).
- **Configurato e TESTATO in produzione**: upload+download round-trip byte-identici. `health.r2Storage=true`. Le immagini ora **non spariscono più ai deploy**.
- Env su Render (già settate dall'utente): `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_REGION` (bucket privato → niente `STORAGE_PUBLIC_URL`). Fix `Content-Length` esplicito (B2 dà 411 senza).

### AI — provider e qualità
- **`GEMINI_API_KEY` su Render**: attiva vision gratis (Gemini vede le foto). Testato in prod (descrive dettagli reali della foto). È il modello di default consigliato — l'utente **resta su Gemini** (gratis), Claude solo se vuole premium.
- **Gemini 2.5 Flash** (65K output, 1M contesto) aggiunto come modello nativo free → **default per piano mensile/settimanale, blog, SEO audit** (il 2.0-flash cappa a 8192 e troncava i JSON grandi). Post brevi restano su 2.0-flash.
- **Cap output Gemini per-modello** (`lib/ai.ts`): 2.5-* → 65536, 2.0/1.5 → 8192 (fix regressione: OpenCode aveva alzato il budget a 12000/16000 che eccede il limite di 2.0-flash).
- **Anthropic reso davvero usabile**: model ID reali (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5-20251001` — prima `claude-sonnet-4-6`/`opus-4-7` inesistenti → 404) + vision (callAnthropic ora passa le immagini come blocchi base64).
- **Routing vision**: con foto caricata usa SOLO modelli vision (evita 404 "no image input"); errore azionabile se nessun vision disponibile.
- **Robustezza piano (OpenCode)**: timeout 90s (era 30s che abortiva i paid), bridge 402 "fewer max_tokens" (retry con token ridotti), chunking mensile in 4 blocchi paralleli + settimanale medium/high in 2, retry su malformed JSON con item/token dimezzati, insertCalendario con introspection colonne (`information_schema`).

### Nuove feature UI/flusso
- **Cross-post opt-in** (`generate/content` `also_canali[]`): nella pagina social spunti altri social → lo stesso contenuto è creato anche lì (id `C…-facebook`), ognuno approvabile a parte. Cross-post fallito ora esposto (`cross_post_failed[]`).
- **Selezione multipla formati** (checkbox + "Genera selezionati N") nella pagina social.
- **Piano mensile in 2 fasi**: param `fase` (1=sett.1-2, 2=sett.3-4) + 2 bottoni → richieste più corte, meno timeout, tieni la fase 1 se la 2 fallisce.
- **Foto prodotto → post**: selettore prodotto nella generazione usa le foto già caricate su quel prodotto (`link_img_1..3`) come media, senza ri-upload.
- **Badge REAL/DEMO nel calendario** (legge `dry_run` cliente) + banner esplicativo. **Tasto "Sincronizza Blotato"** nell'header (invia gli APPROVATO a Blotato).
- **Blotato API key per-cliente** (`lib/blotato-key.ts`, `getBlotatoKey`): ogni cliente il suo account Blotato, fallback env. Usata in schedule + visual + sync.
- **Blog pubblico multi-tenant** via dominio (`clienti.blog_domain`, migration 020, `lib/blog-tenant.ts`) — ogni cliente il suo sottodominio, host non mappato → niente articoli (mai "mostra tutti"). Export PDF articolo.
- **Preview condivisibile**: carica il contenuto reale dal DB (`/api/data/preview` pubblico) invece del localStorage → il link inviato mostra testi+foto veri. Niente più immagine demo finta se il contenuto non ha foto. Bottoni Indietro/Calendario/torna-su.
- **ComfyUI locale** (immagini AI gratis, `lib/comfy.ts` + `/api/generate/image`): SOLO in locale (come Ollama), richiede COMFY_CHECKPOINT. **Non testato** (ComfyUI non disponibile in sessione).
- **Eliminazione multipla** contenuti (bulk delete tenant-safe).

### Audit fallback silenziosi (2 tornate)
7 fallback silenziosi chiusi. Ultima tornata (5): formato non-nativo→template IG (warning), cross-post fallito (esposto), **seo-audit score mancante→0 salvato come reale** (ora `score_mancanti[]`, il più grave), product_id inesistente (warning), correzioni sanitizeItem del piano (contate ed esposte).

### ⚠️ Da testare LIVE (non fatto: quota Gemini free esaurita dai test)
- Piano **mensile** (e 2 fasi) con Gemini 2.5 Flash
- **Cross-post** facebook+threads (3 righe DB attese)
- **ComfyUI** locale (serve il Mac dell'utente con ComfyUI + checkpoint)

### 🔴 Restano per go-live (azione utente, no codice)
- **`BLOTATO_API_KEY`** (per-cliente in Impostazioni, o env globale) → abilita pubblicazione. Poi tasto Sincronizza + toggle `dry_run`→REAL.
- Dati brand SILKinCOM aggiornati (fatto). Prodotti: l'utente carica foto reali lui (bottone camera in `/dashboard/prodotti`).

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

Tutto pushato su `main` (`b9a9674`, `96b946f`, `8a5d074`, `f7ebc1a`, `2d4c7cf`, `fee3fde`, +blog multi-tenant), `tsc`+`build`+`lint` verdi ad ogni commit.

### Blog pubblico multi-tenant reale (fine sessione)
Il cliente ha 2 clienti reali (SILKinCOM, Pino) — la soluzione precedente (`BLOG_PUBLIC_CLIENTE_ID`, una env unica) supportava un solo blog pubblico alla volta. Sostituita con risoluzione dal dominio:
- **Migration 020**: `clienti.blog_domain` (text, unique parziale su non-null).
- **`lib/blog-tenant.ts`**: `resolveBlogClienteId()` legge l'Host header della richiesta (`next/headers`) e cerca il cliente con quel `blog_domain`. Nessun match → `null`, pagina blog vuota con messaggio "Blog non configurato" — **mai** fallback a "mostra tutti i clienti" (era esattamente il bug da evitare).
- **`app/blog/page.tsx` + `app/blog/[slug]/page.tsx`**: usano `resolveBlogClienteId()` invece dell'env fissa.
- **`/dashboard/clienti/[id]`**: nuova card "Blog pubblico" — campo dominio + salva (`PATCH /api/data/clienti`, nuovo endpoint con validazione formato dominio + check duplicati cross-cliente).
- **Testato**: Host header diversi in locale (`blog.silkincom.test` → risolve SILKinCOM; host non mappato → blocca subito). Valore di test ripulito dal DB dopo verifica.
- **Resta da fare (utente)**: per ogni cliente che vuole il blog pubblico, aggiungere il dominio custom su Render (Settings → Custom Domains) + DNS CNAME, poi settare lo stesso dominio in `/dashboard/clienti/[id]`.

### Eliminazione multipla + storage generico + audit fallback
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
- 🔴 **Cross-tenant**: `/blog` pubblico leggeva TUTTI i clienti senza filtro, con rischio slug-hijack (`unique` è `(cliente_id, slug)`, non solo `slug`). Fix iniziale: scoping via env `BLOG_PUBLIC_CLIENTE_ID`. **Sostituito poi** (stessa sessione, vedi sotto) da risoluzione multi-tenant reale via dominio — l'env singola non reggeva con più clienti.
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
- [x] **Blog pubblico multi-tenant reale**: sostituito `BLOG_PUBLIC_CLIENTE_ID` (env unica, un solo cliente alla volta) con risoluzione dal dominio della richiesta (`lib/blog-tenant.ts`, migration 020 `clienti.blog_domain`). Ogni cliente ha il proprio sottodominio (es. `blog.silkincom.com`), configurabile da `/dashboard/clienti/[id]`. Host non mappato → nessun articolo mostrato (fail-safe, mai "mostra tutti"). Testato con Host header diversi in locale. **Resta da fare (utente)**: aggiungere i domini custom su Render (Settings → Custom Domains) + DNS CNAME verso il servizio, per ogni cliente che vuole il blog pubblico.
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

---

## 19. Handoff Per Claude Code — Commit + Push Domani (05/07/2026)

Stato lasciato da Codex il 04/07/2026:
- Branch corrente: `main`.
- Modifiche finali **non committate** nel working tree.
- Il tentativo di commit/push da Codex è stato bloccato perché `.git` era in sola lettura nel sandbox e l'escalation è stata rifiutata.
- L'utente ha chiesto esplicitamente: far committare e pushare a Claude domani, restando su `main`.

### Scope delle modifiche da committare
- Estensione media slot da `link_media_1..7` a `link_media_1..10`.
- Migration additiva/idempotente: `db/migrations/021_media_slots_8_10.sql`.
- Fallback schema silenziosi e robusti tramite nuovo helper `lib/db-schema.ts`.
- Generazione piano: foto distribuite una sola volta, niente riciclo nascosto; flag `images_insufficient` e `carousel_underfilled`.
- Route preview/approval/visual/image/calendario tolleranti se il DB non ha ancora `link_media_8..10`.
- Landing page aggiornata con hero 3D, `HeroScene`, `TiltCard` e animazioni CSS.

### Validazioni già eseguite da Codex
- `npm run lint` ✅ 0 errori, 7 warning preesistenti non legati a questo giro.
- `npm run build` ✅ build production ok, 55 pagine generate.
- `npm run migrate:dry` ✅ vede anche `021_media_slots_8_10.sql`.
- `npm audit --audit-level=moderate` ✅ 0 vulnerabilità.
- `bash scripts/smoke-test.sh http://localhost:3000` ✅ 30 PASS / 0 FAIL.
- `git diff --check` ✅ nessun whitespace issue.
- `npm run prod:check` eseguito: segnala env locali mancanti (`DATABASE_URL`, auth secret, AI key), atteso fuori produzione.

### Comandi consigliati per Claude
1. Verificare stato:
   ```bash
   git branch --show-current
   git status --short
   git diff --stat
   ```
2. Restare su `main` come richiesto dall'utente. Se non è su `main`, chiedere conferma prima di cambiare.
3. Rilanciare almeno:
   ```bash
   npm run lint
   npm run build
   npm run migrate:dry
   ```
4. Commit diretto su `main`:
   ```bash
   git add -A
   git commit -m "stabilizza media e fallback schema"
   git push origin main
   ```
5. Dopo push: controllare GitHub Actions/Render deploy e `/api/system/health`; applicare migration reale solo se `latestMigrationApplied=false`.

### Attenzioni
- Non fare `git reset`, non scartare modifiche locali.
- Non reintrodurre Supabase/n8n.
- Non nascondere errori critici: fallback sì, ma sempre con `schema_fallback`, `warning`, `scheduled:false` o log leggibile.
- Prima del go-live resta da configurare `BLOTATO_API_KEY`; senza quella autopublish reale non è vendibile end-to-end.

*Fine handoff. Non reintrodurre Supabase o n8n. Mantieni la demo mode funzionante.*
