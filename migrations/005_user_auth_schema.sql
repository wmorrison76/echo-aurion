/**
 * Migration: User Authentication and Multi-Tenancy Schema
 * 
 * Creates tables for:
 * - User accounts (email/password + Azure AD)
 * - Organizations (multi-tenancy)
 * - Sessions (JWT token management)
 * 
 * Purpose:
 * - Support both email/password and Azure AD authentication
 * - Enable multi-tenant architecture
 * - Track active sessions for token management
 * - Provide audit trail for user actions
 */

-- ==================== ORGANIZATIONS ====================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID,
  
  -- Organization metadata
  description TEXT,
  logo_url TEXT,
  max_users INTEGER DEFAULT 999999,
  settings JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_name CHECK (char_length(name) > 0),
  CONSTRAINT valid_slug CHECK (char_length(slug) > 0 AND slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);


-- ==================== USERS ====================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  
  -- Email/Password auth
  password_hash TEXT,
  password_changed_at TIMESTAMP,
  
  -- Azure AD auth
  azure_id TEXT UNIQUE,
  azure_mail TEXT,
  azure_display_name TEXT,
  
  -- User profile
  full_name TEXT,
  avatar_url TEXT,
  
  -- Organization
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'deleted'
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  
  -- Preferences
  preferences JSONB DEFAULT '{}',
  
  -- Audit
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_azure_id ON users(azure_id);
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verified ON users(email_verified);


-- ==================== SESSIONS ====================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Token data
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT DEFAULT 'jwt', -- 'jwt', 'refresh'
  
  -- Session details
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- 'web', 'mobile', 'desktop'
  
  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  last_activity_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT not_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at);


-- ==================== AUDIT LOG ====================

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Event details
  action TEXT NOT NULL, -- 'signup', 'login', 'logout', 'password_change', 'azure_link'
  status TEXT NOT NULL, -- 'success', 'failure'
  reason TEXT,
  error_message TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  auth_method TEXT, -- 'email_password', 'azure_ad'
  
  -- Audit
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_action CHECK (action IN ('signup', 'login', 'logout', 'password_change', 'azure_link', 'password_reset', 'email_verify')),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure'))
);

CREATE INDEX idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_log_org_id ON auth_audit_log(org_id);
CREATE INDEX idx_auth_audit_log_action ON auth_audit_log(action);
CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log(created_at);


-- ==================== TRIGGERS ====================

-- Update updated_at timestamp for organizations
CREATE OR REPLACE FUNCTION update_organizations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_timestamp_trigger ON organizations;
CREATE TRIGGER update_organizations_timestamp_trigger
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_organizations_timestamp();


-- Update updated_at timestamp for users
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_timestamp_trigger ON users;
CREATE TRIGGER update_users_timestamp_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_timestamp();


-- Update last_activity_at for sessions
CREATE OR REPLACE FUNCTION update_sessions_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sessions_activity_trigger ON sessions;
CREATE TRIGGER update_sessions_activity_trigger
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_sessions_activity();


-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can see their own org
CREATE POLICY organizations_user_access ON organizations
  FOR SELECT
  USING (id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users: Users can see members of their org
CREATE POLICY users_org_access ON users
  FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Users: Users can update their own profile
CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Sessions: Users can see their own sessions
CREATE POLICY sessions_user_access ON sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Audit log: Users can see their own audit log
CREATE POLICY auth_audit_log_user_access ON auth_audit_log
  FOR SELECT
  USING (user_id = auth.uid() OR org_id = (SELECT org_id FROM users WHERE id = auth.uid()));


-- ==================== COMMENTS ====================

COMMENT ON TABLE organizations IS 'Organizations (workspaces) for multi-tenancy';
COMMENT ON TABLE users IS 'User accounts with support for email/password and Azure AD';
COMMENT ON TABLE sessions IS 'Active and historical user sessions for token management';
COMMENT ON TABLE auth_audit_log IS 'Audit trail for authentication events';

COMMENT ON COLUMN organizations.owner_id IS 'UUID of the user who created the organization';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly organization identifier (lowercase, hyphens only)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of password (NULL if using Azure AD only)';
COMMENT ON COLUMN users.azure_id IS 'Azure AD user OID (NULL if using email/password only)';
COMMENT ON COLUMN users.role IS 'Role within organization: owner, admin, or member';
COMMENT ON COLUMN sessions.token_hash IS 'SHA256 hash of JWT token (for security; token never stored plaintext)';
COMMENT ON COLUMN sessions.expires_at IS 'UTC timestamp when token expires';
COMMENT ON COLUMN sessions.revoked_at IS 'UTC timestamp when token was manually revoked (if applicable)';
