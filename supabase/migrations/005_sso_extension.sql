-- 005_sso_extension.sql

-- 1. Alter story_nodes
ALTER TABLE story_nodes 
    ADD COLUMN IF NOT EXISTS node_type text CHECK (node_type IN ('scene', 'event', 'character')) DEFAULT 'character',
    ADD COLUMN IF NOT EXISTS confidence_score float4 DEFAULT 0.70,
    ADD COLUMN IF NOT EXISTS chapter_id text;

-- 2. Alter story_edges
ALTER TABLE story_edges
    ADD COLUMN IF NOT EXISTS edge_type text CHECK (edge_type IN ('causality', 'relationship', 'conflict')) DEFAULT 'causality';

-- 3. Character States
CREATE TABLE IF NOT EXISTS character_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    character_id text NOT NULL,
    character_name text NOT NULL,
    role text,
    arc_phase text CHECK (arc_phase IN ('introduction', 'development', 'conflict', 'transformation', 'resolution')),
    current_state text,
    chapter_id text,
    confidence_score float4 DEFAULT 0.70,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Conflict States
CREATE TABLE IF NOT EXISTS conflict_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    conflict_id text NOT NULL,
    type text CHECK (type IN ('internal', 'interpersonal', 'societal', 'environmental')),
    intensity float4 CHECK (intensity >= 0 AND intensity <= 1),
    parties text[], -- array of character IDs
    status text CHECK (status IN ('active', 'escalating', 'resolved', 'dormant')),
    chapter_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Progression Markers
CREATE TABLE IF NOT EXISTS progression_markers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    marker_id text NOT NULL,
    chapter_id text NOT NULL,
    phase text CHECK (phase IN ('setup', 'escalation', 'peak', 'resolution')),
    confidence float4 DEFAULT 0.70,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE character_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_markers ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "users_own_character_states" ON character_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_conflict_states" ON conflict_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_progression_markers" ON progression_markers FOR ALL USING (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER trigger_update_character_states_timestamp BEFORE UPDATE ON character_states FOR EACH ROW EXECUTE FUNCTION update_story_node_timestamp();
CREATE TRIGGER trigger_update_conflict_states_timestamp BEFORE UPDATE ON conflict_states FOR EACH ROW EXECUTE FUNCTION update_story_node_timestamp();
CREATE TRIGGER trigger_update_progression_markers_timestamp BEFORE UPDATE ON progression_markers FOR EACH ROW EXECUTE FUNCTION update_story_node_timestamp();
