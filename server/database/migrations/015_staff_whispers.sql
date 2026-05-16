-- ===========================================================================
-- Migration: 015 - staff_whispers
-- Layer:    Aurion
-- Phase:    4
-- Purpose:  The earpiece protocol log. Staff transparency log per Tenet 6.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS staff_whispers (
  id                          UUID PRIMARY KEY,
  staff_id                    UUID NOT NULL,
  guest_id                    UUID NOT NULL,
  triggered_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  urgency                     TEXT NOT NULL,           -- background|noticed|priority|urgent
  duration_seconds            INT NOT NULL,
  text                        TEXT NOT NULL,           -- direction NOT dialogue
  do_nots                     TEXT[],
  suggested_intervention_id   UUID,

  flagged_as_wrong            BOOLEAN NOT NULL DEFAULT false,
  staff_note                  TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whispers_staff ON staff_whispers (staff_id, triggered_at DESC);
CREATE INDEX idx_whispers_guest ON staff_whispers (guest_id, triggered_at DESC);
CREATE INDEX idx_whispers_flagged ON staff_whispers (flagged_as_wrong) WHERE flagged_as_wrong = true;
