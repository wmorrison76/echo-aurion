-- Migration: Global Calendar Fan-out (A7)
-- Purpose: Every prospect-to-plate state transition should appear on the
--          global calendar. Today the engine emits CALENDAR_EVENT_*
--          signals but nothing actually writes the row; calendar updates
--          happen ad-hoc, missing exactly when they matter most.
--
--          This migration adds the structural columns the fan-out service
--          needs: a stable join from calendar_events to lifecycle_events
--          (so re-sync is idempotent), and a back-pointer to the originating
--          prospect for filtering.
--
-- Ticket:  A7 (final ticket of Sequence A)
-- Date:    2026-05-06

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS lifecycle_event_id TEXT,
  ADD COLUMN IF NOT EXISTS prospect_id        UUID,
  ADD COLUMN IF NOT EXISTS layout_id          UUID,
  ADD COLUMN IF NOT EXISTS production_sheet_id UUID,
  ADD COLUMN IF NOT EXISTS lifecycle_stage    TEXT;

CREATE INDEX IF NOT EXISTS idx_calendar_events_lifecycle
  ON calendar_events (lifecycle_event_id) WHERE lifecycle_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_prospect
  ON calendar_events (prospect_id) WHERE prospect_id IS NOT NULL;

-- Idempotency: at most one calendar_events row per lifecycle_event_id.
-- The fan-out service upserts on this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_one_per_lifecycle
  ON calendar_events (lifecycle_event_id) WHERE lifecycle_event_id IS NOT NULL;

-- Audit table: every fan-out emission. Operator can verify the calendar
-- is converging on truth by checking when each lifecycle id was last
-- synced and whether the sync hit insert / update / no-op.
CREATE TABLE IF NOT EXISTS calendar_fanout_emissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID,
  lifecycle_event_id TEXT NOT NULL,
  calendar_event_id  UUID,
  trigger         TEXT NOT NULL,                         -- bus event type or 'manual'
  action          TEXT NOT NULL CHECK (action IN ('insert','update','noop','error')),
  emitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fields_changed  JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_calendar_fanout_lifecycle
  ON calendar_fanout_emissions (lifecycle_event_id, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_fanout_org_emitted_at
  ON calendar_fanout_emissions (org_id, emitted_at DESC);

COMMENT ON TABLE calendar_fanout_emissions IS
  'A7: audit row per calendar fan-out emission. Lets operators verify '
  'the global calendar is converging on lifecycle truth and spot '
  'anywhere it is not.';
