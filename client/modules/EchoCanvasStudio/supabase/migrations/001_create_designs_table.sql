-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create designs table
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) DEFAULT 'Untitled Design',
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  is_trashed BOOLEAN DEFAULT FALSE,
  trash_date TIMESTAMP
);

-- Create design_versions table (for version history)
CREATE TABLE design_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL, -- {layers, canvas, adjustments, etc.}
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  change_description VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE
);

-- Create design_collaborators table (for team collaboration)
CREATE TABLE design_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'editor', -- 'owner', 'editor', 'commenter', 'viewer'
  joined_at TIMESTAMP DEFAULT NOW(),
  permissions JSONB DEFAULT '{"edit": true, "comment": true, "share": false}'::jsonb
);

-- Create design_assets table (for shared assets/library)
CREATE TABLE design_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID REFERENCES designs(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'brush', 'gradient', 'pattern', 'texture', 'image'
  name VARCHAR(255),
  url TEXT,
  data JSONB, -- Stores brush/gradient/pattern data
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_designs_user_id ON designs(user_id);
CREATE INDEX idx_designs_updated_at ON designs(updated_at);
CREATE INDEX idx_design_versions_design_id ON design_versions(design_id);
CREATE INDEX idx_design_collaborators_design_id ON design_collaborators(design_id);
CREATE INDEX idx_design_assets_user_id ON design_assets(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own designs and shared designs
CREATE POLICY "Users can view their own designs"
  ON designs FOR SELECT
  USING (auth.uid()::text = user_id OR is_public = true);

CREATE POLICY "Users can create designs"
  ON designs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own designs"
  ON designs FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own designs"
  ON designs FOR DELETE
  USING (auth.uid()::text = user_id);

-- Policy: Version history
CREATE POLICY "Users can view versions of their designs"
  ON design_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM designs WHERE designs.id = design_versions.design_id 
    AND designs.user_id = auth.uid()::text
  ));

-- Policy: Assets
CREATE POLICY "Users can view/manage their assets"
  ON design_assets FOR ALL
  USING (user_id = auth.uid()::text);
