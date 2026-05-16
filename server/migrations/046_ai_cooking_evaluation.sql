/**
 * AI Cooking Assistant Evaluation Schema
 * Enables accuracy testing, confidence scoring, and performance evaluation
 */

-- =====================================================
-- AI COOKING EVALUATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_cooking_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  model_id VARCHAR(255) NOT NULL DEFAULT 'default',
  
  -- Evaluation data
  query TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  actual_answer TEXT NOT NULL,
  
  -- Scores
  confidence NUMERIC NOT NULL, -- 0-1
  accuracy NUMERIC NOT NULL, -- 0-1
  
  -- Detailed metrics
  metrics JSONB NOT NULL, -- { exactMatch, semanticSimilarity, relevance, completeness }
  
  -- Timestamp
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_cooking_evaluations_org ON ai_cooking_evaluations(org_id);
CREATE INDEX idx_ai_cooking_evaluations_model ON ai_cooking_evaluations(model_id);
CREATE INDEX idx_ai_cooking_evaluations_accuracy ON ai_cooking_evaluations(accuracy);
CREATE INDEX idx_ai_cooking_evaluations_evaluated_at ON ai_cooking_evaluations(evaluated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ai_cooking_evaluations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY ai_cooking_evaluations_tenant_isolation ON ai_cooking_evaluations
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
