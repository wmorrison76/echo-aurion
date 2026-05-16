-- EchoStratus Policies Schema
-- Generated: 2026-01-09
-- Extends previous migrations

BEGIN;

-- =========================
-- Policies Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  dsl text NOT NULL, -- Policy DSL code
  compiled jsonb, -- Compiled policy structure
  risk_level text NOT NULL DEFAULT 'low', -- low, medium, high
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_policies_tenant ON stratus_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stratus_policies_tenant_enabled ON stratus_policies(tenant_id, enabled);
CREATE TRIGGER trg_stratus_policies_updated_at
BEFORE UPDATE ON stratus_policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- Policy Executions Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_policy_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES stratus_policies(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  condition_matched text NOT NULL,
  action_taken text NOT NULL,
  result text NOT NULL, -- success, failed, blocked
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_policy_executions_policy ON stratus_policy_executions(policy_id);
CREATE INDEX IF NOT EXISTS idx_stratus_policy_executions_tenant ON stratus_policy_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stratus_policy_executions_triggered ON stratus_policy_executions(triggered_at DESC);

COMMIT;
