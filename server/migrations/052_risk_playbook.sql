-- Migration 052: Risk Playbook Management System
-- Creates tables for playbook content library, management, and execution tracking

-- Risk playbooks table
CREATE TABLE IF NOT EXISTS risk_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  department VARCHAR(100),
  risk_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- Risk types this playbook applies to
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of playbook steps
  contact_person VARCHAR(255),
  link TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(org_id, name, version)
);

-- Indexes for playbook lookups
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_org_id ON risk_playbooks(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_category ON risk_playbooks(category);
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_department ON risk_playbooks(department);
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_risk_types ON risk_playbooks USING GIN(risk_types);
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_is_active ON risk_playbooks(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_playbooks_name_version ON risk_playbooks(org_id, name, version);

-- Playbook execution tracking
CREATE TABLE IF NOT EXISTS risk_playbook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES risk_playbooks(id) ON DELETE CASCADE,
  event_id UUID, -- Optional link to event
  beo_id UUID, -- Optional link to BEO
  org_id UUID NOT NULL,
  triggered_by UUID NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  current_step VARCHAR(255), -- Current step ID being executed
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of completed step IDs
  failed_steps TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of failed step IDs
  results JSONB DEFAULT '{}'::jsonb, -- Execution results and outputs
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'))
);

-- Indexes for execution tracking
CREATE INDEX IF NOT EXISTS idx_risk_playbook_executions_playbook_id ON risk_playbook_executions(playbook_id);
CREATE INDEX IF NOT EXISTS idx_risk_playbook_executions_event_id ON risk_playbook_executions(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_playbook_executions_beo_id ON risk_playbook_executions(beo_id) WHERE beo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_playbook_executions_org_id ON risk_playbook_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_playbook_executions_status ON risk_playbook_executions(status);
CREATE INDEX IF NOT EXISTS idx_risk_playbook_executions_triggered_at ON risk_playbook_executions(triggered_at DESC);

-- Playbook templates table (for reusable playbook templates)
CREATE TABLE IF NOT EXISTS risk_playbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID, -- NULL for system-wide templates
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  department VARCHAR(100),
  risk_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_template BOOLEAN DEFAULT FALSE, -- System templates available to all orgs
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_risk_playbook_templates_org_id ON risk_playbook_templates(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_playbook_templates_is_system ON risk_playbook_templates(is_system_template) WHERE is_system_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_playbook_templates_category ON risk_playbook_templates(category);

-- Enable RLS on all tables
ALTER TABLE risk_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_playbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_playbook_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for risk_playbooks
CREATE POLICY risk_playbooks_tenant_isolation ON risk_playbooks
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- RLS policies for risk_playbook_executions
CREATE POLICY risk_playbook_executions_tenant_isolation ON risk_playbook_executions
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- RLS policies for risk_playbook_templates (system templates visible to all, org templates only to org)
CREATE POLICY risk_playbook_templates_read ON risk_playbook_templates
  FOR SELECT
  USING (
    is_system_template = TRUE 
    OR org_id = current_setting('app.current_org_id')::uuid
    OR org_id IS NULL
  );

CREATE POLICY risk_playbook_templates_write ON risk_playbook_templates
  FOR ALL
  USING (
    org_id = current_setting('app.current_org_id')::uuid 
    OR (is_system_template = TRUE AND current_setting('app.is_admin', true) = 'true')
  );

-- Insert default system templates
INSERT INTO risk_playbook_templates (template_name, description, category, department, risk_types, steps, is_system_template) VALUES
(
  'Inventory Gap Rapid Response',
  'Escalate to Purchasing, check substitutes, confirm vendor lead times.',
  'inventory',
  'Culinary',
  ARRAY['inventory', 'shortage', 'supply'],
  '[
    {"sequence": 1, "title": "Identify missing items", "description": "Document all missing inventory items", "is_required": true},
    {"sequence": 2, "title": "Check inventory substitutes", "description": "Check for alternative ingredients", "is_required": true},
    {"sequence": 3, "title": "Confirm vendor lead times", "description": "Contact vendors for delivery times", "action": "notify_department", "parameters": {"department": "Purchasing"}, "is_required": true},
    {"sequence": 4, "title": "Update event menu if needed", "description": "Modify menu based on availability", "is_required": false},
    {"sequence": 5, "title": "Notify stakeholders", "description": "Inform all relevant parties", "action": "escalate_to_manager", "is_required": true}
  ]'::jsonb,
  TRUE
),
(
  'Staffing Shortage Playbook',
  'Call on-call pool, adjust service style, reassign from low-risk outlets.',
  'staffing',
  'Banquets',
  ARRAY['staffing', 'labor', 'shortage'],
  '[
    {"sequence": 1, "title": "Assess staffing gap", "description": "Calculate required vs available staff", "is_required": true},
    {"sequence": 2, "title": "Contact on-call pool", "description": "Call on-call staff", "action": "call_on_call_pool", "is_required": true},
    {"sequence": 3, "title": "Evaluate service style adjustments", "description": "Consider buffet or modified service", "is_required": false},
    {"sequence": 4, "title": "Reassign staff from lower-priority events", "description": "Redirect staff from other events", "is_required": false},
    {"sequence": 5, "title": "Confirm with department managers", "description": "Get approval from all managers", "action": "escalate_to_manager", "is_required": true}
  ]'::jsonb,
  TRUE
),
(
  'AV Equipment Lockdown Procedure',
  'Secure all AV equipment 18 hours before high-risk events.',
  'equipment',
  'AV',
  ARRAY['av', 'equipment', 'high-risk'],
  '[
    {"sequence": 1, "title": "Verify equipment list for event", "description": "Check required AV equipment", "is_required": true},
    {"sequence": 2, "title": "Physically lock down all AV", "description": "Secure equipment in locked room", "action": "lock_equipment", "is_required": true},
    {"sequence": 3, "title": "Document lock status with photos", "description": "Take photos of locked equipment", "is_required": true},
    {"sequence": 4, "title": "Assign dedicated AV technician", "description": "Assign technician to event", "is_required": true},
    {"sequence": 5, "title": "Confirm readiness 2 hours pre-event", "description": "Final check before event start", "is_required": true}
  ]'::jsonb,
  TRUE
),
(
  'Engineering Pre-Event Buffer SOP',
  'Cease all disruptive work 2 hours before setup begins.',
  'facilities',
  'Engineering',
  ARRAY['engineering', 'facilities', 'maintenance'],
  '[
    {"sequence": 1, "title": "Review event setup schedule", "description": "Check event timeline", "is_required": true},
    {"sequence": 2, "title": "Halt disruptive work 2h before setup", "description": "Stop all noisy/maintenance work", "action": "update_event_status", "parameters": {"status": "setup_protected"}, "is_required": true},
    {"sequence": 3, "title": "Conduct final safety walkthrough", "description": "Inspect all areas", "is_required": true},
    {"sequence": 4, "title": "Deploy on-call technician", "description": "Have technician available", "action": "call_on_call_pool", "parameters": {"department": "Engineering"}, "is_required": false},
    {"sequence": 5, "title": "Stand by for emergency repairs", "description": "Be ready for issues", "is_required": false}
  ]'::jsonb,
  TRUE
)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE risk_playbooks IS 'Risk playbooks (SOPs) that can be executed when risks are detected';
COMMENT ON TABLE risk_playbook_executions IS 'Execution history and status of playbook runs';
COMMENT ON TABLE risk_playbook_templates IS 'Reusable playbook templates (system-wide or org-specific)';
COMMENT ON COLUMN risk_playbooks.risk_types IS 'Array of risk type keywords that trigger this playbook';
COMMENT ON COLUMN risk_playbooks.steps IS 'JSON array of playbook steps with sequence, actions, and dependencies';
COMMENT ON COLUMN risk_playbook_executions.completed_steps IS 'Array of step IDs that have been completed';
COMMENT ON COLUMN risk_playbook_executions.failed_steps IS 'Array of step IDs that have failed';
