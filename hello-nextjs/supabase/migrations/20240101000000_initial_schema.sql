-- Initial schema: base tables for the video generation platform

-- Create project_stage enum
DO $$ BEGIN
    CREATE TYPE project_stage AS ENUM ('draft', 'scenes', 'images', 'videos', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create image_status enum
DO $$ BEGIN
    CREATE TYPE image_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create video_status enum
DO $$ BEGIN
    CREATE TYPE video_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    story TEXT,
    style TEXT,
    stage project_stage DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    description_confirmed BOOLEAN DEFAULT FALSE,
    image_status image_status DEFAULT 'pending',
    image_confirmed BOOLEAN DEFAULT FALSE,
    video_status video_status DEFAULT 'pending',
    video_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images table
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    duration NUMERIC,
    task_id TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_images_scene_id ON images(scene_id);
CREATE INDEX IF NOT EXISTS idx_videos_scene_id ON videos(scene_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (user_id = auth.uid());

-- Scenes RLS policies
CREATE POLICY "Users can view scenes in their projects" ON scenes
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert scenes in their projects" ON scenes
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update scenes in their projects" ON scenes
    FOR UPDATE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete scenes in their projects" ON scenes
    FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- Images RLS policies
CREATE POLICY "Users can view images in their scenes" ON images
    FOR SELECT USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can insert images in their scenes" ON images
    FOR INSERT WITH CHECK (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can update images in their scenes" ON images
    FOR UPDATE USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can delete images in their scenes" ON images
    FOR DELETE USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

-- Videos RLS policies
CREATE POLICY "Users can view videos in their scenes" ON videos
    FOR SELECT USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can insert videos in their scenes" ON videos
    FOR INSERT WITH CHECK (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can update videos in their scenes" ON videos
    FOR UPDATE USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

CREATE POLICY "Users can delete videos in their scenes" ON videos
    FOR DELETE USING (
        scene_id IN (SELECT id FROM scenes WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
    );

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload media" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their media" ON storage.objects
    FOR DELETE USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);
