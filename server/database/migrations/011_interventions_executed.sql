-- ===========================================================================
-- Migration: 011 - interventions_executed
-- Layer:    Resonance
-- Phase:    1
-- Purpose:  Execution log. Every proposed intervention -> outcome.
--           Feeds the learning loop that updates template success_rate.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS interventions_executed (
  id                  UUID PRIMARY KEY,
  template_id         UUID NOT NULL REFERENCES interventions_library(id),
  guest_id            UUID NOT NULL,
  visit_id            UUID NOT NULL,

  proposed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  proposed_by         TEXT NOT NULL,                -- echo-fast|echo-deep|staff
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,

  status              TEXT NOT NULL,                -- proposed|approved|executed|skipped|completed

  pre_reading         REAL,
  post_reading        REAL,
  outcome_score       REAL,
  notes               TEXT,

  cascade_id          UUID,                         -- link to existing cascader if used

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_executed_visit ON interventions_executed (visit_id);
CREATE INDEX idx_executed_guest ON interventions_executed (guest_id, proposed_at DESC);
CREATE INDEX idx_executed_template ON interventions_executed (template_id);
