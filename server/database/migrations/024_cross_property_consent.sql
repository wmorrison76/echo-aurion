-- ===========================================================================
-- Migration: 024 - cross_property_consent
-- Layer:    Substrate: Network
-- Phase:    6
-- ===========================================================================

CREATE TABLE IF NOT EXISTS cross_property_consent (
  guest_id                  UUID PRIMARY KEY,
  scope                     TEXT NOT NULL,           -- this-property-only|this-brand-only|all-network-properties
  granted_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at                TIMESTAMPTZ,
  permitted_property_ids    UUID[]
);
