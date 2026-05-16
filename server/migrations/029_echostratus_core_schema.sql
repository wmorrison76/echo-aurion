-- EchoStratus Core Schema (Postgres)
-- Generated: 2026-01-09
-- Notes:
-- - All tables are multi-tenant via tenant_id
-- - Append-only + tamper-evident hashes for events/decisions
-- - Uses gen_random_uuid() (pgcrypto) for UUIDs

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Utility trigger for updated_at
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- Event Spine (Immutable)
-- =========================
CREATE TABLE IF NOT EXISTS stratus_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  event_type text NOT NULL,            -- e.g., recipe.updated.v1
  aggregate_type text NOT NULL,        -- recipe/outlet/check/ticket/invoice/etc.
  aggregate_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  producer text NOT NULL,              -- module name
  payload jsonb NOT NULL,
  schema_version int NOT NULL,
  signature text NOT NULL,             -- HMAC/EdDSA signature
  hash text NOT NULL,                  -- sha256(canonical_event)
  prev_hash text NULL                  -- optional chain for tamper evidence
);
CREATE INDEX IF NOT EXISTS idx_stratus_events_tenant_time ON stratus_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stratus_events_tenant_type ON stratus_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_stratus_events_tenant_agg ON stratus_events(tenant_id, aggregate_type, aggregate_id);

CREATE TABLE IF NOT EXISTS stratus_event_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES stratus_events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',  -- pending|published|failed
  retry_count int NOT NULL DEFAULT 0,
  last_error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stratus_outbox_tenant_status ON stratus_event_outbox(tenant_id, status, created_at);
CREATE TRIGGER trg_stratus_outbox_updated_at
BEFORE UPDATE ON stratus_event_outbox
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- Entities & Knowledge Graph
-- =========================
CREATE TABLE IF NOT EXISTS stratus_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL,
  external_id text,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stratus_entities_tenant_type ON stratus_entities(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_stratus_entities_tenant_external ON stratus_entities(tenant_id, external_id);
CREATE TRIGGER trg_stratus_entities_updated_at
BEFORE UPDATE ON stratus_entities
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS stratus_entity_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  from_entity_id uuid NOT NULL REFERENCES stratus_entities(id) ON DELETE CASCADE,
  to_entity_id uuid NOT NULL REFERENCES stratus_entities(id) ON DELETE CASCADE,
  rel_type text NOT NULL,
  weight numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stratus_rels_tenant_from ON stratus_entity_relationships(tenant_id, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_stratus_rels_tenant_to ON stratus_entity_relationships(tenant_id, to_entity_id);
CREATE INDEX IF NOT EXISTS idx_stratus_rels_tenant_type ON stratus_entity_relationships(tenant_id, rel_type);
CREATE TRIGGER trg_stratus_rels_updated_at
BEFORE UPDATE ON stratus_entity_relationships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- Twin State, Snapshots, and Versioning
-- =========================
CREATE TABLE IF NOT EXISTS stratus_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  training_window jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS stratus_twin_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  snapshot_time timestamptz NOT NULL,
  model_version_id uuid REFERENCES stratus_model_versions(id) ON DELETE SET NULL,
  state jsonb NOT NULL,
  hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stratus_snapshots_tenant_time ON stratus_twin_state_snapshots(tenant_id, snapshot_time DESC);

-- =========================
-- Decision Ledger (the time machine)
-- =========================
CREATE TABLE IF NOT EXISTS stratus_decision_assumption_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenario_count int NOT NULL DEFAULT 10000,
  time_horizon_days int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS stratus_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  decision_type text NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  title text NOT NULL,
  description text,
  proposed_by_user_id uuid,
  proposed_by_system bool NOT NULL DEFAULT false,
  trigger_event_ids uuid[] NOT NULL DEFAULT '{}',
  assumption_set_id uuid NOT NULL REFERENCES stratus_decision_assumption_sets(id) ON DELETE RESTRICT,
  target_entity_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  implemented_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_stratus_decisions_tenant_status ON stratus_decisions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_stratus_decisions_tenant_type ON stratus_decisions(tenant_id, decision_type);
CREATE TRIGGER trg_stratus_decisions_updated_at
BEFORE UPDATE ON stratus_decisions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS stratus_decision_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES stratus_decisions(id) ON DELETE CASCADE,
  run_status text NOT NULL DEFAULT 'queued',
  model_version_id uuid REFERENCES stratus_model_versions(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity jsonb NOT NULL DEFAULT '[]'::jsonb,
  bottlenecks jsonb NOT NULL DEFAULT '[]'::jsonb,
  artifacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stratus_runs_tenant_decision ON stratus_decision_runs(tenant_id, decision_id);

CREATE TABLE IF NOT EXISTS stratus_decision_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  decision_run_id uuid NOT NULL REFERENCES stratus_decision_runs(id) ON DELETE CASCADE,
  metric text NOT NULL,
  distribution jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS stratus_decision_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES stratus_decisions(id) ON DELETE CASCADE,
  stage int NOT NULL DEFAULT 1,
  required_role text NOT NULL,
  approved_by_user_id uuid,
  decision text NOT NULL,
  comment text,
  approved_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stratus_decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  decision_id uuid NOT NULL REFERENCES stratus_decisions(id) ON DELETE CASCADE,
  window text NOT NULL,
  observed jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_vs_forecast jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution_notes text,
  confidence_after numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stratus_outcomes_tenant_decision ON stratus_decision_outcomes(tenant_id, decision_id);

-- =========================
-- Policy Engine (governed autonomy)
-- =========================
CREATE TABLE IF NOT EXISTS stratus_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  dsl text NOT NULL,
  approval_required bool NOT NULL DEFAULT true,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL
);
CREATE TRIGGER trg_stratus_policies_updated_at
BEFORE UPDATE ON stratus_policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS stratus_policy_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  policy_id uuid NOT NULL REFERENCES stratus_policies(id) ON DELETE CASCADE,
  run_time timestamptz NOT NULL DEFAULT now(),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions_proposed jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'done',
  hash text NOT NULL
);

-- =========================
-- Drift Reports
-- =========================
CREATE TABLE IF NOT EXISTS stratus_drift_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  model_version_id uuid REFERENCES stratus_model_versions(id) ON DELETE SET NULL,
  report_time timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'info',
  category text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- =========================
-- Security Audit Logs (immutable)
-- =========================
CREATE TABLE IF NOT EXISTS stratus_security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  request_id text,
  ip text,
  user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  hash text NOT NULL,
  prev_hash text NULL
);
CREATE INDEX IF NOT EXISTS idx_stratus_audit_tenant_time ON stratus_security_audit_logs(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stratus_audit_tenant_action ON stratus_security_audit_logs(tenant_id, action);

COMMIT;
