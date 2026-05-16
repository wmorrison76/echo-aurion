-- Create internal knowledge vectors table for pgvector-based knowledge management
-- This table stores all culinary knowledge, PDFs, and learned terms internally
-- Replacing Pinecone for cost-effective, scalable knowledge management

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the internal knowledge vectors table
CREATE TABLE IF NOT EXISTS internal_knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core knowledge content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  
  -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  embedding vector(1536) NOT NULL,
  
  -- Knowledge classification
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'master-dictionary', 'external-llm', 'recipe', 'user-imported')),
  categories TEXT[] DEFAULT '{}',
  domain TEXT DEFAULT 'culinary',
  
  -- Source tracking
  source TEXT NOT NULL,
  
  -- Rich metadata
  metadata JSONB DEFAULT '{}' NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for fast searching
  CONSTRAINT valid_title CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT valid_content CHECK (LENGTH(TRIM(content)) > 0)
);

-- Create vector search index using IVFFlat for fast similarity search
-- IVFFlat is faster than HNSW for large datasets and provides good accuracy
CREATE INDEX IF NOT EXISTS idx_internal_knowledge_embedding 
ON internal_knowledge_vectors USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_internal_knowledge_source_type 
ON internal_knowledge_vectors (source_type);

CREATE INDEX IF NOT EXISTS idx_internal_knowledge_domain 
ON internal_knowledge_vectors (domain);

CREATE INDEX IF NOT EXISTS idx_internal_knowledge_source 
ON internal_knowledge_vectors (source);

CREATE INDEX IF NOT EXISTS idx_internal_knowledge_created_at 
ON internal_knowledge_vectors (created_at DESC);

-- Create index on metadata confidence for filtering
CREATE INDEX IF NOT EXISTS idx_internal_knowledge_confidence 
ON internal_knowledge_vectors USING gin (metadata);

-- Create index on categories for filtering
CREATE INDEX IF NOT EXISTS idx_internal_knowledge_categories 
ON internal_knowledge_vectors USING gin (categories);

-- Update trigger for automatically updating updated_at
CREATE OR REPLACE FUNCTION update_internal_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_internal_knowledge_updated_at 
ON internal_knowledge_vectors;

CREATE TRIGGER trigger_update_internal_knowledge_updated_at
BEFORE UPDATE ON internal_knowledge_vectors
FOR EACH ROW
EXECUTE FUNCTION update_internal_knowledge_updated_at();

-- Create RLS policies (if using RLS)
-- Temporarily disable RLS for development - enable in production with proper policies
ALTER TABLE internal_knowledge_vectors DISABLE ROW LEVEL SECURITY;

-- Create function for vector similarity search
-- Returns results sorted by similarity with calculated distance
CREATE OR REPLACE FUNCTION search_internal_knowledge(
  query_embedding vector(1536),
  search_source_type TEXT DEFAULT NULL,
  search_domain TEXT DEFAULT NULL,
  search_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  description TEXT,
  source_type TEXT,
  source TEXT,
  metadata JSONB,
  similarity FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ikv.id,
    ikv.title,
    ikv.content,
    ikv.description,
    ikv.source_type,
    ikv.source,
    ikv.metadata,
    (1 - (ikv.embedding <=> query_embedding)) AS similarity
  FROM internal_knowledge_vectors ikv
  WHERE 
    (search_source_type IS NULL OR ikv.source_type = search_source_type)
    AND (search_domain IS NULL OR ikv.domain = search_domain)
  ORDER BY ikv.embedding <=> query_embedding
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get knowledge statistics
CREATE OR REPLACE FUNCTION get_internal_knowledge_stats()
RETURNS TABLE (
  total_count BIGINT,
  source_type_breakdown JSONB,
  domain_breakdown JSONB,
  category_breakdown JSONB,
  average_confidence FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    jsonb_object_agg(
      source_type,
      count::TEXT
    ) FILTER (WHERE source_type IS NOT NULL),
    jsonb_object_agg(
      domain,
      count::TEXT
    ) FILTER (WHERE domain IS NOT NULL),
    jsonb_object_agg(
      category,
      count::TEXT
    ) FILTER (WHERE category IS NOT NULL),
    AVG(CAST(metadata->>'confidence' AS FLOAT8))
  FROM (
    SELECT DISTINCT
      source_type,
      domain,
      NULL::TEXT as category,
      COUNT(*) OVER (PARTITION BY source_type) as count
    FROM internal_knowledge_vectors
    
    UNION ALL
    
    SELECT DISTINCT
      NULL::TEXT,
      domain,
      NULL::TEXT,
      COUNT(*) OVER (PARTITION BY domain) as count
    FROM internal_knowledge_vectors
    
    UNION ALL
    
    SELECT DISTINCT
      NULL::TEXT,
      NULL::TEXT,
      unnest(categories),
      COUNT(*) OVER (PARTITION BY UNNEST(categories)) as count
    FROM internal_knowledge_vectors
  ) stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to delete old knowledge vectors (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_internal_knowledge(days_old INTEGER DEFAULT 90)
RETURNS TABLE (
  deleted_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  DELETE FROM internal_knowledge_vectors
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND source_type NOT IN ('master-dictionary', 'recipe')
  RETURNING COUNT(*)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE internal_knowledge_vectors IS 'Stores all internal culinary knowledge using pgvector for vector similarity search. Replaces Pinecone for cost-effective knowledge management.';
COMMENT ON COLUMN internal_knowledge_vectors.embedding IS 'Vector embedding (1536 dimensions) generated by OpenAI text-embedding-3-small model';
COMMENT ON COLUMN internal_knowledge_vectors.source_type IS 'Origin of the knowledge: pdf, master-dictionary, external-llm, recipe, or user-imported';
COMMENT ON COLUMN internal_knowledge_vectors.categories IS 'Array of knowledge categories: technique, ingredient, method, equipment, theory, cuisine, safety, service, tradition';
COMMENT ON COLUMN internal_knowledge_vectors.metadata IS 'Rich metadata including confidence, tags, related terms, author, publication year, mastery level, etc.';
