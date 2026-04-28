ALTER TABLE characters     ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
ALTER TABLE locations      ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
ALTER TABLE research_notes  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key  TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL,
  result     JSONB NOT NULL,
  token_cost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);
CREATE INDEX idx_ai_cache_key     ON ai_analysis_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON ai_analysis_cache(expires_at);

-- Fix progression_markers type mismatch:
ALTER TABLE progression_markers ALTER COLUMN chapter_id TYPE UUID USING chapter_id::UUID;

-- Remove duplicate RLS conflict:
DROP POLICY IF EXISTS "Service role full access on users" ON users;

-- Remove dead table overhead:
DROP TABLE IF EXISTS scenes_analysis_cache CASCADE;
