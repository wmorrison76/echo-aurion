-- Migration: Access Control (RBAC/ABAC)
-- Purpose: Enterprise access control with multi-property/outlet isolation and policy engine
-- Date: 2025-01-16
-- Addresses: LUCCCA OS Grade Evaluation - RBAC/ABAC (TODO-016, TODO-017)

-- ============================================================================
-- USER ROLES (RBAC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL, -- e.g., 'chef', 'manager', 'admin'
  
  -- Multi-property/outlet isolation
  outlet_ids TEXT[], -- Outlets user has access to (NULL = all)
  department_ids TEXT[], -- Departments user has access to (NULL = all)
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tenant_id, role),
  
  INDEX idx_user_roles_user (user_id, tenant_id),
  INDEX idx_user_roles_tenant (tenant_id),
  INDEX idx_user_roles_active (tenant_id, is_active)
);

-- ============================================================================
-- ACCESS CONTROL POLICIES (ABAC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_control_policies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Policy effect
  effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
  
  -- Resource patterns (e.g., 'beo:*', 'recipe:*')
  resources TEXT[] NOT NULL,
  
  -- Action patterns (e.g., 'read', 'write', '*')
  actions TEXT[] NOT NULL,
  
  -- ABAC conditions (e.g., { department_id: 'kitchen', outlet_id: 'main' })
  conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Priority (higher = evaluated first)
  priority INTEGER DEFAULT 100,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_policies_tenant (tenant_id, is_active),
  INDEX idx_policies_priority (tenant_id, priority DESC)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_tenant_isolation ON user_roles
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY access_control_policies_tenant_isolation ON access_control_policies
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ============================================================================
-- DEFAULT POLICIES (optional)
-- ============================================================================

-- Note: Default policies can be inserted here if needed
-- Example: Admin users have full access
