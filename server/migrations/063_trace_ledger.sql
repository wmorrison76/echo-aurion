-- Migration: TraceLedger append-only audit trail
-- Purpose: Canonical trace ledger for cross-domain auditing
-- Date: 2026-01-23

CREATE TABLE IF NOT EXISTS trace_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_ref TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trace_ledger_org_id
  ON trace_ledger(org_id);

CREATE INDEX IF NOT EXISTS idx_trace_ledger_entity
  ON trace_ledger(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_trace_ledger_source_ref
  ON trace_ledger(source_ref);
