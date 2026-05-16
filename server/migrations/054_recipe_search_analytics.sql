/**
 * Recipe Search Analytics Migration
 * 
 * Creates tables for tracking recipe search performance, accuracy, and usage patterns
 */

-- Recipe search analytics table
CREATE TABLE IF NOT EXISTS recipe_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID,
  query TEXT NOT NULL,
  query_type VARCHAR(50) DEFAULT 'semantic', -- 'semantic', 'keyword', 'filter'
  results_count INTEGER DEFAULT 0,
  latency_ms INTEGER NOT NULL,
  engine VARCHAR(50) DEFAULT 'pgvector', -- 'pgvector', 'pinecone', 'hybrid'
  filters JSONB,
  relevance_score DECIMAL(5, 3), -- 0.0 to 1.0
  user_feedback VARCHAR(20), -- 'helpful', 'not_helpful'
  clicked_result TEXT,
  success BOOLEAN DEFAULT true,
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe search clicks table
CREATE TABLE IF NOT EXISTS recipe_search_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES recipe_search_analytics(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  position INTEGER NOT NULL, -- Position in results (1-based)
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_org_id ON recipe_search_analytics(org_id);
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_timestamp ON recipe_search_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_user_id ON recipe_search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_query ON recipe_search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_engine ON recipe_search_analytics(engine);
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_success ON recipe_search_analytics(success);
CREATE INDEX IF NOT EXISTS idx_recipe_search_analytics_latency ON recipe_search_analytics(latency_ms);

CREATE INDEX IF NOT EXISTS idx_recipe_search_clicks_search_id ON recipe_search_clicks(search_id);
CREATE INDEX IF NOT EXISTS idx_recipe_search_clicks_recipe_id ON recipe_search_clicks(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_search_clicks_clicked_at ON recipe_search_clicks(clicked_at);

-- Row-Level Security (RLS) policies
ALTER TABLE recipe_search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_search_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own organization's search analytics
CREATE POLICY recipe_search_analytics_org_isolation ON recipe_search_analytics
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::UUID);

-- RLS Policy: Users can only see clicks for their organization's searches
CREATE POLICY recipe_search_clicks_org_isolation ON recipe_search_clicks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipe_search_analytics
      WHERE recipe_search_analytics.id = recipe_search_clicks.search_id
        AND recipe_search_analytics.org_id = current_setting('app.current_org_id', true)::UUID
    )
  );

COMMENT ON TABLE recipe_search_analytics IS 'Tracks recipe search queries, performance, and results';
COMMENT ON TABLE recipe_search_clicks IS 'Tracks which search results were clicked by users';
