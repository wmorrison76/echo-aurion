-- Migration: Phase 7A - Calendar Intelligence & BEO Management System
-- Purpose: Implement Banquet Event Order (BEO) lifecycle management, version history, visibility rules, PDF management
-- Date: 2025-01-16
-- Features: BEO creation/versioning, role-based event visibility, change feed tracking, PDF storage

-- =====================================================
-- BEO (BANQUET EVENT ORDER) TABLES
-- =====================================================

-- Main BEO storage with status tracking and approval workflow
CREATE TABLE IF NOT EXISTS beo_banquet_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  -- BEO identification
  beo_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., "BEO-2025-001"
  beo_name VARCHAR(255), -- e.g., "Goldman Wedding Reception"
  
  -- Content storage
  content_data JSONB NOT NULL DEFAULT '{}', -- Full BEO structure: menu items, timeline, services, dietary restrictions, etc.
  
  -- PDF management
  pdf_url VARCHAR(1024), -- URL to latest PDF version (S3 or local storage)
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status and workflow
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived')),
  
  -- Department ownership
  department_id UUID NOT NULL,
  
  -- User tracking
  created_by_user_id UUID NOT NULL,
  approved_by_user_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  audit_metadata JSONB DEFAULT '{}', -- {last_editor: user_id, last_edit_timestamp, edit_count}
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(org_id, beo_number)
);

CREATE INDEX IF NOT EXISTS idx_beo_org_event ON beo_banquet_orders(org_id, event_id);
CREATE INDEX IF NOT EXISTS idx_beo_status_created ON beo_banquet_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beo_department ON beo_banquet_orders(department_id, org_id);
CREATE INDEX IF NOT EXISTS idx_beo_created_by ON beo_banquet_orders(created_by_user_id);

-- BEO version history for change tracking and audit trail
CREATE TABLE IF NOT EXISTS beo_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  beo_id UUID NOT NULL,
  
  -- Version tracking
  version_number INTEGER NOT NULL, -- Sequential: 1, 2, 3...
  
  -- Change information
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'approved', 'rejected', 'restored')),
  change_summary VARCHAR(500), -- Human-readable summary: "Added dessert service, updated guest count to 200"
  
  -- Detailed changes (what fields changed)
  changed_fields JSONB, -- { "guest_count": { old: 150, new: 200 }, "services": { old: [...], new: [...] } }
  
  -- Full BEO content at this version (for comparison/restore)
  content_snapshot JSONB NOT NULL,
  
  -- User who made change
  changed_by_user_id UUID NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (beo_id) REFERENCES beo_banquet_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(beo_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_beo_versions_beo ON beo_versions(beo_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_beo_versions_created ON beo_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beo_versions_user ON beo_versions(changed_by_user_id);

-- =====================================================
-- VISIBILITY AND ACCESS CONTROL TABLES
-- =====================================================

-- Role-based event visibility rules (determines which events users can see)
CREATE TABLE IF NOT EXISTS calendar_event_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Visibility scope type
  visibility_scope VARCHAR(50) NOT NULL DEFAULT 'own_departments' CHECK (
    visibility_scope IN ('all_events', 'own_outlet', 'own_departments', 'custom')
  ),
  
  -- Array of outlet IDs user can view (if scope allows)
  allowed_outlet_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Array of department IDs user can view (if scope allows)
  allowed_department_ids UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Flag: can this user see all events in org
  can_view_all_events BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_visibility_rules_user ON calendar_event_visibility_rules(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_visibility_rules_org ON calendar_event_visibility_rules(org_id);

-- =====================================================
-- ATTACHMENT MANAGEMENT TABLE
-- =====================================================

-- Store BEO PDFs and other event attachments
CREATE TABLE IF NOT EXISTS calendar_event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID NOT NULL,
  beo_id UUID, -- Optional: link to specific BEO if this is a BEO PDF
  
  -- File metadata
  file_name VARCHAR(500) NOT NULL,
  file_url VARCHAR(1024) NOT NULL, -- S3 URL or local path
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('pdf', 'image', 'document', 'spreadsheet', 'video')),
  file_size_bytes INTEGER,
  
  -- Storage information
  storage_provider VARCHAR(50) DEFAULT 'local' CHECK (storage_provider IN ('local', 's3', 'gcs')),
  storage_path VARCHAR(1024),
  
  -- Upload tracking
  uploaded_by_user_id UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Version tracking (for BEO PDFs)
  is_current_version BOOLEAN DEFAULT TRUE,
  version_number INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- { pages: 5, width: 8.5, height: 11, created_date, author, etc. }
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (beo_id) REFERENCES beo_banquet_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_event ON calendar_event_attachments(event_id, file_type);
CREATE INDEX IF NOT EXISTS idx_attachments_beo ON calendar_event_attachments(beo_id, is_current_version);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded ON calendar_event_attachments(uploaded_at DESC);

-- =====================================================
-- ALTER EXISTING CALENDAR_EVENTS TABLE
-- =====================================================

-- Add BEO link and visibility tracking to calendar_events
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS beo_id UUID,
ADD COLUMN IF NOT EXISTS visibility_filter_applied BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT fk_calendar_events_beo FOREIGN KEY (beo_id) REFERENCES beo_banquet_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_beo ON calendar_events(beo_id);

-- =====================================================
-- CHANGE FEED TABLE (for real-time notifications)
-- =====================================================

-- Track all BEO changes for change feed and notifications
CREATE TABLE IF NOT EXISTS beo_change_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  beo_id UUID NOT NULL,
  
  -- Change metadata
  change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'rejected'
  change_summary VARCHAR(500),
  changed_fields JSONB,
  
  -- Who made the change
  changed_by_user_id UUID NOT NULL,
  changed_by_name VARCHAR(255), -- Cached for performance
  
  -- Affected stakeholders
  affected_department_id UUID,
  
  -- Notification status
  is_notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (beo_id) REFERENCES beo_banquet_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  FOREIGN KEY (affected_department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_change_feed_beo ON beo_change_feed(beo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_feed_org ON beo_change_feed(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_feed_notified ON beo_change_feed(is_notified, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE beo_banquet_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE beo_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE beo_change_feed ENABLE ROW LEVEL SECURITY;

-- BEO visibility: Only owner department, created_by user, and approvers can view
CREATE POLICY beo_org_isolation ON beo_banquet_orders FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY beo_creator_access ON beo_banquet_orders FOR SELECT
  USING (created_by_user_id = auth.uid() OR approved_by_user_id = auth.uid());

CREATE POLICY beo_department_access ON beo_banquet_orders FOR SELECT
  USING (department_id IN (
    SELECT department_id FROM employees WHERE user_id = auth.uid()
  ));

-- BEO versions visibility
CREATE POLICY beo_versions_visibility ON beo_versions FOR SELECT
  USING (
    beo_id IN (SELECT id FROM beo_banquet_orders WHERE org_id = auth.jwt() ->> 'org_id')
  );

-- Visibility rules: Users can only see their own rules
CREATE POLICY visibility_rules_own ON calendar_event_visibility_rules FOR SELECT
  USING (user_id = auth.uid() AND org_id = auth.jwt() ->> 'org_id');

CREATE POLICY visibility_rules_update ON calendar_event_visibility_rules FOR UPDATE
  USING (user_id = auth.uid() AND org_id = auth.jwt() ->> 'org_id');

-- Attachments visibility: Based on event visibility
CREATE POLICY attachments_visibility ON calendar_event_attachments FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

-- Change feed visibility: Only org members can see
CREATE POLICY change_feed_org ON beo_change_feed FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

-- =====================================================
-- HELPER FUNCTIONS FOR BEO MANAGEMENT
-- =====================================================

-- Function to auto-generate BEO number
CREATE OR REPLACE FUNCTION generate_beo_number(org_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  year INTEGER := EXTRACT(YEAR FROM NOW());
  next_seq INTEGER;
  beo_number VARCHAR;
BEGIN
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(beo_number, 11) AS INTEGER)), 0) + 1
  INTO next_seq
  FROM beo_banquet_orders
  WHERE org_id = $1 AND beo_number LIKE 'BEO-' || year || '-%';
  
  -- Format: BEO-YYYY-NNN
  beo_number := 'BEO-' || year || '-' || LPAD(next_seq::TEXT, 3, '0');
  
  RETURN beo_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create new BEO version automatically
CREATE OR REPLACE FUNCTION create_beo_version(
  beo_id_param UUID,
  change_type_param VARCHAR,
  change_summary_param VARCHAR,
  changed_fields_param JSONB,
  user_id_param UUID
)
RETURNS INTEGER AS $$
DECLARE
  new_version INTEGER;
  beo_org_id UUID;
  current_content JSONB;
BEGIN
  -- Get BEO org_id and current content
  SELECT org_id, content_data INTO beo_org_id, current_content
  FROM beo_banquet_orders
  WHERE id = beo_id_param;
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO new_version
  FROM beo_versions
  WHERE beo_id = beo_id_param;
  
  -- Insert new version
  INSERT INTO beo_versions (
    org_id,
    beo_id,
    version_number,
    change_type,
    change_summary,
    changed_fields,
    content_snapshot,
    changed_by_user_id,
    created_at
  ) VALUES (
    beo_org_id,
    beo_id_param,
    new_version,
    change_type_param,
    change_summary_param,
    changed_fields_param,
    current_content,
    user_id_param,
    NOW()
  );
  
  -- Log to change feed
  INSERT INTO beo_change_feed (
    org_id,
    beo_id,
    change_type,
    change_summary,
    changed_fields,
    changed_by_user_id,
    affected_department_id,
    created_at
  ) SELECT
    org_id,
    beo_id_param,
    change_type_param,
    change_summary_param,
    changed_fields_param,
    user_id_param,
    department_id,
    NOW()
  FROM beo_banquet_orders
  WHERE id = beo_id_param;
  
  RETURN new_version;
END;
$$ LANGUAGE plpgsql;

-- Function to get event visibility for a user
CREATE OR REPLACE FUNCTION can_user_view_event(
  event_id_param UUID,
  user_id_param UUID,
  org_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  event_dept_id UUID;
  event_outlet_id UUID;
  visibility_scope VARCHAR;
  can_view BOOLEAN := FALSE;
BEGIN
  -- Get event's department and outlet
  SELECT department_id, outlet_id
  INTO event_dept_id, event_outlet_id
  FROM calendar_events
  WHERE id = event_id_param;
  
  -- Get user's visibility settings
  SELECT visibility_scope
  INTO visibility_scope
  FROM calendar_event_visibility_rules
  WHERE user_id = user_id_param AND org_id = org_id_param;
  
  -- Default visibility scope if not set
  IF visibility_scope IS NULL THEN
    visibility_scope := 'own_departments';
  END IF;
  
  -- Check visibility based on scope
  CASE visibility_scope
    WHEN 'all_events' THEN
      can_view := TRUE;
    WHEN 'own_outlet' THEN
      can_view := event_outlet_id IN (
        SELECT outlet_id FROM employees WHERE user_id = user_id_param
      );
    WHEN 'own_departments' THEN
      can_view := event_dept_id IN (
        SELECT department_id FROM employees WHERE user_id = user_id_param
      );
    WHEN 'custom' THEN
      can_view := event_dept_id IN (
        SELECT UNNEST(allowed_department_ids)
        FROM calendar_event_visibility_rules
        WHERE user_id = user_id_param AND org_id = org_id_param
      );
    ELSE
      can_view := FALSE;
  END CASE;
  
  RETURN can_view;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETION LOG
-- =====================================================

-- Record migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 018 completed: BEO Management, Visibility Rules, and Change Feed tables created successfully';
END $$;
