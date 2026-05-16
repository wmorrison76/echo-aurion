-- Migration: Create Mandatory Events Schema
-- Purpose: Enable mandatory event marking, department dependency tracking, and enforcement
-- Date: 2025-01-15
-- Features: Mandatory flags, department dependencies, enforcement policies

-- =====================================================
-- ALTER calendar_events TABLE - Add mandatory fields
-- =====================================================

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mandatory_reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS acknowledgment_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS enforcement_policy VARCHAR(50) DEFAULT 'notify' CHECK (enforcement_policy IN ('notify', 'escalate', 'block_checkin', 'full_lock')),
ADD COLUMN IF NOT EXISTS enforcement_enabled BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_events_mandatory ON calendar_events(is_mandatory) WHERE is_mandatory = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_requires_ack ON calendar_events(requires_acknowledgment) WHERE requires_acknowledgment = TRUE;

-- =====================================================
-- CALENDAR EVENT DEPARTMENT DEPENDENCIES TABLE
-- =====================================================
-- Tracks which departments are required to participate in an event
-- Example: Menu launch requires Culinary, FOH, Management, and Finance
CREATE TABLE IF NOT EXISTS calendar_event_department_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  department VARCHAR(100) NOT NULL,
  is_primary_organizer BOOLEAN DEFAULT FALSE,
  required_role VARCHAR(50), -- 'MANAGER', 'ALL_STAFF', 'SPECIFIC_ROLE', etc.
  notification_type VARCHAR(50) DEFAULT 'email_and_in_app', -- email_only, in_app_only, email_and_in_app
  reminder_hours_before INTEGER DEFAULT 24,
  auto_escalate_after_hours INTEGER DEFAULT 48,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_notification CHECK (notification_type IN ('email_only', 'in_app_only', 'email_and_in_app', 'sms_all')),
  CONSTRAINT valid_role CHECK (required_role IN ('MANAGER', 'ALL_STAFF', 'SPECIFIC_ROLE', 'LEADERSHIP_ONLY')),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(event_id, department, required_role)
);

CREATE INDEX IF NOT EXISTS idx_dept_deps_event ON calendar_event_department_dependencies(event_id);
CREATE INDEX IF NOT EXISTS idx_dept_deps_department ON calendar_event_department_dependencies(department);

-- =====================================================
-- CALENDAR EVENT ACKNOWLEDGMENT QUEUE TABLE
-- =====================================================
-- Tracks which users still need to acknowledge mandatory events
CREATE TABLE IF NOT EXISTS calendar_event_acknowledgment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  department VARCHAR(100) NOT NULL,
  required_role VARCHAR(50),
  
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'escalated', 'auto_waived', 'excluded')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by_user_id UUID,
  acknowledgment_method VARCHAR(30) DEFAULT 'in_app', -- in_app, email_link, sms, manager_override
  
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  first_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  escalation_sent_at TIMESTAMP WITH TIME ZONE,
  escalation_target_id UUID, -- Manager or escalation recipient
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT dept_escalation_fk FOREIGN KEY (escalation_target_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  UNIQUE(event_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_ack_event ON calendar_event_acknowledgment_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_ack_employee ON calendar_event_acknowledgment_queue(employee_id);
CREATE INDEX IF NOT EXISTS idx_ack_status ON calendar_event_acknowledgment_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ack_department ON calendar_event_acknowledgment_queue(department);
CREATE INDEX IF NOT EXISTS idx_ack_escalation_target ON calendar_event_acknowledgment_queue(escalation_target_id) WHERE status = 'escalated';

-- =====================================================
-- CALENDAR EVENT ENFORCEMENT AUDIT TABLE
-- =====================================================
-- Logs enforcement actions (block checkin, escalation, etc)
CREATE TABLE IF NOT EXISTS calendar_event_enforcement_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  enforcement_action VARCHAR(50) NOT NULL CHECK (enforcement_action IN ('checkin_blocked', 'escalation_triggered', 'access_restricted', 'warning_issued', 'override_applied')),
  enforcement_reason TEXT,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  triggered_by_user_id UUID,
  
  event_details JSONB DEFAULT '{}',
  employee_details JSONB DEFAULT '{}',
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_enforce_event ON calendar_event_enforcement_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_enforce_employee ON calendar_event_enforcement_audit(employee_id);
CREATE INDEX IF NOT EXISTS idx_enforce_action ON calendar_event_enforcement_audit(enforcement_action);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE calendar_event_department_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_acknowledgment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_enforcement_audit ENABLE ROW LEVEL SECURITY;

-- Department dependencies visible to org members
CREATE POLICY dept_deps_view_policy ON calendar_event_department_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND ce.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Acknowledgment queue: users see their own, managers see their dept
CREATE POLICY ack_queue_view_policy ON calendar_event_acknowledgment_queue
  FOR SELECT USING (
    employee_id = auth.uid()
    OR escalation_target_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'hr_manager')
    )
  );

-- Users can update their own acknowledgments
CREATE POLICY ack_queue_update_policy ON calendar_event_acknowledgment_queue
  FOR UPDATE USING (
    employee_id = auth.uid()
  )
  WITH CHECK (
    employee_id = auth.uid()
    AND status IN ('acknowledged', 'auto_waived')
  );

-- Enforcement audit visible to event creators and admins
CREATE POLICY enforce_audit_view_policy ON calendar_event_enforcement_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND (
        ce.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND role IN ('admin', 'owner', 'hr_manager')
        )
      )
    )
  );

-- =====================================================
-- TRIGGERS FOR TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_ack_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ack_queue_timestamp
BEFORE UPDATE ON calendar_event_acknowledgment_queue
FOR EACH ROW
EXECUTE FUNCTION update_ack_queue_timestamp();

COMMIT;
