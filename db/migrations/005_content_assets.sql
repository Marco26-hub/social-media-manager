-- Social Automation V2 — Content assets: campi strutturati per contenuti ricchi
-- Esegui dopo 001_full_schema.sql

alter table calendario add column if not exists scenes_json jsonb;
alter table calendario add column if not exists slides_json jsonb;
alter table calendario add column if not exists overlay_text text;
alter table calendario add column if not exists alt_text text;
alter table calendario add column if not exists tags jsonb;
alter table calendario add column if not exists thumbnail_url text;
alter table calendario add column if not exists idea_visual text;
alter table calendario add column if not exists voiceover_script text;
alter table calendario add column if not exists music_mood text;
alter table calendario add column if not exists checked_alt_text text check (checked_alt_text in ('SI','NO'));
alter table calendario add column if not exists checked_aspect_ratio text check (checked_aspect_ratio in ('SI','NO'));
alter table calendario add column if not exists checked_media_valid text check (checked_media_valid in ('SI','NO'));

comment on column calendario.scenes_json is 'Array scene video: [{numero, secondi, descrizione, overlay_testo}]';
comment on column calendario.slides_json is 'Array slide carosello: [{numero, testo, visual}]';
comment on column calendario.overlay_text is 'Testo in sovrimpressione su reel/story/pin';
comment on column calendario.alt_text is 'Alt text per immagine/thumbnail';
comment on column calendario.tags is 'Array tag/parole chiave (YouTube, Pinterest)';
comment on column calendario.thumbnail_url is 'URL copertina/thumbnail';
comment on column calendario.idea_visual is 'Descrizione del visual/immagine da produrre';
comment on column calendario.voiceover_script is 'Script voiceover per video/reel';
comment on column calendario.music_mood is 'Mood musicale suggerito';
comment on column calendario.checked_alt_text is 'Checklist: alt text verificato';
comment on column calendario.checked_aspect_ratio is 'Checklist: aspect ratio corretto';
comment on column calendario.checked_media_valid is 'Checklist: media valido e raggiungibile';
