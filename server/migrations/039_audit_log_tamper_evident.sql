-- Migration: Audit Log with Tamper-Evident Storage
-- Purpose: Enterprise audit log with hash chaining for tamper detection
-- Date: 2025-01-16
-- Addresses: LUCCCA OS Grade Evaluation - Audit Log (TODO-014, TODO-015)

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'READ', 'EXPORT', 
    'LOGIN', 'LOGOUT', 'SECURITY_EVENT'
  )),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  
  -- Change tracking
  changes JSONB DEFAULT '{}'::jsonb, -- Before/after values
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Tamper-evident hashing
  hash TEXT NOT NULL, -- SHA-256 hash of entry
  previous_hash TEXT, -- Hash of previous entry (chain)
  
  INDEX idx_audit_tenant (tenant_id),
  INDEX idx_audit_org (tenant_id, org_id),
  INDEX idx_audit_user (tenant_id, user_id),
  INDEX idx_audit_entity (tenant_id, entity_type, entity_id),
  INDEX idx_audit_action (tenant_id, action),
  INDEX idx_audit_timestamp (tenant_id, timestamp DESC),
  INDEX idx_audit_entity_timestamp (tenant_id, entity_type, entity_id, timestamp DESC),
  INDEX idx_audit_hash (hash) -- For integrity verification
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ============================================================================
-- CLEANUP: Archive old audit logs (optional)
-- ============================================================================

-- Note: Audit logs should typically be retained for compliance
-- This function can be used to archive logs older than retention period
CREATE OR REPLACE FUNCTION archive_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive logs older than retention period
  -- (Implementation depends on archive storage strategy)
  
  -- For now, just log the count (actual archiving logic depends on infrastructure)
  SELECT COUNT(*) INTO archived_count
  FROM audit_logs
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
