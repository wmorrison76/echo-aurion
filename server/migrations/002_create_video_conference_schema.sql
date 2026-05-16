-- Video Conference System Schema
-- Integrates with Daily.co SaaS for video infrastructure

-- Video conference rooms table
CREATE TABLE IF NOT EXISTS video_conference_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_room_name TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  room_name TEXT NOT NULL,
  room_description TEXT,
  room_type TEXT DEFAULT 'private', -- private, public, shared
  privacy_level TEXT DEFAULT 'private', -- private, invited, public
  max_participants INT DEFAULT 100,
  allow_recording BOOLEAN DEFAULT true,
  allow_screen_share BOOLEAN DEFAULT true,
  allow_chat BOOLEAN DEFAULT true,
  meeting_start_time TIMESTAMP WITH TIME ZONE,
  meeting_end_time TIMESTAMP WITH TIME ZONE,
  scheduled_duration INT, -- in minutes
  owner_id UUID NOT NULL,
  org_id UUID,
  board_id UUID, -- link to whiteboard if applicable
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_video_rooms_daily_name ON video_conference_rooms(daily_room_name);
CREATE INDEX IF NOT EXISTS idx_video_rooms_owner_id ON video_conference_rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_org_id ON video_conference_rooms(org_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_board_id ON video_conference_rooms(board_id);
CREATE INDEX IF NOT EXISTS idx_video_rooms_created_at ON video_conference_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_rooms_is_active ON video_conference_rooms(is_active);

-- Video conference participants table
CREATE TABLE IF NOT EXISTS video_conference_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  user_id UUID,
  guest_name TEXT,
  guest_email TEXT,
  participant_role TEXT DEFAULT 'participant', -- participant, presenter, moderator
  join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  leave_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INT,
  is_guest BOOLEAN DEFAULT false,
  was_kicked BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_video_participants_room_id ON video_conference_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_user_id ON video_conference_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_participants_guest_email ON video_conference_participants(guest_email);
CREATE INDEX IF NOT EXISTS idx_video_participants_join_time ON video_conference_participants(join_time DESC);

-- Video conference guest links table
CREATE TABLE IF NOT EXISTS video_conference_guest_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  guest_token VARCHAR(128) NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  guest_name TEXT,
  allowed_email TEXT,
  max_uses INT,
  current_uses INT DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  revoke_reason TEXT,
  require_password BOOLEAN DEFAULT false,
  password_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_video_guest_links_room_id ON video_conference_guest_links(room_id);
CREATE INDEX IF NOT EXISTS idx_video_guest_links_token ON video_conference_guest_links(guest_token);
CREATE INDEX IF NOT EXISTS idx_video_guest_links_created_by ON video_conference_guest_links(created_by);
CREATE INDEX IF NOT EXISTS idx_video_guest_links_expires_at ON video_conference_guest_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_guest_links_is_revoked ON video_conference_guest_links(is_revoked);

-- Video conference sessions table (for recording purposes)
CREATE TABLE IF NOT EXISTS video_conference_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INT,
  participant_count INT DEFAULT 0,
  peak_participant_count INT DEFAULT 0,
  recording_id TEXT,
  recording_url TEXT,
  is_recorded BOOLEAN DEFAULT false,
  storage_status TEXT, -- pending, processing, complete, failed
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_video_sessions_room_id ON video_conference_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_session_start ON video_conference_sessions(session_start DESC);
CREATE INDEX IF NOT EXISTS idx_video_sessions_is_recorded ON video_conference_sessions(is_recorded);

-- Video conference recordings table
CREATE TABLE IF NOT EXISTS video_conference_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_conference_sessions(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  recording_id TEXT NOT NULL UNIQUE,
  recording_url TEXT,
  recording_size BIGINT,
  duration_seconds INT,
  file_format TEXT,
  status TEXT DEFAULT 'processing', -- processing, ready, failed
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_video_recordings_room_id ON video_conference_recordings(room_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_session_id ON video_conference_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_video_recordings_status ON video_conference_recordings(status);
CREATE INDEX IF NOT EXISTS idx_video_recordings_created_at ON video_conference_recordings(created_at DESC);

-- Audit log for conference events
CREATE TABLE IF NOT EXISTS video_conference_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  user_id UUID,
  guest_email TEXT,
  event_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_video_audit_room_id ON video_conference_audit(room_id);
CREATE INDEX IF NOT EXISTS idx_video_audit_event_type ON video_conference_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_video_audit_created_at ON video_conference_audit(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE video_conference_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conference_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conference_guest_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conference_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conference_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_conference_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view rooms they created or are invited to
CREATE POLICY video_rooms_view_policy ON video_conference_rooms
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    auth.uid() = created_by OR
    privacy_level = 'public' OR
    EXISTS (
      SELECT 1 FROM video_conference_guest_links
      WHERE room_id = video_conference_rooms.id
      AND is_revoked = false
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- RLS Policy: Only owner can modify rooms
CREATE POLICY video_rooms_modify_policy ON video_conference_rooms
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- RLS Policy: Only owner can delete rooms
CREATE POLICY video_rooms_delete_policy ON video_conference_rooms
  FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policy: Anyone can insert rooms (create)
CREATE POLICY video_rooms_insert_policy ON video_conference_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_video_conference_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
CREATE TRIGGER video_conference_rooms_update_trigger
BEFORE UPDATE ON video_conference_rooms
FOR EACH ROW
EXECUTE FUNCTION update_video_conference_rooms_updated_at();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_video_conference_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO video_conference_audit (room_id, event_type, event_details)
  VALUES (
    COALESCE(NEW.room_id, OLD.room_id),
    TG_ARGV[0]::TEXT,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers
CREATE TRIGGER video_participants_insert_audit
AFTER INSERT ON video_conference_participants
FOR EACH ROW
EXECUTE FUNCTION log_video_conference_event('PARTICIPANT_JOINED');

CREATE TRIGGER video_participants_delete_audit
AFTER DELETE ON video_conference_participants
FOR EACH ROW
EXECUTE FUNCTION log_video_conference_event('PARTICIPANT_LEFT');

-- Create view for active rooms (useful for queries)
CREATE OR REPLACE VIEW active_video_rooms AS
SELECT 
  vr.id,
  vr.daily_room_name,
  vr.room_name,
  vr.owner_id,
  vr.max_participants,
  COUNT(DISTINCT vcp.id) as current_participants,
  MAX(CASE WHEN vcp.leave_time IS NULL THEN 1 ELSE 0 END)::BOOLEAN as has_active_participants,
  vr.created_at,
  vr.updated_at
FROM video_conference_rooms vr
LEFT JOIN video_conference_participants vcp ON vr.id = vcp.room_id
WHERE vr.is_active = true AND vr.deleted_at IS NULL
GROUP BY vr.id;

-- Create view for room statistics
CREATE OR REPLACE VIEW video_room_statistics AS
SELECT 
  vr.id,
  vr.room_name,
  COUNT(DISTINCT vcp.id) as total_participants,
  COUNT(DISTINCT CASE WHEN vcp.is_guest = true THEN vcp.id END) as guest_count,
  COUNT(DISTINCT vcs.id) as session_count,
  SUM(CASE WHEN vcs.is_recorded = true THEN 1 ELSE 0 END) as recorded_sessions,
  COUNT(DISTINCT vcr.id) as recording_count
FROM video_conference_rooms vr
LEFT JOIN video_conference_participants vcp ON vr.id = vcp.room_id
LEFT JOIN video_conference_sessions vcs ON vr.id = vcs.room_id
LEFT JOIN video_conference_recordings vcr ON vr.id = vcr.room_id
WHERE vr.deleted_at IS NULL
GROUP BY vr.id, vr.room_name;
