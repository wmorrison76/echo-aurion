-- ===========================================================================
-- Migration: 010 - interventions_library
-- Layer:    Resonance
-- Phase:    1
-- Purpose:  Parameterized intervention templates. Seeded with founder's
--           operating wisdom (10 templates initially).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS interventions_library (
  id                    UUID PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,

  affect_quadrants      TEXT[] NOT NULL,            -- high-pos|high-neg|low-pos|low-neg
  requires_signals      TEXT[],
  exclude_signals       TEXT[],

  approach              TEXT NOT NULL,              -- active-waiting|gentle-approach|protective|cascade-only|voice-only
  effort                TEXT NOT NULL,              -- frictionless|light|medium|heavy
  lead_time_minutes     INT NOT NULL,
  estimated_cost_cents  INT NOT NULL DEFAULT 0,
  estimated_cost_currency TEXT NOT NULL DEFAULT 'USD',
  reuse_cooldown_days   INT NOT NULL DEFAULT 0,

  departments_required  TEXT[] NOT NULL DEFAULT '{}',
  proxemic_guidance     TEXT,
  scripted_direction    TEXT,                       -- DIRECTION not DIALOGUE
  do_nots               TEXT[] NOT NULL DEFAULT '{}',

  times_used            INT NOT NULL DEFAULT 0,
  success_rate          REAL NOT NULL DEFAULT 0,
  last_used_at          TIMESTAMPTZ,

  active                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interventions_active ON interventions_library (active);
CREATE INDEX idx_interventions_quadrant ON interventions_library USING GIN (affect_quadrants);
