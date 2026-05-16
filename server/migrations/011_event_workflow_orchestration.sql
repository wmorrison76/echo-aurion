-- Migration: Create Event Workflow Orchestration Schema
-- Purpose: Define event workflow templates with sequential steps, checkpoints, and progression tracking
-- Date: 2025-01-15
-- Features: Workflow templates, step definitions, checkpoint system, progression tracking, auto-progression rules

-- =====================================================
-- WORKFLOW TEMPLATES TABLE
-- =====================================================
-- Pre-defined templates for common event workflows (menu launch, training, emergency, etc)
CREATE TABLE IF NOT EXISTS event_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  template_name VARCHAR(255) NOT NULL,
  template_slug VARCHAR(100) NOT NULL, -- e.g., 'menu_launch', 'server_training', 'emergency_protocol'
  description TEXT,
  
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'menu_launch',
    'training',
    'emergency',
    'scheduled_maintenance',
    'special_event',
    'required_meeting',
    'certification',
    'custom'
  )),
  
  -- Workflow configuration
  total_steps INTEGER NOT NULL,
  requires_sequential_steps BOOLEAN DEFAULT TRUE, -- Can steps be done out of order?
  allow_step_reversal BOOLEAN DEFAULT FALSE, -- Can you go back to previous steps?
  auto_progress_on_completion BOOLEAN DEFAULT TRUE, -- Auto-move to next step when current completes
  
  estimated_duration_hours NUMERIC(8,2),
  
  -- Creator and versioning
  created_by UUID NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_steps CHECK (total_steps > 0),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(org_id, template_slug, version)
);

CREATE INDEX IF NOT EXISTS idx_templates_org ON event_workflow_templates(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_type ON event_workflow_templates(event_type);
CREATE INDEX IF NOT EXISTS idx_templates_slug ON event_workflow_templates(template_slug);

-- =====================================================
-- WORKFLOW STEPS DEFINITION TABLE
-- =====================================================
-- Defines individual steps within a workflow template
CREATE TABLE IF NOT EXISTS workflow_step_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  step_number INTEGER NOT NULL, -- 1, 2, 3, etc
  step_name VARCHAR(255) NOT NULL,
  step_description TEXT,
  
  -- Step type determines what actions are required
  step_type VARCHAR(50) NOT NULL CHECK (step_type IN (
    'notification',       -- Notify departments
    'acknowledgment',     -- Get acknowledgments
    'approval',           -- Get approvals
    'execution',          -- Execute/run the event
    'documentation',      -- Document results
    'feedback',           -- Collect feedback
    'checkpoint',         -- Manual checkpoint
    'condition',          -- Conditional branching
    'parallel',           -- Run steps in parallel
    'email_notification'  -- Send emails
  )),
  
  -- Timing
  estimated_duration_minutes INTEGER,
  
  -- Execution details
  required_role_for_execution VARCHAR(50), -- MANAGER, ADMIN, etc
  can_skip BOOLEAN DEFAULT FALSE,
  is_blocking BOOLEAN DEFAULT TRUE, -- Blocks progress if incomplete
  
  -- Auto-completion rules
  auto_complete_when VARCHAR(50), -- 'all_acknowledged', 'any_approval', 'time_elapsed', 'never'
  auto_complete_threshold INTEGER, -- e.g., 80% acknowledged triggers auto-complete
  
  -- Notifications for this step
  notify_departments TEXT[], -- Which depts to notify in this step
  notification_template_id UUID,
  
  -- Conditional logic
  condition_json JSONB, -- Store complex conditions
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_step_number CHECK (step_number > 0),
  
  FOREIGN KEY (template_id) REFERENCES event_workflow_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_steps_template ON workflow_step_definitions(template_id);
CREATE INDEX IF NOT EXISTS idx_steps_step_type ON workflow_step_definitions(step_type);
CREATE INDEX IF NOT EXISTS idx_steps_step_number ON workflow_step_definitions(template_id, step_number);

-- =====================================================
-- EVENT WORKFLOW INSTANCES TABLE
-- =====================================================
-- Tracks the actual progression of a workflow for a specific event
CREATE TABLE IF NOT EXISTS event_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  template_id UUID NOT NULL, -- Which template was used
  
  workflow_status VARCHAR(30) DEFAULT 'not_started' CHECK (workflow_status IN (
    'not_started',
    'in_progress',
    'paused',
    'completed',
    'failed',
    'cancelled'
  )),
  
  current_step_number INTEGER DEFAULT 0,
  current_step_id UUID,
  
  total_steps INTEGER NOT NULL,
  completed_steps INTEGER DEFAULT 0,
  
  progress_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  
  -- Initiated by
  initiated_by_user_id UUID,
  
  -- Status and notes
  notes TEXT,
  failure_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT completed_not_exceed_total CHECK (completed_steps <= total_steps),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES event_workflow_templates(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_step_id) REFERENCES workflow_step_definitions(id) ON DELETE SET NULL,
  FOREIGN KEY (initiated_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(event_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_event ON event_workflow_instances(event_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON event_workflow_instances(workflow_status);
CREATE INDEX IF NOT EXISTS idx_workflow_template ON event_workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_progress ON event_workflow_instances(progress_percent);

-- =====================================================
-- WORKFLOW STEP PROGRESSION TABLE
-- =====================================================
-- Tracks progression through each step in a workflow
CREATE TABLE IF NOT EXISTS workflow_step_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL,
  step_id UUID NOT NULL,
  step_number INTEGER NOT NULL,
  
  step_status VARCHAR(30) DEFAULT 'pending' CHECK (step_status IN (
    'pending',
    'in_progress',
    'blocked',
    'completed',
    'skipped',
    'failed',
    'waiting_approval'
  )),
  
  -- Completion tracking
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- For approval steps
  approvals_required INTEGER DEFAULT 0,
  approvals_received INTEGER DEFAULT 0,
  approval_percent NUMERIC(5,2) DEFAULT 0,
  
  -- For acknowledgment steps
  acknowledgments_required INTEGER DEFAULT 0,
  acknowledgments_received INTEGER DEFAULT 0,
  acknowledgment_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Notes and reasons
  completion_notes TEXT,
  skip_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_approval_percent CHECK (approval_percent >= 0 AND approval_percent <= 100),
  CONSTRAINT valid_ack_percent CHECK (acknowledgment_percent >= 0 AND acknowledgment_percent <= 100),
  
  FOREIGN KEY (workflow_instance_id) REFERENCES event_workflow_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES workflow_step_definitions(id) ON DELETE RESTRICT,
  
  UNIQUE(workflow_instance_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_progression_workflow ON workflow_step_progression(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_progression_step_id ON workflow_step_progression(step_id);
CREATE INDEX IF NOT EXISTS idx_progression_status ON workflow_step_progression(step_status);

-- =====================================================
-- WORKFLOW CHECKPOINT TABLE
-- =====================================================
-- Manual checkpoints within workflow steps
CREATE TABLE IF NOT EXISTS workflow_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_progression_id UUID NOT NULL,
  workflow_instance_id UUID NOT NULL,
  
  checkpoint_name VARCHAR(255) NOT NULL,
  checkpoint_description TEXT,
  
  -- Approval/validation
  requires_approval BOOLEAN DEFAULT TRUE,
  approver_role VARCHAR(50), -- MANAGER, ADMIN, etc
  approval_status VARCHAR(30) DEFAULT 'pending',
  
  approved_by_user_id UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Validation
  validation_required BOOLEAN DEFAULT FALSE,
  validation_rules JSONB, -- Complex validation logic
  validation_status VARCHAR(30), -- 'pending', 'passed', 'failed'
  
  -- Timing
  expected_completion TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (step_progression_id) REFERENCES workflow_step_progression(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_instance_id) REFERENCES event_workflow_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_progression ON workflow_checkpoints(step_progression_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_workflow ON workflow_checkpoints(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_status ON workflow_checkpoints(approval_status);

-- =====================================================
-- WORKFLOW AUDIT TRAIL TABLE
-- =====================================================
-- Complete audit trail of workflow progression
CREATE TABLE IF NOT EXISTS workflow_progression_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'workflow_initiated',
    'step_started',
    'step_completed',
    'step_skipped',
    'approval_requested',
    'approval_granted',
    'checkpoint_passed',
    'workflow_paused',
    'workflow_resumed',
    'workflow_completed',
    'workflow_failed',
    'rollback'
  )),
  
  step_number INTEGER,
  action_by_user_id UUID,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  details JSONB DEFAULT '{}', -- Store action-specific details
  notes TEXT,
  
  FOREIGN KEY (workflow_instance_id) REFERENCES event_workflow_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (action_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_workflow ON workflow_progression_audit(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON workflow_progression_audit(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON workflow_progression_audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON workflow_progression_audit(action_timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE event_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_progression_audit ENABLE ROW LEVEL SECURITY;

-- Templates visible to org members
CREATE POLICY templates_view_policy ON event_workflow_templates
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- Workflow instances visible to event participants
CREATE POLICY instances_view_policy ON event_workflow_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND ce.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Step progression visible to event participants
CREATE POLICY progression_view_policy ON workflow_step_progression
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_workflow_instances ewi
      JOIN calendar_events ce ON ewi.event_id = ce.id
      WHERE ewi.id = workflow_instance_id
      AND ce.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Audit visible to admins and event creators
CREATE POLICY audit_view_policy ON workflow_progression_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_workflow_instances ewi
      JOIN calendar_events ce ON ewi.event_id = ce.id
      WHERE ewi.id = workflow_instance_id
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

-- =====================================================
-- HELPER FUNCTION: Calculate Workflow Progress
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_workflow_progress(
  p_workflow_instance_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_total_steps INTEGER;
  v_completed_steps INTEGER;
BEGIN
  SELECT total_steps INTO v_total_steps
  FROM event_workflow_instances
  WHERE id = p_workflow_instance_id;
  
  SELECT COUNT(*) INTO v_completed_steps
  FROM workflow_step_progression
  WHERE workflow_instance_id = p_workflow_instance_id
    AND step_status = 'completed';
  
  IF v_total_steps = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((v_completed_steps::NUMERIC / v_total_steps) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_timestamp
BEFORE UPDATE ON event_workflow_instances
FOR EACH ROW
EXECUTE FUNCTION update_workflow_timestamp();

CREATE TRIGGER trigger_update_progression_timestamp
BEFORE UPDATE ON workflow_step_progression
FOR EACH ROW
EXECUTE FUNCTION update_workflow_timestamp();

CREATE OR REPLACE FUNCTION trigger_workflow_progress_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE event_workflow_instances
  SET progress_percent = calculate_workflow_progress(workflow_instance_id),
      completed_steps = (
        SELECT COUNT(*) FROM workflow_step_progression
        WHERE workflow_instance_id = NEW.workflow_instance_id
          AND step_status = 'completed'
      )
  WHERE id = NEW.workflow_instance_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_progress_on_step_change
AFTER UPDATE ON workflow_step_progression
FOR EACH ROW
WHEN (OLD.step_status IS DISTINCT FROM NEW.step_status)
EXECUTE FUNCTION trigger_workflow_progress_update();

COMMIT;
