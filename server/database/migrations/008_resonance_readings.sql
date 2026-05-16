-- ===========================================================================
-- Migration: 008 - resonance_readings
-- Layer:    Resonance
-- Phase:    1
--
-- Purpose:  The atomic table for emotional intelligence. Every faint-signal
--           observation, every voice-derived prosody reading, every inferred
--           affect estimate is one row.
--
-- Pending:  Adapt to your team's migration runner (Drizzle / Prisma / raw SQL).
--           This file is the canonical schema; translate as needed.
--
-- WARNING: Additive only. Do not modify columns; add new ones via a later migration.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS resonance_readings (
  id              UUID PRIMARY KEY,
  guest_id        UUID NOT NULL,
  visit_id        UUID,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by     TEXT NOT NULL,            -- staff UUID or 'aurion'
  channel         TEXT NOT NULL,            -- observation|voice|inferred|self-reported

  arousal         REAL NOT NULL,            -- -1.0 to +1.0
  valence         REAL NOT NULL,            -- -1.0 to +1.0
  resonance       REAL NOT NULL,            -- 1-10 computed

  signals         JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence      REAL NOT NULL,            -- 0.0 to 1.0
  note            TEXT,

  expires_at      TIMESTAMPTZ NOT NULL,     -- auto-decay enforcement

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resonance_readings_guest ON resonance_readings (guest_id, timestamp DESC);
CREATE INDEX idx_resonance_readings_visit ON resonance_readings (visit_id, timestamp DESC);
CREATE INDEX idx_resonance_readings_expires ON resonance_readings (expires_at);
