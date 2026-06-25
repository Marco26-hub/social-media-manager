# HANDOFF — Social Automation V2

> Documento per AI agent (Claude, Codex, Cursor, etc.). Stato attuale del progetto.

**Data**: 2026-06-25
**Progetto**: Social Automation — SaaS gestito per sito, e-commerce e social automation
**Stack attuale**: Next.js 15 + Neon/Postgres + NextAuth + Tailwind + AI (Anthropic/OpenRouter)
**Percorso locale**: `/Users/md/Downloads/social_automation_v2`
**Repo GitHub**: `https://github.com/Marco26-hub/social-media-manager.git`
**Ultimo push noto**: `main` → commit `a7ecfce prepare Neon production foundation`

---

## 1. Stato Executive

Il progetto è stato riallineato da Supabase a **Neon/Postgres via `DATABASE_URL`** con login **NextAuth credentials**.

Build produzione verificata:

```bash
npm run build
```

Risultato: ✅ build verde.

Il codice è pronto per deploy tecnico, ma il go-live reale richiede ancora env, schema dati completo, utente admin, seed cliente/prodotti/brand e test con chiavi vere.

---

## 2. Architettura Attuale

```
Browser
  → Next.js 15 App Router
      ├── /login                  → login NextAuth credentials
      ├── /dashboard/*            → area admin protetta da middleware/sessione
      ├── /servizi                → landing pubblica vendita servizi
      ├── /api/data/*             → CRUD/query dati via Neon/Postgres
      ├── /api/generate/*         → generazione AI + insert su Postgres
      ├── /api/auth/[...nextauth] → auth NextAuth
      └── /api/system/health      → health check env/runtime

Database:
  Neon/Postgres
    ├── profiles                  → utenti app con password_hash bcrypt
    ├── clienti + user_client_access
    ├── brand, prodotti, calendario, settings, log_pubblicazioni
    ├── blog_articoli, seo_audit
    ├── generation_jobs           → nuovo tracking job backend
    └── integration_events        → nuovo outbox/inbox integrazioni
```

**Supabase non è più il backend attivo.**
La cartella `supabase/migrations/` resta materiale storico/legacy e non va considerata la fonte runtime attuale.

---

## 3. Struttura File Importante

```
app/
  api/
    auth/[...nextauth]/route.ts       → handler NextAuth
    data/
      brand/route.ts                  → GET brand cliente attivo
      calendario/route.ts             → GET/PATCH contenuti calendario
      clienti/route.ts                → GET/POST clienti
      log/route.ts                    → GET log pubblicazioni
      prodotti/route.ts               → GET prodotti
      seo-audit/route.ts              → GET ultimi audit
      settings/route.ts               → GET/PATCH impostazioni
      stats/route.ts                  → GET statistiche dashboard
    generate/
      content/route.ts                → POST genera contenuto social
      plan/route.ts                   → POST genera piano editoriale
      seo-audit/route.ts              → POST genera audit SEO/GEO
    system/health/route.ts            → GET stato env/app
  dashboard/
    page.tsx                          → control room moderna + stats/job
    calendario/page.tsx               → approvazione contenuti
    clienti/page.tsx                  → gestione clienti
    prodotti/page.tsx                 → catalogo prodotti
    social/[platform]/page.tsx        → generatori per piattaforma
    piano/page.tsx                    → wizard piano editoriale
    seo/page.tsx                      → audit SEO/GEO
    log/page.tsx                      → storico pubblicazioni
    settings/page.tsx                 → configurazione automazione
  login/page.tsx                      → login NextAuth
  servizi/page.tsx                    → landing pubblica

components/
  Sidebar.tsx                         → nav + logout NextAuth
  ClienteSelector.tsx                 → selettore cliente via /api/data/clienti
  DemoBanner.tsx                      → banner demo mode
  AIModelSelector.tsx                 → modello AI + OpenRouter key localStorage
  StatusBadge.tsx
  PostPreview.tsx
  ConfirmModal.tsx

lib/
  db.ts                               → query helper Neon/Postgres (`q`, `q1`)
  auth.ts                             → configurazione NextAuth credentials
  auth-utils.ts                       → requireAuth/requireClienteId
  ai.ts                               → Anthropic/OpenRouter + extract JSON
  demo.ts                             → demo mode detection
  demo-data.ts                        → dati demo
  use-data.ts                         → fetch helper client
  social-config.ts                    → piattaforme/formati
  types.ts                            → tipi TypeScript
  tenant/
    client.ts                         → cookie cliente lato client
    server.ts                         → cliente attivo lato server

db/
  migrations/
    004_operations_foundation.sql     → generation_jobs + integration_events
```

---

## 4. Backend Dati

### `lib/db.ts`

Usa `DATABASE_URL` e chiama l’endpoint SQL HTTP Neon:

- `dbReady()` → controlla se `DATABASE_URL` esiste
- `q(query, params)` → ritorna array righe
- `q1(query, params)` → ritorna prima riga o `null`

Tutte le nuove API route attive usano `q()` e query parametrizzate.

### Auth

NextAuth credentials:

- file: `lib/auth.ts`
- provider: email/password
- tabella: `profiles`
- campi attesi: `id`, `email`, `nome`, `password_hash`
- hash password: bcrypt

Il middleware protegge `/dashboard/*`.

---

## 5. API Route Attive

### Data API

- `GET /api/data/clienti`
- `POST /api/data/clienti`
- `GET /api/data/calendario`
- `PATCH /api/data/calendario`
- `GET /api/data/prodotti`
- `GET /api/data/brand`
- `GET /api/data/settings`
- `PATCH /api/data/settings`
- `GET /api/data/log`
- `GET /api/data/stats`
- `GET /api/data/seo-audit`

### Generate API

#### `POST /api/generate/content`

Input:

```json
{
  "cliente_id": "...",
  "canale": "instagram",
  "formato": "post",
  "model": "claude-sonnet-4-6",
  "openrouter_key": "...",
  "tema": "...",
  "nome_prodotto": "...",
  "product_id": "..."
}
```

Fa:

1. Carica `brand` + `prodotti` da Neon/Postgres.
2. Costruisce prompt inline.
3. Chiama AI.
4. Inserisce in `calendario` con status `DA_APPROVARE`.

#### `POST /api/generate/plan`

Genera piano settimanale/mensile e inserisce righe `BOZZA` in `calendario`.

#### `POST /api/generate/seo-audit`

Carica brand, ultimi contenuti e log; genera audit; inserisce in `seo_audit`.

### System API

#### `GET /api/system/health`

Controlla:

- `DATABASE_URL`
- `AUTH_SECRET` o `NEXTAUTH_SECRET`
- `ANTHROPIC_API_KEY` o `OPENROUTER_API_KEY`

Ritorna `ready` solo se DB + auth secret + almeno una chiave AI sono presenti.

---

## 6. Variabili Ambiente

Minime per produzione:

```bash
DATABASE_URL=postgresql://...
AUTH_SECRET=...
NEXTAUTH_URL=https://tuo-dominio.it
ANTHROPIC_API_KEY=sk-ant-...
# oppure:
OPENROUTER_API_KEY=sk-or-v1-...
```

Opzionale:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Note:

- Non usare env Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` non sono più parte del backend attivo.
- `.env.local` è ignorato da git.

---

## 7. Stato Componenti

| Area | Stato | Note |
|---|---:|---|
| Next.js App Router | ✅ | Build produzione verde |
| Neon/Postgres helper | ✅ | `lib/db.ts` |
| NextAuth login | ✅ | Credentials + bcrypt |
| Middleware auth dashboard | ✅ | `/dashboard/*` protetto |
| Dashboard control room | ✅ | Stato sistema + job backend |
| Cliente selector | ✅ | Cookie `active_cliente_id` |
| Calendario approvazione | ✅ | GET/PATCH via API data |
| Pagine social generator | ✅ | Generano via API route AI |
| Piano editoriale | ✅ | Wizard + API generate plan |
| SEO/GEO audit | ✅ | Generate + lista audit |
| Prodotti | ✅ | Lista prodotti cliente |
| Settings | ✅ | GET/PATCH settings |
| Log | ✅ | Storico log |
| Health check | ✅ | `/api/system/health` |
| `generation_jobs` schema | ✅ | Migration 004 pronta |
| `integration_events` schema | ✅ | Migration 004 pronta |
| Pubblicazione Blotato/webhook | ❌ | Da implementare |
| Validazione media | ❌ | Da implementare |
| Report automatico | ❌ | Da implementare |
| E2E con DB/AI reali | ❌ | Da fare prima del go-live |

---

## 8. Flusso Operativo Attuale

```
1. Admin fa login da /login (NextAuth credentials)
2. Admin seleziona cliente attivo
3. Admin genera piano o contenuto singolo
4. API generate chiama AI e scrive in calendario
5. Admin approva da /dashboard/calendario
6. Contenuto passa a APPROVATO
7. [NEXT] Bridge Blotato/webhook pubblica e registra esito
```

Il punto 7 non è ancora implementato.

---

## 9. Produzione: Cosa Manca Davvero

Prima di dire “go-live”:

- [ ] Impostare env production: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, chiave AI.
- [ ] Verificare/applicare schema base Neon per tutte le tabelle usate dal codice.
- [ ] Eseguire `db/migrations/004_operations_foundation.sql`.
- [ ] Creare utente admin in `profiles` con `password_hash` bcrypt.
- [ ] Popolare `clienti`, `user_client_access`, `brand`, `prodotti`, `settings`.
- [ ] Testare login reale.
- [ ] Testare `GET /api/system/health`.
- [ ] Testare generazione contenuto con chiave AI reale.
- [ ] Testare approvazione calendario.
- [ ] Implementare pubblicazione `APPROVATO → Blotato/webhook → PUBBLICATO/ERRORE`.
- [ ] Configurare dominio/deploy Vercel o target equivalente.

Nota importante: la migration `004_operations_foundation.sql` crea solo le nuove tabelle operative. Serve anche uno schema base Neon coerente per tabelle già usate (`profiles`, `clienti`, `calendario`, etc.). Le vecchie migration Supabase possono aiutare come riferimento, ma non vanno eseguite 1:1 su Neon senza adattamento.

---

## 10. Decisioni Tecniche

- **Supabase dismesso dal runtime**: rimossi client `lib/supabase/*` dal codice attivo.
- **Neon/Postgres come DB**: accesso tramite `DATABASE_URL` e `lib/db.ts`.
- **NextAuth credentials**: sostituisce Supabase Auth.
- **n8n non attivo**: workflow JSON restano storico/riferimento.
- **Prompt inline**: prompt AI nelle API route per semplicità operativa.
- **Multi-cliente**: ogni dato usa `cliente_id`; cliente attivo via cookie `active_cliente_id`.
- **Job/event tracking**: `generation_jobs` e `integration_events` preparano queue, publish bridge e osservabilità.

---

## 11. Modelli AI

`AIModelSelector` salva in `localStorage`:

- `ai_model`
- `openrouter_key`

Provider:

- Anthropic se modello `claude-*` e `ANTHROPIC_API_KEY` presente.
- OpenRouter se modello esterno/free o se viene passata `openrouter_key`.

Modello default UI/API:

- `claude-sonnet-4-6`

---

## 12. Comandi Utili

```bash
npm run dev      # http://localhost:3000
npm run build    # build produzione
npm run start    # avvia build prod
```

Git:

```bash
git status -sb
git log -1 --oneline
git push origin main
```

---

## 13. Ultimo Stato Git

Branch locale/remoto:

```bash
main -> origin/main
```

Ultimo commit pushato:

```bash
a7ecfce prepare Neon production foundation
```

Repo:

```bash
https://github.com/Marco26-hub/social-media-manager.git
```

---

*Fine handoff. Prossimo agent: non reintrodurre Supabase nel runtime; lavorare su schema Neon base, seed production e publish bridge.*
