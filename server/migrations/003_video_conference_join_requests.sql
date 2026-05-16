-- Optional waiting room: guests request to join, host approves
CREATE TABLE IF NOT EXISTS video_conference_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_conference_rooms(id) ON DELETE CASCADE,
  link_id UUID REFERENCES video_conference_guest_links(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, denied
  token_generated_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  token TEXT, -- set when host approves, for guest to retrieve
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_join_requests_room_id ON video_conference_join_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_video_join_requests_status ON video_conference_join_requests(status);
