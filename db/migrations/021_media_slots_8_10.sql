-- Carosello fino a 10 foto (limite Instagram). Lo schema aveva link_media_1..7;
-- aggiungiamo 8,9,10 così un carosello può usare il massimo che le piattaforme
-- accettano. Additivo e idempotente: nessun impatto sui contenuti esistenti.
alter table calendario add column if not exists link_media_8  text;
alter table calendario add column if not exists link_media_9  text;
alter table calendario add column if not exists link_media_10 text;
