-- ===========================================================================
-- Migration: 021 - media_assets (the marketing library)
-- Layer:    Atrium
-- Phase:    5
-- ===========================================================================

CREATE TABLE IF NOT EXISTS media_assets (
  id                       UUID PRIMARY KEY,
  venue_id                 UUID,
  kind                     TEXT NOT NULL,            -- hero-loop|story|reel|photo
  storage_url              TEXT NOT NULL,
  duration_seconds         INT,
  silent_by_default        BOOLEAN NOT NULL DEFAULT true,

  moods                    TEXT[] NOT NULL DEFAULT '{}',
  dayparts                 TEXT[] NOT NULL DEFAULT '{}',
  seasons                  TEXT[] NOT NULL DEFAULT '{}',

  uploaded_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by              UUID NOT NULL,

  published_to_instagram   BOOLEAN NOT NULL DEFAULT false,
  published_to_app         BOOLEAN NOT NULL DEFAULT false,

  retired_at               TIMESTAMPTZ
);

CREATE INDEX idx_media_venue ON media_assets (venue_id) WHERE retired_at IS NULL;
CREATE INDEX idx_media_published_app ON media_assets (published_to_app) WHERE published_to_app = true AND retired_at IS NULL;
CREATE INDEX idx_media_moods ON media_assets USING GIN (moods);
