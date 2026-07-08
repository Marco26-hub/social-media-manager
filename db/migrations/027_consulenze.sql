-- Consulenze legali one-off (es. €150/30 min con lo Studio BCS).
-- Pagamento SINGOLO (Stripe mode=payment), separato dagli abbonamenti pacchetti.
-- Non richiede un cliente/workspace: chiunque può prenotare dalla landing.

create table if not exists consulenze (
  id                       uuid primary key default gen_random_uuid(),
  nome                     text not null,
  email                    text not null,
  telefono                 text,
  messaggio                text,
  tipo                     text not null default 'legale-ai',   -- tipologia consulenza
  importo_cents            integer not null default 15000,       -- €150
  currency                 text not null default 'eur',
  status                   text not null default 'pending',      -- pending | paid | cancelled
  stripe_session_id        text,
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists consulenze_status_created_idx
  on consulenze(status, created_at desc);

create index if not exists consulenze_email_idx
  on consulenze(email);

create unique index if not exists consulenze_session_uidx
  on consulenze(stripe_session_id)
  where stripe_session_id is not null;
