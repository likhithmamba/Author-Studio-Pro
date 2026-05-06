-- Migration 002: Create writing_sessions table for streak tracking
-- Required by: editor_routes.py (line 680) which already tries to INSERT/UPDATE

CREATE TABLE IF NOT EXISTS writing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    words_added INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_writing_sessions_user_date ON writing_sessions(user_id, session_date);

ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON writing_sessions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
    ON writing_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
    ON writing_sessions FOR UPDATE USING (user_id = auth.uid());
