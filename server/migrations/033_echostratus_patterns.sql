-- EchoStratus Patterns Schema
-- Generated: 2026-01-09
-- Extends previous migrations

BEGIN;

-- =========================
-- Operational Patterns Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_operational_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  outlet_id text NOT NULL,
  pattern_type text NOT NULL,
  description text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  confidence numeric NOT NULL DEFAULT 0.5, -- 0-1
  frequency int NOT NULL DEFAULT 1,
  impact text NOT NULL DEFAULT 'neutral', -- positive, negative, neutral
  entities_involved text[] NOT NULL DEFAULT '{}',
  implicit_decision_id uuid REFERENCES stratus_decisions(id),
  status text NOT NULL DEFAULT 'new', -- new, reviewing, approved, rejected
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_patterns_tenant_outlet ON stratus_operational_patterns(tenant_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_stratus_patterns_tenant_status ON stratus_operational_patterns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_stratus_patterns_tenant_detected ON stratus_operational_patterns(tenant_id, detected_at DESC);
CREATE TRIGGER trg_stratus_patterns_updated_at
BEFORE UPDATE ON stratus_operational_patterns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- Events Archive Table (for performance)
-- =========================
CREATE TABLE IF NOT EXISTS stratus_events_archive (
  LIKE stratus_events INCLUDING ALL
);

CREATE INDEX IF NOT EXISTS idx_stratus_events_archive_tenant_time ON stratus_events_archive(tenant_id, occurred_at DESC);

COMMIT;
