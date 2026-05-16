-- Phase 14: Enterprise File Management Schema

-- File metadata table
CREATE TABLE IF NOT EXISTS whiteboard_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL,
  session_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  file_hash VARCHAR(64),
  access_level TEXT NOT NULL DEFAULT 'private',
  is_scanned BOOLEAN DEFAULT false,
  scan_result TEXT,
  metadata JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_whiteboard_files_board_id ON whiteboard_files(board_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_files_session_id ON whiteboard_files(session_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_files_uploaded_by ON whiteboard_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_whiteboard_files_access_level ON whiteboard_files(access_level);
CREATE INDEX IF NOT EXISTS idx_whiteboard_files_created_at ON whiteboard_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whiteboard_files_file_hash ON whiteboard_files(file_hash);

-- File access control table
CREATE TABLE IF NOT EXISTS whiteboard_file_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES whiteboard_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'view',
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(file_id, user_id)
);

-- Create indices for file access
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_access_file_id ON whiteboard_file_access(file_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_access_user_id ON whiteboard_file_access(user_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_access_type ON whiteboard_file_access(access_type);

-- File versions table for audit trail and versioning
CREATE TABLE IF NOT EXISTS whiteboard_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES whiteboard_files(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(file_id, version_number)
);

-- Create indices for versions
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_versions_file_id ON whiteboard_file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_versions_created_at ON whiteboard_file_versions(created_at DESC);

-- File operations audit log
CREATE TABLE IF NOT EXISTS whiteboard_file_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES whiteboard_files(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  user_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for audit
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_audit_file_id ON whiteboard_file_audit(file_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_audit_user_id ON whiteboard_file_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_audit_operation_type ON whiteboard_file_audit(operation_type);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_audit_created_at ON whiteboard_file_audit(created_at DESC);

-- Shared file links (for secure sharing without user account)
CREATE TABLE IF NOT EXISTS whiteboard_file_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES whiteboard_files(id) ON DELETE CASCADE,
  share_token VARCHAR(128) NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INT DEFAULT 0,
  max_access_count INT,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for shares
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_shares_file_id ON whiteboard_file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_shares_token ON whiteboard_file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_whiteboard_file_shares_created_by ON whiteboard_file_shares(created_by);

-- Enable RLS (Row Level Security) for multi-tenant safety
ALTER TABLE whiteboard_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_file_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_file_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_file_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view files they uploaded or have access to
CREATE POLICY whiteboard_files_view_policy ON whiteboard_files
  FOR SELECT
  USING (
    auth.uid() = uploaded_by OR
    access_level = 'public' OR
    EXISTS (
      SELECT 1 FROM whiteboard_file_access
      WHERE file_id = whiteboard_files.id
      AND user_id = auth.uid()
    )
  );

-- RLS Policy: Users can only delete their own files
CREATE POLICY whiteboard_files_delete_policy ON whiteboard_files
  FOR DELETE
  USING (auth.uid() = uploaded_by);

-- RLS Policy: Users can update only their own files
CREATE POLICY whiteboard_files_update_policy ON whiteboard_files
  FOR UPDATE
  USING (auth.uid() = uploaded_by);

-- RLS Policy: Anyone can insert files (upload)
CREATE POLICY whiteboard_files_insert_policy ON whiteboard_files
  FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- File access RLS policies
CREATE POLICY whiteboard_file_access_view ON whiteboard_file_access
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT uploaded_by FROM whiteboard_files WHERE id = file_id
    ) OR
    auth.uid() = user_id
  );

CREATE POLICY whiteboard_file_access_insert ON whiteboard_file_access
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT uploaded_by FROM whiteboard_files WHERE id = file_id
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whiteboard_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
CREATE TRIGGER whiteboard_files_update_trigger
BEFORE UPDATE ON whiteboard_files
FOR EACH ROW
EXECUTE FUNCTION update_whiteboard_files_updated_at();

-- Function to log file operations for audit trail
CREATE OR REPLACE FUNCTION log_whiteboard_file_operation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO whiteboard_file_audit (file_id, operation_type, user_id, new_value)
  VALUES (
    NEW.id,
    TG_ARGV[0]::TEXT,
    auth.uid(),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit logging
CREATE TRIGGER whiteboard_files_insert_audit
AFTER INSERT ON whiteboard_files
FOR EACH ROW
EXECUTE FUNCTION log_whiteboard_file_operation('INSERT');

CREATE TRIGGER whiteboard_files_delete_audit
AFTER DELETE ON whiteboard_files
FOR EACH ROW
EXECUTE FUNCTION log_whiteboard_file_operation('DELETE');
