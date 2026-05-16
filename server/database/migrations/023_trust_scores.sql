-- ===========================================================================
-- Migration: 023 - trust_scores
-- Layer:    Substrate: Trust
-- Phase:    3
--
-- WARNING: Tenet 4 - this table is NEVER joined into a guest-facing API
-- response. Server-side only. Internal fraud signal.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS trust_scores (
  guest_id                   UUID PRIMARY KEY,
  computed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  identity_coherence         REAL NOT NULL,
  behavioral_consistency     REAL NOT NULL,
  contextual_plausibility    REAL NOT NULL,
  composite                  REAL NOT NULL,

  flags                      JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Audit trail. Every change to a trust score is appended here.
CREATE TABLE IF NOT EXISTS trust_score_history (
  id            UUID PRIMARY KEY,
  guest_id      UUID NOT NULL,
  at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  composite     REAL NOT NULL,
  reason        TEXT NOT NULL
);

CREATE INDEX idx_trust_history_guest ON trust_score_history (guest_id, at DESC);
