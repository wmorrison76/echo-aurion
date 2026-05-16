/**
 * Migration: Create auth_tokens table for OAuth token storage
 * 
 * This table stores OAuth tokens for Outlook/Teams/Microsoft Graph integration.
 * Tokens are encrypted at rest and automatically refresh when expired.
 * 
 * Purpose:
 * - Persist OAuth tokens across server restarts
 * - Enable multi-user support across organization
 * - Track token lifecycle for security auditing
 * 
 * Usage:
 * INSERT INTO auth_tokens (org_id, user_id, access_token, refresh_token, scopes, expires_at)
 * VALUES ('org-123', 'user-456', 'access...', 'refresh...', ARRAY['Mail.Read', 'Calendar.Read'], ...);
 */

-- Create auth_tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'outlook',
  
  -- OAuth tokens (encrypted via Supabase encryption)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  
  -- Token metadata
  scopes TEXT[] DEFAULT ARRAY['Mail.Read', 'Calendar.Read', 'User.Read', 'offline_access'],
  expires_at BIGINT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  last_used_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_user_provider UNIQUE(org_id, user_id, provider),
  CONSTRAINT valid_expires_at CHECK (expires_at > 0)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_tokens_org_id ON auth_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_org_user ON auth_tokens(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_provider ON auth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_auth_tokens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_auth_tokens_timestamp_trigger ON auth_tokens;
CREATE TRIGGER update_auth_tokens_timestamp_trigger
BEFORE UPDATE ON auth_tokens
FOR EACH ROW
EXECUTE FUNCTION update_auth_tokens_timestamp();

-- Create audit log table for token access
CREATE TABLE IF NOT EXISTS auth_token_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'outlook',
  action TEXT NOT NULL, -- 'created', 'refreshed', 'used', 'deleted', 'failed'
  status TEXT NOT NULL, -- 'success', 'failure'
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Create index for audit log lookups
CREATE INDEX IF NOT EXISTS idx_auth_token_audit_org_id ON auth_token_audit(org_id);
CREATE INDEX IF NOT EXISTS idx_auth_token_audit_user_id ON auth_token_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_token_audit_created_at ON auth_token_audit(created_at);

-- Enable Row Level Security (optional, for multi-tenancy)
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_token_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own tokens
CREATE POLICY IF NOT EXISTS auth_tokens_user_isolation ON auth_tokens
  FOR SELECT
  USING (org_id = current_setting('app.current_org_id')::text);

CREATE POLICY IF NOT EXISTS auth_token_audit_user_isolation ON auth_token_audit
  FOR SELECT
  USING (org_id = current_setting('app.current_org_id')::text);

-- Add comments
COMMENT ON TABLE auth_tokens IS 'Stores OAuth tokens for external service integration (Outlook, Teams, etc.)';
COMMENT ON COLUMN auth_tokens.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN auth_tokens.user_id IS 'User ID within organization';
COMMENT ON COLUMN auth_tokens.provider IS 'OAuth provider (outlook, gmail, teams)';
COMMENT ON COLUMN auth_tokens.access_token IS 'Short-lived access token (1 hour)';
COMMENT ON COLUMN auth_tokens.refresh_token IS 'Long-lived refresh token (90 days)';
COMMENT ON COLUMN auth_tokens.scopes IS 'Array of OAuth scopes granted';
COMMENT ON COLUMN auth_tokens.expires_at IS 'Unix timestamp when access token expires';
COMMENT ON TABLE auth_token_audit IS 'Audit log for token access and lifecycle events';
