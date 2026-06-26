-- Social Automation V2 — Schema completo per Neon/Postgres
-- Esegui una volta su Neon SQL Editor o via psql

-- ─────────────────────────────────────────
-- EXTENSION
-- ─────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────
-- PROFILES (utenti NextAuth)
-- ─────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  nome            text,
  password_hash   text not null,
  ruolo_globale   text not null default 'user'
    check (ruolo_globale in ('super_admin','admin','user')),
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- CLIENTI (multi-tenant)
-- ─────────────────────────────────────────
create table if not exists clienti (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  slug            text unique not null,
  settore         text,
  email           text,
  telefono        text,
  piano           text not null default 'pro'
    check (piano in ('free','pro','agency','enterprise')),
  contenuti_mese  integer not null default 30,
  attivo          boolean not null default true,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- USER CLIENT ACCESS
-- ─────────────────────────────────────────
create table if not exists user_client_access (
  user_id     uuid not null references profiles(id) on delete cascade,
  cliente_id  uuid not null references clienti(id) on delete cascade,
  ruolo       text not null default 'editor'
    check (ruolo in ('owner','admin','editor','viewer')),
  attivo      boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (user_id, cliente_id)
);

-- ─────────────────────────────────────────
-- BRAND
-- ─────────────────────────────────────────
create table if not exists brand (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clienti(id) on delete cascade,
  brand_name      text not null,
  sito_url        text,
  tono_voce       text,
  target          text,
  promessa_brand  text,
  colori_brand    text,
  parole_da_usare    text,
  parole_da_evitare  text,
  emoji_policy    text,
  hashtag_base    text,
  cta_base        text,
  note_legali     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PRODOTTI
-- ─────────────────────────────────────────
create table if not exists prodotti (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clienti(id) on delete cascade,
  product_id      text not null,
  nome_prodotto   text not null,
  categoria       text,
  collezione      text,
  prezzo          numeric(10,2),
  prezzo_promo    numeric(10,2),
  link_prodotto   text,
  link_img_1      text,
  link_img_2      text,
  link_img_3      text,
  colori          text,
  taglie          text,
  mood            text,
  target          text,
  priorita        text check (priorita in ('alta','media','bassa')),
  prodotto_attivo text not null default 'SI' check (prodotto_attivo in ('SI','NO')),
  stock_status    text check (stock_status in ('disponibile','esaurito','in_arrivo')),
  stock_quantity  integer,
  data_ultimo_controllo_stock date,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (cliente_id, product_id)
);

-- ─────────────────────────────────────────
-- ACCOUNT SOCIAL
-- ─────────────────────────────────────────
create table if not exists account_social (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references clienti(id) on delete cascade,
  canale              text not null,
  nome_account        text not null,
  platform_account_id text not null,
  attivo              text not null default 'SI' check (attivo in ('SI','NO')),
  formati_permessi    text not null,
  default_media_type  text,
  note                text,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PROMO
-- ─────────────────────────────────────────
create table if not exists promo (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references clienti(id) on delete cascade,
  promo_id         text not null,
  promo_nome       text not null,
  promo_codice     text,
  promo_attiva     text not null default 'NO' check (promo_attiva in ('SI','NO')),
  promo_data_inizio date,
  promo_data_fine   date,
  descrizione      text,
  prodotti_inclusi text,
  canali_abilitati text,
  note             text,
  created_at       timestamptz not null default now(),
  unique (cliente_id, promo_id)
);

-- ─────────────────────────────────────────
-- SETTINGS
-- ─────────────────────────────────────────
create table if not exists settings (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clienti(id) on delete cascade,
  chiave      text not null,
  valore      text not null,
  descrizione text,
  updated_at  timestamptz not null default now(),
  unique (cliente_id, chiave)
);

-- ─────────────────────────────────────────
-- CALENDARIO (tabella principale contenuti)
-- ─────────────────────────────────────────
create table if not exists calendario (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references clienti(id) on delete cascade,
  id_contenuto         text not null,
  data_pubblicazione   date not null,
  ora_pubblicazione    time not null default '12:00',
  canale               text not null,
  formato              text not null,
  obiettivo            text,
  product_id           text,
  nome_prodotto        text,
  tema                 text,
  hook                 text,
  caption              text,
  hashtag              text,
  cta                  text,
  link_media_1         text,
  link_media_2         text,
  link_media_3         text,
  link_media_4         text,
  link_media_5         text,
  link_media_6         text,
  link_media_7         text,
  link_prodotto        text,
  link_prodotto_finale  text,
  status               text not null default 'BOZZA'
    check (status in ('BOZZA','IDEA','DA_APPROVARE','APPROVATO',
                      'IN_PUBBLICAZIONE','PUBBLICATO','ERRORE',
                      'ERRORE_MANUALE','DRY_RUN_OK','ARCHIVIATO')),
  approvato_da         text,
  data_approvazione    timestamptz,
  blotato_post_id      text,
  errore               text,
  note                 text,
  platform_account_id  text,
  publish_lock_id      text,
  media_type           text,
  media_validato       text check (media_validato in ('SI','NO')),
  retry_count          integer default 0,
  last_retry_at        timestamptz,
  errore_tecnico       text,
  checked_copy         text check (checked_copy in ('SI','NO')),
  checked_media        text check (checked_media in ('SI','NO')),
  checked_link         text check (checked_link in ('SI','NO')),
  checked_price        text check (checked_price in ('SI','NO')),
  checked_by           text,
  checked_at           timestamptz,
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  promo_id             text,
  promo_codice         text,
  promo_validata       text check (promo_validata in ('SI','NO')),
  fonte_media          text,
  consenso_utilizzo    text check (consenso_utilizzo in ('SI','NO')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (cliente_id, id_contenuto)
);

-- ─────────────────────────────────────────
-- LOG PUBBLICAZIONI
-- ─────────────────────────────────────────
create table if not exists log_pubblicazioni (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clienti(id) on delete cascade,
  timestamp         timestamptz not null default now(),
  id_contenuto      text,
  canale            text,
  formato           text,
  status_precedente text,
  status_finale     text not null,
  blotato_post_id   text,
  messaggio         text,
  errore            text
);

-- ─────────────────────────────────────────
-- BLOG ARTICOLI
-- ─────────────────────────────────────────
create table if not exists blog_articoli (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clienti(id) on delete cascade,
  slug              text not null,
  meta_title        text not null,
  meta_description  text,
  h1                text not null,
  intro             text,
  sezioni           jsonb,
  faq               jsonb,
  cta_finale        text,
  keywords_target   jsonb,
  prodotti_linkati  jsonb,
  tempo_lettura_min integer,
  immagine_cover    text,
  autore            text not null,
  status            text not null default 'BOZZA'
    check (status in ('BOZZA','DA_APPROVARE','APPROVATO','PUBBLICATO','ARCHIVIATO')),
  data_pubblicazione date,
  url_pubblicato    text,
  checked_seo       text check (checked_seo in ('SI','NO')),
  checked_copy      text check (checked_copy in ('SI','NO')),
  errore_tecnico    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (cliente_id, slug)
);

-- ─────────────────────────────────────────
-- SEO AUDIT
-- ─────────────────────────────────────────
create table if not exists seo_audit (
  id                      uuid primary key default gen_random_uuid(),
  cliente_id              uuid not null references clienti(id) on delete cascade,
  data_audit              date not null,
  periodo                 text not null check (periodo in ('settimanale','mensile')),
  score_globale           integer not null,
  score_seo_tecnico       integer not null,
  score_seo_contenuti     integer not null,
  score_geo_ai_search     integer not null,
  score_social_coerenza   integer not null,
  score_eeat              integer not null,
  score_performance_social integer not null,
  riepilogo               text,
  punti_forti             jsonb,
  punti_critici           jsonb,
  miglioramenti           jsonb,
  kpi_da_monitorare       jsonb,
  contenuti_suggeriti     jsonb,
  generato_da             text,
  created_at              timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- GENERATION JOBS
-- ─────────────────────────────────────────
create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  tipo text not null
    check (tipo in ('content','plan','seo_audit','media_validation','publish','report')),
  status text not null default 'queued'
    check (status in ('queued','running','completed','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  model text,
  attempts integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- INTEGRATION EVENTS
-- ─────────────────────────────────────────
create table if not exists integration_events (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clienti(id) on delete cascade,
  provider text not null,
  event_type text not null,
  direction text not null default 'outbound'
    check (direction in ('inbound','outbound')),
  status text not null default 'received'
    check (status in ('received','processing','processed','failed','ignored')),
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- TRIGGERS — updated_at automatico
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_profiles_updated_at on profiles;
create trigger tr_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

drop trigger if exists tr_clienti_updated_at on clienti;
create trigger tr_clienti_updated_at
  before update on clienti
  for each row execute function update_updated_at();

drop trigger if exists tr_calendario_updated_at on calendario;
create trigger tr_calendario_updated_at
  before update on calendario
  for each row execute function update_updated_at();

drop trigger if exists tr_prodotti_updated_at on prodotti;
create trigger tr_prodotti_updated_at
  before update on prodotti
  for each row execute function update_updated_at();

drop trigger if exists tr_brand_updated_at on brand;
create trigger tr_brand_updated_at
  before update on brand
  for each row execute function update_updated_at();

drop trigger if exists tr_settings_updated_at on settings;
create trigger tr_settings_updated_at
  before update on settings
  for each row execute function update_updated_at();

drop trigger if exists tr_blog_articoli_updated_at on blog_articoli;
create trigger tr_blog_articoli_updated_at
  before update on blog_articoli
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- INDICI
-- ─────────────────────────────────────────
create index if not exists idx_calendario_cliente_status on calendario(cliente_id, status);
create index if not exists idx_calendario_cliente_data on calendario(cliente_id, data_pubblicazione);
create index if not exists idx_calendario_cliente_canale on calendario(cliente_id, canale);
create index if not exists idx_calendario_status on calendario(status);
create index if not exists idx_log_cliente_timestamp on log_pubblicazioni(cliente_id, timestamp desc);
create index if not exists idx_prodotti_cliente on prodotti(cliente_id);
create index if not exists idx_settings_cliente on settings(cliente_id);
create index if not exists idx_clienti_attivo on clienti(attivo);
create index if not exists idx_user_client_access_user on user_client_access(user_id);
create index if not exists idx_generation_jobs_cliente_status on generation_jobs(cliente_id, status, created_at desc);
create index if not exists idx_integration_events_cliente_status on integration_events(cliente_id, status, created_at desc);

-- ─────────────────────────────────────────
-- SETTINGS DEFAULT (per cliente SILKinCOM)
-- Saranno inseriti dopo aver creato il cliente via seed
-- ─────────────────────────────────────────
