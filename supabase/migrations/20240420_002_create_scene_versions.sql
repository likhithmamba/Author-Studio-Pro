-- 2.2 scene_versions table
CREATE TABLE scene_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id     UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  content      TEXT NOT NULL,
  word_count   INTEGER NOT NULL DEFAULT 0,
  label        TEXT NOT NULL DEFAULT 'Auto-save',
  -- label types: 'Auto-save' | 'Manual save' | 'Session start' | 'Restored from v{id}'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE scene_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scene_versions_owner ON scene_versions
  USING (user_id = auth.uid());

-- Keep only last 50 versions per scene (prevent unbounded growth)
CREATE OR REPLACE FUNCTION prune_scene_versions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM scene_versions
  WHERE scene_id = NEW.scene_id
    AND id NOT IN (
      SELECT id FROM scene_versions
      WHERE scene_id = NEW.scene_id
      ORDER BY created_at DESC
      LIMIT 50
    );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER prune_versions
  AFTER INSERT ON scene_versions
  FOR EACH ROW EXECUTE FUNCTION prune_scene_versions();

CREATE INDEX idx_versions_scene ON scene_versions(scene_id, created_at DESC);
