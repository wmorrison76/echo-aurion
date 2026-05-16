-- Phase 2.5 Performance Optimization
-- Indexes for Rule Engine, Forensic Accounting, and Operator Learning
-- Timeline: Week 13

-- ============================================================================
-- RULE ENGINE PERFORMANCE INDEXES
-- ============================================================================

-- Index for fetching active rules by entity (most common query)
CREATE INDEX IF NOT EXISTS idx_automation_rules_entity_active 
ON automation_rules(entity_id, is_active, is_paused, deleted_at)
WHERE is_active = true AND is_paused = false AND deleted_at IS NULL;

-- Index for rule execution history queries and filtering
CREATE INDEX IF NOT EXISTS idx_rule_execution_log_rule_date 
ON rule_execution_log(rule_id, executed_at DESC)
INCLUDE (execution_status, result);

-- Index for getting execution history by time range (compliance queries)
CREATE INDEX IF NOT EXISTS idx_rule_execution_log_entity_date 
ON rule_execution_log(entity_id, executed_at DESC)
INCLUDE (rule_id, execution_status);

-- Index for rule template filtering
CREATE INDEX IF NOT EXISTS idx_rule_templates_active 
ON rule_templates(is_active, category)
WHERE is_active = true;

-- ============================================================================
-- FORENSIC ACCOUNTING PERFORMANCE INDEXES
-- ============================================================================

-- Index for forensic trail verification (critical for audit)
CREATE INDEX IF NOT EXISTS idx_forensic_audit_log_entity_date 
ON forensic_audit_log(entity_id, created_at DESC)
INCLUDE (user_id, decision_type, this_hash);

-- Index for user activity audits (SOX compliance)
CREATE INDEX IF NOT EXISTS idx_forensic_audit_log_user_date 
ON forensic_audit_log(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Index for AI action audits (Echo AI³ tracking)
CREATE INDEX IF NOT EXISTS idx_forensic_audit_log_ai_date 
ON forensic_audit_log(ai_component, created_at DESC)
WHERE ai_component IS NOT NULL;

-- Index for regulatory category filtering (pre-built reports)
CREATE INDEX IF NOT EXISTS idx_forensic_audit_log_regulatory 
ON forensic_audit_log(entity_id, regulatory_category, created_at DESC)
WHERE regulatory_category IS NOT NULL;

-- Index for hash chain verification
CREATE INDEX IF NOT EXISTS idx_forensic_audit_log_hash 
ON forensic_audit_log(entity_id, prev_hash, this_hash);

-- ============================================================================
-- OPERATOR LEARNING PERFORMANCE INDEXES
-- ============================================================================

-- Index for operator override tracking (pattern detection)
CREATE INDEX IF NOT EXISTS idx_operator_overrides_pattern 
ON operator_overrides(entity_id, operator_id, created_at DESC)
INCLUDE (override_reason, decision_outcome);

-- Index for AI rule generation (learning metrics)
CREATE INDEX IF NOT EXISTS idx_ai_generated_rules_status 
ON ai_generated_rules(entity_id, status, created_at DESC)
INCLUDE (confidence_score);

-- ============================================================================
-- QUERY PERFORMANCE ANALYSIS HELPERS
-- ============================================================================

-- Create a view for performance monitoring
CREATE OR REPLACE VIEW vw_rule_performance_metrics AS
SELECT 
  r.entity_id,
  r.id as rule_id,
  r.rule_name,
  COUNT(rel.id) as execution_count,
  ROUND(AVG(
    EXTRACT(EPOCH FROM (rel.executed_at - rel.created_at)) * 1000
  )::numeric, 2) as avg_execution_ms,
  MAX(CASE WHEN rel.execution_status = 'success' THEN 1 ELSE 0 END) as success_count,
  MAX(CASE WHEN rel.execution_status = 'failed' THEN 1 ELSE 0 END) as failure_count,
  ROUND(
    (COUNT(CASE WHEN rel.execution_status = 'success' THEN 1 END)::numeric / 
     NULLIF(COUNT(rel.id)::numeric, 0) * 100),
    2
  ) as success_rate_pct,
  MAX(rel.executed_at) as last_executed
FROM automation_rules r
LEFT JOIN rule_execution_log rel ON r.id = rel.rule_id
WHERE r.deleted_at IS NULL
GROUP BY r.entity_id, r.id, r.rule_name;

-- Create view for forensic audit trail health
CREATE OR REPLACE VIEW vw_forensic_audit_health AS
SELECT 
  entity_id,
  COUNT(*) as total_entries,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT ai_component) as ai_actions,
  MIN(created_at) as earliest_entry,
  MAX(created_at) as latest_entry,
  ROUND(
    (EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400)::numeric,
    1
  ) as audit_days,
  ROUND(
    (COUNT(*)::numeric / NULLIF(
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400, 0
    ))::numeric,
    0
  ) as entries_per_day
FROM forensic_audit_log
GROUP BY entity_id;

-- Create view for rule health metrics
CREATE OR REPLACE VIEW vw_learning_statistics AS
SELECT 
  entity_id,
  COUNT(DISTINCT operator_id) as total_operators,
  COUNT(*) as total_overrides_30d,
  COUNT(DISTINCT override_reason) as unique_patterns,
  ROUND(
    (COUNT(CASE WHEN decision_outcome = 'good' THEN 1 END)::numeric / 
     NULLIF(COUNT(*)::numeric, 0) * 100),
    2
  ) as good_decision_pct,
  COUNT(CASE WHEN ai_rule_generated = true THEN 1 END) as rules_from_patterns
FROM operator_overrides
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY entity_id;

-- ============================================================================
-- QUERY OPTIMIZATION NOTES
-- ============================================================================

-- For pagination on forensic queries:
-- SELECT * FROM forensic_audit_log 
-- WHERE entity_id = $1 AND created_at BETWEEN $2 AND $3
-- ORDER BY created_at DESC
-- LIMIT $4 OFFSET $5;
-- This query will use idx_forensic_audit_log_entity_date

-- For compliance period queries:
-- SELECT * FROM forensic_audit_log
-- WHERE entity_id = $1 AND regulatory_category IN ('accounting_record', 'transaction')
-- AND created_at >= $2 AND created_at <= $3
-- ORDER BY created_at DESC;
-- This query will use idx_forensic_audit_log_regulatory

-- For rule performance analysis:
-- SELECT * FROM vw_rule_performance_metrics
-- WHERE success_rate_pct < 80 OR avg_execution_ms > 100
-- ORDER BY avg_execution_ms DESC;
-- Identifies underperforming rules needing review

-- ============================================================================
-- STATISTICS AND AUTOVACUUM TUNING
-- ============================================================================

-- Analyze tables after index creation
ANALYZE automation_rules;
ANALYZE rule_execution_log;
ANALYZE forensic_audit_log;
ANALYZE operator_overrides;
ANALYZE ai_generated_rules;

-- Optional: Increase autovacuum for high-volume tables
-- ALTER TABLE forensic_audit_log SET (autovacuum_vacuum_scale_factor = 0.01);
-- ALTER TABLE rule_execution_log SET (autovacuum_vacuum_scale_factor = 0.01);
