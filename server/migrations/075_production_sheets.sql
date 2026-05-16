-- Migration: 24h Production Sheets (A5)
-- Purpose: Persist a per-BEO production sheet — the document the kitchen
--          actually works from on event day. Generated automatically by
--          the scheduler ~24h before an event, or on demand by chef. One
--          sheet per BEO per generation pass; subsequent regenerations
--          supersede the prior one (the prior is kept for audit via
--          status='superseded').
--
--          The sheet body is a snapshot — scaled ingredients, prep
--          tasks, station assignments, timeline — frozen at generation
--          time so the kitchen card doesn't shift under the cooks
--          while service is running.
--
-- Ticket:  A5 (prospect → plate vertical slice)
-- Date:    2026-05-06

CREATE TABLE IF NOT EXISTS production_sheets (
  -- Identity
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  beo_id          UUID NOT NULL,
  lifecycle_event_id TEXT,

  -- Sheet status — supersedes pattern lets us regenerate without
  -- destroying the audit trail.
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','superseded','cancelled')),

  -- Generation metadata
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by    TEXT NOT NULL DEFAULT 'scheduler',
  trigger         TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (trigger IN ('scheduled','manual','beo_approved','regenerate')),
  fires_at        TIMESTAMPTZ,         -- when the kitchen should start
  event_date      DATE NOT NULL,       -- service day
  guest_count     INTEGER NOT NULL DEFAULT 0,

  -- Snapshot body
  ingredients     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- scaled lines
  tasks           JSONB NOT NULL DEFAULT '[]'::jsonb,  -- maestro tasks
  timeline        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- prep/cook order
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals          JSONB NOT NULL DEFAULT '{}'::jsonb   -- summary numbers
);

CREATE INDEX IF NOT EXISTS idx_production_sheets_org_event_date
  ON production_sheets (org_id, event_date);

CREATE INDEX IF NOT EXISTS idx_production_sheets_beo_active
  ON production_sheets (beo_id, status);

CREATE INDEX IF NOT EXISTS idx_production_sheets_org_status
  ON production_sheets (org_id, status);

-- Idempotency: at most one ACTIVE sheet per BEO at any time.
-- Regenerations flip the prior row to 'superseded' before inserting new.
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_sheets_one_active_per_beo
  ON production_sheets (beo_id) WHERE status = 'active';

-- Audit table: every scheduler tick records what it did.
CREATE TABLE IF NOT EXISTS production_sheet_scheduler_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID,                 -- NULL for cross-org passes
  ran_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start    TIMESTAMPTZ NOT NULL, -- ~ now + 23h
  window_end      TIMESTAMPTZ NOT NULL, -- ~ now + 25h
  beos_examined   INTEGER NOT NULL DEFAULT 0,
  sheets_created  INTEGER NOT NULL DEFAULT 0,
  sheets_skipped  INTEGER NOT NULL DEFAULT 0,  -- already had active sheet
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_production_sheet_runs_ran_at
  ON production_sheet_scheduler_runs (ran_at DESC);

COMMENT ON TABLE production_sheets IS
  'A5: kitchen production sheet generated ~24h before an event. One '
  'active sheet per BEO; regeneration supersedes the prior row.';

COMMENT ON TABLE production_sheet_scheduler_runs IS
  'A5: audit row per scheduler tick so operators can see when the 24h '
  'pass last ran and what it did.';
