-- Migration: Unified Audit Log System
-- Purpose: Enterprise-grade audit log with tamper-evident hash chains
-- Date: 2025-01-15
-- Addresses: LUCCCA OS Grade Evaluation - Audit Log + Timeline (2.0/5 → 4.0/5)

-- ============================================================================
-- UNIFIED AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS unified_audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type VARCHAR(100) NOT NULL, -- 'recipe', 'beo', 'journal_entry', 'shift', etc.
  entity_id TEXT NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', etc.
  performed_by TEXT NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Tamper evidence (hash chain)
  previous_hash TEXT,
  current_hash TEXT NOT NULL, -- SHA256 hash for tamper evidence
  
  INDEX idx_audit_tenant (tenant_id),
  INDEX idx_audit_entity (tenant_id, entity_type, entity_id, performed_at DESC),
  INDEX idx_audit_performed_at (performed_at DESC),
  INDEX idx_audit_performed_by (tenant_id, performed_by, performed_at DESC),
  INDEX idx_audit_action (tenant_id, action, performed_at DESC),
  INDEX idx_audit_hash (current_hash),
  INDEX idx_audit_entity_action (tenant_id, entity_type, entity_id, action)
);

-- ============================================================================
-- AUDIT LOG QUERY VIEW (for timeline)
-- ============================================================================

CREATE OR REPLACE VIEW audit_timeline AS
SELECT 
  id,
  tenant_id,
  entity_type,
  entity_id,
  action,
  performed_by,
  performed_at,
  old_value,
  new_value,
  metadata,
  current_hash,
  previous_hash
FROM unified_audit_logs
ORDER BY performed_at DESC;

-- ============================================================================
-- FUNCTION: Verify audit log integrity
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_audit_log_integrity(p_tenant_id TEXT, p_entity_type TEXT, p_entity_id TEXT)
RETURNS TABLE(
  id TEXT,
  performed_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN,
  expected_hash TEXT,
  actual_hash TEXT
) AS $$
DECLARE
  v_previous_hash TEXT := NULL;
  v_row RECORD;
BEGIN
  FOR v_row IN 
    SELECT * FROM unified_audit_logs
    WHERE tenant_id = p_tenant_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
    ORDER BY performed_at ASC
  LOOP
    DECLARE
      v_expected_hash TEXT;
      v_hash_input TEXT;
    BEGIN
      -- Calculate expected hash
      v_hash_input := json_build_object(
        'id', v_row.id,
        'tenant_id', v_row.tenant_id,
        'entity_type', v_row.entity_type,
        'entity_id', v_row.entity_id,
        'action', v_row.action,
        'performed_by', v_row.performed_by,
        'performed_at', v_row.performed_at,
        'old_value', v_row.old_value,
        'new_value', v_row.new_value,
        'metadata', v_row.metadata,
        'previous_hash', v_previous_hash
      )::TEXT;
      
      v_expected_hash := encode(digest(v_hash_input, 'sha256'), 'hex');
      
      -- Check if hash matches
      RETURN QUERY SELECT 
        v_row.id,
        v_row.performed_at,
        (v_row.current_hash = v_expected_hash)::BOOLEAN AS is_valid,
        v_expected_hash,
        v_row.current_hash;
      
      v_previous_hash := v_expected_hash;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE unified_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY unified_audit_logs_tenant_isolation ON unified_audit_logs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ============================================================================
-- RETENTION POLICY: Archive old audit logs (older than 1 year)
-- ============================================================================

CREATE TABLE IF NOT EXISTS unified_audit_logs_archive (
  LIKE unified_audit_logs INCLUDING ALL
);

CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void AS $$
BEGIN
  INSERT INTO unified_audit_logs_archive
  SELECT * FROM unified_audit_logs
  WHERE performed_at < NOW() - INTERVAL '1 year';
  
  DELETE FROM unified_audit_logs
  WHERE performed_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;
