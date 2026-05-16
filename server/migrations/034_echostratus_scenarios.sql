-- EchoStratus Scenarios Schema
-- Generated: 2026-01-09
-- Extends previous migrations

BEGIN;

-- =========================
-- Scenarios Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulation_results jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft, simulated, approved, implemented
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_scenarios_tenant ON stratus_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stratus_scenarios_tenant_status ON stratus_scenarios(tenant_id, status);
CREATE TRIGGER trg_stratus_scenarios_updated_at
BEFORE UPDATE ON stratus_scenarios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
