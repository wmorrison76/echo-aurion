-- ===========================================================================
-- Migration: 016 - trips
-- Layer:    Voyage
-- Phase:    2
-- Purpose:  The unit of guest engagement. Connects bookings -> briefs -> plans.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS trips (
  id                      UUID PRIMARY KEY,
  guest_id                UUID NOT NULL,
  property_id             UUID NOT NULL,
  status                  TEXT NOT NULL,           -- booked|pre-arrival|arriving|in-stay|departing|post-stay|cancelled
  purpose                 TEXT NOT NULL,           -- leisure|corporate|celebration|wellness|family-reunion|mixed

  booking_id              UUID UNIQUE,             -- idempotency
  booked_at               TIMESTAMPTZ NOT NULL,
  expected_arrival        TIMESTAMPTZ NOT NULL,
  expected_departure      TIMESTAMPTZ NOT NULL,

  party_member_ids        UUID[] NOT NULL DEFAULT '{}',
  primary_guest_id        UUID NOT NULL,
  corporate_block_id      UUID,

  current_brief_id        UUID,
  living_plan_id          UUID,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trips_guest ON trips (guest_id, expected_arrival DESC);
CREATE INDEX idx_trips_property_active ON trips (property_id, expected_arrival)
  WHERE status IN ('pre-arrival', 'arriving', 'in-stay');
CREATE INDEX idx_trips_corporate_block ON trips (corporate_block_id) WHERE corporate_block_id IS NOT NULL;
