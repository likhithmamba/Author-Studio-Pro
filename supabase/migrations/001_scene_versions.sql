-- Migration 001: Create scene_versions table for version history
-- Required by: editor_routes.py (line 217) which already tries to INSERT into this table
-- Gracefully fails without it, but history is lost

CREATE TABLE IF NOT EXISTS scene_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    label TEXT DEFAULT 'Auto-save',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast version lookups by scene
CREATE INDEX IF NOT EXISTS idx_scene_versions_scene_id ON scene_versions(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_versions_user_id ON scene_versions(user_id);

-- RLS: Users can only see their own versions
ALTER TABLE scene_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scene versions"
    ON scene_versions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own scene versions"
    ON scene_versions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Note: Service role key bypasses RLS, so the FastAPI backend can still
-- read/write freely. This only prevents direct frontend access via anon key.
