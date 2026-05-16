-- EchoStratus Anomalies & Outcomes Schema
-- Generated: 2026-01-09
-- Extends 029_echostratus_core_schema.sql

BEGIN;

-- =========================
-- Anomalies Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  outlet_id text NOT NULL,
  metric_type text NOT NULL, -- revenue, wait_time, ticket_time, labor_cost, satisfaction
  detected_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL, -- low, medium, high, critical
  value numeric NOT NULL,
  expected_value numeric NOT NULL,
  deviation numeric NOT NULL,
  deviation_percentage numeric NOT NULL,
  likely_causes text[] NOT NULL DEFAULT '{}',
  confidence numeric NOT NULL DEFAULT 0.5, -- 0-1
  status text NOT NULL DEFAULT 'new', -- new, investigating, resolved, false_positive
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_anomalies_tenant_outlet ON stratus_anomalies(tenant_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_stratus_anomalies_tenant_severity ON stratus_anomalies(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_stratus_anomalies_tenant_status ON stratus_anomalies(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_stratus_anomalies_tenant_detected ON stratus_anomalies(tenant_id, detected_at DESC);
CREATE TRIGGER trg_stratus_anomalies_updated_at
BEFORE UPDATE ON stratus_anomalies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- Decision Outcomes Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES stratus_decisions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  measurement_time timestamptz NOT NULL,
  days_since_implementation int NOT NULL,
  metric_type text NOT NULL, -- revenue, cost, wait_time, satisfaction, throughput, labor
  forecast_value numeric NOT NULL,
  actual_value numeric NOT NULL,
  delta numeric NOT NULL,
  delta_percentage numeric NOT NULL,
  attribution text[] NOT NULL DEFAULT '{}',
  confidence numeric NOT NULL DEFAULT 0.5, -- 0-1
  status text NOT NULL, -- win, loss, draw
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_outcomes_decision ON stratus_decision_outcomes(decision_id);
CREATE INDEX IF NOT EXISTS idx_stratus_outcomes_tenant ON stratus_decision_outcomes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stratus_outcomes_status ON stratus_decision_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_stratus_outcomes_measurement_time ON stratus_decision_outcomes(measurement_time DESC);
CREATE TRIGGER trg_stratus_outcomes_updated_at
BEFORE UPDATE ON stratus_decision_outcomes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
