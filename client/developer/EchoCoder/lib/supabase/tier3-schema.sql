-- TIER 3 ENTERPRISE SCHEMA
-- Advanced security, compliance, and authentication features

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- COMPLIANCE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_frameworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  framework_name VARCHAR(100) NOT NULL, -- GDPR, SOC2, HIPAA, PCI-DSS, ISO27001
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, compliant, non_compliant
  last_audit_date TIMESTAMP WITH TIME ZONE,
  next_audit_date TIMESTAMP WITH TIME ZONE,
  audit_findings INTEGER DEFAULT 0,
  remediation_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_framework_status CHECK (status IN ('pending', 'in_progress', 'compliant', 'non_compliant')),
  CONSTRAINT valid_framework CHECK (framework_name IN ('GDPR', 'SOC2', 'HIPAA', 'PCI-DSS', 'ISO27001'))
);

CREATE INDEX idx_compliance_workspace ON compliance_frameworks(workspace_id);
CREATE INDEX idx_compliance_status ON compliance_frameworks(workspace_id, status);

CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
  check_name VARCHAR(255) NOT NULL,
  check_description TEXT,
  category VARCHAR(100),
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  status VARCHAR(50) DEFAULT 'pending', -- pending, pass, fail, not_applicable
  evidence TEXT,
  remediation_steps TEXT,
  checked_by UUID,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_checks_framework ON compliance_checks(framework_id);
CREATE INDEX idx_compliance_checks_status ON compliance_checks(framework_id, status);

-- ============================================
-- IP WHITELIST / NETWORK SECURITY
-- ============================================

CREATE TABLE IF NOT EXISTS ip_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  ip_address INET NOT NULL,
  cidr_block VARCHAR(50),
  description VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  applied_to VARCHAR(100)[], -- workspace, api, all
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  UNIQUE(workspace_id, ip_address)
);

CREATE INDEX idx_ip_whitelist_workspace ON ip_whitelist(workspace_id);
CREATE INDEX idx_ip_whitelist_active ON ip_whitelist(workspace_id, active);

CREATE TABLE IF NOT EXISTS rate_limit_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 3600,
  requests_per_day INTEGER DEFAULT 86400,
  burst_size INTEGER DEFAULT 10,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_rate_status CHECK (status IN ('active', 'inactive'))
);

-- ============================================
-- SSO (Single Sign-On) CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- saml, oauth2, oidc, ldap
  provider_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  domain VARCHAR(255),
  metadata_url VARCHAR(2048),
  entity_id VARCHAR(255),
  acs_url VARCHAR(2048),
  certificate TEXT,
  client_id VARCHAR(255),
  client_secret VARCHAR(255), -- ENCRYPTED in real implementation
  authorization_endpoint VARCHAR(2048),
  token_endpoint VARCHAR(2048),
  userinfo_endpoint VARCHAR(2048),
  scopes TEXT[],
  custom_attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_provider CHECK (provider_type IN ('saml', 'oauth2', 'oidc', 'ldap')),
  UNIQUE(workspace_id, provider_type)
);

CREATE INDEX idx_sso_providers_workspace ON sso_providers(workspace_id);
CREATE INDEX idx_sso_providers_enabled ON sso_providers(workspace_id, enabled);

CREATE TABLE IF NOT EXISTS sso_user_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
  workspace_user_id UUID NOT NULL,
  external_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  attributes JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(provider_id, external_user_id)
);

CREATE INDEX idx_sso_mappings_provider ON sso_user_mappings(provider_id);

-- ============================================
-- TWO-FACTOR AUTHENTICATION (2FA)
-- ============================================

CREATE TABLE IF NOT EXISTS two_fa_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  method VARCHAR(50) NOT NULL DEFAULT 'totp', -- totp, sms, email, webauthn
  secret_key VARCHAR(255), -- ENCRYPTED
  backup_codes TEXT[], -- ENCRYPTED
  verified BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, user_id, method)
);

CREATE INDEX idx_two_fa_workspace ON two_fa_settings(workspace_id);
CREATE INDEX idx_two_fa_user ON two_fa_settings(workspace_id, user_id);
CREATE INDEX idx_two_fa_enabled ON two_fa_settings(workspace_id, user_id, enabled);

CREATE TABLE IF NOT EXISTS two_fa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  two_fa_id UUID NOT NULL REFERENCES two_fa_settings(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL, -- ENCRYPTED
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS two_fa_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  two_fa_id UUID NOT NULL REFERENCES two_fa_settings(id) ON DELETE CASCADE,
  attempt_success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_two_fa_attempts_id ON two_fa_attempts(two_fa_id);
CREATE INDEX idx_two_fa_attempts_created ON two_fa_attempts(created_at DESC);

-- ============================================
-- SESSION AND DEVICE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- mobile, desktop, tablet
  ip_address INET,
  user_agent TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_user_sessions_workspace ON user_sessions(workspace_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(workspace_id, user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ============================================
-- DATA ENCRYPTION AND SECRETS
-- ============================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  key_type VARCHAR(50) DEFAULT 'aes-256-gcm', -- aes-256-gcm, rsa-2048, etc
  key_version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  rotation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, key_name, key_version)
);

CREATE INDEX idx_encryption_keys_workspace ON encryption_keys(workspace_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Compliance: Admin access only
CREATE POLICY compliance_select ON compliance_frameworks FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = compliance_frameworks.workspace_id
    AND role_id IN (
      SELECT id FROM workspace_roles 
      WHERE 'manage_compliance' = ANY(permissions)
    )
  ));

-- IP Whitelist: Admin access
CREATE POLICY ip_whitelist_select ON ip_whitelist FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = ip_whitelist.workspace_id
    AND role_id IN (
      SELECT id FROM workspace_roles 
      WHERE 'manage_network_security' = ANY(permissions)
    )
  ));

-- SSO: Admin access
CREATE POLICY sso_select ON sso_providers FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = sso_providers.workspace_id
    AND role_id IN (
      SELECT id FROM workspace_roles 
      WHERE 'manage_sso' = ANY(permissions)
    )
  ));

-- 2FA: Users can view/manage their own settings
CREATE POLICY two_fa_select ON two_fa_settings FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = two_fa_settings.workspace_id
      AND role_id IN (
        SELECT id FROM workspace_roles 
        WHERE 'manage_2fa' = ANY(permissions)
      )
    )
  );

-- Sessions: Users can view their own sessions
CREATE POLICY sessions_select ON user_sessions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- VIEWS FOR MONITORING
-- ============================================

CREATE OR REPLACE VIEW security_posture_score AS
SELECT
  workspace_id,
  COUNT(CASE WHEN status = 'compliant' THEN 1 END)::FLOAT / 
    NULLIF(COUNT(*), 0) * 100 as compliance_percentage,
  COUNT(CASE WHEN enabled = TRUE THEN 1 END) as active_2fa_users,
  COUNT(DISTINCT CASE WHEN last_activity_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN user_id END) as active_users_24h
FROM compliance_frameworks
LEFT JOIN two_fa_settings ON compliance_frameworks.workspace_id = two_fa_settings.workspace_id
LEFT JOIN user_sessions ON compliance_frameworks.workspace_id = user_sessions.workspace_id
GROUP BY workspace_id;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_sso_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_sync_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sso_sync_timestamp BEFORE UPDATE ON sso_providers
FOR EACH ROW EXECUTE FUNCTION update_sso_sync_timestamp();
