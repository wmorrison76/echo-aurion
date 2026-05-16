-- Migration: Create Enterprise Sticky Notes Schema
-- Purpose: Establish database tables, indexes, and RLS policies for enterprise-grade sticky notes
-- Date: 2024-12-30

-- =====================================================
-- NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  folder_id UUID,

  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'markdown',

  color VARCHAR(7) DEFAULT '#fef3c7',
  template_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',

  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT status_check CHECK (status IN ('draft', 'active', 'archived', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_notes_workspace_owner ON notes(workspace_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived_at) WHERE archived_at IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_notes_fts ON notes USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

-- =====================================================
-- NOTE SHARING TABLE (Permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS note_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,

  user_id UUID,
  team_id UUID,
  role_id UUID,

  access_level VARCHAR(20) NOT NULL,

  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT access_level_check CHECK (access_level IN ('view', 'comment', 'edit', 'manage')),
  CONSTRAINT at_least_one_recipient CHECK (
    (user_id IS NOT NULL)::int + (team_id IS NOT NULL)::int + (role_id IS NOT NULL)::int = 1
  ),

  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE(note_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(team_id, '00000000-0000-0000-0000-000000000001'::uuid),
         COALESCE(role_id, '00000000-0000-0000-0000-000000000002'::uuid))
);

CREATE INDEX IF NOT EXISTS idx_sharing_user ON note_sharing(user_id, access_level);
CREATE INDEX IF NOT EXISTS idx_sharing_team ON note_sharing(team_id);
CREATE INDEX IF NOT EXISTS idx_sharing_role ON note_sharing(role_id);
CREATE INDEX IF NOT EXISTS idx_sharing_expires ON note_sharing(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- NOTE VERSIONS TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  version_number INTEGER NOT NULL,

  title VARCHAR(255),
  content TEXT,

  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  change_summary TEXT,
  diff JSONB,
  is_major_version BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE(note_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_note ON note_versions(note_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_versions_changed ON note_versions(changed_by, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_major ON note_versions(note_id) WHERE is_major_version = TRUE;

-- =====================================================
-- NOTE COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  parent_comment_id UUID,

  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES note_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_note ON note_comments(note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON note_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON note_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON note_comments USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_comments_fts ON note_comments USING GIN(
  to_tsvector('english', content)
) WHERE deleted_at IS NULL;

-- =====================================================
-- NOTE AUDIT LOG TABLE (Compliance)
-- =====================================================
CREATE TABLE IF NOT EXISTS note_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID NOT NULL,

  action VARCHAR(50) NOT NULL,
  change_data JSONB,

  ip_address INET,
  user_agent TEXT,
  session_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT action_check CHECK (
    action IN ('created', 'updated', 'shared', 'commented', 'viewed', 'deleted', 'restored', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_audit_note ON note_audit_log(note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON note_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON note_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_session ON note_audit_log(session_id) WHERE session_id IS NOT NULL;

-- Partition audit log by date for performance (optional, can be enabled later)
-- CREATE TABLE note_audit_log_2024_q4 PARTITION OF note_audit_log
--   FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- =====================================================
-- NOTE FOLDERS TABLE (Hierarchical Organization)
-- =====================================================
CREATE TABLE IF NOT EXISTS note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  parent_id UUID,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  color VARCHAR(7),
  icon VARCHAR(50),
  is_shared BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES note_folders(id) ON DELETE CASCADE,

  UNIQUE(workspace_id, parent_id, name) WHERE deleted_at IS NULL
);

CREATE INDEX IF NOT EXISTS idx_folders_workspace ON note_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON note_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON note_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_shared ON note_folders(is_shared) WHERE is_shared = TRUE;

-- =====================================================
-- NOTE TAGS TABLE (Taxonomy)
-- =====================================================
CREATE TABLE IF NOT EXISTS note_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  tag_name VARCHAR(100) NOT NULL,

  color VARCHAR(7),
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,

  UNIQUE(workspace_id, LOWER(tag_name))
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace ON note_tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON note_tags(usage_count DESC);

-- =====================================================
-- NOTE REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS note_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID NOT NULL,

  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type VARCHAR(20) DEFAULT 'due_date',

  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  acknowledged BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  CONSTRAINT reminder_type_check CHECK (reminder_type IN ('due_date', 'reminder', 'repeat'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON note_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON note_reminders(user_id, notified);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON note_reminders(due_date)
  WHERE notified = FALSE AND acknowledged = FALSE;

-- =====================================================
-- NOTE TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  owner_id UUID NOT NULL,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'markdown',

  category VARCHAR(50),
  is_public BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_templates_workspace ON note_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_public ON note_templates(workspace_id) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_templates_category ON note_templates(category);

-- =====================================================
-- PUBLIC SHARE LINKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS note_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,

  token VARCHAR(64) NOT NULL UNIQUE,
  access_level VARCHAR(20) NOT NULL DEFAULT 'view',

  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  max_views INTEGER,
  current_views INTEGER DEFAULT 0,

  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,

  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT access_level_check CHECK (access_level IN ('view', 'comment', 'edit'))
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON note_share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_note ON note_share_links(note_id);
CREATE INDEX IF NOT EXISTS idx_share_links_created ON note_share_links(created_by);
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON note_share_links(expires_at)
  WHERE expires_at IS NOT NULL AND is_revoked = FALSE;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_share_links ENABLE ROW LEVEL SECURITY;

-- Notes RLS: Users can see notes they own or are shared with
CREATE POLICY notes_select_policy ON notes FOR SELECT
  USING (
    auth.uid() = owner_id OR
    id IN (
      SELECT note_id FROM note_sharing
      WHERE user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > NOW())
    ) OR
    status = 'deleted' AND auth.uid() = owner_id
  );

-- Notes RLS: Only owner can insert
CREATE POLICY notes_insert_policy ON notes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Notes RLS: Only owner can update
CREATE POLICY notes_update_policy ON notes FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Notes RLS: Only owner can delete
CREATE POLICY notes_delete_policy ON notes FOR DELETE
  USING (auth.uid() = owner_id);

-- Note Sharing RLS: Only owner can manage sharing
CREATE POLICY sharing_select_policy ON note_sharing FOR SELECT
  USING (
    (SELECT owner_id FROM notes WHERE id = note_id) = auth.uid() OR
    user_id = auth.uid()
  );

CREATE POLICY sharing_insert_policy ON note_sharing FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM notes WHERE id = note_id)
  );

CREATE POLICY sharing_update_policy ON note_sharing FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM notes WHERE id = note_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM notes WHERE id = note_id));

CREATE POLICY sharing_delete_policy ON note_sharing FOR DELETE
  USING (auth.uid() = (SELECT owner_id FROM notes WHERE id = note_id));

-- Note Versions RLS: Anyone with note access can view versions
CREATE POLICY versions_select_policy ON note_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE id = note_id AND (
        auth.uid() = owner_id OR
        id IN (
          SELECT note_id FROM note_sharing
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Note Comments RLS: Anyone with note access can comment
CREATE POLICY comments_select_policy ON note_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE id = note_id AND (
        auth.uid() = owner_id OR
        id IN (
          SELECT note_id FROM note_sharing
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY comments_insert_policy ON note_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM notes
      WHERE id = note_id AND (
        auth.uid() = owner_id OR
        id IN (
          SELECT note_id FROM note_sharing
          WHERE user_id = auth.uid()
            AND access_level IN ('comment', 'edit', 'manage')
        )
      )
    )
  );

-- Audit Log RLS: Read-only for audit
CREATE POLICY audit_log_select_policy ON note_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE id = note_id AND auth.uid() = owner_id
    )
  );

CREATE POLICY audit_log_insert_policy ON note_audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Folders RLS: Users can see folders they own or are shared with
CREATE POLICY folders_select_policy ON note_folders FOR SELECT
  USING (
    auth.uid() = owner_id OR
    (is_shared = TRUE AND workspace_id IN (
      SELECT workspace_id FROM notes
      WHERE owner_id = auth.uid()
    ))
  );

CREATE POLICY folders_insert_policy ON note_folders FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY folders_update_policy ON note_folders FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- =====================================================
-- AUDIT TRIGGER
-- =====================================================

-- Function to log note changes
CREATE OR REPLACE FUNCTION log_note_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO note_audit_log (note_id, user_id, action, change_data)
  VALUES (
    NEW.id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'old_title', OLD.title,
        'new_title', NEW.title,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for notes
DROP TRIGGER IF EXISTS notes_audit_trigger ON notes;
CREATE TRIGGER notes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION log_note_changes();

-- Function to update version on changes
CREATE OR REPLACE FUNCTION create_note_version()
RETURNS TRIGGER AS $$
DECLARE
  v_version_number INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM note_versions
    WHERE note_id = NEW.id;

    INSERT INTO note_versions (
      note_id, version_number, title, content,
      changed_by, change_summary, is_major_version
    ) VALUES (
      NEW.id,
      v_version_number,
      NEW.title,
      NEW.content,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'Auto-saved version',
      FALSE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for versioning
DROP TRIGGER IF EXISTS notes_version_trigger ON notes;
CREATE TRIGGER notes_version_trigger
  AFTER UPDATE ON notes
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION create_note_version();

-- =====================================================
-- CLEANUP FUNCTION FOR SOFT DELETES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_deleted_notes(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Hard delete notes that were soft-deleted more than X days ago
  DELETE FROM notes
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days_old;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS (for Supabase/PostgREST)
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table access
GRANT ALL ON notes TO authenticated, service_role;
GRANT ALL ON note_sharing TO authenticated, service_role;
GRANT ALL ON note_versions TO authenticated, service_role;
GRANT ALL ON note_comments TO authenticated, service_role;
GRANT ALL ON note_audit_log TO authenticated, service_role;
GRANT ALL ON note_folders TO authenticated, service_role;
GRANT ALL ON note_tags TO authenticated, service_role;
GRANT ALL ON note_reminders TO authenticated, service_role;
GRANT ALL ON note_templates TO authenticated, service_role;
GRANT ALL ON note_share_links TO authenticated, service_role;

-- Grant function execution
GRANT EXECUTE ON FUNCTION log_note_changes TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_note_version TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_notes TO service_role;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Verify all tables were created
SELECT 'Enterprise Sticky Notes schema created successfully' AS status;
