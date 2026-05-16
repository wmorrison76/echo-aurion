-- Video Conference Enhancements: post-meeting feedback, recording views, training assignments,
-- recording visibility/retention/legal hold, capacity (no app-level room cap; capacity is for display).

-- Post-meeting feedback (organizer pop-up at end of meeting)
CREATE TABLE IF NOT EXISTS video_conference_post_meeting_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
  issues_text TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vc_feedback_room_id ON video_conference_post_meeting_feedback(room_id);
CREATE INDEX IF NOT EXISTS idx_vc_feedback_submitted_by ON video_conference_post_meeting_feedback(submitted_by);
CREATE INDEX IF NOT EXISTS idx_vc_feedback_created_at ON video_conference_post_meeting_feedback(created_at DESC);

-- Recording views (who watched, progress, playback speed, device) and audit for leaks
CREATE TABLE IF NOT EXISTS video_conference_recording_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES video_conference_recordings(id) ON DELETE CASCADE,
  user_id UUID,
  guest_email TEXT,
  progress_pct INT DEFAULT 0,
  last_position_sec INT DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  device TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vc_rec_views_rec_user ON video_conference_recording_views(recording_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vc_rec_views_rec_guest ON video_conference_recording_views(recording_id, guest_email) WHERE user_id IS NULL AND guest_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vc_rec_views_recording_id ON video_conference_recording_views(recording_id);
CREATE INDEX IF NOT EXISTS idx_vc_rec_views_user_id ON video_conference_recording_views(user_id);
CREATE INDEX IF NOT EXISTS idx_vc_rec_views_created_at ON video_conference_recording_views(created_at DESC);

-- Training assignments (assign training to org/venue/role or "all")
CREATE TABLE IF NOT EXISTS video_conference_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES video_conference_recordings(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  target_type TEXT NOT NULL, -- 'all' | 'org' | 'venue' | 'role'
  target_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vc_training_assign_recording ON video_conference_training_assignments(recording_id);
CREATE INDEX IF NOT EXISTS idx_vc_training_assign_target ON video_conference_training_assignments(target_type, target_id);

-- Add visibility and retention to recordings (sensitive/exec, invite-based access)
ALTER TABLE video_conference_recordings
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS allowed_viewer_ids UUID[],
  ADD COLUMN IF NOT EXISTS retention_days INT,
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT false;

COMMENT ON COLUMN video_conference_recordings.visibility IS 'open | invitees_only | owner_only';
COMMENT ON COLUMN video_conference_recordings.allowed_viewer_ids IS 'Snapshot of user IDs who may view (e.g. meeting invitees)';
COMMENT ON COLUMN video_conference_recordings.retention_days IS 'Auto-delete after N days if not legal_hold';
COMMENT ON COLUMN video_conference_recordings.legal_hold IS 'If true, skip retention deletion';

-- RLS policy for video_conference_recordings: user can SELECT if owner, or visibility=open, or in allowed_viewer_ids
DROP POLICY IF EXISTS video_recordings_view_policy ON video_conference_recordings;
CREATE POLICY video_recordings_view_policy ON video_conference_recordings
  FOR SELECT
  USING (
    (visibility = 'open')
    OR (uploaded_by = auth.uid() OR (SELECT owner_id FROM video_conference_rooms WHERE id = video_conference_recordings.room_id) = auth.uid())
    OR (visibility = 'invitees_only' AND auth.uid() = ANY(COALESCE(allowed_viewer_ids, ARRAY[]::uuid[])))
  );

-- Optional: capacity config table (per-org limits for display; actual enforcement can be in API)
CREATE TABLE IF NOT EXISTS video_conference_capacity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  max_concurrent_rooms INT,
  max_concurrent_participants INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_vc_capacity_org ON video_conference_capacity_config(org_id);
