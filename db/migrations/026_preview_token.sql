-- Token opaco per il link anteprima condivisibile (anti-IDOR).
-- Prima /preview/<id_contenuto> usava l'id_contenuto enumerabile
-- (C<timestamp_b36>_<n>): chiunque poteva indovinare/iterare gli id e leggere
-- le anteprime altrui. Con un token uuid casuale il link resta non-indovinabile.

ALTER TABLE calendario
  ADD COLUMN IF NOT EXISTS preview_token uuid DEFAULT gen_random_uuid();

-- Backfill righe esistenti che non hanno ancora un token.
UPDATE calendario SET preview_token = gen_random_uuid() WHERE preview_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calendario_preview_token_idx
  ON calendario(preview_token);
