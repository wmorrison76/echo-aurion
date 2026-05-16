-- Week 10: Rule Engine Database Schema

-- Custom rules (user-defined)
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  
  -- Rule metadata
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  rule_type VARCHAR(50) NOT NULL, -- 'gl_posting', 'ap_approval', 'cash_alert', 'profitability'
  rule_version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  
  -- Rule logic (JSON)
  conditions JSONB NOT NULL, -- When to trigger
  actions JSONB NOT NULL, -- What to do when triggered
  approval_required BOOLEAN DEFAULT false, -- Does operator approve first?
  
  -- Rule source
  created_by_user_id UUID REFERENCES users(id),
  created_by_ai BOOLEAN DEFAULT false, -- TRUE if Echo AI³ created
  parent_rule_id UUID REFERENCES automation_rules(id),
  
  -- Statistics
  times_triggered INT DEFAULT 0,
  times_auto_executed INT DEFAULT 0,
  times_approved INT DEFAULT 0,
  times_rejected INT DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  
  -- Versions & history
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_rule_name UNIQUE(entity_id, rule_name),
  INDEX idx_entity_active (entity_id, is_active)
);

-- Rule execution log (forensic)
CREATE TABLE IF NOT EXISTS rule_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  
  -- Execution details
  triggered_by VARCHAR(50) NOT NULL, -- 'gl_entry', 'invoice', 'cash_alert', 'schedule'
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  trigger_data JSONB, -- What triggered it
  
  -- Action taken
  action_type VARCHAR(50), -- 'auto_executed', 'recommended', 'blocked'
  action_details JSONB, -- What happened
  result VARCHAR(20), -- 'success', 'failed', 'pending'
  
  -- Approval workflow
  required_approval BOOLEAN,
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_reason TEXT,
  
  -- Execution status
  execution_started_at TIMESTAMP WITH TIME ZONE,
  execution_completed_at TIMESTAMP WITH TIME ZONE,
  execution_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  INDEX idx_rule_execution (entity_id, rule_id, triggered_at DESC)
);

-- Rule templates (for quick rule creation)
CREATE TABLE IF NOT EXISTS rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template info
  template_name VARCHAR(255) NOT NULL UNIQUE,
  template_description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  
  -- Template logic
  conditions_template JSONB NOT NULL,
  actions_template JSONB NOT NULL,
  
  -- Metadata
  created_by_user_id UUID,
  is_system_template BOOLEAN DEFAULT true, -- System vs. user template
  usage_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- AI-generated rules (tracking learning)
CREATE TABLE IF NOT EXISTS ai_generated_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  
  -- What triggered generation
  trigger_type VARCHAR(50) NOT NULL, -- 'operator_override', 'pattern_detected', 'recommendation_accepted'
  trigger_data JSONB,
  
  -- Rule creation
  rule_reasoning TEXT,
  confidence_pct INT DEFAULT 0,
  
  -- Operator action
  accepted_by_user_id UUID REFERENCES users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  acceptance_reason TEXT,
  
  -- Statistics
  active_duration INT,
  times_used INT DEFAULT 0,
  success_rate DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Operator overrides tracking
CREATE TABLE IF NOT EXISTS operator_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  transaction_id UUID,
  
  -- User info
  overridden_by_user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  
  -- What was overridden
  echo_ai_recommendation JSONB NOT NULL,
  operator_decision JSONB NOT NULL,
  override_reason TEXT,
  
  -- Outcome
  outcome VARCHAR(50), -- 'successful', 'problematic', 'neutral'
  outcome_notes TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  INDEX idx_entity_overrides (entity_id, created_at DESC)
);

-- Forensic audit trail
CREATE TABLE IF NOT EXISTS forensic_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  
  -- HUMAN ACTIONS
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  user_ip_address INET,
  user_session_id UUID,
  
  -- AI ACTIONS
  ai_component VARCHAR(50), -- 'echo_ai3', 'guardian', 'rule_engine'
  ai_action VARCHAR(50), -- 'recommendation', 'auto_post', 'blocked'
  ai_confidence INT,
  
  -- TRANSACTION DETAILS
  transaction_type VARCHAR(50),
  transaction_id UUID,
  transaction_data JSONB,
  
  -- DECISION MADE
  decision_type VARCHAR(50), -- 'approved', 'rejected', 'escalated', 'auto_executed'
  decision_reason TEXT,
  decision_impact JSONB,
  
  -- RULE EXECUTION
  rule_id UUID REFERENCES automation_rules(id),
  rule_name VARCHAR(255),
  rule_version INT,
  
  -- APPROVAL WORKFLOW
  approval_required BOOLEAN,
  approved_by_user_id UUID REFERENCES users(id),
  approval_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  timestamp_server_clock TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Regulatory
  regulatory_category VARCHAR(50),
  
  INDEX idx_entity_time (entity_id, created_at DESC),
  INDEX idx_transaction (transaction_id),
  INDEX idx_user (user_id),
  INDEX idx_rule (rule_id)
);

-- Add rule_id column to journal_entries if not exists
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS rule_executed_id UUID REFERENCES automation_rules(id);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS rule_execution_log_id UUID REFERENCES rule_execution_log(id);

-- Add rule_id column to ap_invoices if not exists
ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS rule_executed_id UUID REFERENCES automation_rules(id);
ALTER TABLE ap_invoices ADD COLUMN IF NOT EXISTS rule_execution_log_id UUID REFERENCES rule_execution_log(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_rules_entity ON automation_rules(entity_id, is_active, is_paused);
CREATE INDEX IF NOT EXISTS idx_automation_rules_type ON automation_rules(entity_id, rule_type);
CREATE INDEX IF NOT EXISTS idx_rule_templates_type ON rule_templates(rule_type);
CREATE INDEX IF NOT EXISTS idx_ai_generated_entity ON ai_generated_rules(entity_id, accepted_at);
CREATE INDEX IF NOT EXISTS idx_operator_overrides_entity ON operator_overrides(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forensic_entity_date ON forensic_audit_log(entity_id, created_at DESC);
