-- ===========================================================================
-- Migration: 019 - corporate_blocks and conference_sessions
-- Layer:    Voyage
-- Phase:    5
-- ===========================================================================

CREATE TABLE IF NOT EXISTS corporate_blocks (
  id                  UUID PRIMARY KEY,
  conference_name     TEXT NOT NULL,
  organizer_name      TEXT NOT NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  attendee_guest_ids  UUID[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conference_sessions (
  id                  UUID PRIMARY KEY,
  block_id            UUID NOT NULL REFERENCES corporate_blocks(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  is_mandatory        BOOLEAN NOT NULL DEFAULT false,
  catering_provided   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_sessions_block ON conference_sessions (block_id, starts_at);
