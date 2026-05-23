-- V2 — Blog articoli + SEO/GEO audit

-- ─────────────────────────────────────────
-- BLOG ARTICOLI
-- ─────────────────────────────────────────
create table if not exists blog_articoli (
  id                uuid primary key default uuid_generate_v4(),
  slug              text unique not null,
  meta_title        text not null,
  meta_description  text,
  h1                text not null,
  intro             text,
  sezioni           jsonb,         -- array di { h2, paragrafi, lista_punti }
  faq               jsonb,         -- array di { domanda, risposta }
  cta_finale        text,
  keywords_target   text[],
  prodotti_linkati  text[],
  tempo_lettura_min integer,
  immagine_cover    text,
  autore            text default 'Brand',
  status            text not null default 'DA_APPROVARE'
    check (status in ('BOZZA','DA_APPROVARE','APPROVATO','PUBBLICATO','ARCHIVIATO')),
  data_pubblicazione date,
  url_pubblicato    text,
  checked_seo       text check (checked_seo in ('SI','NO')),
  checked_copy      text check (checked_copy in ('SI','NO')),
  errore_tecnico    text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create trigger tr_blog_updated_at
  before update on blog_articoli
  for each row execute function update_updated_at();

alter table blog_articoli enable row level security;
create policy "auth_all" on blog_articoli for all using (auth.role() = 'authenticated');

create index if not exists idx_blog_status on blog_articoli(status);
create index if not exists idx_blog_data   on blog_articoli(data_pubblicazione desc);


-- ─────────────────────────────────────────
-- SEO/GEO AUDIT
-- ─────────────────────────────────────────
create table if not exists seo_audit (
  id                  uuid primary key default uuid_generate_v4(),
  data_audit          date not null,
  periodo             text not null check (periodo in ('settimanale','mensile')),
  score_globale       integer check (score_globale between 0 and 100),
  score_seo_tecnico   integer,
  score_seo_contenuti integer,
  score_geo_ai_search integer,
  score_social_coerenza integer,
  score_eeat          integer,
  score_performance_social integer,
  riepilogo           text,
  punti_forti         text[],
  punti_critici       text[],
  miglioramenti      jsonb,        -- array di { area, azione, impatto, effort, deadline_suggerita }
  kpi_da_monitorare  jsonb,        -- array di { metrica, valore_attuale, target }
  contenuti_suggeriti jsonb,       -- array di { tema, formato, canale, priorita }
  generato_da         text default 'claude-sonnet-4-6',
  created_at          timestamptz default now()
);

alter table seo_audit enable row level security;
create policy "auth_all" on seo_audit for all using (auth.role() = 'authenticated');

create index if not exists idx_audit_data    on seo_audit(data_audit desc);
create index if not exists idx_audit_periodo on seo_audit(periodo);


-- ─────────────────────────────────────────
-- Aggiungi 'blog' come canale ammissibile in calendario (opzionale)
-- ─────────────────────────────────────────
-- Già supportato come text libero, niente da fare
