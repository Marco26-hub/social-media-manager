-- Config GLOBALE (agenzia) di abilitazione per agente automatico. Secondo livello
-- di controllo oltre a generation_mode per-cliente: un agente produce per un cliente
-- solo se (cliente su AUTO) AND (agente abilitato qui). Riga assente = abilitato.
create table if not exists agent_config (
  agent_key   text primary key,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);

insert into agent_config (agent_key, enabled) values
  ('content', true), ('seo', true), ('ads', true), ('report', true), ('competitor', true)
on conflict (agent_key) do nothing;
