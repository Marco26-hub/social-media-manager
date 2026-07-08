// FONTE UNICA dei dati del Titolare del trattamento, usata da tutte le pagine
// legali (Privacy, Cookie, Termini, Trasparenza AI) e dal footer.
//
// ⚠️ COMPILARE con i dati reali dell'azienda PRIMA del go-live pubblico.
// I campi [DA COMPILARE] sono obbligatori per legge (GDPR art. 13, D.Lgs 70/2003).
// Le pagine legali sono BOZZE da far validare allo Studio Legale BCS.

export const TITOLARE = {
  // Ragione sociale completa (o nome e cognome se ditta individuale/freelance)
  ragioneSociale: '[DA COMPILARE — Ragione sociale / Nome Cognome]',
  // Nome commerciale mostrato al pubblico
  brand: 'Social Automation',
  // Partita IVA
  partitaIva: '[DA COMPILARE — P.IVA]',
  // Codice fiscale (se diverso dalla P.IVA)
  codiceFiscale: '[DA COMPILARE — Codice Fiscale]',
  // Sede legale completa
  sedeLegale: '[DA COMPILARE — Via, n. civico, CAP, Città (Provincia)]',
  // Email di contatto ordinaria
  email: 'swsdautomation@gmail.com',
  // PEC (posta certificata) — consigliata per le comunicazioni formali
  pec: '[DA COMPILARE — PEC]',
  // Telefono / WhatsApp business
  telefono: '[DA COMPILARE — Telefono]',
  // REA (Repertorio Economico Amministrativo), se iscritto
  rea: '[DA COMPILARE — REA, se applicabile]',
  // DPO (Responsabile Protezione Dati): obbligatorio solo in certi casi.
  // Se non nominato, lascia null.
  dpo: null as null | { nome: string; email: string },
  // Partner legale (erogazione consulenze)
  partnerLegale: 'Studio Legale BCS — Avv. Vincenzo Sapone (Cassazionista)',
  // URL pubblico del sito (per riferimenti nei documenti)
  sitoUrl: 'https://social-media-manager-zte4.onrender.com',
  // Data ultimo aggiornamento dei documenti legali (aggiornare a ogni modifica)
  ultimoAggiornamento: '8 luglio 2026',
}

// Fornitori/sub-responsabili del trattamento realmente usati dalla piattaforma.
// Rilevanti per l'informativa privacy (art. 13 GDPR) e per i trasferimenti extra-UE.
export const SUB_RESPONSABILI = [
  { nome: 'Neon (database Postgres)', ruolo: 'Hosting database e dati account', extraUe: 'Possibile (USA) — SCC/Data Privacy Framework' },
  { nome: 'Render', ruolo: 'Hosting applicazione', extraUe: 'Possibile (USA) — SCC' },
  { nome: 'Anthropic / OpenRouter / Google (Gemini)', ruolo: 'Generazione contenuti con AI', extraUe: 'Sì (USA) — SCC/DPF' },
  { nome: 'Blotato', ruolo: 'Pubblicazione programmata sui social', extraUe: 'Possibile — SCC' },
  { nome: 'Stripe', ruolo: 'Pagamenti e fatturazione abbonamenti', extraUe: 'Possibile (USA) — SCC/DPF, PCI-DSS' },
  { nome: 'Cloudflare R2 / Backblaze B2', ruolo: 'Archiviazione immagini', extraUe: 'Possibile — SCC' },
  { nome: 'Meta (Instagram/Facebook Graph API)', ruolo: 'Statistiche e pubblicazione (se collegato)', extraUe: 'Sì (USA) — SCC/DPF' },
  { nome: 'Resend', ruolo: 'Invio email transazionali (se attivo)', extraUe: 'Possibile (USA) — SCC' },
]
