-- ===========================================================================
-- Migration: 014 - prosody_readings
-- Layer:    Aurion
-- Phase:    3
-- Purpose:  Voice tone analysis output. Score persists, audio does not (Tenet 2).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS prosody_readings (
  id                  UUID PRIMARY KEY,
  session_id          UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  arousal             REAL NOT NULL,
  valence             REAL NOT NULL,

  energy_level        REAL NOT NULL,
  warmth              REAL NOT NULL,
  hesitation          REAL NOT NULL,
  pitch_variability   REAL NOT NULL,
  speaking_rate       REAL NOT NULL,
  detected_sighs      INT NOT NULL DEFAULT 0,
  detected_laughs     INT NOT NULL DEFAULT 0,

  confidence          REAL NOT NULL
);

CREATE INDEX idx_prosody_session ON prosody_readings (session_id, captured_at);
