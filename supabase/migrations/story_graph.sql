-- Story Nodes and Edges Migration
-- Run this against your Supabase instance to enable the story graph feature.

-- Story Nodes
-- Characters, plot points, chapter markers, and events created by @/# mentions
CREATE TABLE IF NOT EXISTS story_nodes (
    id          text PRIMARY KEY,
    project_id  text NOT NULL,
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    type        text NOT NULL CHECK (type IN ('character', 'plot', 'chapter', 'event')),
    label       text NOT NULL,
    position_x  float DEFAULT 0,
    position_y  float DEFAULT 0,
    chapter_refs text[] DEFAULT '{}',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Story Edges
-- Connections between nodes drawn on the graph canvas
CREATE TABLE IF NOT EXISTS story_edges (
    id          text PRIMARY KEY,
    project_id  text NOT NULL,
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    source      text NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
    target      text NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
    created_at  timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE story_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_nodes" ON story_nodes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_edges" ON story_edges
    FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_nodes_project ON story_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_story_nodes_user ON story_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_edges_project ON story_edges(project_id);
CREATE INDEX IF NOT EXISTS idx_story_edges_user ON story_edges(user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_story_node_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_story_node_timestamp ON story_nodes;
CREATE TRIGGER trigger_update_story_node_timestamp
    BEFORE UPDATE ON story_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_story_node_timestamp();
