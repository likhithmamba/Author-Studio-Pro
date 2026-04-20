-- 2.5 Metadata tables: characters, locations, timeline_events, research_notes

-- characters
CREATE TABLE characters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  name           TEXT NOT NULL,
  role           TEXT,
  description    TEXT,
  traits         JSONB DEFAULT '[]',
  goals          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY characters_owner ON characters USING (user_id = auth.uid());
CREATE INDEX idx_characters_project ON characters(project_id);

-- locations
CREATE TABLE locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  name           TEXT NOT NULL,
  description    TEXT,
  history        TEXT,
  tags           JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY locations_owner ON locations USING (user_id = auth.uid());
CREATE INDEX idx_locations_project ON locations(project_id);

-- timeline_events
CREATE TABLE timeline_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  title          TEXT NOT NULL,
  description    TEXT,
  event_date     TEXT, -- e.g. "1952-08-01" or abstract like "Day 1"
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY timeline_events_owner ON timeline_events USING (user_id = auth.uid());
CREATE INDEX idx_timeline_events_project ON timeline_events(project_id);

-- research_notes
CREATE TABLE research_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  title          TEXT NOT NULL,
  content        TEXT,
  url            TEXT,
  tags           JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER research_notes_updated_at
  BEFORE UPDATE ON research_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY research_notes_owner ON research_notes USING (user_id = auth.uid());
CREATE INDEX idx_research_notes_project ON research_notes(project_id);
