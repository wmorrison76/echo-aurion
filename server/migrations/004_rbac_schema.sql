/**
 * Role-Based Access Control (RBAC) Schema
 * Enables granular permission management with roles, teams, and delegation
 * 
 * Tables:
 * - calendar_roles: Role definitions
 * - calendar_role_permissions: Permission mappings
 * - calendar_teams: Team groupings
 * - calendar_team_members: Team membership with roles
 * - calendar_delegations: Time-limited event delegation
 * - calendar_role_audit: Audit trail for role changes
 */

-- =====================================================
-- ROLES TABLE
-- =====================================================

CREATE TABLE calendar_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Role definition
  role_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  description TEXT,
  
  -- System vs custom
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_roles_org_active 
  ON calendar_roles(org_id, is_active)
  WHERE is_active = TRUE;

-- =====================================================
-- ROLE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE calendar_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES calendar_roles(id) ON DELETE CASCADE,
  
  -- Permission (resource:action format)
  permission VARCHAR(255) NOT NULL,
  
  -- Examples:
  -- events:create - Create events
  -- events:read - View events
  -- events:update - Edit events
  -- events:delete - Delete events
  -- events:share - Share events
  -- conflicts:resolve - Resolve conflicts
  -- analytics:view - View analytics
  -- teams:manage - Manage teams
  -- roles:manage - Manage roles
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_role_permissions_role_id 
  ON calendar_role_permissions(role_id);
CREATE INDEX idx_calendar_role_permissions_permission 
  ON calendar_role_permissions(permission);

-- =====================================================
-- TEAMS TABLE
-- =====================================================

CREATE TABLE calendar_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Team info
  team_name VARCHAR(255) NOT NULL,
  description TEXT,
  team_type VARCHAR(50) DEFAULT 'general', -- 'general', 'department', 'location'
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  max_members INTEGER,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_teams_org_active 
  ON calendar_teams(org_id, is_active)
  WHERE is_active = TRUE;

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================

CREATE TABLE calendar_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES calendar_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Role within team
  role_id UUID REFERENCES calendar_roles(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_team_members_team_user 
  ON calendar_team_members(team_id, user_id);
CREATE INDEX idx_calendar_team_members_user 
  ON calendar_team_members(user_id);
CREATE UNIQUE INDEX idx_calendar_team_members_unique 
  ON calendar_team_members(team_id, user_id)
  WHERE is_active = TRUE;

-- =====================================================
-- DELEGATIONS TABLE
-- =====================================================

CREATE TABLE calendar_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Delegation info
  delegator_id UUID NOT NULL,
  delegate_id UUID NOT NULL,
  
  -- Scope
  delegation_type VARCHAR(50), -- 'full', 'events-only', 'conflicts-only'
  event_ids UUID[], -- NULL = all events
  outlet_ids UUID[], -- NULL = all outlets
  
  -- Time-limited
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Permissions during delegation
  can_create_events BOOLEAN DEFAULT TRUE,
  can_edit_events BOOLEAN DEFAULT TRUE,
  can_delete_events BOOLEAN DEFAULT FALSE,
  can_resolve_conflicts BOOLEAN DEFAULT TRUE,
  can_view_analytics BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_delegations_delegator 
  ON calendar_delegations(delegator_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_calendar_delegations_delegate 
  ON calendar_delegations(delegate_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_calendar_delegations_period 
  ON calendar_delegations(start_date, end_date);

-- =====================================================
-- RBAC AUDIT LOG
-- =====================================================

CREATE TABLE calendar_role_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- What changed
  audit_type VARCHAR(50), -- 'role_created', 'role_updated', 'member_added', 'delegation_created'
  entity_type VARCHAR(50), -- 'role', 'team', 'member', 'delegation'
  entity_id UUID,
  
  -- Who made the change
  changed_by UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_role_audit_org 
  ON calendar_role_audit(org_id, created_at DESC);
CREATE INDEX idx_calendar_role_audit_type 
  ON calendar_role_audit(audit_type, created_at DESC);

-- =====================================================
-- DEFAULT SYSTEM ROLES
-- =====================================================

INSERT INTO calendar_roles (
  org_id, role_name, display_name, description, is_system
) VALUES
  (NULL, 'admin', 'Administrator', 'Full system access', TRUE),
  (NULL, 'manager', 'Manager', 'Can create/edit events and manage teams', TRUE),
  (NULL, 'member', 'Team Member', 'Can create and view events', TRUE),
  (NULL, 'viewer', 'Viewer', 'Read-only access to events', TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- =====================================================
-- DEFAULT PERMISSIONS FOR ADMIN ROLE
-- =====================================================

INSERT INTO calendar_role_permissions (role_id, permission)
SELECT 
  (SELECT id FROM calendar_roles WHERE role_name = 'admin' AND is_system = TRUE LIMIT 1),
  permission
FROM (
  VALUES
    ('events:create'),
    ('events:read'),
    ('events:update'),
    ('events:delete'),
    ('events:share'),
    ('conflicts:view'),
    ('conflicts:resolve'),
    ('analytics:view'),
    ('analytics:edit'),
    ('teams:view'),
    ('teams:create'),
    ('teams:manage'),
    ('roles:view'),
    ('roles:manage'),
    ('delegations:view'),
    ('delegations:manage')
) AS perms(permission)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DEFAULT PERMISSIONS FOR MANAGER ROLE
-- =====================================================

INSERT INTO calendar_role_permissions (role_id, permission)
SELECT 
  (SELECT id FROM calendar_roles WHERE role_name = 'manager' AND is_system = TRUE LIMIT 1),
  permission
FROM (
  VALUES
    ('events:create'),
    ('events:read'),
    ('events:update'),
    ('events:delete'),
    ('events:share'),
    ('conflicts:view'),
    ('conflicts:resolve'),
    ('analytics:view'),
    ('teams:view'),
    ('teams:create'),
    ('delegations:view'),
    ('delegations:create')
) AS perms(permission)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DEFAULT PERMISSIONS FOR MEMBER ROLE
-- =====================================================

INSERT INTO calendar_role_permissions (role_id, permission)
SELECT 
  (SELECT id FROM calendar_roles WHERE role_name = 'member' AND is_system = TRUE LIMIT 1),
  permission
FROM (
  VALUES
    ('events:create'),
    ('events:read'),
    ('events:update'),
    ('events:share'),
    ('conflicts:view'),
    ('analytics:view')
) AS perms(permission)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DEFAULT PERMISSIONS FOR VIEWER ROLE
-- =====================================================

INSERT INTO calendar_role_permissions (role_id, permission)
SELECT 
  (SELECT id FROM calendar_roles WHERE role_name = 'viewer' AND is_system = TRUE LIMIT 1),
  permission
FROM (
  VALUES
    ('events:read'),
    ('analytics:view')
) AS perms(permission)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PERMISSION CHECK FUNCTION
-- =====================================================

/**
 * Check if a user has a specific permission
 */
CREATE OR REPLACE FUNCTION has_calendar_permission(
  p_user_id UUID,
  p_org_id UUID,
  p_permission VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check if user has this permission through any of their roles
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM calendar_team_members ctm
      JOIN calendar_roles cr ON ctm.role_id = cr.id
      JOIN calendar_role_permissions crp ON cr.id = crp.role_id
      WHERE ctm.user_id = p_user_id
        AND cr.org_id = p_org_id
        AND crp.permission = p_permission
        AND ctm.is_active = TRUE
        AND cr.is_active = TRUE
      LIMIT 1
    ), FALSE
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

/**
 * Check if a user has delegation access
 */
CREATE OR REPLACE FUNCTION has_delegation_access(
  p_user_id UUID,
  p_event_id UUID,
  p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Check if user is an active delegate with required permission
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM calendar_delegations
      WHERE delegate_id = p_user_id
        AND is_active = TRUE
        AND CURRENT_DATE BETWEEN start_date AND end_date
        AND (event_ids IS NULL OR p_event_id = ANY(event_ids))
        AND (
          CASE p_action
            WHEN 'create' THEN can_create_events
            WHEN 'edit' THEN can_edit_events
            WHEN 'delete' THEN can_delete_events
            WHEN 'resolve_conflict' THEN can_resolve_conflicts
            WHEN 'view_analytics' THEN can_view_analytics
            ELSE FALSE
          END
        )
      LIMIT 1
    ), FALSE
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFY SCHEMA
-- =====================================================

-- Check tables exist:
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename LIKE 'calendar_roles%'
--    OR tablename LIKE 'calendar_teams%'
--    OR tablename LIKE 'calendar_delegations%';
