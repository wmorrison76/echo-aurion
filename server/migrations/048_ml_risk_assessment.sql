/**
 * ML-Based Risk Assessment Schema
 * Enables ML-based risk scoring, assessment, and mitigation recommendations
 */

-- =====================================================
-- EVENT RISK ASSESSMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS event_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Risk scores
  base_score NUMERIC NOT NULL, -- 0-100
  ml_score NUMERIC NOT NULL, -- ML-enhanced score (0-100)
  ml_confidence NUMERIC NOT NULL, -- 0-1
  risk_band VARCHAR(20) NOT NULL, -- "low", "medium", "high"
  
  -- Risk analysis
  risk_factors JSONB NOT NULL, -- Array of risk factors with ML detection
  mitigation_recommendations JSONB NOT NULL, -- Array of recommendations
  historical_pattern JSONB, -- Historical pattern analysis
  
  -- Event outcome (for learning)
  event_outcome VARCHAR(50), -- "success", "partial_success", "failure"
  outcome_notes TEXT,
  outcome_recorded_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamp
  assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_risk_assessments_event ON event_risk_assessments(event_id);
CREATE INDEX idx_event_risk_assessments_org ON event_risk_assessments(org_id);
CREATE INDEX idx_event_risk_assessments_ml_score ON event_risk_assessments(ml_score DESC);
CREATE INDEX idx_event_risk_assessments_band ON event_risk_assessments(risk_band);
CREATE INDEX idx_event_risk_assessments_assessed_at ON event_risk_assessments(assessed_at DESC);

-- =====================================================
-- RISK MITIGATION RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS risk_mitigation_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Recommendation
  recommendation TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL, -- "high", "medium", "low"
  expected_impact TEXT,
  implementation_effort VARCHAR(20) NOT NULL, -- "low", "medium", "high"
  category VARCHAR(50) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- "pending", "in_progress", "completed", "rejected"
  implemented_at TIMESTAMP WITH TIME ZONE,
  result TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_risk_mitigation_event ON risk_mitigation_recommendations(event_id);
CREATE INDEX idx_risk_mitigation_org ON risk_mitigation_recommendations(org_id);
CREATE INDEX idx_risk_mitigation_status ON risk_mitigation_recommendations(status);
CREATE INDEX idx_risk_mitigation_priority ON risk_mitigation_recommendations(priority);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE event_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_mitigation_recommendations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY event_risk_assessments_tenant_isolation ON event_risk_assessments
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY risk_mitigation_recommendations_tenant_isolation ON risk_mitigation_recommendations
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
