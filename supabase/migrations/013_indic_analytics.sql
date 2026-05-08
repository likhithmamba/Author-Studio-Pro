-- migrations/013_indic_analytics.sql
ALTER TABLE writing_sessions ADD COLUMN IF NOT EXISTS words_devanagari  INTEGER DEFAULT 0;
ALTER TABLE writing_sessions ADD COLUMN IF NOT EXISTS words_kannada     INTEGER DEFAULT 0;
ALTER TABLE writing_sessions ADD COLUMN IF NOT EXISTS words_tamil       INTEGER DEFAULT 0;
ALTER TABLE writing_sessions ADD COLUMN IF NOT EXISTS words_telugu      INTEGER DEFAULT 0;
ALTER TABLE writing_sessions ADD COLUMN IF NOT EXISTS words_latin       INTEGER DEFAULT 0;
ALTER TABLE writing_sessions ADD COLUMN IF NOT EXISTS is_hinglish       BOOLEAN DEFAULT FALSE;
