-- Master Culinary Dictionary Migration
-- Creates table to store 180K+ hospitality industry terms with full-text search
-- This replaces the in-memory Map + JSON file persistence

CREATE TABLE IF NOT EXISTS master_culinary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique identifier for the term
  term_key TEXT UNIQUE NOT NULL, -- "fond" or "fond-cooking"
  
  -- Core term information
  term_name TEXT NOT NULL,
  definition TEXT NOT NULL,
  
  -- Classification
  categories TEXT[] NOT NULL DEFAULT '{}',
  mastery_level TEXT DEFAULT 'intermediate',
  
  -- Quality metrics
  confidence FLOAT DEFAULT 0.85,
  source_type TEXT DEFAULT 'user-imported',
  
  -- Rich metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}', -- {pronunciation, etymology, usage, related_terms, etc}
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  
  -- Validation
  CONSTRAINT valid_term_key CHECK (LENGTH(TRIM(term_key)) > 0),
  CONSTRAINT valid_term_name CHECK (LENGTH(TRIM(term_name)) > 0),
  CONSTRAINT valid_definition CHECK (LENGTH(TRIM(definition)) > 0),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for fast lookups and filtering
CREATE INDEX idx_term_key 
ON master_culinary_terms(term_key);

CREATE INDEX idx_term_name 
ON master_culinary_terms(term_name);

CREATE INDEX idx_term_name_gin 
ON master_culinary_terms USING gin(to_tsvector('english', term_name || ' ' || definition));

CREATE INDEX idx_categories 
ON master_culinary_terms USING gin(categories);

CREATE INDEX idx_mastery_level 
ON master_culinary_terms(mastery_level);

CREATE INDEX idx_source_type 
ON master_culinary_terms(source_type);

CREATE INDEX idx_created_at 
ON master_culinary_terms(created_at DESC);

CREATE INDEX idx_confidence 
ON master_culinary_terms(confidence DESC);

-- Full text search capability
CREATE INDEX idx_term_search_fts
ON master_culinary_terms USING gin(
  to_tsvector('english', term_name || ' ' || definition || ' ' || array_to_string(categories, ' '))
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_master_culinary_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_master_culinary_terms_updated_at 
ON master_culinary_terms;

CREATE TRIGGER trigger_update_master_culinary_terms_updated_at
BEFORE UPDATE ON master_culinary_terms
FOR EACH ROW
EXECUTE FUNCTION update_master_culinary_terms_updated_at();

-- Function to search terms
CREATE OR REPLACE FUNCTION search_culinary_terms(
  query TEXT,
  search_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  term_name TEXT,
  definition TEXT,
  categories TEXT[],
  confidence FLOAT,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mct.id,
    mct.term_name,
    mct.definition,
    mct.categories,
    mct.confidence,
    ts_rank(
      to_tsvector('english', mct.term_name || ' ' || mct.definition),
      plainto_tsquery('english', query)
    ) as relevance
  FROM master_culinary_terms mct
  WHERE to_tsvector('english', mct.term_name || ' ' || mct.definition) @@ 
        plainto_tsquery('english', query)
  ORDER BY relevance DESC, mct.confidence DESC
  LIMIT search_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get term count and statistics
CREATE OR REPLACE FUNCTION get_master_culinary_stats()
RETURNS TABLE (
  total_count BIGINT,
  by_category JSONB,
  by_mastery_level JSONB,
  by_source_type JSONB,
  avg_confidence FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    jsonb_object_agg(
      unnest(categories), 
      COUNT(*) FILTER (WHERE categories IS NOT NULL)
    ) OVER (PARTITION BY unnest(categories)),
    jsonb_object_agg(
      mastery_level, 
      COUNT(*)
    ) OVER (PARTITION BY mastery_level),
    jsonb_object_agg(
      source_type, 
      COUNT(*)
    ) OVER (PARTITION BY source_type),
    AVG(confidence)::FLOAT
  FROM master_culinary_terms;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS if using Supabase Auth
ALTER TABLE master_culinary_terms ENABLE ROW LEVEL SECURITY;

-- Public read access, admin write access
CREATE POLICY master_culinary_terms_read ON master_culinary_terms
  FOR SELECT USING (true);

CREATE POLICY master_culinary_terms_write ON master_culinary_terms
  FOR INSERT, UPDATE, DELETE 
  USING (auth.role() = 'service_role');

-- Grants
GRANT SELECT ON master_culinary_terms TO authenticated, anon;
GRANT ALL ON master_culinary_terms TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Add comments for documentation
COMMENT ON TABLE master_culinary_terms IS 'Master culinary dictionary - stores 180K+ hospitality industry terms with full-text search support';
COMMENT ON COLUMN master_culinary_terms.term_key IS 'Normalized unique key (e.g. "fond-cooking")';
COMMENT ON COLUMN master_culinary_terms.metadata IS 'JSONB field: {pronunciation, etymology, usage, related_terms, history, etc}';
COMMENT ON INDEX idx_term_search_fts IS 'Full-text search index for term_name and definition - use search_culinary_terms() function';
