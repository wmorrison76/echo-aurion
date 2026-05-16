-- Migration: Prospect ↔ Event ↔ BEO foreign-key linkage
-- Purpose: Real FKs joining the three entities so the prospect-to-plate
--          chain doesn't lose context between modules. Three things change:
--
--          1. beo_banquet_orders gets lifecycle_event_id (link to the
--             persistent EventRecord introduced in migration 070) and
--             prospect_id (link to prospects.id). The existing event_id
--             FK to calendar_events stays — it represents the visual
--             calendar row, which is a different concern (A7 reconciles).
--          2. prospects gets lifecycle_event_id so the conversion from
--             prospect → event is reversible.
--          3. lifecycle_events.beo_id (already added in 070) gets a
--             matching index for joins.
--
-- Ticket:  A2 (prospect → plate vertical slice)
-- Date:    2026-05-06

-- =========================================================================
-- BEO ↔ EVENT / PROSPECT
-- =========================================================================

ALTER TABLE beo_banquet_orders
  ADD COLUMN IF NOT EXISTS lifecycle_event_id TEXT,
  ADD COLUMN IF NOT EXISTS prospect_id        UUID;

CREATE INDEX IF NOT EXISTS idx_beo_lifecycle_event
  ON beo_banquet_orders (lifecycle_event_id)
  WHERE lifecycle_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beo_prospect
  ON beo_banquet_orders (prospect_id)
  WHERE prospect_id IS NOT NULL;

-- prospects.id is UUID, so the FK is enforceable. lifecycle_events.id is
-- TEXT (matches EventRecord.id from the engine), so the linkage is by
-- value rather than a SQL FK constraint — same approach lifecycle_events
-- uses internally.
ALTER TABLE beo_banquet_orders
  ADD CONSTRAINT fk_beo_prospect
    FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL;

-- =========================================================================
-- PROSPECTS ← LIFECYCLE EVENT
-- =========================================================================

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS lifecycle_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_prospects_lifecycle_event
  ON prospects (lifecycle_event_id)
  WHERE lifecycle_event_id IS NOT NULL;

-- =========================================================================
-- LIFECYCLE_EVENTS — index for joins (beo_id column already exists from 070)
-- =========================================================================

-- Already created in 070_lifecycle_events.sql; ensured here for idempotency.
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_beo_id
  ON lifecycle_events (beo_id)
  WHERE beo_id IS NOT NULL;

COMMENT ON COLUMN beo_banquet_orders.lifecycle_event_id IS
  'Links a BEO row to the EventRecord in lifecycle_events. Set by '
  'EventLifecycleEngine.createBEOFromEvent. Distinct from event_id (which '
  'points at the visual calendar_events row).';

COMMENT ON COLUMN beo_banquet_orders.prospect_id IS
  'Links a BEO back to the original prospect. Populated when the BEO is '
  'created from an event that came from a prospect (A2 chain).';

COMMENT ON COLUMN prospects.lifecycle_event_id IS
  'Links a prospect to the EventRecord it converted into. Populated by '
  'EventLifecycleEngine.createEventFromProspect.';
