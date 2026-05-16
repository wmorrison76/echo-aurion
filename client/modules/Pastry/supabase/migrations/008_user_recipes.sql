-- User-scoped recipes table for cloud synchronization
-- This table stores recipes created or imported by users across devices

CREATE TABLE IF NOT EXISTS user_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recipe data
  title TEXT NOT NULL,
  description TEXT,
  image_data_url TEXT, -- base64 encoded image
  cuisine TEXT,
  course TEXT,
  dietary_restrictions TEXT[], -- vegan, gluten-free, etc
  tags TEXT[],
  
  -- Recipe details
  ingredients TEXT[], -- JSON array of ingredients
  instructions TEXT[], -- JSON array of instructions
  yield TEXT,
  servings INTEGER,
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  total_time INTEGER, -- minutes
  difficulty_level INTEGER, -- 1-5
  
  -- Nutrition and costing
  calories DECIMAL,
  nutrition JSONB, -- carbs, protein, fat, etc
  extra JSONB, -- server notes, cost data, etc
  
  -- Status and metadata
  rating INTEGER, -- 0-5 stars
  is_favorite BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_global BOOLEAN DEFAULT false, -- shared across all outlets
  
  -- Organization context (for multi-org support)
  organization_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Track source
  source TEXT DEFAULT 'user-created', -- user-created, imported, crawled
  source_url TEXT, -- original URL if imported/crawled
  
  CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CONSTRAINT valid_difficulty CHECK (difficulty_level IS NULL OR (difficulty_level >= 1 AND difficulty_level <= 5))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_recipes_user_id ON user_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_created_at ON user_recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_recipes_is_deleted ON user_recipes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_user_recipes_is_favorite ON user_recipes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_user_recipes_organization ON user_recipes(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_title ON user_recipes(title);
CREATE INDEX IF NOT EXISTS idx_user_recipes_user_org ON user_recipes(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_synced_at ON user_recipes(synced_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_user_recipes_title_search ON user_recipes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_user_recipes_description_search ON user_recipes USING gin(to_tsvector('english', COALESCE(description, '')));

-- Enable RLS
ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own recipes (or organization-shared ones)
CREATE POLICY "Users can view their own recipes"
  ON user_recipes FOR SELECT
  USING (
    auth.uid() = user_id
    OR (is_global = true AND organization_id IN (
      SELECT organization_id FROM auth.users WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert recipes"
  ON user_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON user_recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete (soft delete) their own recipes"
  ON user_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_recipes_updated_at
BEFORE UPDATE ON user_recipes
FOR EACH ROW
EXECUTE FUNCTION update_user_recipes_updated_at();

-- Sync trigger: Update synced_at when updated
CREATE OR REPLACE FUNCTION update_user_recipes_synced_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.synced_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_recipes_synced_at
BEFORE INSERT OR UPDATE ON user_recipes
FOR EACH ROW
EXECUTE FUNCTION update_user_recipes_synced_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_recipes TO authenticated;
