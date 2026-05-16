-- Figma Workspace Schema for storing workspace files, assets, and sync data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.figma_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  figma_user_id TEXT UNIQUE,
  figma_access_token TEXT ENCRYPTED,
  figma_refresh_token TEXT ENCRYPTED,
  figma_team_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace files (imported from Figma)
CREATE TABLE IF NOT EXISTS public.figma_workspace_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  figma_file_key TEXT NOT NULL,
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  status TEXT DEFAULT 'synced' CHECK (status IN ('synced', 'syncing', 'error')),
  file_data JSONB,
  metadata JSONB DEFAULT '{}',
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, figma_file_key)
);

-- Workspace assets (components, styles, images)
CREATE TABLE IF NOT EXISTS public.figma_workspace_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('COMPONENT', 'COMPONENT_SET', 'IMAGE', 'STYLE')),
  thumbnail_url TEXT,
  figma_key TEXT NOT NULL,
  figma_node_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_id, figma_key)
);

-- Design versions (history tracking)
CREATE TABLE IF NOT EXISTS public.figma_design_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT,
  description TEXT,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export history (design to code conversions)
CREATE TABLE IF NOT EXISTS public.figma_export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('REACT', 'HTML', 'VUE', 'SVELTE', 'JSON')),
  generated_code TEXT,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync jobs (track Figma API sync status)
CREATE TABLE IF NOT EXISTS public.figma_sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.figma_workspace_files(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('FILE_IMPORT', 'COMPONENT_FETCH', 'FULL_SYNC')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS public.figma_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.figma_workspace_files(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_figma_workspace_files_user_id ON public.figma_workspace_files(user_id);
CREATE INDEX idx_figma_workspace_files_status ON public.figma_workspace_files(status);
CREATE INDEX idx_figma_workspace_assets_file_id ON public.figma_workspace_assets(file_id);
CREATE INDEX idx_figma_workspace_assets_type ON public.figma_workspace_assets(asset_type);
CREATE INDEX idx_figma_design_versions_file_id ON public.figma_design_versions(file_id);
CREATE INDEX idx_figma_export_history_file_id ON public.figma_export_history(file_id);
CREATE INDEX idx_figma_sync_jobs_user_id ON public.figma_sync_jobs(user_id);
CREATE INDEX idx_figma_sync_jobs_status ON public.figma_sync_jobs(status);
CREATE INDEX idx_figma_activity_logs_user_id ON public.figma_activity_logs(user_id);
CREATE INDEX idx_figma_activity_logs_created_at ON public.figma_activity_logs(created_at);

-- Row-level security
ALTER TABLE public.figma_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_workspace_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own figma profile" ON public.figma_users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can update their own figma profile" ON public.figma_users
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Users can view their own files" ON public.figma_workspace_files
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create their own files" ON public.figma_workspace_files
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own files" ON public.figma_workspace_files
  FOR UPDATE USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own files" ON public.figma_workspace_files
  FOR DELETE USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can view their own assets" ON public.figma_workspace_assets
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create their own assets" ON public.figma_workspace_assets
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can view their own versions" ON public.figma_design_versions
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can view their own exports" ON public.figma_export_history
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can create their own exports" ON public.figma_export_history
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can view their own sync jobs" ON public.figma_sync_jobs
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can view their own activity logs" ON public.figma_activity_logs
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.figma_users WHERE auth_id = auth.uid()
  ));
