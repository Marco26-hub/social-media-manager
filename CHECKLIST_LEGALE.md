# ✅ Checklist Compliance Legale — Social Automation

> Stato al 8 luglio 2026. Pagine legali create come **BOZZE** — da validare con Studio Legale BCS prima del go-live pubblico.

## 🟢 FATTO (in codice, live dopo deploy)
- [x] Pagina **Privacy Policy** (`/privacy`) — informativa GDPR art. 13, basi giuridiche, sub-responsabili, diritti
- [x] Pagina **Cookie Policy** (`/cookie-policy`) — tabella cookie tecnici, Linee Guida Garante 2021
- [x] Pagina **Termini e Condizioni** (`/termini`) — servizio, pagamenti, AI, responsabilità, recesso
- [x] Pagina **Trasparenza AI** (`/trasparenza-ai`) — AI Act art. 50, supervisione umana, no-training
- [x] **Cookie banner** (solo tecnici, informativo) — `components/CookieBanner.tsx`
- [x] **Link footer** a tutte le pagine legali (landing)
- [x] **Sitemap** aggiornata con le 4 pagine
- [x] Config dati titolare centralizzata — `lib/legal-config.ts`

## 🔴 DA COMPILARE (dati reali azienda — obbligatori per legge)
In `lib/legal-config.ts`, sostituire i `[DA COMPILARE]`:
- [ ] **Ragione sociale** completa (o Nome Cognome se ditta individuale)
- [ ] **Partita IVA**
- [ ] **Codice Fiscale**
- [ ] **Sede legale** (via, CAP, città, provincia)
- [ ] **PEC** (posta certificata)
- [ ] **Telefono**
- [ ] **REA** (se iscritto al Registro Imprese)
- [ ] **Foro competente** in `app/termini/page.tsx` (città sede legale)
- [ ] Verificare se serve un **DPO** (Responsabile Protezione Dati) — art. 37 GDPR

## 🟡 DA VALIDARE con Studio Legale BCS
- [ ] Far revisionare tutte e 4 le pagine (sono template, non parere legale)
- [ ] Verificare l'elenco **sub-responsabili** in `lib/legal-config.ts` (aggiungere/togliere fornitori reali)
- [ ] Confermare i **trasferimenti extra-UE** (SCC/Data Privacy Framework) per ogni fornitore USA
- [ ] Verificare **tempi di conservazione** dei dati (nella Privacy Policy)
- [ ] Se raccogli consensi marketing → predisporre **registro dei consensi**
- [ ] Valutare **Registro dei trattamenti** (art. 30 GDPR) — obbligatorio sopra certe soglie
- [ ] **Nomine art. 28** (DPA) con i fornitori: Stripe, Neon, Render, Blotato, ecc. hanno DPA da accettare/firmare

## 🟢 DA CONFIGURARE (tecnico, quando pronti)
- [ ] Aggiornare `TITOLARE.sitoUrl` se si passa a dominio custom
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` per email transazionali (già scaffoldate)
- [ ] Se si aggiungono **analytics/pixel** (Google Analytics, Meta Pixel): estendere il cookie banner con consenso granulare **prima** di installarli + aggiornare Cookie Policy
- [ ] Cookie di sessione con flag `Secure` + `HttpOnly` (NextAuth li imposta; verificare `active_cliente_id`)

## 📋 Obblighi operativi ricorrenti
- [ ] Aggiornare `ultimoAggiornamento` in `lib/legal-config.ts` a ogni modifica dei documenti
- [ ] Procedura di **data breach** (notifica Garante entro 72h — art. 33 GDPR)
- [ ] Gestione richieste **diritti interessati** (accesso/cancellazione entro 30 gg — art. 12 GDPR)
- [ ] **Fatturazione elettronica** e conservazione 10 anni (Stripe + commercialista)

## ⚖️ Scadenze normative
- **2 agosto 2026**: AI Act pienamente applicabile (obblighi trasparenza già consigliati ora)
- Consenso cookie: rinnovo consigliato ~6 mesi (già impostato nel banner)

---
**Pagine live**: `/privacy` · `/cookie-policy` · `/termini` · `/trasparenza-ai`
**Fonte dati**: `lib/legal-config.ts` (unico file da compilare)
