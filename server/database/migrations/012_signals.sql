-- ===========================================================================
-- Migration: 012 - signals
-- Layer:    Substrate: Signal Graph
-- Phase:    1
-- Purpose:  The unified signal graph. Every guest interaction across every
--           layer becomes a row. The platform's memory.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS signals (
  id            UUID PRIMARY KEY,
  guest_id      UUID NOT NULL,
  visit_id      UUID,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),

  source        TEXT NOT NULL,
  subject       JSONB NOT NULL,
  tags          JSONB NOT NULL DEFAULT '[]'::jsonb,

  conversion    TEXT,                              -- converted|considered|dismissed|null
  note          TEXT,

  sensitivity   TEXT NOT NULL,                     -- public|preference|behavioral|emotional|sensitive|forbidden
  expires_at    TIMESTAMPTZ NOT NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_guest ON signals (guest_id, timestamp DESC);
CREATE INDEX idx_signals_visit ON signals (visit_id, timestamp DESC);
CREATE INDEX idx_signals_expires ON signals (expires_at);
CREATE INDEX idx_signals_source ON signals (source);
