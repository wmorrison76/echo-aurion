-- Migration: Client Import Session Payload Storage
-- Purpose: Persist parsed headers/rows so validation/import can run server-side
-- Date: 2026-01-21

ALTER TABLE client_import_sessions
  ADD COLUMN IF NOT EXISTS source_headers TEXT[] DEFAULT '{}'::text[];

ALTER TABLE client_import_sessions
  ADD COLUMN IF NOT EXISTS source_rows JSONB DEFAULT '[]'::jsonb;

ALTER TABLE client_import_sessions
  ADD COLUMN IF NOT EXISTS source_row_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_client_import_sessions_created_at
  ON client_import_sessions(created_at DESC);

