-- EchoStratus Properties Schema
-- Generated: 2026-01-09
-- Extends previous migrations

BEGIN;

-- =========================
-- Properties Table
-- =========================
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- restaurant, hotel, catering, venue
  location text,
  status text NOT NULL DEFAULT 'active', -- active, inactive
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_tenant ON properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_status ON properties(tenant_id, status);
CREATE TRIGGER trg_properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
