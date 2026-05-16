-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Recipe vectors table for semantic search
CREATE TABLE IF NOT EXISTS recipe_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id TEXT NOT NULL,
  title TEXT NOT NULL,
  organization_id UUID NOT NULL,
  chef_id UUID NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('fine-dining', 'manufacturing')),
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  cross_track_viable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, chef_id, track)
);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS recipe_vectors_embedding_idx ON recipe_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for organization filtering
CREATE INDEX IF NOT EXISTS recipe_vectors_org_idx ON recipe_vectors(organization_id);

-- Create index for track filtering
CREATE INDEX IF NOT EXISTS recipe_vectors_track_idx ON recipe_vectors(track);

-- Create index for combined org + track queries
CREATE INDEX IF NOT EXISTS recipe_vectors_org_track_idx ON recipe_vectors(organization_id, track);

-- Recipe vector collaborators junction table
CREATE TABLE IF NOT EXISTS recipe_vector_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_vector_id UUID NOT NULL REFERENCES recipe_vectors(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_vector_id, collaborator_id)
);

-- Create index for collaborator lookups
CREATE INDEX IF NOT EXISTS recipe_vector_collaborators_idx ON recipe_vector_collaborators(collaborator_id);

-- Function to search similar recipes
CREATE OR REPLACE FUNCTION search_similar_recipes(
  query_embedding vector(1536),
  search_organization_id UUID,
  search_track TEXT,
  search_limit INT DEFAULT 10,
  include_cross_track BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  recipe_id TEXT,
  title TEXT,
  track TEXT,
  similarity FLOAT8,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id,
    rv.recipe_id,
    rv.title,
    rv.track,
    (1 - (rv.embedding <=> query_embedding)) AS similarity,
    rv.metadata
  FROM recipe_vectors rv
  WHERE rv.organization_id = search_organization_id
  AND (
    rv.track = search_track
    OR (include_cross_track AND rv.track != search_track AND rv.cross_track_viable = true)
  )
  ORDER BY rv.embedding <=> query_embedding
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get cross-track learning suggestions
CREATE OR REPLACE FUNCTION get_cross_track_learning(
  query_embedding vector(1536),
  search_organization_id UUID,
  search_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  recipe_id TEXT,
  title TEXT,
  track TEXT,
  similarity FLOAT8,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id,
    rv.recipe_id,
    rv.title,
    rv.track,
    (1 - (rv.embedding <=> query_embedding)) AS similarity,
    rv.metadata
  FROM recipe_vectors rv
  WHERE rv.organization_id = search_organization_id
  AND rv.track = 'fine-dining'
  AND rv.cross_track_viable = true
  ORDER BY rv.embedding <=> query_embedding
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for recipe_vectors
ALTER TABLE recipe_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_vector_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_vectors (organization-based access)
CREATE POLICY "Users can view their org's recipe vectors"
  ON recipe_vectors FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert recipe vectors for their org"
  ON recipe_vectors FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update recipe vectors in their org"
  ON recipe_vectors FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete recipe vectors in their org"
  ON recipe_vectors FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  ));

-- RLS policies for recipe_vector_collaborators
CREATE POLICY "Users can view collaborators for org vectors"
  ON recipe_vector_collaborators FOR SELECT
  USING (recipe_vector_id IN (
    SELECT id FROM recipe_vectors WHERE organization_id IN (
      SELECT organization_id FROM auth.users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage collaborators in their org"
  ON recipe_vector_collaborators FOR INSERT
  WITH CHECK (recipe_vector_id IN (
    SELECT id FROM recipe_vectors WHERE organization_id IN (
      SELECT organization_id FROM auth.users WHERE id = auth.uid()
    )
  ));

-- Grant public access to the search functions (security handled via RLS)
GRANT EXECUTE ON FUNCTION search_similar_recipes TO authenticated;
GRANT EXECUTE ON FUNCTION get_cross_track_learning TO authenticated;
