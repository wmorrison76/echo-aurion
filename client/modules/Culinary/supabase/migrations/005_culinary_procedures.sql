-- Culinary procedures table with vector embeddings for semantic search
-- Stores step-by-step culinary procedures extracted from textbooks/documents
CREATE TABLE IF NOT EXISTS culinary_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_book TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('butchery', 'pastry', 'cooking', 'preparation', 'technique', 'general')),
  steps JSONB NOT NULL, -- Array of {number, instruction, tips}
  materials TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  time_estimate TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  related_keywords TEXT[] DEFAULT '{}',
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for similarity search (vector cosine distance)
CREATE INDEX IF NOT EXISTS culinary_procedures_embedding_idx ON culinary_procedures
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS culinary_procedures_category_idx ON culinary_procedures(category);

-- Create index for book/source filtering
CREATE INDEX IF NOT EXISTS culinary_procedures_book_idx ON culinary_procedures(source_book);

-- Create index for combined searches
CREATE INDEX IF NOT EXISTS culinary_procedures_category_book_idx ON culinary_procedures(category, source_book);

-- Create index for full text search on title
CREATE INDEX IF NOT EXISTS culinary_procedures_title_idx ON culinary_procedures
USING GIN (to_tsvector('english', title));

-- Function to search procedures semantically
CREATE OR REPLACE FUNCTION search_culinary_procedures(
  query_embedding vector(1536),
  p_limit INT DEFAULT 10,
  p_category TEXT DEFAULT NULL,
  p_min_similarity FLOAT8 DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  source_book TEXT,
  category TEXT,
  steps JSONB,
  materials TEXT[],
  tools TEXT[],
  time_estimate TEXT,
  difficulty TEXT,
  related_keywords TEXT[],
  similarity FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.title,
    cp.source_book,
    cp.category,
    cp.steps,
    cp.materials,
    cp.tools,
    cp.time_estimate,
    cp.difficulty,
    cp.related_keywords,
    (1 - (cp.embedding <=> query_embedding)) AS similarity
  FROM culinary_procedures cp
  WHERE cp.embedding IS NOT NULL
  AND (p_category IS NULL OR cp.category = p_category)
  AND (1 - (cp.embedding <=> query_embedding)) > p_min_similarity
  ORDER BY cp.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search procedures by category
CREATE OR REPLACE FUNCTION get_procedures_by_category(
  p_category TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  source_book TEXT,
  category TEXT,
  steps JSONB,
  materials TEXT[],
  tools TEXT[],
  time_estimate TEXT,
  difficulty TEXT,
  related_keywords TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.title,
    cp.source_book,
    cp.category,
    cp.steps,
    cp.materials,
    cp.tools,
    cp.time_estimate,
    cp.difficulty,
    cp.related_keywords
  FROM culinary_procedures cp
  WHERE cp.category = p_category
  ORDER BY cp.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search procedures by book/source
CREATE OR REPLACE FUNCTION get_procedures_by_book(
  p_book TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  source_book TEXT,
  category TEXT,
  steps JSONB,
  materials TEXT[],
  tools TEXT[],
  time_estimate TEXT,
  difficulty TEXT,
  related_keywords TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.title,
    cp.source_book,
    cp.category,
    cp.steps,
    cp.materials,
    cp.tools,
    cp.time_estimate,
    cp.difficulty,
    cp.related_keywords
  FROM culinary_procedures cp
  WHERE LOWER(cp.source_book) = LOWER(p_book)
  ORDER BY cp.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function for full text search on procedures
CREATE OR REPLACE FUNCTION search_procedures_fulltext(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  source_book TEXT,
  category TEXT,
  steps JSONB,
  materials TEXT[],
  tools TEXT[],
  time_estimate TEXT,
  difficulty TEXT,
  related_keywords TEXT[],
  relevance FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.title,
    cp.source_book,
    cp.category,
    cp.steps,
    cp.materials,
    cp.tools,
    cp.time_estimate,
    cp.difficulty,
    cp.related_keywords,
    ts_rank(to_tsvector('english', cp.title), plainto_tsquery('english', p_query)) AS relevance
  FROM culinary_procedures cp
  WHERE to_tsvector('english', cp.title) @@ plainto_tsquery('english', p_query)
  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE culinary_procedures ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow anyone to read procedures (public knowledge base)
CREATE POLICY "Anyone can read culinary procedures"
  ON culinary_procedures FOR SELECT
  USING (true);

-- RLS policy: Only authenticated users can insert procedures
CREATE POLICY "Authenticated users can insert procedures"
  ON culinary_procedures FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS policy: Only authenticated users can update procedures
CREATE POLICY "Authenticated users can update procedures"
  ON culinary_procedures FOR UPDATE
  USING (auth.role() = 'authenticated');

-- RLS policy: Only authenticated users can delete procedures
CREATE POLICY "Authenticated users can delete procedures"
  ON culinary_procedures FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant access to functions
GRANT EXECUTE ON FUNCTION search_culinary_procedures TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_procedures_by_category TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_procedures_by_book TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_procedures_fulltext TO authenticated, anon;
