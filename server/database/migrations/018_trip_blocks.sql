-- ===========================================================================
-- Migration: 018 - trip_blocks (the Living Plan)
-- Layer:    Voyage
-- Phase:    2
-- Purpose:  Confirmed/held/suggested blocks composing a trip's timeline.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS trip_blocks (
  id                  UUID PRIMARY KEY,
  trip_id             UUID NOT NULL REFERENCES trips(id),
  class               TEXT NOT NULL,         -- confirmed|held|suggested
  kind                TEXT NOT NULL,         -- travel-arrival|meal|spa|activity|meeting|...

  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  title               TEXT NOT NULL,
  venue_id            UUID,
  party_member_ids    UUID[],

  source              TEXT NOT NULL,         -- guest|aurion-suggested|corporate-import|staff
  proposed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  held_until          TIMESTAMPTZ,           -- auto-release time
  suggestion_copy     TEXT,

  dismissed_at        TIMESTAMPTZ,           -- soft delete: dismissals are signals
  dismissed_reason    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_trip_active ON trip_blocks (trip_id, starts_at) WHERE dismissed_at IS NULL;
CREATE INDEX idx_blocks_held_release ON trip_blocks (held_until) WHERE class = 'held' AND dismissed_at IS NULL;
