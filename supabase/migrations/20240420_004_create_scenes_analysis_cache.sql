-- 2.4 scenes_analysis_cache table
-- Cache prose analysis results to avoid re-analysing unchanged content
CREATE TABLE scenes_analysis_cache (
  scene_id         UUID PRIMARY KEY REFERENCES scenes(id) ON DELETE CASCADE,
  content_hash     TEXT NOT NULL,   -- SHA-256 of content
  grade            TEXT,
  readability      INTEGER,
  pacing           INTEGER,
  sentence_variety INTEGER,
  show_vs_tell     INTEGER,
  dialogue_ratio   INTEGER,
  passive_voice    INTEGER,
  adverb_density   INTEGER,
  cliche_score     INTEGER,
  overused_words   JSONB,
  sentence_lengths JSONB,
  analysed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- When scene content changes, invalidate cache
CREATE OR REPLACE FUNCTION invalidate_analysis_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM scenes_analysis_cache WHERE scene_id = NEW.id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER scenes_content_changed
  AFTER UPDATE OF content ON scenes
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION invalidate_analysis_cache();
