-- Migration: Persist EventRecord (Echo Events lifecycle)
-- Purpose: Replace the in-process Map<string, EventRecord> in
--          event-lifecycle-engine.ts with a real durable store so
--          prospect → event → BEO state survives server restarts.
-- Ticket:  A1 (prospect → plate vertical slice)
-- Date:    2026-05-06

-- =========================================================================
-- LIFECYCLE EVENTS TABLE
-- =========================================================================
-- One row per EventRecord. Columns mirror the top-level fields of
-- EventRecord; nested structures (pricing, payments, cost_tracking, labor,
-- timeline, documents, menu_selections) are stored as JSONB so the engine
-- can round-trip them without losing fidelity.

CREATE TABLE IF NOT EXISTS lifecycle_events (
  -- Identity
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL,
  outlet_id       TEXT NOT NULL,

  -- Basic info
  name            TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  status          TEXT NOT NULL,

  -- Client info
  client_id       TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_phone    TEXT,
  client_company  TEXT,

  -- Event details
  event_date      DATE NOT NULL,
  start_time      TEXT NOT NULL,
  end_time        TEXT NOT NULL,
  guest_count     INTEGER NOT NULL DEFAULT 0,
  guaranteed_count INTEGER,

  -- Venue / Space / BEO linkage (A2 will FK beo_id to beos.id)
  space_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout_id       TEXT,
  beo_id          TEXT,
  prospect_id     TEXT,

  -- Nested structures
  menu_selections   JSONB NOT NULL DEFAULT '[]'::jsonb,
  pricing           JSONB NOT NULL DEFAULT '{}'::jsonb,
  payments          JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_tracking     JSONB NOT NULL DEFAULT '{}'::jsonb,
  labor_allocation  JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline          JSONB NOT NULL DEFAULT '[]'::jsonb,
  documents         JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_to       JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags              JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes             TEXT NOT NULL DEFAULT '',

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      TEXT NOT NULL
);

-- Indexes for the lookups the engine and calendar will hit
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_org
  ON lifecycle_events (org_id);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_org_status
  ON lifecycle_events (org_id, status);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_org_date
  ON lifecycle_events (org_id, event_date);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_beo
  ON lifecycle_events (beo_id) WHERE beo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_prospect
  ON lifecycle_events (prospect_id) WHERE prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_client
  ON lifecycle_events (client_id);

-- Auto-update updated_at on every row write
CREATE OR REPLACE FUNCTION lifecycle_events_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lifecycle_events_touch ON lifecycle_events;
CREATE TRIGGER trg_lifecycle_events_touch
BEFORE UPDATE ON lifecycle_events
FOR EACH ROW EXECUTE FUNCTION lifecycle_events_touch_updated_at();

COMMENT ON TABLE lifecycle_events IS
  'Persistent store for the EventLifecycleEngine. Each row is one EventRecord. '
  'Replaces the in-memory Map that lost data on server restart (A1).';
