-- ─── Manuscripts ─────────────────────────────────────────────────────────────
-- Storing the actual novel content (chapters, text, metadata) as JSONB
-- This ensures a simple, flexible, and performant save structure.

CREATE TABLE IF NOT EXISTS manuscripts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  TEXT NOT NULL UNIQUE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their manuscripts"
    ON manuscripts FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_manuscripts_project ON manuscripts(project_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_user ON manuscripts(user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_manuscript_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_manuscript_timestamp ON manuscripts;
CREATE TRIGGER trigger_update_manuscript_timestamp
    BEFORE UPDATE ON manuscripts
    FOR EACH ROW
    EXECUTE FUNCTION update_manuscript_timestamp();
