-- Create design_sessions table for managing collaborative design sessions
CREATE TABLE IF NOT EXISTS design_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL,
  bakery_id VARCHAR NOT NULL,
  
  -- Primary chef controlling the design
  primary_chef_id VARCHAR NOT NULL,
  
  -- Viewers watching the design
  viewers JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Session mode and permissions
  mode VARCHAR NOT NULL DEFAULT 'readonly',
  permission_transfer_required BOOLEAN NOT NULL DEFAULT true,
  
  -- Session lifecycle
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_mode CHECK (mode IN ('readonly', 'exclusive', 'shared')),
  CONSTRAINT design_id_format CHECK (design_id IS NOT NULL),
  CONSTRAINT valid_viewers CHECK (viewers IS NOT NULL AND jsonb_typeof(viewers) = 'array')
);

-- Create indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_design_sessions_design_id ON design_sessions(design_id);
CREATE INDEX IF NOT EXISTS idx_design_sessions_bakery_id ON design_sessions(bakery_id);
CREATE INDEX IF NOT EXISTS idx_design_sessions_primary_chef ON design_sessions(primary_chef_id);
CREATE INDEX IF NOT EXISTS idx_design_sessions_started_at ON design_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_sessions_active ON design_sessions(ended_at)
  WHERE ended_at IS NULL;

-- Enable RLS
ALTER TABLE design_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Sessions visible only to users in the same bakery
CREATE POLICY "Sessions visible to bakery members" ON design_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
  );

-- RLS: Only primary chef can create sessions
CREATE POLICY "Create sessions for designs you control" ON design_sessions
  FOR INSERT
  WITH CHECK (
    primary_chef_id = auth.uid()::text
  );

-- RLS: Only primary chef can update their sessions
CREATE POLICY "Update own sessions" ON design_sessions
  FOR UPDATE
  USING (
    primary_chef_id = auth.uid()::text
  )
  WITH CHECK (
    primary_chef_id = auth.uid()::text
  );

-- RLS: Only primary chef can delete their sessions
CREATE POLICY "Delete own sessions" ON design_sessions
  FOR DELETE
  USING (
    primary_chef_id = auth.uid()::text
  );

-- Create function to add viewer to session
CREATE OR REPLACE FUNCTION add_session_viewer(
  session_id UUID,
  viewer_id VARCHAR,
  viewer_name VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  viewers JSONB;
  new_viewer JSONB;
BEGIN
  SELECT viewers INTO viewers FROM design_sessions WHERE id = session_id;
  
  -- Check if viewer already exists
  IF viewers @> jsonb_build_array(jsonb_build_object('user_id', viewer_id)) THEN
    RETURN viewers;
  END IF;
  
  -- Add new viewer
  new_viewer := jsonb_build_object(
    'user_id', viewer_id,
    'viewer_name', viewer_name,
    'joined_at', to_jsonb(NOW())
  );
  
  UPDATE design_sessions 
  SET viewers = viewers || jsonb_build_array(new_viewer)
  WHERE id = session_id;
  
  RETURN viewers || jsonb_build_array(new_viewer);
END;
$$ LANGUAGE plpgsql;

-- Create function to remove viewer from session
CREATE OR REPLACE FUNCTION remove_session_viewer(
  session_id UUID,
  viewer_id VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  viewers JSONB;
BEGIN
  SELECT viewers INTO viewers FROM design_sessions WHERE id = session_id;
  
  UPDATE design_sessions 
  SET viewers = (
    SELECT jsonb_agg(viewer) 
    FROM jsonb_array_elements(viewers) AS viewer 
    WHERE viewer->>'user_id' != viewer_id
  )
  WHERE id = session_id;
  
  RETURN viewers;
END;
$$ LANGUAGE plpgsql;

-- Create function to end session
CREATE OR REPLACE FUNCTION end_design_session(
  session_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  end_time := NOW();
  
  UPDATE design_sessions 
  SET ended_at = end_time
  WHERE id = session_id AND ended_at IS NULL;
  
  RETURN end_time;
END;
$$ LANGUAGE plpgsql;
