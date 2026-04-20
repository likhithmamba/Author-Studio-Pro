-- 2.1 scenes table
CREATE TABLE scenes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id     UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  title          TEXT NOT NULL DEFAULT 'Untitled Scene',
  content        TEXT NOT NULL DEFAULT '',
  word_count     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','done','archived')),
  pov            TEXT,
  location       TEXT,
  time_of_day    TEXT,
  tension        TEXT,
  mood           TEXT,
  act            TEXT,
  position       INTEGER NOT NULL DEFAULT 0,
  notes          JSONB NOT NULL DEFAULT '[]',
  tracked_changes JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql;

CREATE TRIGGER scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: auto-compute word_count on content change
CREATE OR REPLACE FUNCTION compute_word_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.word_count = array_length(
    string_to_array(trim(NEW.content), ' '), 1
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER scenes_word_count
  BEFORE INSERT OR UPDATE OF content ON scenes
  FOR EACH ROW EXECUTE FUNCTION compute_word_count();

-- RLS
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenes_owner ON scenes
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_scenes_chapter ON scenes(chapter_id);
CREATE INDEX idx_scenes_project ON scenes(project_id);
CREATE INDEX idx_scenes_updated ON scenes(updated_at DESC);
