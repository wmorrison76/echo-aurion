-- ===========================================================================
-- Migration: 017 - trip_briefs
-- Layer:    Voyage
-- Phase:    2
-- Purpose:  Versioned Trip Brief artifacts. Each refresh is a new row.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS trip_briefs (
  id                      UUID PRIMARY KEY,
  trip_id                 UUID NOT NULL REFERENCES trips(id),
  composed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  composed_by             TEXT NOT NULL DEFAULT 'echo-deep',

  paragraphs              TEXT[] NOT NULL,
  call_to_action          TEXT,

  voice_playback_available BOOLEAN NOT NULL DEFAULT true,

  superseded_at           TIMESTAMPTZ,
  superseded_reason       TEXT
);

CREATE INDEX idx_briefs_trip_current ON trip_briefs (trip_id, composed_at DESC) WHERE superseded_at IS NULL;
