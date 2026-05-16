-- Migration: Enhanced Guardian AI System
-- Creates tables for 4-Layer AI Guardian validation (Argus, Zelda, Phoenix, Odin)
-- All text fields support i18n translation keys

-- Guardian Audit Trail (Odin)
CREATE TABLE IF NOT EXISTS guardian_audit_trail (
  id VARCHAR(255) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  actor VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL,
  hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash
  previous_hash VARCHAR(64), -- Links to previous transaction (blockchain-style)
  context JSONB DEFAULT '{}'::jsonb, -- IP, user agent, location, device
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for hash chain verification
  INDEX idx_guardian_audit_hash (hash),
  INDEX idx_guardian_audit_previous_hash (previous_hash),
  INDEX idx_guardian_audit_timestamp (timestamp DESC),
  INDEX idx_guardian_audit_actor (actor)
);

-- Guardian Check Results (stores results of all Guardian checks)
CREATE TABLE IF NOT EXISTS guardian_check_results (
  id VARCHAR(255) PRIMARY KEY,
  transaction_id VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('journal_entry', 'ap_invoice')),
  org_id UUID NOT NULL,
  
  -- Argus results
  argus_passed BOOLEAN NOT NULL,
  argus_errors JSONB DEFAULT '[]'::jsonb,
  argus_error_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  argus_warnings JSONB DEFAULT '[]'::jsonb,
  argus_warning_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  argus_checks_run JSONB DEFAULT '[]'::jsonb,
  argus_risk_score INT DEFAULT 0 CHECK (argus_risk_score >= 0 AND argus_risk_score <= 100),
  argus_compliance_score INT DEFAULT 100 CHECK (argus_compliance_score >= 0 AND argus_compliance_score <= 100),
  
  -- Zelda results
  zelda_passed BOOLEAN NOT NULL,
  zelda_duplicates JSONB DEFAULT '[]'::jsonb,
  zelda_auto_heals JSONB DEFAULT '[]'::jsonb,
  zelda_warnings JSONB DEFAULT '[]'::jsonb,
  zelda_warning_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  zelda_data_quality_score INT DEFAULT 100 CHECK (zelda_data_quality_score >= 0 AND zelda_data_quality_score <= 100),
  
  -- Phoenix results
  phoenix_passed BOOLEAN NOT NULL,
  phoenix_anomalies JSONB DEFAULT '[]'::jsonb,
  phoenix_risk_score INT DEFAULT 0 CHECK (phoenix_risk_score >= 0 AND phoenix_risk_score <= 100),
  phoenix_fraud_indicators JSONB DEFAULT '[]'::jsonb,
  phoenix_warnings JSONB DEFAULT '[]'::jsonb,
  phoenix_warning_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  
  -- Odin results
  odin_passed BOOLEAN NOT NULL,
  odin_transaction_hash VARCHAR(64) NOT NULL,
  odin_audit_trail_id VARCHAR(255) NOT NULL,
  odin_previous_hash VARCHAR(64),
  odin_integrity_verified BOOLEAN DEFAULT true,
  
  -- Overall results
  passed_all BOOLEAN NOT NULL,
  blocking_errors JSONB DEFAULT '[]'::jsonb,
  blocking_error_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  warnings JSONB DEFAULT '[]'::jsonb,
  warning_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  compliance_score INT DEFAULT 100 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  data_quality_score INT DEFAULT 100 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('PASSED', 'WARNINGS', 'BLOCKED', 'CRITICAL')),
  
  -- EchoAI^3 insights
  echoai3_recommendation TEXT,
  echoai3_recommendation_key VARCHAR(255), -- i18n key
  echoai3_confidence DECIMAL(3, 2) CHECK (echoai3_confidence >= 0 AND echoai3_confidence <= 1),
  echoai3_reasoning TEXT,
  echoai3_reasoning_key VARCHAR(255), -- i18n key
  
  -- Recommendations
  recommendations JSONB DEFAULT '[]'::jsonb,
  recommendation_keys JSONB DEFAULT '[]'::jsonb, -- i18n keys
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(transaction_id, transaction_type)
);

-- Guardian Historical Patterns (for ML learning)
CREATE TABLE IF NOT EXISTS guardian_historical_patterns (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  pattern_type VARCHAR(50) NOT NULL, -- 'amount', 'vendor', 'account', 'time', etc.
  pattern_data JSONB NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_guardian_patterns_org (org_id),
  INDEX idx_guardian_patterns_type (pattern_type)
);

-- Guardian Auto-Heals Log (tracks all auto-healing actions)
CREATE TABLE IF NOT EXISTS guardian_auto_heals (
  id VARCHAR(255) PRIMARY KEY,
  transaction_id VARCHAR(255) NOT NULL,
  heal_type VARCHAR(50) NOT NULL, -- 'ROUNDING_CORRECTION', 'VENDOR_NORMALIZATION', etc.
  description TEXT NOT NULL,
  description_key VARCHAR(255), -- i18n key
  original_value JSONB,
  corrected_value JSONB,
  applied_automatically BOOLEAN DEFAULT true,
  applied_by VARCHAR(255) DEFAULT 'zelda_guardian',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_guardian_auto_heals_transaction (transaction_id),
  INDEX idx_guardian_auto_heals_type (heal_type)
);

-- Guardian Fraud Indicators (tracks fraud detection events)
CREATE TABLE IF NOT EXISTS guardian_fraud_indicators (
  id VARCHAR(255) PRIMARY KEY,
  transaction_id VARCHAR(255) NOT NULL,
  indicator VARCHAR(100) NOT NULL,
  indicator_key VARCHAR(255), -- i18n key
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_guardian_fraud_transaction (transaction_id),
  INDEX idx_guardian_fraud_severity (severity),
  INDEX idx_guardian_fraud_reviewed (reviewed)
);

-- Guardian Performance Metrics (for monitoring and optimization)
CREATE TABLE IF NOT EXISTS guardian_performance_metrics (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  date DATE NOT NULL,
  guardian_type VARCHAR(20) NOT NULL CHECK (guardian_type IN ('argus', 'zelda', 'phoenix', 'odin')),
  
  -- Performance metrics
  total_checks INT DEFAULT 0,
  passed_checks INT DEFAULT 0,
  failed_checks INT DEFAULT 0,
  average_latency_ms DECIMAL(10, 2),
  p95_latency_ms DECIMAL(10, 2),
  p99_latency_ms DECIMAL(10, 2),
  
  -- Quality metrics
  average_risk_score DECIMAL(5, 2),
  average_compliance_score DECIMAL(5, 2),
  average_data_quality_score DECIMAL(5, 2),
  
  -- Error rates
  error_rate DECIMAL(5, 2), -- percentage
  warning_rate DECIMAL(5, 2), -- percentage
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, date, guardian_type),
  INDEX idx_guardian_metrics_org_date (org_id, date DESC)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guardian_check_results_org ON guardian_check_results(org_id);
CREATE INDEX IF NOT EXISTS idx_guardian_check_results_transaction ON guardian_check_results(transaction_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_guardian_check_results_status ON guardian_check_results(overall_status);
CREATE INDEX IF NOT EXISTS idx_guardian_check_results_risk ON guardian_check_results(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_check_results_created ON guardian_check_results(created_at DESC);

-- Function to verify hash chain integrity
CREATE OR REPLACE FUNCTION verify_guardian_hash_chain()
RETURNS TABLE (
  integrity_verified BOOLEAN,
  broken_links INT,
  total_links INT
) AS $$
BEGIN
  RETURN QUERY
  WITH chain_check AS (
    SELECT
      id,
      hash,
      previous_hash,
      CASE
        WHEN previous_hash IS NULL THEN true -- First link
        WHEN EXISTS (
          SELECT 1 FROM guardian_audit_trail gat2
          WHERE gat2.hash = guardian_audit_trail.previous_hash
        ) THEN true
        ELSE false
      END AS link_valid
    FROM guardian_audit_trail
  )
  SELECT
    COUNT(*) FILTER (WHERE link_valid) = COUNT(*) AS integrity_verified,
    COUNT(*) FILTER (WHERE NOT link_valid) AS broken_links,
    COUNT(*) AS total_links
  FROM chain_check;
END;
$$ LANGUAGE plpgsql;

-- Function to get Guardian statistics
CREATE OR REPLACE FUNCTION get_guardian_statistics(
  p_org_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_checks INT,
  passed_checks INT,
  failed_checks INT,
  average_risk_score DECIMAL(5, 2),
  average_compliance_score DECIMAL(5, 2),
  critical_count INT,
  blocked_count INT,
  warnings_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS total_checks,
    COUNT(*) FILTER (WHERE passed_all)::INT AS passed_checks,
    COUNT(*) FILTER (WHERE NOT passed_all)::INT AS failed_checks,
    AVG(risk_score)::DECIMAL(5, 2) AS average_risk_score,
    AVG(compliance_score)::DECIMAL(5, 2) AS average_compliance_score,
    COUNT(*) FILTER (WHERE overall_status = 'CRITICAL')::INT AS critical_count,
    COUNT(*) FILTER (WHERE overall_status = 'BLOCKED')::INT AS blocked_count,
    COUNT(*) FILTER (WHERE overall_status = 'WARNINGS')::INT AS warnings_count
  FROM guardian_check_results
  WHERE org_id = p_org_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;
