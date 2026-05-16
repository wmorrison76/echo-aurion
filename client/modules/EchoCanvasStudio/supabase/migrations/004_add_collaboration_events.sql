-- Create collaboration_events table for audit logging and analytics
CREATE TABLE IF NOT EXISTS collaboration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL,
  session_id UUID,
  
  -- Event metadata
  event_type VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  
  -- Event data (flexible JSON for different event types)
  data JSONB,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'session_created',
    'session_ended',
    'viewer_joined',
    'viewer_left',
    'control_transferred',
    'design_changed',
    'layer_added',
    'layer_deleted',
    'layer_modified',
    'permission_changed',
    'template_created',
    'template_shared',
    'comment_added',
    'design_saved'
  ))
);

-- Create indexes for event lookups
CREATE INDEX IF NOT EXISTS idx_collaboration_events_design_id ON collaboration_events(design_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_session_id ON collaboration_events(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_user_id ON collaboration_events(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_event_type ON collaboration_events(event_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_created_at ON collaboration_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_design_created ON collaboration_events(design_id, created_at DESC);

-- Enable RLS
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;

-- RLS: Events visible only to users in designs they can access
CREATE POLICY "View events for accessible designs" ON collaboration_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- RLS: Users can create events for designs they're working on
CREATE POLICY "Create events for your sessions" ON collaboration_events
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
  );

-- Create function to log collaboration event
CREATE OR REPLACE FUNCTION log_collaboration_event(
  p_design_id UUID,
  p_session_id UUID,
  p_event_type VARCHAR,
  p_user_id VARCHAR,
  p_data JSONB
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO collaboration_events (
    design_id,
    session_id,
    event_type,
    user_id,
    data,
    created_at
  ) VALUES (
    p_design_id,
    p_session_id,
    p_event_type,
    p_user_id,
    p_data,
    NOW()
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get session event history
CREATE OR REPLACE FUNCTION get_session_event_history(
  p_session_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  event_type VARCHAR,
  user_id VARCHAR,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    collaboration_events.id,
    collaboration_events.event_type,
    collaboration_events.user_id,
    collaboration_events.data,
    collaboration_events.created_at
  FROM collaboration_events
  WHERE collaboration_events.session_id = p_session_id
  ORDER BY collaboration_events.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to get design event timeline
CREATE OR REPLACE FUNCTION get_design_event_timeline(
  p_design_id UUID,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  event_type VARCHAR,
  user_id VARCHAR,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    collaboration_events.id,
    collaboration_events.event_type,
    collaboration_events.user_id,
    collaboration_events.data,
    collaboration_events.created_at
  FROM collaboration_events
  WHERE collaboration_events.design_id = p_design_id
  ORDER BY collaboration_events.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create view for active sessions with event counts
CREATE OR REPLACE VIEW active_design_sessions_summary AS
SELECT 
  ds.id,
  ds.design_id,
  ds.bakery_id,
  ds.primary_chef_id,
  jsonb_array_length(ds.viewers) as viewer_count,
  ds.mode,
  ds.started_at,
  COUNT(DISTINCT ce.id) as total_events,
  MAX(ce.created_at) as last_event_at
FROM design_sessions ds
LEFT JOIN collaboration_events ce ON ds.id = ce.session_id
WHERE ds.ended_at IS NULL
GROUP BY ds.id, ds.design_id, ds.bakery_id, ds.primary_chef_id, ds.viewers, ds.mode, ds.started_at;

-- Create view for design collaboration stats
CREATE OR REPLACE VIEW design_collaboration_stats AS
SELECT 
  d.id as design_id,
  d.bakery_id,
  COUNT(DISTINCT ds.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN ds.ended_at IS NULL THEN ds.id END) as active_sessions,
  COUNT(DISTINCT CASE WHEN ce.event_type = 'design_changed' THEN ce.id END) as change_count,
  COUNT(DISTINCT ce.user_id) as unique_contributors,
  MAX(ce.created_at) as last_change_at
FROM designs d
LEFT JOIN design_sessions ds ON d.id = ds.design_id
LEFT JOIN collaboration_events ce ON d.id = ce.design_id
GROUP BY d.id, d.bakery_id;
