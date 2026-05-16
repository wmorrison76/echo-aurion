-- ===========================================================================
-- Migration: 013 - voice_sessions
-- Layer:    Aurion
-- Phase:    3
-- Purpose:  Lifecycle records for guest-Aurion conversations.
--
-- Tenet 2: audio NEVER stored here. Only structured metadata + prosody scores.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS voice_sessions (
  id                      UUID PRIMARY KEY,
  guest_id                UUID,
  staff_id                UUID,
  context                 TEXT NOT NULL,           -- pre-arrival|arrival-handoff|in-room-come-alive|in-stay-ambient|departure|post-stay-followup|staff-whisper
  state                   TEXT NOT NULL,           -- initiating|connecting|active|paused|completed|failed

  started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at                TIMESTAMPTZ,
  duration_seconds        INT,

  voice_profile           TEXT NOT NULL,
  outcome_summary         TEXT,

  /* Transcript optional, opt-in only */
  transcript              TEXT,
  transcript_expires_at   TIMESTAMPTZ,

  /* Audit columns */
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_sessions_guest ON voice_sessions (guest_id, started_at DESC);
CREATE INDEX idx_voice_sessions_staff ON voice_sessions (staff_id, started_at DESC);
CREATE INDEX idx_voice_sessions_active ON voice_sessions (state) WHERE state = 'active';
CREATE INDEX idx_voice_sessions_transcript_expires ON voice_sessions (transcript_expires_at) WHERE transcript_expires_at IS NOT NULL;
