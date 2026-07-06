# Go-Live Checklist — Social Automation V2

**Ultimo aggiornamento:** 2026-07-06
Deploy: Render service `social-automation-v2` (deploya da `origin/main`).

Legenda: 🔴 blocca il go-live · 🟡 consigliato · ⚪ opzionale

---

## 1. 🔴 Portare il codice online

Tutte le feature (landing premium, prezzi, registrazione self-serve, provisioning,
gate login, gating admin) sono sul branch **`feat/landing-onboarding`**, NON su `main`.

- [ ] Apri e mergia la PR:
      https://github.com/Marco26-hub/social-media-manager/pull/new/feat/landing-onboarding
- [ ] Il merge su `main` fa partire il deploy Render in automatico.
- [ ] `preDeployCommand: npm run migrate` applica la migration `022` (colonne onboarding).

## 2. 🔴 Env di produzione su Render (Dashboard → Environment)

Queste sono `sync: false` in `render.yaml` → vanno inserite a mano.

| Env | Serve per | Senza |
|---|---|---|
| `DATABASE_URL` | Neon Postgres | Registrazione in demo (non salva), login demo |
| `NEXTAUTH_URL` | URL pubblico (https://…onrender.com) | Login/redirect rotti |
| `NEXT_PUBLIC_SITE_URL` | SEO/sitemap/link | Link assoluti errati |
| `ADMIN_EMAIL` + `ADMIN_PASSWORD` | Admin reale (vedi §3) | Resta il default insicuro |
| `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` | Generazione AI | Contenuti non generano |
| `BLOTATO_API_KEY` | Autopubblicazione | Publishing non opera |
| `STORAGE_*` (endpoint/key/secret/bucket/region) | Immagini persistenti | Upload spariscono a ogni deploy |
| `META_APP_ID` / `META_APP_SECRET` | Insights IG/FB | Analytics social off |

- `AUTH_SECRET` e `BLOTATO_WEBHOOK_SECRET`: auto-generate (già `generateValue: true`).

## 3. 🔴 Cambiare l'admin di default

Il seed (`011_admin_user.sql`) crea `admin` / `1234567`. **Da neutralizzare.**

- [ ] Imposta su Render `ADMIN_EMAIL` (es. tua email) e `ADMIN_PASSWORD` (forte, ≥8).
- [ ] Al deploy, `scripts/ensure-admin.mjs` crea l'admin reale (super_admin, attivo)
      e mette il default `admin` a `status='rejected'` (non può più loggare).
- [ ] Verifica: login con le nuove credenziali OK; login `admin`/`1234567` → bloccato.

## 3b. 🔴 Demo mode vs pubblicazione (IMPORTANTE)

Due flag SEPARATI (prima erano accoppiati):

| Flag | Effetto |
|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` = TUTTO finto (registrazione/login/dati demo). Per andare live: **`false`** (o rimuovi). È `NEXT_PUBLIC_` → richiede rebuild (Manual Deploy → Clear cache). |
| `PUBLISH_ENABLED` | `true` = pubblica DAVVERO sui social (Blotato). `false`/assente = app reale ma **niente post reali** (dry-run). |

**Andare live in sicurezza:**
1. `NEXT_PUBLIC_DEMO_MODE=false` → registrazione/vendita reali.
2. `PUBLISH_ENABLED=false` (o non messa) → NON pubblica ancora: testi tutto senza rischio.
3. Quando sei pronto a pubblicare per davvero → `PUBLISH_ENABLED=true`.

> Nota: in demo mode non si pubblica comunque mai, qualunque sia `PUBLISH_ENABLED`.

## 4. 🟡 Piano Render

- [ ] Il piano `free` va in spin-down (cold start ~30-60s): inadatto a clienti paganti.
      Passa a un piano a pagamento prima di aprire al pubblico.

## 5. Flusso di vendita — come funziona ORA

Modello attuale = **lead-capture + attivazione manuale** (nessun pagamento automatico):

1. Prospect dalla landing/servizi → `/register?piano=<slug>` → compila → account `pending`.
2. Admin apre **/dashboard/registrazioni** → **Attiva**:
   - crea il workspace (`clienti` con piano/contenuti derivati dal pacchetto) + accesso `owner`;
   - l'utente può ora fare login e trova il pannello **già pronto**.
3. Incasso: **manuale/offline** (bonifico/fattura/WhatsApp). Coerente con B2B a canone+setup.

- [ ] Definisci il processo di fatturazione (chi manda la fattura, quando attivare).

## 6. ⚪ Pagamento automatico (Stripe) — opzionale

Non implementato di proposito: per un servizio B2B gestito (canone €390–2.590 + setup,
venduto via consulenza) la fatturazione manuale è lo standard e non frena la conversione.

Se in futuro vuoi il checkout automatico:
- Stripe Checkout (subscription) per canone + one-time per il setup;
- webhook `checkout.session.completed` → attiva l'account (riusa la logica di provisioning
  già in `PATCH /api/admin/registrazioni`);
- richiede: account Stripe + chiavi (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

## 7. 🟡 Verifiche post-deploy (smoke test su produzione reale)

- [ ] `/` e `/servizi` caricano con la nuova grafica premium.
- [ ] Registrazione reale: `/register` → invio → “Richiesta ricevuta” (account `pending` in DB).
- [ ] Login con account `pending` → messaggio “in attesa di attivazione” (niente accesso).
- [ ] Da admin: /dashboard/registrazioni → Attiva → l'utente entra e vede un cliente creato.
- [ ] Voce “Registrazioni” in sidebar visibile SOLO all'admin.
- [ ] Immagini caricate restano dopo un redeploy (STORAGE_* ok).
