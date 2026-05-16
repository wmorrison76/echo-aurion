-- TIER 2 ENTERPRISE SCHEMA
-- Workspace management, team collaboration, feature flags, webhooks

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- WORKSPACES AND ORGANIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'team', -- team, enterprise, custom
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, archived
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_plan CHECK (plan IN ('team', 'enterprise', 'custom')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_status ON workspaces(status);

-- ============================================
-- WORKSPACE MEMBERS AND ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  invited_by UUID,
  invitation_accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS workspace_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_workspace_roles_workspace ON workspace_roles(workspace_id);

-- ============================================
-- FEATURE FLAGS
-- ============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  targeting_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, key)
);

CREATE INDEX idx_feature_flags_workspace ON feature_flags(workspace_id);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(workspace_id, enabled);

CREATE TABLE IF NOT EXISTS feature_flag_evaluation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id UUID,
  evaluation_result BOOLEAN NOT NULL,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  context JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_flag_evaluation_flag ON feature_flag_evaluation(flag_id);
CREATE INDEX idx_flag_evaluation_user ON feature_flag_evaluation(user_id);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  target_url VARCHAR(2048) NOT NULL,
  secret VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, disabled
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_webhook_status CHECK (status IN ('active', 'inactive', 'disabled'))
);

CREATE INDEX idx_webhooks_workspace ON webhooks(workspace_id);
CREATE INDEX idx_webhooks_event_type ON webhooks(workspace_id, event_type);
CREATE INDEX idx_webhooks_status ON webhooks(workspace_id, status);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_code INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
  error_message TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_delivery_status CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(webhook_id, status);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- ============================================
-- AUDIT LOGGING FOR TIER 2 OPERATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_workspace ON workspace_audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON workspace_audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON workspace_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON workspace_audit_logs(resource_type, resource_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_audit_logs ENABLE ROW LEVEL SECURITY;

-- Workspaces: Users can see workspaces they're members of
CREATE POLICY workspace_select ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

CREATE POLICY workspace_update ON workspaces FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role_id IN (SELECT id FROM workspace_roles WHERE 'admin' = ANY(permissions))
    )
  );

-- Workspace members: Only admins or workspace members can view
CREATE POLICY workspace_members_select ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
      OR owner_id = auth.uid()
    )
  );

-- Feature flags: Workspace members can read
CREATE POLICY feature_flags_select ON feature_flags FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Webhooks: Workspace admins only
CREATE POLICY webhooks_select ON webhooks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM workspace_roles 
        WHERE 'manage_webhooks' = ANY(permissions)
      )
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Audit logs: Workspace admins and audit viewers
CREATE POLICY audit_logs_select ON workspace_audit_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM workspace_roles 
        WHERE 'view_audit_logs' = ANY(permissions)
      )
    )
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

CREATE OR REPLACE VIEW workspace_member_stats AS
SELECT
  w.id,
  w.name,
  COUNT(DISTINCT wm.user_id) as member_count,
  COUNT(DISTINCT CASE WHEN wm.invitation_accepted_at IS NOT NULL THEN wm.user_id END) as active_members,
  COUNT(DISTINCT CASE WHEN wm.invitation_accepted_at IS NULL THEN wm.user_id END) as pending_invites
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
GROUP BY w.id, w.name;

CREATE OR REPLACE VIEW feature_flag_usage AS
SELECT
  f.id,
  f.key,
  f.enabled,
  COUNT(DISTINCT fre.user_id) as evaluated_users,
  SUM(CASE WHEN fre.evaluation_result = TRUE THEN 1 ELSE 0 END) as true_evaluations
FROM feature_flags f
LEFT JOIN feature_flag_evaluation fre ON f.id = fre.flag_id
GROUP BY f.id, f.key, f.enabled;

-- ============================================
-- TRIGGERS FOR AUDIT LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION log_workspace_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_audit_logs(workspace_id, action, resource_type, resource_id, changes)
  VALUES(
    COALESCE(NEW.id, OLD.id),
    TG_ARGV[0],
    'workspace',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER workspace_changes AFTER INSERT OR UPDATE OR DELETE ON workspaces
FOR EACH ROW EXECUTE FUNCTION log_workspace_changes();
