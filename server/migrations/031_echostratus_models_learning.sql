-- EchoStratus Models & Learning Schema
-- Generated: 2026-01-09
-- Extends 029_echostratus_core_schema.sql and 030_echostratus_anomalies_outcomes.sql

BEGIN;

-- =========================
-- Model Versions Table
-- =========================
CREATE TABLE IF NOT EXISTS stratus_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  model_type text NOT NULL, -- queue, kitchen, labor, cost, experience
  version text NOT NULL, -- e.g., "1.2.3"
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  accuracy numeric NOT NULL DEFAULT 0, -- 0-1
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stratus_model_versions_tenant_type ON stratus_model_versions(tenant_id, model_type);
CREATE INDEX IF NOT EXISTS idx_stratus_model_versions_tenant_active ON stratus_model_versions(tenant_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stratus_model_versions_tenant_type_version ON stratus_model_versions(tenant_id, model_type, version);
CREATE TRIGGER trg_stratus_model_versions_updated_at
BEFORE UPDATE ON stratus_model_versions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- Aurum Forecasts Table
-- =========================
CREATE TABLE IF NOT EXISTS aurum_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  outlet_id text NOT NULL,
  period text NOT NULL, -- YYYY-MM-DD or YYYY-MM
  projected_revenue numeric NOT NULL,
  projected_cogs numeric NOT NULL,
  projected_labor numeric NOT NULL,
  projected_prime_cost numeric NOT NULL,
  source text NOT NULL DEFAULT 'stratus', -- stratus, manual, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aurum_forecasts_tenant_outlet ON aurum_forecasts(tenant_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_aurum_forecasts_tenant_period ON aurum_forecasts(tenant_id, period);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aurum_forecasts_tenant_outlet_period ON aurum_forecasts(tenant_id, outlet_id, period);
CREATE TRIGGER trg_aurum_forecasts_updated_at
BEFORE UPDATE ON aurum_forecasts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
