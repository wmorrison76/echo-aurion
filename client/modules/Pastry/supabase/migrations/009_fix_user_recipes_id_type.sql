-- Fix user_recipes ID column to support string IDs from client
-- Changes ID from UUID to TEXT to allow client-generated IDs

-- First, drop the dependent objects
DROP TRIGGER IF EXISTS user_recipes_synced_at ON user_recipes;
DROP TRIGGER IF EXISTS user_recipes_updated_at ON user_recipes;
DROP FUNCTION IF EXISTS update_user_recipes_synced_at();
DROP FUNCTION IF EXISTS update_user_recipes_updated_at();

-- Drop indexes that reference the ID column
DROP INDEX IF EXISTS idx_user_recipes_user_id;

-- Recreate the table with TEXT ID column
-- This is done by creating a new table and copying data
CREATE TABLE user_recipes_new (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recipe data
  title TEXT NOT NULL,
  description TEXT,
  image_data_url TEXT,
  cuisine TEXT,
  course TEXT,
  dietary_restrictions TEXT[],
  tags TEXT[],
  
  -- Recipe details
  ingredients TEXT[],
  instructions TEXT[],
  yield TEXT,
  servings INTEGER,
  prep_time INTEGER,
  cook_time INTEGER,
  total_time INTEGER,
  difficulty_level INTEGER,
  
  -- Nutrition and costing
  calories DECIMAL,
  nutrition JSONB,
  extra JSONB,
  
  -- Status and metadata
  rating INTEGER,
  is_favorite BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_global BOOLEAN DEFAULT false,
  
  -- Organization context
  organization_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Track source
  source TEXT DEFAULT 'user-created',
  source_url TEXT,
  
  CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CONSTRAINT valid_difficulty CHECK (difficulty_level IS NULL OR (difficulty_level >= 1 AND difficulty_level <= 5))
);

-- Copy data from old table
INSERT INTO user_recipes_new
SELECT * FROM user_recipes;

-- Drop old table
DROP TABLE user_recipes;

-- Rename new table
ALTER TABLE user_recipes_new RENAME TO user_recipes;

-- Recreate indexes
CREATE INDEX idx_user_recipes_user_id ON user_recipes(user_id);
CREATE INDEX idx_user_recipes_created_at ON user_recipes(created_at DESC);
CREATE INDEX idx_user_recipes_is_deleted ON user_recipes(is_deleted);
CREATE INDEX idx_user_recipes_is_favorite ON user_recipes(is_favorite);
CREATE INDEX idx_user_recipes_organization ON user_recipes(organization_id);
CREATE INDEX idx_user_recipes_title ON user_recipes(title);
CREATE INDEX idx_user_recipes_user_org ON user_recipes(user_id, organization_id);
CREATE INDEX idx_user_recipes_synced_at ON user_recipes(synced_at);

-- Full-text search indexes
CREATE INDEX idx_user_recipes_title_search ON user_recipes USING gin(to_tsvector('english', title));
CREATE INDEX idx_user_recipes_description_search ON user_recipes USING gin(to_tsvector('english', COALESCE(description, '')));

-- Re-enable RLS
ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;

-- Recreate RLS Policies
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

-- Recreate update trigger for updated_at
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

-- Recreate sync trigger
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
