-- Figma Collaboration Schema - Comments, Presence, Activity Logs

-- ===== COMMENTS TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  element_id UUID REFERENCES public.figma_canvas_elements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Position
  x DECIMAL,
  y DECIMAL,
  
  -- Status
  resolved BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_figma_comments_file_id ON public.figma_comments(file_id);
CREATE INDEX idx_figma_comments_element_id ON public.figma_comments(element_id);
CREATE INDEX idx_figma_comments_user_id ON public.figma_comments(user_id);
CREATE INDEX idx_figma_comments_resolved ON public.figma_comments(resolved);

-- ===== COMMENT REPLIES TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_comment_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.figma_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited BOOLEAN DEFAULT false
);

CREATE INDEX idx_figma_comment_replies_comment_id ON public.figma_comment_replies(comment_id);
CREATE INDEX idx_figma_comment_replies_user_id ON public.figma_comment_replies(user_id);

-- ===== PRESENCE TABLE =====
CREATE TABLE IF NOT EXISTS public.figma_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'idle', 'offline')),
  
  -- Activity
  last_action TEXT,
  editing_element_id UUID REFERENCES public.figma_canvas_elements(id) ON DELETE SET NULL,
  
  -- Timestamps
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(file_id, user_id)
);

CREATE INDEX idx_figma_presence_file_id ON public.figma_presence(file_id);
CREATE INDEX idx_figma_presence_user_id ON public.figma_presence(user_id);
CREATE INDEX idx_figma_presence_status ON public.figma_presence(status);

-- ===== CURSOR POSITIONS TABLE (for tracking) =====
CREATE TABLE IF NOT EXISTS public.figma_cursor_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Position
  cursor_x DECIMAL NOT NULL,
  cursor_y DECIMAL NOT NULL,
  element_id UUID REFERENCES public.figma_canvas_elements(id) ON DELETE SET NULL,
  
  -- Timestamp
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_figma_cursor_history_file_id ON public.figma_cursor_history(file_id);
CREATE INDEX idx_figma_cursor_history_user_id ON public.figma_cursor_history(user_id);
CREATE INDEX idx_figma_cursor_history_recorded_at ON public.figma_cursor_history(recorded_at);

-- ===== COLLABORATION ACTIVITY LOG =====
CREATE TABLE IF NOT EXISTS public.figma_collaboration_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Action
  action TEXT NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_figma_collaboration_activity_file_id ON public.figma_collaboration_activity(file_id);
CREATE INDEX idx_figma_collaboration_activity_user_id ON public.figma_collaboration_activity(user_id);
CREATE INDEX idx_figma_collaboration_activity_timestamp ON public.figma_collaboration_activity(timestamp);

-- ===== COLLABORATION PERMISSIONS =====
CREATE TABLE IF NOT EXISTS public.figma_collaboration_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Permissions
  can_edit BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  can_view BOOLEAN DEFAULT true,
  can_share BOOLEAN DEFAULT false,
  
  -- Timestamps
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(file_id, user_id)
);

CREATE INDEX idx_figma_collaboration_permissions_file_id ON public.figma_collaboration_permissions(file_id);
CREATE INDEX idx_figma_collaboration_permissions_user_id ON public.figma_collaboration_permissions(user_id);

-- ===== SHARED FILES =====
CREATE TABLE IF NOT EXISTS public.figma_shared_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.figma_workspace_files(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.figma_users(id) ON DELETE CASCADE,
  
  -- Share info
  shared_token TEXT UNIQUE NOT NULL,
  share_url TEXT NOT NULL,
  
  -- Permissions
  allow_edit BOOLEAN DEFAULT false,
  allow_comment BOOLEAN DEFAULT true,
  
  -- Expiry
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_figma_shared_files_file_id ON public.figma_shared_files(file_id);
CREATE INDEX idx_figma_shared_files_owner_id ON public.figma_shared_files(owner_id);
CREATE INDEX idx_figma_shared_files_shared_token ON public.figma_shared_files(shared_token);

-- ===== ROW LEVEL SECURITY =====

ALTER TABLE public.figma_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view comments on their files" ON public.figma_comments
  FOR SELECT USING (
    file_id IN (
      SELECT id FROM public.figma_workspace_files 
      WHERE user_id = auth.uid()::uuid
    )
  );

ALTER TABLE public.figma_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view presence on their files" ON public.figma_presence
  FOR SELECT USING (
    file_id IN (
      SELECT id FROM public.figma_workspace_files 
      WHERE user_id = auth.uid()::uuid
    )
  );

ALTER TABLE public.figma_collaboration_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view permissions for their files" ON public.figma_collaboration_permissions
  FOR SELECT USING (
    file_id IN (
      SELECT id FROM public.figma_workspace_files 
      WHERE user_id = auth.uid()::uuid
    )
  );
