-- Migration: Create Department Relationship Graph Schema
-- Purpose: Define department dependencies and notification cascading for cross-department coordination
-- Date: 2025-01-15
-- Features: Department graph, relationship types, cascade rules, notification templates

-- =====================================================
-- DEPARTMENT REGISTRY TABLE
-- =====================================================
-- Canonical list of all departments in an organization
CREATE TABLE IF NOT EXISTS organization_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  description TEXT,
  
  department_type VARCHAR(50) NOT NULL DEFAULT 'operational' CHECK (department_type IN (
    'operational',  -- Daily operations (Culinary, FOH, BOH)
    'management',   -- Leadership (General Manager, Assistant Manager)
    'support',      -- HR, Finance, Accounting
    'specialized'   -- Engineering, Housekeeping
  )),
  
  manager_id UUID, -- Default department manager
  location_id UUID, -- If multi-location
  
  is_active BOOLEAN DEFAULT TRUE,
  color_hex VARCHAR(7) DEFAULT '#3b82f6',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_color CHECK (color_hex ~ '^#[0-9a-f]{6}$'),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_depts_org ON organization_departments(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_depts_type ON organization_departments(department_type);

-- =====================================================
-- DEPARTMENT RELATIONSHIPS / DEPENDENCY GRAPH
-- =====================================================
-- Defines which departments must be notified when events occur in other departments
CREATE TABLE IF NOT EXISTS department_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  source_department_id UUID NOT NULL, -- Department that triggers notification
  target_department_id UUID NOT NULL, -- Department that receives notification
  
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'requires_coordination',    -- Both must coordinate (bidirectional)
    'depends_on',               -- Target depends on source (source → target)
    'notifies_only',            -- Source notifies target (no action needed)
    'escalation_chain',         -- Part of escalation path
    'approval_required',        -- Target must approve source's actions
    'resource_sharing'          -- Share staff/resources
  )),
  
  is_bidirectional BOOLEAN DEFAULT FALSE, -- If true, reverse relationship also exists
  priority INTEGER DEFAULT 1, -- 1=highest (notify first)
  
  notification_required BOOLEAN DEFAULT TRUE,
  auto_invite BOOLEAN DEFAULT FALSE, -- Auto-invite to meetings
  approval_required BOOLEAN DEFAULT FALSE,
  approval_deadline_hours INTEGER DEFAULT 24,
  
  -- Filtering: which event types trigger notification
  triggers_on_event_types TEXT[] DEFAULT ARRAY['mandatory', 'training', 'menu_launch', 'emergency'],
  excludes_on_event_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Escalation settings
  escalate_if_not_responded_hours INTEGER, -- NULL = no escalation
  escalate_to_department_id UUID, -- Escalate to this dept if no response
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT different_depts CHECK (source_department_id != target_department_id),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (source_department_id) REFERENCES organization_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (target_department_id) REFERENCES organization_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (escalate_to_department_id) REFERENCES organization_departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(org_id, source_department_id, target_department_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_rels_source ON department_relationships(source_department_id);
CREATE INDEX IF NOT EXISTS idx_rels_target ON department_relationships(target_department_id);
CREATE INDEX IF NOT EXISTS idx_rels_org ON department_relationships(org_id);
CREATE INDEX IF NOT EXISTS idx_rels_type ON department_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_rels_priority ON department_relationships(priority) WHERE notification_required = TRUE;

-- =====================================================
-- DEPARTMENT NOTIFICATION QUEUE
-- =====================================================
-- Tracks which departments need to be notified about an event
CREATE TABLE IF NOT EXISTS department_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  relationship_id UUID NOT NULL,
  
  source_department_id UUID NOT NULL,
  target_department_id UUID NOT NULL,
  
  notification_status VARCHAR(30) DEFAULT 'pending' CHECK (notification_status IN (
    'pending',
    'notified',
    'acknowledged',
    'escalated',
    'cancelled',
    'snoozed'
  )),
  
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by_user_id UUID,
  
  approval_required BOOLEAN DEFAULT FALSE,
  approval_status VARCHAR(30), -- pending, approved, rejected
  approval_by_user_id UUID,
  approval_at TIMESTAMP WITH TIME ZONE,
  
  escalation_timestamp TIMESTAMP WITH TIME ZONE,
  escalated_to_department_id UUID,
  
  cascade_level INTEGER DEFAULT 1, -- For multi-level cascades
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (relationship_id) REFERENCES department_relationships(id) ON DELETE CASCADE,
  FOREIGN KEY (source_department_id) REFERENCES organization_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (target_department_id) REFERENCES organization_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  FOREIGN KEY (approval_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  FOREIGN KEY (escalated_to_department_id) REFERENCES organization_departments(id) ON DELETE SET NULL,
  
  UNIQUE(event_id, relationship_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_event ON department_notification_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_notif_target_dept ON department_notification_queue(target_department_id);
CREATE INDEX IF NOT EXISTS idx_notif_status ON department_notification_queue(notification_status) WHERE notification_status IN ('pending', 'escalated');
CREATE INDEX IF NOT EXISTS idx_notif_approval ON department_notification_queue(approval_status) WHERE approval_required = TRUE;

-- =====================================================
-- DEPARTMENT NOTIFICATION AUDIT
-- =====================================================
-- Audit trail for all department notifications
CREATE TABLE IF NOT EXISTS department_notification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  
  source_department_id UUID NOT NULL,
  target_department_id UUID NOT NULL,
  
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'notification_sent',
    'notification_dismissed',
    'acknowledged',
    'escalated',
    'approval_requested',
    'approval_given',
    'approval_rejected',
    'cascade_triggered'
  )),
  
  action_by_user_id UUID,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  message TEXT,
  metadata JSONB DEFAULT '{}',
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (source_department_id) REFERENCES organization_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (target_department_id) REFERENCES organization_departments(id) ON DELETE CASCADE,
  FOREIGN KEY (action_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_event ON department_notification_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON department_notification_audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON department_notification_audit(action_timestamp DESC);

-- =====================================================
-- NOTIFICATION TEMPLATES
-- =====================================================
-- Pre-defined templates for cross-department notifications
CREATE TABLE IF NOT EXISTS department_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  template_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- menu_launch, training, emergency, etc
  
  subject_template VARCHAR(500),
  email_body_template TEXT,
  in_app_message_template TEXT,
  sms_template TEXT,
  
  notify_managers_only BOOLEAN DEFAULT FALSE,
  include_details BOOLEAN DEFAULT TRUE, -- Include event details in notification
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(org_id, event_type, template_name)
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON department_notification_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON department_notification_templates(event_type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE organization_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_notification_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_notification_templates ENABLE ROW LEVEL SECURITY;

-- Users in an org can see departments
CREATE POLICY depts_view_policy ON organization_departments
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- Relationships visible to org members
CREATE POLICY rels_view_policy ON department_relationships
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- Admins can manage relationships
CREATE POLICY rels_manage_policy ON department_relationships
  FOR ALL USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- Notification queue visible to target department
CREATE POLICY notif_queue_view_policy ON department_notification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND ce.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Audit visible to admins and event creators
CREATE POLICY audit_view_policy ON department_notification_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND (
        ce.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND role IN ('admin', 'owner')
        )
      )
    )
  );

-- Templates visible to org
CREATE POLICY templates_view_policy ON department_notification_templates
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- =====================================================
-- HELPER FUNCTION: Get Department Graph (Traversal)
-- =====================================================

CREATE OR REPLACE FUNCTION get_dependent_departments(
  p_source_dept_id UUID,
  p_max_depth INTEGER DEFAULT 5
) RETURNS TABLE (
  dept_id UUID,
  dept_name VARCHAR,
  relationship_type VARCHAR,
  priority INTEGER,
  depth INTEGER
) AS $$
WITH RECURSIVE dept_graph AS (
  -- Base case: direct dependencies
  SELECT
    dr.target_department_id as dept_id,
    od.name as dept_name,
    dr.relationship_type,
    dr.priority,
    1 as depth
  FROM department_relationships dr
  JOIN organization_departments od ON dr.target_department_id = od.id
  WHERE dr.source_department_id = p_source_dept_id
    AND dr.notification_required = TRUE
    AND od.is_active = TRUE
    AND depth <= p_max_depth
  
  UNION ALL
  
  -- Recursive case: transitive dependencies
  SELECT
    dr.target_department_id,
    od.name,
    dr.relationship_type,
    dr.priority,
    dg.depth + 1
  FROM department_relationships dr
  JOIN organization_departments od ON dr.target_department_id = od.id
  JOIN dept_graph dg ON dr.source_department_id = dg.dept_id
  WHERE dr.notification_required = TRUE
    AND od.is_active = TRUE
    AND dg.depth < p_max_depth
)
SELECT DISTINCT ON (dept_id) * FROM dept_graph
ORDER BY dept_id, depth, priority;
$$ LANGUAGE SQL;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_dept_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dept_timestamp
BEFORE UPDATE ON organization_departments
FOR EACH ROW
EXECUTE FUNCTION update_dept_timestamp();

CREATE TRIGGER trigger_update_relationships_timestamp
BEFORE UPDATE ON department_relationships
FOR EACH ROW
EXECUTE FUNCTION update_dept_timestamp();

COMMIT;
