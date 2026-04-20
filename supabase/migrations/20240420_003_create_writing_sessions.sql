-- 2.3 writing_sessions table
CREATE TABLE writing_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  session_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  words_added    INTEGER NOT NULL DEFAULT 0,
  words_total_eod INTEGER,          -- filled at end of day by background job
  duration_secs  INTEGER,
  mood           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one session record per user per project per day
-- (upsert increments words_added)
CREATE UNIQUE INDEX idx_sessions_daily
  ON writing_sessions(user_id, project_id, session_date);

ALTER TABLE writing_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_owner ON writing_sessions
  USING (user_id = auth.uid());
