-- Migration: Consolidation resilience (A4.5)
-- Purpose: Make the consolidation engine production-safe at scale —
--          handle thousands of BEOs per pass, survive process death
--          mid-run, never lose a shortfall row, deduplicate duplicate
--          submissions, and keep ingredient → product matching
--          deterministic across re-runs.
--
--          Five things change:
--
--          1. purchase_consolidations gets explicit run-status fields:
--             run_status (pending | running | completed | partial | failed),
--             started_at, completed_at, last_heartbeat_at, error_summary,
--             pending_supplier_groups (the leftover work for resume).
--          2. purchase_consolidations gets idempotency_key — repeated
--             submissions with the same key return the original run
--             instead of creating a duplicate.
--          3. scaled_ingredients and inventory_items both get a
--             normalized_name column populated by a SQL immutable
--             function; matching is now deterministic and indexable
--             instead of doing case-insensitive string comparison in
--             memory.
--          4. event_purchase_orders gets a partial unique constraint on
--             (consolidation_id, supplier_name, product_name) so a
--             retry can't write two rows for the same shortfall.
--          5. A view `stuck_consolidations` surfaces runs whose
--             last_heartbeat_at is older than 10 minutes while still
--             in run_status='running' — the operator visibility layer.
--
-- Ticket:  A4.5 (consolidation resilience)
-- Date:    2026-05-06

-- =========================================================================
-- 1. NORMALIZATION FUNCTION
-- =========================================================================
-- Lowercase, trim, collapse whitespace, drop common adjectival qualifiers
-- that vendors add inconsistently ("fresh", "organic", "raw"). IMMUTABLE
-- so it can be used in indexes.

CREATE OR REPLACE FUNCTION ingredient_normalize_name(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s TEXT;
BEGIN
  IF name IS NULL THEN RETURN NULL; END IF;
  s := lower(trim(name));
  s := regexp_replace(s, '\s+', ' ', 'g');
  -- Strip a small set of qualifiers that show up everywhere and don't
  -- change product identity. Conservative; can be expanded later.
  s := regexp_replace(s, '^(fresh|organic|raw|frozen|whole|chopped|diced) ', '', 'g');
  RETURN s;
END;
$$;

-- =========================================================================
-- 2. PURCHASE_CONSOLIDATIONS — run status + resume support
-- =========================================================================

ALTER TABLE purchase_consolidations
  ADD COLUMN IF NOT EXISTS run_status              TEXT NOT NULL DEFAULT 'completed'
    CHECK (run_status IN ('pending','running','completed','partial','failed')),
  ADD COLUMN IF NOT EXISTS started_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_summary           TEXT,
  ADD COLUMN IF NOT EXISTS pending_supplier_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key         TEXT,
  ADD COLUMN IF NOT EXISTS retry_count             INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_purchase_consolidations_status
  ON purchase_consolidations (org_id, run_status);

-- Idempotency — same key, same org, returns existing run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_consolidations_idempotency
  ON purchase_consolidations (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =========================================================================
-- 3. NORMALIZED NAME COLUMNS — for deterministic matching
-- =========================================================================

ALTER TABLE scaled_ingredients
  ADD COLUMN IF NOT EXISTS normalized_name TEXT
    GENERATED ALWAYS AS (ingredient_normalize_name(ingredient_name)) STORED;

CREATE INDEX IF NOT EXISTS idx_scaled_ingredients_normalized
  ON scaled_ingredients (normalized_name);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS normalized_name TEXT
    GENERATED ALWAYS AS (ingredient_normalize_name(product_name)) STORED;

CREATE INDEX IF NOT EXISTS idx_inventory_items_normalized
  ON inventory_items (org_id, normalized_name);

-- =========================================================================
-- 4. EVENT_PURCHASE_ORDERS — dedupe constraint
-- =========================================================================

-- Same (consolidation_id, supplier_name, product_name) cannot be inserted
-- twice. Lets resume retries be safe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_purchase_orders_consolidation_dedupe
  ON event_purchase_orders (consolidation_id, supplier_name, product_name)
  WHERE consolidation_id IS NOT NULL;

-- =========================================================================
-- 5. STUCK-RUN VISIBILITY
-- =========================================================================

CREATE OR REPLACE VIEW stuck_consolidations AS
SELECT
  id,
  org_id,
  run_status,
  started_at,
  last_heartbeat_at,
  EXTRACT(EPOCH FROM (NOW() - last_heartbeat_at))::INT AS seconds_since_heartbeat,
  retry_count,
  pending_supplier_groups,
  error_summary
FROM purchase_consolidations
WHERE run_status = 'running'
  AND last_heartbeat_at IS NOT NULL
  AND last_heartbeat_at < NOW() - INTERVAL '10 minutes';

COMMENT ON VIEW stuck_consolidations IS
  'Consolidation runs whose process likely died mid-flight. Operator UI '
  'should poll this view; A4.5 resume endpoint can be invoked to recover.';
