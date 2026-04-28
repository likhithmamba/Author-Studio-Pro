CREATE TABLE IF NOT EXISTS chapters (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  title      TEXT NOT NULL DEFAULT 'Chapter 1',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY chapters_owner ON chapters FOR ALL USING (user_id = auth.uid());
CREATE INDEX idx_chapters_project ON chapters(project_id);
