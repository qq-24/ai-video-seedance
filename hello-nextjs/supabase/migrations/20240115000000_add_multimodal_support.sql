-- Add scene_mode enum type
DO $$ BEGIN
    CREATE TYPE scene_mode AS ENUM ('story', 'free');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add mode field to scenes table
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS mode scene_mode DEFAULT 'story';

-- Add material_type enum type
DO $$ BEGIN
    CREATE TYPE material_type AS ENUM ('audio', 'video', 'image', 'text');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    type material_type NOT NULL,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    metadata JSONB,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create video_chains table
CREATE TABLE IF NOT EXISTS video_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create video_chain_items table
CREATE TABLE IF NOT EXISTS video_chain_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES video_chains(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    parent_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_materials_scene_id ON materials(scene_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_video_chains_project_id ON video_chains(project_id);
CREATE INDEX IF NOT EXISTS idx_video_chain_items_chain_id ON video_chain_items(chain_id);
CREATE INDEX IF NOT EXISTS idx_video_chain_items_video_id ON video_chain_items(video_id);

-- Enable RLS (Row Level Security)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_chain_items ENABLE ROW LEVEL SECURITY;

-- Materials RLS policies
CREATE POLICY "Users can view materials in their scenes" ON materials
    FOR SELECT USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can insert materials in their scenes" ON materials
    FOR INSERT WITH CHECK (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can update materials in their scenes" ON materials
    FOR UPDATE USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can delete materials in their scenes" ON materials
    FOR DELETE USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

-- Video Chains RLS policies
CREATE POLICY "Users can view video chains in their projects" ON video_chains
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert video chains in their projects" ON video_chains
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update video chains in their projects" ON video_chains
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete video chains in their projects" ON video_chains
    FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Video Chain Items RLS policies
CREATE POLICY "Users can view video chain items in their chains" ON video_chain_items
    FOR SELECT USING (
        chain_id IN (SELECT id FROM video_chains WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can insert video chain items in their chains" ON video_chain_items
    FOR INSERT WITH CHECK (
        chain_id IN (SELECT id FROM video_chains WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can update video chain items in their chains" ON video_chain_items
    FOR UPDATE USING (
        chain_id IN (SELECT id FROM video_chains WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can delete video chain items in their chains" ON video_chain_items
    FOR DELETE USING (
        chain_id IN (SELECT id FROM video_chains WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );
