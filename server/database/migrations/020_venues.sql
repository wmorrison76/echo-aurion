-- ===========================================================================
-- Migration: 020 - venues and hours
-- Layer:    Atrium
-- Phase:    5
-- ===========================================================================

CREATE TABLE IF NOT EXISTS venues (
  id                  UUID PRIMARY KEY,
  property_id         UUID NOT NULL,
  name                TEXT NOT NULL,
  kind                TEXT NOT NULL,                 -- restaurant|spa|bar|gym|pool|garden|other
  short_description   TEXT NOT NULL,
  bookable            BOOLEAN NOT NULL DEFAULT false,
  hours               JSONB NOT NULL,                -- VenueHours JSON
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_property ON venues (property_id);
