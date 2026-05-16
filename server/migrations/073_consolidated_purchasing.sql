-- Migration: Multi-BEO consolidated purchasing
-- Purpose: Lets the platform aggregate ingredient demand across every BEO
--          inside a lookahead window and emit one PO per supplier instead
--          of one PO per BEO. The owner's exact phrasing was "if they can
--          only run one BEO at a time, think it doesn't exist" — this
--          schema is the spine that prevents that.
--
--          Two changes:
--          1. event_purchase_orders.production_task_id becomes nullable
--             (consolidation runs at BEO/event level, not task level), and
--             we add columns the consolidation engine needs (unit_cost,
--             product_name, consolidation_id linking back to the run).
--          2. New purchase_consolidations table records each consolidation
--             pass — input window, BEOs included, output PO ids, warnings.
--
-- Ticket:  A4 (prospect → plate vertical slice — CRITICAL)
-- Date:    2026-05-06

-- =========================================================================
-- EVENT_PURCHASE_ORDERS — make BEO/consolidation-friendly
-- =========================================================================

ALTER TABLE event_purchase_orders
  ALTER COLUMN production_task_id DROP NOT NULL;

ALTER TABLE event_purchase_orders
  ADD COLUMN IF NOT EXISTS consolidation_id UUID,
  ADD COLUMN IF NOT EXISTS unit_cost        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS unit             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS product_name     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS quantity         NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS status           VARCHAR(30),
  ADD COLUMN IF NOT EXISTS beo_id           UUID,
  ADD COLUMN IF NOT EXISTS beo_ids_covered  JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_event_purchase_orders_consolidation
  ON event_purchase_orders (consolidation_id) WHERE consolidation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_purchase_orders_org_status
  ON event_purchase_orders (org_id, status);

CREATE INDEX IF NOT EXISTS idx_event_purchase_orders_beo
  ON event_purchase_orders (beo_id) WHERE beo_id IS NOT NULL;

-- =========================================================================
-- PURCHASE_CONSOLIDATIONS — audit trail of each run
-- =========================================================================

CREATE TABLE IF NOT EXISTS purchase_consolidations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,

  -- Run metadata
  run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_by          UUID,
  trigger         TEXT NOT NULL DEFAULT 'manual',  -- manual | scheduled | beo_approved
  dry_run         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Input window
  window_start    DATE NOT NULL,
  window_end      DATE NOT NULL,
  beos_included   JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of beo ids

  -- Output
  pos_created     INTEGER NOT NULL DEFAULT 0,
  po_ids          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of event_purchase_orders.id
  total_cost      NUMERIC(14,2) NOT NULL DEFAULT 0,
  shortfall_count INTEGER NOT NULL DEFAULT 0,
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb   -- the full plan for audit
);

CREATE INDEX IF NOT EXISTS idx_purchase_consolidations_org
  ON purchase_consolidations (org_id);

CREATE INDEX IF NOT EXISTS idx_purchase_consolidations_org_run_at
  ON purchase_consolidations (org_id, run_at DESC);

COMMENT ON TABLE purchase_consolidations IS
  'One row per consolidation pass. The plan_snapshot column captures the '
  'exact shortfall computation and per-supplier groupings so the run can '
  'be audited or re-played without re-querying source data.';
