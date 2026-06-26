-- Social Automation V2 — Publish Bridge: account social con OAuth
-- Esegui dopo 005_content_assets.sql

create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clienti(id) on delete cascade,
  platform text not null
    check (platform in ('instagram', 'facebook', 'tiktok', 'pinterest', 'linkedin', 'youtube')),
  platform_account_id text not null,
  platform_username text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  attivo boolean not null default true,
  last_publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, platform, platform_account_id)
);

create index if not exists idx_social_accounts_cliente on social_accounts(cliente_id, platform);
create index if not exists idx_social_accounts_token_expiry on social_accounts(token_expires_at);

comment on table social_accounts is 'Account social collegati via OAuth per pubblicazione';
comment on column social_accounts.access_token is 'Token OAuth criptato';
comment on column social_accounts.refresh_token is 'Refresh token per rinnovo automatico';
comment on column social_accounts.token_expires_at is 'Scadenza token (null = non scade)';

-- Trigger updated_at
drop trigger if exists tr_social_accounts_updated_at on social_accounts;
create trigger tr_social_accounts_updated_at
  before update on social_accounts
  for each row execute function update_updated_at();
