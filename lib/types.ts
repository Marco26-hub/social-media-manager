export type Status =
  | 'BOZZA' | 'IDEA' | 'DA_APPROVARE' | 'APPROVATO'
  | 'IN_PUBBLICAZIONE' | 'PUBBLICATO' | 'ERRORE'
  | 'ERRORE_MANUALE' | 'DRY_RUN_OK' | 'ARCHIVIATO'

export type Canale = 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube_shorts' | 'blog'
export type Formato = 'post' | 'carousel' | 'reel' | 'story' | 'pin' | 'short' | 'video' | 'articolo'
export type MediaType = 'image' | 'video' | 'pin' | 'short'

export interface Contenuto {
  id: string
  id_contenuto: string
  data_pubblicazione: string
  ora_pubblicazione: string
  canale: Canale
  formato: Formato
  obiettivo: string | null
  product_id: string | null
  nome_prodotto: string | null
  tema: string | null
  hook: string | null
  caption: string | null
  hashtag: string | null
  cta: string | null
  link_media_1: string | null
  link_media_2: string | null
  link_media_3: string | null
  link_media_4: string | null
  link_media_5: string | null
  link_media_6: string | null
  link_media_7: string | null
  link_prodotto: string | null
  link_prodotto_finale: string | null
  status: Status
  approvato_da: string | null
  data_approvazione: string | null
  blotato_post_id: string | null
  errore: string | null
  note: string | null
  platform_account_id: string | null
  publish_lock_id: string | null
  media_type: MediaType | null
  media_validato: 'SI' | 'NO' | null
  retry_count: number
  last_retry_at: string | null
  errore_tecnico: string | null
  checked_copy: 'SI' | 'NO' | null
  checked_media: 'SI' | 'NO' | null
  checked_link: 'SI' | 'NO' | null
  checked_price: 'SI' | 'NO' | null
  checked_by: string | null
  checked_at: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  promo_id: string | null
  promo_codice: string | null
  promo_validata: 'SI' | 'NO' | null
  fonte_media: string | null
  consenso_utilizzo: 'SI' | 'NO' | null
  created_at: string
  updated_at: string
}

export interface Prodotto {
  id: string
  product_id: string
  nome_prodotto: string
  categoria: string | null
  collezione: string | null
  prezzo: number | null
  prezzo_promo: number | null
  link_prodotto: string | null
  link_img_1: string | null
  link_img_2: string | null
  link_img_3: string | null
  colori: string | null
  taglie: string | null
  mood: string | null
  target: string | null
  priorita: 'alta' | 'media' | 'bassa' | null
  prodotto_attivo: 'SI' | 'NO'
  stock_status: 'disponibile' | 'esaurito' | 'in_arrivo' | null
  stock_quantity: number | null
  data_ultimo_controllo_stock: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  brand_name: string
  sito_url: string | null
  tono_voce: string | null
  target: string | null
  promessa_brand: string | null
  colori_brand: string | null
  parole_da_usare: string | null
  parole_da_evitare: string | null
  emoji_policy: string | null
  hashtag_base: string | null
  cta_base: string | null
  note_legali: string | null
  created_at: string
  updated_at: string
}

export interface AccountSocial {
  id: string
  canale: Canale
  nome_account: string
  platform_account_id: string
  attivo: 'SI' | 'NO'
  formati_permessi: string
  default_media_type: string
  note: string | null
  created_at: string
}

export interface Promo {
  id: string
  promo_id: string
  promo_nome: string
  promo_codice: string | null
  promo_attiva: 'SI' | 'NO'
  promo_data_inizio: string | null
  promo_data_fine: string | null
  descrizione: string | null
  prodotti_inclusi: string | null
  canali_abilitati: string | null
  note: string | null
  created_at: string
}

export interface LogPubblicazione {
  id: string
  timestamp: string
  id_contenuto: string | null
  canale: string | null
  formato: string | null
  status_precedente: string | null
  status_finale: string
  blotato_post_id: string | null
  messaggio: string | null
  errore: string | null
}

export interface Setting {
  id: string
  chiave: string
  valore: string
  descrizione: string | null
  updated_at: string
}

export interface BlogArticolo {
  id: string
  slug: string
  meta_title: string
  meta_description: string | null
  h1: string
  intro: string | null
  sezioni: { h2: string; paragrafi: string[]; lista_punti?: string[] }[] | null
  faq: { domanda: string; risposta: string }[] | null
  cta_finale: string | null
  keywords_target: string[] | null
  prodotti_linkati: string[] | null
  tempo_lettura_min: number | null
  immagine_cover: string | null
  autore: string
  status: 'BOZZA' | 'DA_APPROVARE' | 'APPROVATO' | 'PUBBLICATO' | 'ARCHIVIATO'
  data_pubblicazione: string | null
  url_pubblicato: string | null
  checked_seo: 'SI' | 'NO' | null
  checked_copy: 'SI' | 'NO' | null
  errore_tecnico: string | null
  created_at: string
  updated_at: string
}

export interface SeoAudit {
  id: string
  data_audit: string
  periodo: 'settimanale' | 'mensile'
  score_globale: number
  score_seo_tecnico: number
  score_seo_contenuti: number
  score_geo_ai_search: number
  score_social_coerenza: number
  score_eeat: number
  score_performance_social: number
  riepilogo: string
  punti_forti: string[]
  punti_critici: string[]
  miglioramenti: { area: string; azione: string; impatto: string; effort: string; deadline_suggerita: string }[]
  kpi_da_monitorare: { metrica: string; valore_attuale: string; target: string }[]
  contenuti_suggeriti: { tema: string; formato: string; canale: string; priorita: string }[]
  generato_da: string
  created_at: string
}

// Supabase Database type (minimal for type safety)
export interface Database {
  public: {
    Tables: {
      calendario:       { Row: Contenuto;        Insert: Partial<Omit<Contenuto,        'id'>>; Update: Partial<Omit<Contenuto,        'id' | 'created_at'>> }
      prodotti:         { Row: Prodotto;          Insert: Partial<Omit<Prodotto,          'id'>>; Update: Partial<Omit<Prodotto,          'id' | 'created_at'>> }
      brand:            { Row: Brand;             Insert: Partial<Omit<Brand,             'id'>>; Update: Partial<Omit<Brand,             'id' | 'created_at'>> }
      account_social:   { Row: AccountSocial;    Insert: Partial<Omit<AccountSocial,    'id'>>; Update: Partial<Omit<AccountSocial,    'id'>> }
      promo:            { Row: Promo;             Insert: Partial<Omit<Promo,             'id'>>; Update: Partial<Omit<Promo,             'id'>> }
      log_pubblicazioni:{ Row: LogPubblicazione;  Insert: Partial<Omit<LogPubblicazione,  'id'>>; Update: Partial<Omit<LogPubblicazione,  'id'>> }
      settings:         { Row: Setting;           Insert: Partial<Omit<Setting,           'id'>>; Update: Partial<Omit<Setting,           'id'>> }
    }
  }
}
