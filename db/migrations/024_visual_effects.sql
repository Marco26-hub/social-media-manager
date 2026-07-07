-- Effetti visual per reel/carosello.
-- Flag "trending" arricchisce il prompt Blotato con descrittori virali del momento
-- (cut rapidi, hook 0-2s, transizioni whip-pan, testo overlay animato) senza
-- promettere effetti che Blotato non applica meccanicamente: l'AI del template
-- interpreta il prompt. Preset "premium" / "minimal" / "classico" alternativi.

ALTER TABLE calendario
  ADD COLUMN IF NOT EXISTS visual_preset        text,            -- 'trending' | 'premium' | 'minimal' | 'classico' | null
  ADD COLUMN IF NOT EXISTS use_trending_effects boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visual_effects       jsonb;           -- ['whip-pan','fast-cuts','beat-drop','text-pop'] etc

COMMENT ON COLUMN calendario.visual_preset IS 'Preset stile per template Blotato (reel/carosello): trending|premium|minimal|classico';
COMMENT ON COLUMN calendario.use_trending_effects IS 'Se true, planVisual arricchisce il prompt con descrittori virali (cuts rapidi, hook aggressivo, transizioni)';
COMMENT ON COLUMN calendario.visual_effects IS 'Effetti richiesti dal cliente/AI, passati come hint al prompt Blotato (jsonb array di string)';
