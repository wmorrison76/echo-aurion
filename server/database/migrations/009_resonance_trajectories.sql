-- ===========================================================================
-- Migration: 009 - resonance_trajectories
-- Layer:    Resonance
-- Phase:    1
--
-- Purpose:  Materialized aggregate per active visit. Updated on every reading.
--           Drives the GM floor view dashboard.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS resonance_trajectories (
  visit_id            UUID PRIMARY KEY,
  guest_id            UUID NOT NULL,
  property_id         UUID NOT NULL,

  started_at          TIMESTAMPTZ NOT NULL,
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ,             -- null while in-progress

  entry_score         REAL NOT NULL,
  current_score       REAL NOT NULL,
  trajectory          REAL NOT NULL DEFAULT 0,
  projected_exit_score REAL NOT NULL,
  lift_goal           REAL NOT NULL,           -- entry_score + 2
  lift_gap            REAL NOT NULL,
  status              TEXT NOT NULL,           -- green|amber|red

  reading_count       INT NOT NULL DEFAULT 0,
  has_open_intervention BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_trajectories_property_active ON resonance_trajectories (property_id) WHERE ended_at IS NULL;
CREATE INDEX idx_trajectories_guest ON resonance_trajectories (guest_id, started_at DESC);
