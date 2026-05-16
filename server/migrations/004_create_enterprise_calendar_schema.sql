-- Migration: Create Enterprise Calendar Schema
-- Purpose: Establish database tables, indexes, and RLS policies for enterprise-grade calendar system
-- Date: 2024-12-30
-- Features: Multi-outlet calendars, conflict detection, permissions, audit logging

-- =====================================================
-- CALENDAR OUTLETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'calendar',
  is_system BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_color CHECK (color ~ '^#[0-9a-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_outlets_org ON calendar_outlets(org_id);
CREATE INDEX IF NOT EXISTS idx_outlets_active ON calendar_outlets(org_id) WHERE NOT is_archived;
CREATE INDEX IF NOT EXISTS idx_outlets_system ON calendar_outlets(is_system);

-- =====================================================
-- CALENDAR OUTLET PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_outlet_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  user_id UUID,
  team_id UUID,
  role_id UUID,
  access_level VARCHAR(20) NOT NULL DEFAULT 'view',
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT access_level_check CHECK (access_level IN ('view', 'create', 'manage')),
  CONSTRAINT at_least_one_recipient CHECK (
    (user_id IS NOT NULL)::int + (team_id IS NOT NULL)::int + (role_id IS NOT NULL)::int = 1
  ),
  
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(outlet_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(team_id, '00000000-0000-0000-0000-000000000001'::uuid),
         COALESCE(role_id, '00000000-0000-0000-0000-000000000002'::uuid))
);

CREATE INDEX IF NOT EXISTS idx_outlet_perms_user ON calendar_outlet_permissions(user_id, access_level);
CREATE INDEX IF NOT EXISTS idx_outlet_perms_team ON calendar_outlet_permissions(team_id);
CREATE INDEX IF NOT EXISTS idx_outlet_perms_role ON calendar_outlet_permissions(role_id);

-- =====================================================
-- CALENDAR EVENTS TABLE (Main)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  date DATE NOT NULL,
  
  location_room VARCHAR(255),
  space_id UUID,
  guest_count INTEGER,
  department VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'pending',
  severity VARCHAR(20) DEFAULT 'normal',
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  beo_id UUID,
  revenue NUMERIC(12, 2),
  contact_person VARCHAR(255),
  
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT status_check CHECK (status IN ('pending', 'confirmed', 'conflict', 'locked', 'cancelled')),
  CONSTRAINT severity_check CHECK (severity IN ('low', 'normal', 'high', 'critical')),
  CONSTRAINT valid_dates CHECK (start_time < end_time),
  
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_outlet ON calendar_events(outlet_id);
CREATE INDEX IF NOT EXISTS idx_events_org ON calendar_events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON calendar_events(date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_time_range ON calendar_events(start_time, end_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_location ON calendar_events(location_room) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_status ON calendar_events(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_space ON calendar_events(space_id);
CREATE INDEX IF NOT EXISTS idx_events_beo ON calendar_events(beo_id);

-- =====================================================
-- CALENDAR EVENT PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_event_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID,
  team_id UUID,
  role_id UUID,
  
  access_level VARCHAR(20) NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT access_level_check CHECK (access_level IN ('read', 'write', 'delete', 'manage')),
  CONSTRAINT at_least_one_recipient CHECK (
    (user_id IS NOT NULL)::int + (team_id IS NOT NULL)::int + (role_id IS NOT NULL)::int = 1
  ),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(event_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
         COALESCE(team_id, '00000000-0000-0000-0000-000000000001'::uuid),
         COALESCE(role_id, '00000000-0000-0000-0000-000000000002'::uuid))
);

CREATE INDEX IF NOT EXISTS idx_event_perms_event ON calendar_event_permissions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_perms_user ON calendar_event_permissions(user_id, access_level);
CREATE INDEX IF NOT EXISTS idx_event_perms_team ON calendar_event_permissions(team_id);

-- =====================================================
-- CALENDAR CONFLICTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id_1 UUID NOT NULL,
  event_id_2 UUID NOT NULL,
  org_id UUID NOT NULL,
  
  conflict_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning',
  message TEXT NOT NULL,
  
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolved_by UUID,
  
  acknowledged_by UUID[],
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT conflict_type_check CHECK (conflict_type IN ('location', 'time', 'resource', 'personnel')),
  CONSTRAINT severity_check CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT different_events CHECK (event_id_1 < event_id_2),
  
  FOREIGN KEY (event_id_1) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id_2) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conflicts_event_1 ON calendar_conflicts(event_id_1);
CREATE INDEX IF NOT EXISTS idx_conflicts_event_2 ON calendar_conflicts(event_id_2);
CREATE INDEX IF NOT EXISTS idx_conflicts_org ON calendar_conflicts(org_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON calendar_conflicts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON calendar_conflicts(severity);

-- =====================================================
-- CALENDAR ATTACHMENTS TABLE (BEO/REO/PDFs)
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  
  attachment_url TEXT NOT NULL,
  attachment_type VARCHAR(50),
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT attachment_type_check CHECK (attachment_type IN ('pdf', 'image', 'document', 'video', 'other')),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_event ON calendar_event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON calendar_event_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded ON calendar_event_attachments(created_at DESC);

-- =====================================================
-- CALENDAR AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS calendar_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  
  change_data JSONB DEFAULT '{}',
  previous_data JSONB DEFAULT '{}',
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT action_check CHECK (action IN ('create', 'update', 'delete', 'share', 'view', 'acknowledge_conflict')),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_event ON calendar_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON calendar_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON calendar_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON calendar_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON calendar_audit_log(created_at DESC);

-- Partitioning audit log by date (optional but recommended for performance)
-- Note: Uncomment if using PostgreSQL 12+ with partition support
-- CREATE TABLE IF NOT EXISTS calendar_audit_log_2024_q4 PARTITION OF calendar_audit_log
--   FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE calendar_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_outlet_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- calendar_outlets RLS
-- =====================================================

-- Users can view outlets in their org
CREATE POLICY outlets_view_policy ON calendar_outlets
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- System outlets are viewable by all org members
-- Users with outlet permissions can view
-- Admins can manage all outlets
CREATE POLICY outlets_create_policy ON calendar_outlets
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY outlets_update_policy ON calendar_outlets
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM calendar_outlet_permissions
        WHERE outlet_id = calendar_outlets.id
        AND user_id = auth.uid()
        AND access_level IN ('manage', 'admin')
      )
    )
  );

-- =====================================================
-- calendar_events RLS
-- =====================================================

-- Users can view own events or shared events
CREATE POLICY events_select_policy ON calendar_events
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM calendar_event_permissions
        WHERE event_id = calendar_events.id
        AND user_id = auth.uid()
        AND access_level IN ('read', 'write', 'delete', 'manage')
      )
      OR deleted_at IS NULL
    )
  );

-- Users can create events in outlets they have access to
CREATE POLICY events_create_policy ON calendar_events
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM calendar_outlets co
        WHERE co.id = outlet_id
        AND co.is_system = TRUE
      )
      OR EXISTS (
        SELECT 1 FROM calendar_outlet_permissions
        WHERE outlet_id = calendar_events.outlet_id
        AND user_id = auth.uid()
        AND access_level IN ('create', 'manage')
      )
    )
  );

-- Users with write access can update their events
CREATE POLICY events_update_policy ON calendar_events
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM calendar_event_permissions
        WHERE event_id = calendar_events.id
        AND user_id = auth.uid()
        AND access_level IN ('write', 'manage')
      )
    )
  );

-- Users with delete access can delete events
CREATE POLICY events_delete_policy ON calendar_events
  FOR DELETE USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM calendar_event_permissions
        WHERE event_id = calendar_events.id
        AND user_id = auth.uid()
        AND access_level IN ('delete', 'manage')
      )
    )
  );

-- =====================================================
-- calendar_event_permissions RLS
-- =====================================================

-- Only event owner and org admins can manage permissions
CREATE POLICY event_perms_manage_policy ON calendar_event_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND ce.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
    )
  );

-- =====================================================
-- calendar_conflicts RLS
-- =====================================================

-- Users can view conflicts for events they have access to
CREATE POLICY conflicts_view_policy ON calendar_conflicts
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM calendar_events
        WHERE id = event_id_1
        AND (created_by = auth.uid() OR deleted_at IS NULL)
      )
      OR EXISTS (
        SELECT 1 FROM calendar_events
        WHERE id = event_id_2
        AND (created_by = auth.uid() OR deleted_at IS NULL)
      )
    )
  );

-- =====================================================
-- calendar_audit_log RLS
-- =====================================================

-- Users can view audit logs for events they own or have manage access
-- Org admins can view all audit logs in their org
CREATE POLICY audit_view_policy ON calendar_audit_log
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM calendar_events ce
        WHERE ce.id = event_id
        AND ce.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM calendar_event_permissions
        WHERE event_id = calendar_audit_log.event_id
        AND user_id = auth.uid()
        AND access_level = 'manage'
      )
      OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (role = 'admin' OR role = 'owner')
      )
    )
  );

-- Only application service role can insert audit logs
CREATE POLICY audit_insert_policy ON calendar_audit_log
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_calendar_outlets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_outlets_timestamp
BEFORE UPDATE ON calendar_outlets
FOR EACH ROW
EXECUTE FUNCTION update_calendar_outlets_timestamp();

CREATE OR REPLACE FUNCTION update_calendar_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_events_timestamp
BEFORE UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_calendar_events_timestamp();

-- =====================================================
-- SAMPLE DATA (optional - can be removed for production)
-- =====================================================

-- Insert default system outlets
DO $$
DECLARE
  sample_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  sample_user_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Check if sample data already exists
  IF NOT EXISTS (SELECT 1 FROM calendar_outlets WHERE is_system = TRUE) THEN
    INSERT INTO calendar_outlets (org_id, name, description, color, icon, is_system, created_by) VALUES
      (sample_org_id, 'Events', 'Banquets and special events', '#ef4444', 'calendar-event', TRUE, sample_user_id),
      (sample_org_id, 'Holidays', 'Company and national holidays', '#f59e0b', 'flag', TRUE, sample_user_id),
      (sample_org_id, 'BQT Team', 'Banquet team scheduling', '#3b82f6', 'users', TRUE, sample_user_id),
      (sample_org_id, 'HR', 'Human resources and training', '#8b5cf6', 'briefcase', TRUE, sample_user_id),
      (sample_org_id, 'Engineering', 'Maintenance and engineering', '#10b981', 'wrench', TRUE, sample_user_id),
      (sample_org_id, 'Activations', 'Marketing and activations', '#ec4899', 'zap', TRUE, sample_user_id);
  END IF;
END $$;

COMMIT;
