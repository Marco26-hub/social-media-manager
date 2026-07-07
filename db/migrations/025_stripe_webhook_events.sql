-- Idempotenza webhook Stripe.
-- Evita doppia elaborazione dello stesso event.id in caso di retry Stripe,
-- timeout di rete o deploy durante l'elaborazione.

create table if not exists stripe_webhook_events (
  event_id          text primary key,
  event_type        text not null,
  livemode          boolean not null default false,
  raw               jsonb,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  processing_error  text
);

create index if not exists stripe_webhook_events_received_idx
  on stripe_webhook_events(received_at desc);

create index if not exists stripe_webhook_events_type_idx
  on stripe_webhook_events(event_type, received_at desc);
