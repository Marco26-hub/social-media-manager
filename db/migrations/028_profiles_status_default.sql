-- Hardening: default fail-safe per profiles.status.
-- La 022 aveva scelto default 'active' per non far perdere accesso agli utenti
-- ESISTENTI (il backfill dell'ADD COLUMN li ha marcati 'active'). Ma per le righe
-- NUOVE un default 'active' è fail-open: un INSERT che dimentica `status` creerebbe
-- un account già attivo, scavalcando il gate di attivazione admin/pagamento.
-- Il flusso di registrazione imposta già 'pending' esplicitamente: questo cambia
-- SOLO il DEFAULT per gli insert futuri (fail-safe). Le righe esistenti NON vengono
-- toccate e restano 'active'.
alter table profiles alter column status set default 'pending';
