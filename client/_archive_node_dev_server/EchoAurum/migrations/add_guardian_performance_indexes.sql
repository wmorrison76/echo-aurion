-- ============================================================================
-- MIGRATION: Guardian Performance Optimization Indexes
-- ============================================================================
-- This migration adds indexes to speed up Guardian query patterns
-- Optimizes Zelda (duplicate detection), Phoenix (anomaly detection),
-- and general GL operations used during Guardian checks

-- ============================================================================
-- JOURNAL ENTRIES INDEXES
-- ============================================================================

-- Index 1: Zelda duplicate detection queries
-- Zelda searches for recent entries from same vendor with similar amounts
CREATE INDEX IF NOT EXISTS idx_journal_entries_vendor_date
  ON gl_journal_entries(entity_id, vendor_id, created_at DESC)
  WHERE status IN ('posted', 'draft');

-- Index 2: Phoenix anomaly detection queries
-- Phoenix needs to find historical amounts for statistical analysis
CREATE INDEX IF NOT EXISTS idx_journal_entries_amount_date
  ON gl_journal_entries(entity_id, total_debits, created_at DESC)
  WHERE status = 'posted';

-- Index 3: GL account validation queries
-- Argus validates accounts exist and are active
CREATE INDEX IF NOT EXISTS idx_journal_entries_account
  ON gl_journal_entries(entity_id, gl_account_id)
  WHERE status != 'deleted';

-- Index 4: Fast lookup by transaction date range
-- Used for period-based queries (e.g., "last 30 days")
CREATE INDEX IF NOT EXISTS idx_journal_entries_date_range
  ON gl_journal_entries(entity_id, created_at DESC)
  WHERE status = 'posted';

-- ============================================================================
-- AP INVOICES INDEXES
-- ============================================================================

-- Index 5: Zelda duplicate detection for invoices
-- Detects duplicate invoices from same vendor
CREATE INDEX IF NOT EXISTS idx_ap_invoices_vendor_number
  ON ap_invoices(entity_id, vendor_id, invoice_number)
  WHERE status IN ('draft', 'matched', 'approved');

-- Index 6: Phoenix risk scoring for invoices
-- Quick lookup of recent invoices for amount analysis
CREATE INDEX IF NOT EXISTS idx_ap_invoices_amount_date
  ON ap_invoices(entity_id, total_amount, created_at DESC)
  WHERE status != 'rejected';

-- Index 7: AP invoice matching optimization
-- Speeds up 2-way and 3-way matching logic
CREATE INDEX IF NOT EXISTS idx_ap_invoices_matching
  ON ap_invoices(entity_id, match_status, created_at DESC)
  WHERE status IN ('matched', 'approved');

-- ============================================================================
-- GUARDIAN AUDIT TRAIL INDEXES
-- ============================================================================

-- Index 8: Fast audit trail queries by entity and date
CREATE INDEX IF NOT EXISTS idx_guardian_audit_entity_date_status
  ON guardian_audit_trail(entity_id, created_at DESC, overall_status);

-- Index 9: Risk scoring analysis
CREATE INDEX IF NOT EXISTS idx_guardian_audit_risk_score
  ON guardian_audit_trail(entity_id, risk_score DESC)
  WHERE overall_status = 'BLOCKED';

-- Index 10: Transaction lookup in audit trail
CREATE INDEX IF NOT EXISTS idx_guardian_audit_transaction_lookup
  ON guardian_audit_trail(transaction_id, created_at DESC);

-- ============================================================================
-- AUTOMATION SETTINGS INDEXES
-- ============================================================================

-- Index 11: Fast lookup of automation rules by entity
CREATE INDEX IF NOT EXISTS idx_automation_rules_active
  ON automation_rules(entity_id, is_active, is_paused)
  WHERE is_active = true AND is_paused = false;

-- Index 12: Rule execution logging
CREATE INDEX IF NOT EXISTS idx_rule_execution_entity_date
  ON rule_execution_log(entity_id, triggered_at DESC);

-- ============================================================================
-- CONSTRAINT INDEXES (Automatic by PostgreSQL)
-- ============================================================================
-- PostgreSQL automatically creates indexes for:
-- - PRIMARY KEYs (entity_id in tables)
-- - UNIQUE constraints (already indexed)
-- - FOREIGN KEY columns (implicit indexing)

-- ============================================================================
-- STATISTICS
-- ============================================================================
-- Force ANALYZE to update query planner statistics after index creation
-- This helps the query planner choose the best execution plans
ANALYZE gl_journal_entries;
ANALYZE ap_invoices;
ANALYZE guardian_audit_trail;
ANALYZE automation_rules;
ANALYZE rule_execution_log;

-- Verification query: Check all created indexes
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
