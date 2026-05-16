-- Multi-tenant database schema for LUCCCA Enterprise
-- Enables organization isolation, role-based access, and tier management

-- Organizations (companies/restaurants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  api_key_hash VARCHAR(255),
  settings JSONB DEFAULT '{}'::jsonb,
  usage_limits JSONB DEFAULT '{
    "monthly_api_calls": 10000,
    "monthly_storage_gb": 10,
    "team_members": 5,
    "custom_integrations": 0
  }'::jsonb,
  current_usage JSONB DEFAULT '{
    "api_calls": 0,
    "storage_gb": 0,
    "team_members": 0
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organization members (users in organizations)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Role definitions (custom roles per organization)
CREATE TABLE IF NOT EXISTS role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- Tier features (which features are available per tier)
CREATE TABLE IF NOT EXISTS tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
  feature_name VARCHAR(100) NOT NULL,
  feature_category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  limits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier, feature_name)
);

-- Usage metrics (track feature usage for billing)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_name VARCHAR(100) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, feature_name, period_start, period_end)
);

-- API keys for organizations
CREATE TABLE IF NOT EXISTS organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, key_hash)
);

-- Audit logs (security and compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snapshots/Restore points
CREATE TABLE IF NOT EXISTS system_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  snapshot_data BYTEA NOT NULL,
  compression_algorithm TEXT DEFAULT 'gzip',
  encryption_algorithm TEXT DEFAULT 'aes-256-gcm',
  encryption_key_hash VARCHAR(255),
  iv_hex VARCHAR(255) NOT NULL,
  auth_tag_hex VARCHAR(255) NOT NULL,
  is_encrypted BOOLEAN DEFAULT TRUE,
  size_bytes INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_at TIMESTAMP WITH TIME ZONE,
  restore_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_role_definitions_org_id ON role_definitions(org_id);
CREATE INDEX IF NOT EXISTS idx_tier_features_tier ON tier_features(tier);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_id ON usage_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_org_id ON system_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_by ON system_snapshots(created_by);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON system_snapshots(created_at DESC);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
DROP POLICY IF EXISTS "users_see_own_orgs" ON organizations;
CREATE POLICY "users_see_own_orgs" ON organizations
  FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "org_members_view_org" ON organizations
  FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
      AND organization_members.status = 'accepted'
    )
  );

-- RLS Policies for organization_members
DROP POLICY IF EXISTS "users_see_own_memberships" ON organization_members;
CREATE POLICY "users_see_own_memberships" ON organization_members
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM organization_members om2
      WHERE om2.org_id = organization_members.org_id
      AND om2.status = 'accepted'
      AND om2.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for tier_features (public read)
DROP POLICY IF EXISTS "everyone_reads_tier_features" ON tier_features;
CREATE POLICY "everyone_reads_tier_features" ON tier_features
  FOR SELECT
  USING (TRUE);

-- RLS Policies for audit_logs
DROP POLICY IF EXISTS "users_see_org_audit_logs" ON audit_logs;
CREATE POLICY "users_see_org_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = audit_logs.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'accepted'
      AND organization_members.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for snapshots
DROP POLICY IF EXISTS "users_see_org_snapshots" ON system_snapshots;
CREATE POLICY "users_see_org_snapshots" ON system_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = system_snapshots.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'accepted'
      AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Insert default tier features
INSERT INTO tier_features (tier, feature_name, feature_category, enabled, limits)
VALUES
  ('free', 'analytics', 'core', TRUE, '{"max_queries": 100}'),
  ('free', 'webhooks', 'core', FALSE, '{}'),
  ('free', 'custom_code', 'core', FALSE, '{}'),
  ('free', 'team_members', 'core', TRUE, '{"max": 1}'),
  
  ('starter', 'analytics', 'core', TRUE, '{"max_queries": 5000}'),
  ('starter', 'webhooks', 'core', TRUE, '{"max": 5}'),
  ('starter', 'custom_code', 'core', FALSE, '{}'),
  ('starter', 'team_members', 'core', TRUE, '{"max": 5}'),
  ('starter', 'sso', 'security', FALSE, '{}'),
  
  ('professional', 'analytics', 'core', TRUE, '{"max_queries": 50000}'),
  ('professional', 'webhooks', 'core', TRUE, '{"max": 50}'),
  ('professional', 'custom_code', 'core', TRUE, '{"max_files": 100}'),
  ('professional', 'team_members', 'core', TRUE, '{"max": 20}'),
  ('professional', 'sso', 'security', TRUE, '{}'),
  ('professional', 'audit_logs', 'security', TRUE, '{}'),
  ('professional', 'api_keys', 'security', TRUE, '{"max": 5}'),
  
  ('enterprise', 'analytics', 'core', TRUE, '{"max_queries": -1}'),
  ('enterprise', 'webhooks', 'core', TRUE, '{"max": -1}'),
  ('enterprise', 'custom_code', 'core', TRUE, '{"max_files": -1}'),
  ('enterprise', 'team_members', 'core', TRUE, '{"max": -1}'),
  ('enterprise', 'sso', 'security', TRUE, '{}'),
  ('enterprise', 'audit_logs', 'security', TRUE, '{}'),
  ('enterprise', 'api_keys', 'security', TRUE, '{"max": -1}'),
  ('enterprise', 'custom_integrations', 'integrations', TRUE, '{"max": -1}'),
  ('enterprise', 'dedicated_support', 'support', TRUE, '{}')
ON CONFLICT DO NOTHING;
