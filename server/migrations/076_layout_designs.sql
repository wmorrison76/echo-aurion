-- Migration: EchoLayout designs from BEO (A6)
-- Purpose: Persist auto-generated room layouts. The BEO carries room
--          spec + guest count + style; EchoLayout reads that and emits
--          a draft design (table positions, fixtures, aisles). The
--          design enters human-approval flow; once approved, it becomes
--          the BEO's official layout (lifecycle_events.layout_id).
--
--          One design at a time per BEO is "live" (pending_approval or
--          approved). Regenerations supersede the prior. Rejections are
--          kept for audit.
--
-- Ticket:  A6 (prospect → plate vertical slice)
-- Date:    2026-05-06

CREATE TABLE IF NOT EXISTS layout_designs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  beo_id          UUID NOT NULL,
  lifecycle_event_id TEXT,
  room_id         UUID,

  -- Style / status
  style           TEXT NOT NULL DEFAULT 'banquet'
    CHECK (style IN ('banquet','theatre','classroom','cocktail','u_shape','custom')),
  status          TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('draft','pending_approval','approved','rejected','superseded')),

  -- Inputs we designed against (snapshot — so a later guest-count
  -- change doesn't make the layout look wrong retroactively)
  guest_count     INTEGER NOT NULL DEFAULT 0,
  room_spec       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- length/width/units/capacity
  constraints     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- ADA, dietary zones, head-table, dance floor, etc.

  -- Output
  tables          JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{id, type, seats, position, rotation}]
  fixtures        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- stage, bar, dj, etc.
  aisles          JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals          JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { tableCount, totalSeats, capacityPct }
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes           TEXT,

  -- Audit
  generated_by    TEXT NOT NULL DEFAULT 'echolayout',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  rejected_by     TEXT,
  rejected_at     TIMESTAMPTZ,
  rejected_reason TEXT,
  edited          BOOLEAN NOT NULL DEFAULT FALSE  -- flipped to true if human modifies tables/fixtures
);

CREATE INDEX IF NOT EXISTS idx_layout_designs_beo
  ON layout_designs (beo_id);

CREATE INDEX IF NOT EXISTS idx_layout_designs_org_status
  ON layout_designs (org_id, status);

CREATE INDEX IF NOT EXISTS idx_layout_designs_lifecycle
  ON layout_designs (lifecycle_event_id) WHERE lifecycle_event_id IS NOT NULL;

-- Idempotency: at most one design per BEO that is currently in flight
-- (pending_approval or approved). Regenerations must supersede first.
CREATE UNIQUE INDEX IF NOT EXISTS idx_layout_designs_one_live_per_beo
  ON layout_designs (beo_id) WHERE status IN ('pending_approval','approved');

COMMENT ON TABLE layout_designs IS
  'A6: auto-generated room layouts. One live design (pending_approval '
  'or approved) per BEO. Approved designs are linked from '
  'lifecycle_events.layout_id.';
