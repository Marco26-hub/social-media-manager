-- Metriche di performance per post pubblicato. Popolata da sync Blotato/piattaforma
-- o inserimento manuale. Tenuta separata dal contenuto per storicizzare i rilevamenti.
create table if not exists post_metrics (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clienti(id) on delete cascade,
  id_contenuto      text,
  canale            text,
  blotato_post_id   text,
  impressions       integer not null default 0,
  reach             integer not null default 0,
  likes             integer not null default 0,
  comments          integer not null default 0,
  shares            integer not null default 0,
  saves             integer not null default 0,
  clicks            integer not null default 0,
  engagement_rate   numeric(6,2) not null default 0,
  rilevato_at       timestamptz not null default now(),
  fonte             text not null default 'manual',  -- manual | blotato | api
  unique (cliente_id, id_contenuto, canale)
);

create index if not exists idx_post_metrics_cliente on post_metrics(cliente_id);
create index if not exists idx_post_metrics_contenuto on post_metrics(cliente_id, id_contenuto);

comment on table post_metrics is 'Metriche performance per post (reach/engagement). Fonte: manuale, Blotato o API piattaforma.';
