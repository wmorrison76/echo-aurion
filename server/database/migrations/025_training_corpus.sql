-- ===========================================================================
-- Migration: 025 - training_corpus
-- Layer:    Substrate: Network
-- Phase:    6
-- Purpose:  Anonymized episode traces. The data flywheel.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS training_episodes (
  id                  UUID PRIMARY KEY,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  segment_key         TEXT NOT NULL,                -- e.g. "luxury_resort_us-fl_anniversary"
  pre_state           JSONB NOT NULL,
  action              JSONB NOT NULL,
  post_state          JSONB NOT NULL,
  outcome_quality     REAL NOT NULL                 -- 0-1
);

CREATE INDEX idx_corpus_segment ON training_episodes (segment_key, captured_at DESC);
CREATE INDEX idx_corpus_quality ON training_episodes (outcome_quality);
