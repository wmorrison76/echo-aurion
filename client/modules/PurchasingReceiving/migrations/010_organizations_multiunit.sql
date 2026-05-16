-- Migration 010: Multi-Unit Organizations & Outlet Groups
-- Extends existing schema to support hotel/casino groups with 25+ outlets
-- Adds: organizations, outlet_groups, extends outlets with org/group hierarchy

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS (Parent entity for all data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT DEFAULT 'UTC',
  industry TEXT CHECK (industry IN ('hospitality', 'qsr', 'casual_dining', 'fine_dining', 'other')),
  country TEXT DEFAULT 'US',
  website TEXT,
  billing_contact_email TEXT,
  group_purchasing_policy TEXT DEFAULT 'independent' 
    CHECK (group_purchasing_policy IN ('independent', 'consolidated', 'hybrid')),
  allow_master_billing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX organizations_slug_idx ON organizations (slug);
CREATE INDEX organizations_created_idx ON organizations (created_at DESC);

-- ============================================================================
-- OUTLET GROUPS (Regions, franchisees, or sub-brands within organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS outlet_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  group_type TEXT CHECK (group_type IN ('region', 'franchisee', 'sub_brand', 'dc_zone')),
  timezone TEXT,
  geography_region TEXT,  -- 'Northeast', 'Southwest', 'Midwest', etc.
  manager_email TEXT,
  allow_group_purchasing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE INDEX outlet_groups_org_idx ON outlet_groups (organization_id);
CREATE INDEX outlet_groups_geography_idx ON outlet_groups (geography_region);

-- ============================================================================
-- EXTEND OUTLETS TABLE (Add org/group hierarchy)
-- ============================================================================
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS outlet_group_id UUID REFERENCES outlet_groups(id);
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS outlet_type TEXT CHECK (outlet_type IN ('hotel', 'casino', 'restaurant', 'qsr', 'cafe', 'bar', 'other'));
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS specialization TEXT[] DEFAULT ARRAY[]::TEXT[];  -- ['f_and_b', 'gaming', 'housekeeping', etc]
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS approval_required_for_non_asl BOOLEAN DEFAULT FALSE;
-- ALTER TABLE outlets ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
-- UPDATE outlets SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;
-- ALTER TABLE outlets ALTER COLUMN organization_id SET NOT NULL;

-- For fresh installations:
ALTER TABLE IF EXISTS outlets ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS outlets ADD COLUMN outlet_group_id UUID REFERENCES outlet_groups(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS outlets ADD COLUMN outlet_type TEXT CHECK (outlet_type IN ('hotel', 'casino', 'restaurant', 'qsr', 'cafe', 'bar', 'other'));
ALTER TABLE IF EXISTS outlets ADD COLUMN specialization TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE IF EXISTS outlets ADD COLUMN approval_required_for_non_asl BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS outlets ADD COLUMN active BOOLEAN DEFAULT TRUE;

CREATE INDEX outlets_org_idx ON outlets (organization_id);
CREATE INDEX outlets_group_idx ON outlets (outlet_group_id);
CREATE INDEX outlets_type_idx ON outlets (outlet_type);

-- ============================================================================
-- OUTLET HIERARCHY VIEW (Useful for queries)
-- ============================================================================
CREATE OR REPLACE VIEW outlet_hierarchy AS
SELECT
  o.id as outlet_id,
  o.name as outlet_name,
  og.id as group_id,
  og.name as group_name,
  org.id as organization_id,
  org.name as organization_name,
  o.timezone,
  o.outlet_type,
  o.specialization
FROM outlets o
LEFT JOIN outlet_groups og ON o.outlet_group_id = og.id
LEFT JOIN organizations org ON o.organization_id = org.id;

-- ============================================================================
-- ORGANIZATION SETTINGS (Flexible config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::JSONB,  -- {forecast_model: 'ensemble', edi_enabled: true, etc}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RBAC: Organization & Outlet Group Roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'finance', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX org_memberships_org_idx ON org_memberships (organization_id);
CREATE INDEX org_memberships_user_idx ON org_memberships (user_id);

CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_group_id UUID NOT NULL REFERENCES outlet_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(outlet_group_id, user_id)
);

CREATE INDEX group_memberships_group_idx ON group_memberships (outlet_group_id);
CREATE INDEX group_memberships_user_idx ON group_memberships (user_id);

-- ============================================================================
-- AUDIT LOG for organization changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- 'create_group', 'add_outlet', 'change_policy', etc
  target_type TEXT,      -- 'outlet_group', 'outlet', 'member', etc
  target_id UUID,
  changes JSONB,         -- {before: {...}, after: {...}}
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX audit_org_idx ON organization_audit_log (organization_id);
CREATE INDEX audit_action_idx ON organization_audit_log (action);
