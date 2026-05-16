-- ===========================================================================
-- Migration: 022 - service_credits and loyalty_balances
-- Layer:    Substrate: Trust
-- Phase:    5
-- Purpose:  Recovery currency + dormant balance redemption.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS service_credits (
  id                UUID PRIMARY KEY,
  guest_id          UUID NOT NULL,
  amount_cents      INT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  origin            TEXT NOT NULL,                  -- service-recovery|manual-gm-grant|loyalty-redemption|celebration-offer
  reason            TEXT NOT NULL,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  consumed_at       TIMESTAMPTZ,
  consumed_for      TEXT
);

CREATE INDEX idx_credits_guest ON service_credits (guest_id, issued_at DESC);
CREATE INDEX idx_credits_unused ON service_credits (guest_id) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS loyalty_balances (
  guest_id          UUID PRIMARY KEY,
  program_name      TEXT NOT NULL,
  points_balance    INT NOT NULL DEFAULT 0,
  points_value_cents INT NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  dormant_since     TIMESTAMPTZ,
  last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loyalty_dormant ON loyalty_balances (dormant_since) WHERE dormant_since IS NOT NULL;
