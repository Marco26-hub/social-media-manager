// FONTE UNICA DEI PACCHETTI — usata da landing (/), servizi (/servizi) e
// registrazione (/register + API). Modifica QUI e resta tutto allineato.
// Prezzi validati vs concorrenza reale 2026 (ANALISI_CONCORRENZA_2026.md).
// Scala cumulativa: ogni tier include tutto quello sotto (`includeDa`) e le
// `features` elencano solo ciò che AGGIUNGE rispetto al pacchetto precedente.

export type Pacchetto = {
  slug: string            // usato in /register?piano= e nell'API
  nome: string            // nome breve, coerente ovunque
  eyebrow: string         // descrittore target
  prezzo: string          // canone mensile, es. '€390'
  setup: string           // es. 'Setup incluso' | '€290 setup'
  sottotitolo: string     // descrizione breve
  includeDa?: string      // nome del pacchetto inferiore (badge "Tutto di X, più:")
  features: string[]      // ciò che aggiunge rispetto al tier precedente
  consigliato: boolean
}

export const PACCHETTI: Pacchetto[] = [
  {
    slug: 'starter',
    nome: 'Starter',
    eyebrow: 'Per iniziare',
    prezzo: '€390',
    setup: 'Setup incluso',
    sottotitolo: 'Per freelance, partite IVA e professionisti che vogliono presenza social senza impegni pesanti.',
    features: ['8 contenuti al mese', '1-2 canali social', 'Analisi automatica del tuo brand', 'Immagini AI incluse', 'Anteprima su ogni piattaforma', 'Report mensile'],
    consigliato: false,
  },
  {
    slug: 'presenza',
    nome: 'Presenza',
    eyebrow: 'Per attività locali',
    prezzo: '€590',
    setup: '€290 setup',
    sottotitolo: 'Per chi ha già un sito e vuole una gestione social ordinata, costante e professionale con AI.',
    includeDa: 'Starter',
    features: ['12 contenuti al mese', '2 canali social', 'Contenuti valutati prima di pubblicare', 'Piano editoriale strategico', 'Report risultati + call mensile'],
    consigliato: false,
  },
  {
    slug: 'slancio',
    nome: 'Slancio',
    eyebrow: 'Per crescere',
    prezzo: '€790',
    setup: '€390 setup',
    sottotitolo: 'Per chi vuole spingere: più contenuti, un terzo canale e i primi articoli per il blog.',
    includeDa: 'Presenza',
    features: ['16 contenuti al mese', '3 canali social', 'Blog aziendale mensile', 'Reel e Short', 'Analisi dei concorrenti'],
    consigliato: false,
  },
  {
    slug: 'crescita',
    nome: 'Crescita',
    eyebrow: 'Consigliato',
    prezzo: '€1.090',
    setup: '€490 setup',
    sottotitolo: 'Il pacchetto più equilibrato per PMI che vogliono struttura, contenuti, lead e crescita misurabile.',
    includeDa: 'Slancio',
    features: ['20 contenuti al mese', 'Audit SEO + GEO completo', 'Contatti ordinati per priorità (caldo/tiepido/freddo)', 'Reel e Short premium', 'Report bisettimanale con call'],
    consigliato: true,
  },
  {
    slug: 'ecommerce',
    nome: 'E-commerce',
    eyebrow: 'Per vendere online',
    prezzo: '€1.690',
    setup: '€990 setup',
    sottotitolo: 'Per negozi e brand che vogliono collegare prodotti, promozioni e social in un sistema unico.',
    includeDa: 'Crescita',
    features: ['30 contenuti/mese su 4 canali', 'Sito e negozio online collegato', 'Catalogo prodotti sincronizzato', 'Campagne pubblicitarie gestite', 'Prodotti taggati e traffico tracciato', 'Percorso di vendita (funnel)'],
    consigliato: false,
  },
  {
    slug: 'dominio',
    nome: 'Dominio',
    eyebrow: 'Per aziende strutturate',
    prezzo: '€2.590',
    setup: '€1.490 setup',
    sottotitolo: 'Strategia su tutti i canali per aziende che vogliono presidiare il mercato digitale.',
    includeDa: 'E-commerce',
    features: ['50+ contenuti/mese su 5 canali', 'Blog SEO + AI continuativo', 'Produzione video avanzata', 'Strategia su tutti i canali', 'Cruscotto live e priorità', 'Documenti legali (Privacy, GDPR)'],
    consigliato: false,
  },
]

export const PACCHETTO_SLUGS = new Set(PACCHETTI.map(p => p.slug))

export function pacchettoBySlug(slug: string | null | undefined): Pacchetto | undefined {
  if (!slug) return undefined
  return PACCHETTI.find(p => p.slug === slug.toLowerCase())
}

// Mapping legacy DB → pacchetti marketing.
// `clienti.piano` nasce con valori tecnici storici (free/pro/agency/enterprise),
// mentre la fonte unica commerciale usa slug reali (starter/presenza/slancio/
// crescita/ecommerce/dominio). Per evitare una migration invasiva oggi, la vista
// cliente mappa i valori legacy qui; la quota resta comunque `clienti.contenuti_mese`.
export const PIANO_TO_PACCHETTO_SLUG: Record<string, string> = {
  free: 'starter',
  pro: 'crescita',
  agency: 'ecommerce',
  enterprise: 'dominio',
  growth: 'crescita',
}

export function pacchettoSlugFromPiano(piano: string | null | undefined): string {
  const normalized = (piano || '').toLowerCase().trim()
  if (PACCHETTO_SLUGS.has(normalized)) return normalized
  return PIANO_TO_PACCHETTO_SLUG[normalized] || 'starter'
}

export function pacchettoFromPiano(piano: string | null | undefined): Pacchetto {
  return pacchettoBySlug(pacchettoSlugFromPiano(piano)) || PACCHETTI[0]
}
