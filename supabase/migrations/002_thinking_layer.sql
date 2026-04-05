-- 1. Quick Captures
CREATE TABLE quick_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'note'
    CHECK (type IN ('note','scene_fragment','character_thought','plot_idea','research')),
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox','promoted','archived')),
  promoted_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their captures"
  ON quick_captures FOR ALL USING (auth.uid() = user_id);

-- 2. Idea Cards
CREATE TABLE idea_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  body TEXT DEFAULT '',
  color TEXT DEFAULT 'white'
    CHECK (color IN ('white','yellow','blue','green','red','purple')),
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE idea_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their idea cards"
  ON idea_cards FOR ALL USING (auth.uid() = user_id);

-- 3. Idea Connections
CREATE TABLE idea_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_card_id UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE,
  to_card_id UUID NOT NULL REFERENCES idea_cards(id) ON DELETE CASCADE
);
ALTER TABLE idea_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their connections"
  ON idea_connections FOR ALL USING (auth.uid() = user_id);

-- 4. What-If Scenarios
CREATE TABLE what_if_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  consequences TEXT[] DEFAULT '{}',
  character_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('exploring','draft','rejected','chosen')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE what_if_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their what-ifs"
  ON what_if_scenarios FOR ALL USING (auth.uid() = user_id);

-- 5. Thread Cards
CREATE TABLE thread_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'subplot'
    CHECK (type IN ('subplot','theme','character_arc','foreshadowing','motif')),
  chapter_ids UUID[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unplaced'
    CHECK (status IN ('unplaced','in_progress','woven_in')),
  status_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE thread_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their threads"
  ON thread_cards FOR ALL USING (auth.uid() = user_id);

-- 6. Story Branches
CREATE TABLE story_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  trigger_chapter_id TEXT,
  trigger_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE story_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their branches"
  ON story_branches FOR ALL USING (auth.uid() = user_id);

-- 7. Branch Paths
CREATE TABLE branch_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES story_branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  summary TEXT DEFAULT '',
  consequences TEXT[] DEFAULT '{}',
  character_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'considering'
    CHECK (status IN ('considering','active','discarded')),
  is_canonical BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE branch_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their branch paths"
  ON branch_paths FOR ALL USING (auth.uid() = user_id);

-- 8. Graveyard
CREATE TABLE graveyard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_type TEXT NOT NULL,
  content_snapshot JSONB NOT NULL DEFAULT '{}',
  reason TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  restored BOOLEAN DEFAULT FALSE,
  restored_at TIMESTAMPTZ,
  new_id UUID,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE graveyard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their graveyard"
  ON graveyard FOR ALL USING (auth.uid() = user_id);
