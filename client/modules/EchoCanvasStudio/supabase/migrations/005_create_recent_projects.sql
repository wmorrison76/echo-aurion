-- Create recent_projects table to track user's recent work
CREATE TABLE recent_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  title VARCHAR(255),
  thumbnail_url TEXT,
  accessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, design_id)
);

-- Create index for fast lookups
CREATE INDEX idx_recent_projects_user_id ON recent_projects(user_id);
CREATE INDEX idx_recent_projects_accessed_at ON recent_projects(accessed_at DESC);

-- Enable RLS
ALTER TABLE recent_projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own recent projects
CREATE POLICY "Users can view their own recent projects"
  ON recent_projects FOR SELECT
  USING (user_id = auth.uid()::text);

-- Policy: Users can insert their own recent projects
CREATE POLICY "Users can add recent projects"
  ON recent_projects FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own recent projects
CREATE POLICY "Users can update recent projects"
  ON recent_projects FOR UPDATE
  USING (user_id = auth.uid()::text);

-- Policy: Users can delete their own recent projects
CREATE POLICY "Users can delete recent projects"
  ON recent_projects FOR DELETE
  USING (user_id = auth.uid()::text);
