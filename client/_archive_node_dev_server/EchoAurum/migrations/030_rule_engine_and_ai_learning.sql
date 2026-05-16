-- ============================================================================
-- AUTOMATION RULES ENGINE & AI LEARNING SYSTEM
-- Phase 2 Weeks 10-12: Complete rule engine + AI learning + forensic audit
-- ============================================================================

-- Custom automation rules (user-defined and AI-generated)
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Rule metadata
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  rule_type VARCHAR(50), -- 'gl_posting', 'ap_approval', 'cash_alert', 'profitability'
  rule_version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  
  -- Rule logic (JSON)
  conditions JSONB NOT NULL, -- When to trigger
  actions JSONB NOT NULL, -- What to do when triggered
  approval_required BOOLEAN DEFAULT false, -- Does operator approve first?
  
  -- Rule source
  created_by_user_id TEXT REFERENCES auth_users(id), -- User who created
  created_by_ai BOOLEAN DEFAULT false, -- TRUE if Echo AI³ created
  parent_rule_id TEXT REFERENCES automation_rules(id), -- For copies
  
  -- Statistics
  times_triggered INT DEFAULT 0,
  times_auto_executed INT DEFAULT 0,
  times_approved INT DEFAULT 0,
  times_rejected INT DEFAULT 0,
  last_triggered_at TIMESTAMP,
  
  -- Versions & history
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete
  
  UNIQUE(entity_id, rule_name),
  INDEX idx_entity_active (entity_id, is_active)
);

-- Rule execution log (forensic)
CREATE TABLE IF NOT EXISTS rule_execution_log (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  rule_id TEXT NOT NULL REFERENCES automation_rules(id),
  
  -- Execution details
  triggered_by VARCHAR(50), -- 'gl_entry', 'invoice', 'cash_alert', 'schedule'
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  trigger_data JSONB, -- What triggered it
  
  -- Action taken
  action_type VARCHAR(50), -- 'auto_executed', 'recommended', 'blocked'
  action_details JSONB, -- What happened
  result VARCHAR(20), -- 'success', 'failed', 'pending'
  
  -- Approval workflow
  required_approval BOOLEAN,
  approved_by_user_id TEXT REFERENCES auth_users(id),
  approved_at TIMESTAMP,
  approval_reason TEXT,
  
  -- Execution status
  execution_started_at TIMESTAMP,
  execution_completed_at TIMESTAMP,
  execution_error TEXT, -- If failed
  
  -- Immutable audit
  prev_hash VARCHAR(256),
  this_hash VARCHAR(256) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_rule_execution (entity_id, rule_id, triggered_at)
);

-- Rule templates (for quick rule creation)
CREATE TABLE IF NOT EXISTS rule_templates (
  id TEXT PRIMARY KEY,
  
  -- Template info
  template_name VARCHAR(255) NOT NULL UNIQUE,
  template_description TEXT,
  rule_type VARCHAR(50),
  
  -- Template logic
  conditions_template JSONB,
  actions_template JSONB,
  
  -- Metadata
  created_by_user_id TEXT REFERENCES auth_users(id),
  is_system_template BOOLEAN DEFAULT true, -- System vs. user template
  usage_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI-generated rules (tracking learning)
CREATE TABLE IF NOT EXISTS ai_generated_rules (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  rule_id TEXT NOT NULL REFERENCES automation_rules(id),
  
  -- What triggered generation
  trigger_type VARCHAR(50), -- 'operator_override', 'pattern_detected', 'recommendation_accepted'
  trigger_data JSONB,
  
  -- Rule creation
  rule_reasoning TEXT, -- Why Echo AI³ created this rule
  confidence_pct INT, -- 0-100 confidence that rule is good
  
  -- Operator action
  accepted_by_user_id TEXT REFERENCES auth_users(id),
  accepted_at TIMESTAMP,
  acceptance_reason TEXT,
  
  -- Statistics
  active_duration INT, -- How long rule has been active
  times_used INT DEFAULT 0,
  success_rate DECIMAL(5,2), -- 0-100% of times it worked well
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Operator overrides (for AI learning)
CREATE TABLE IF NOT EXISTS operator_overrides (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  transaction_id TEXT,
  
  -- What was overridden
  recommendation_type VARCHAR(50), -- 'gl_posting', 'ap_approval', etc.
  echo_ai_recommendation JSONB, -- Original recommendation
  operator_decision JSONB, -- What operator chose instead
  
  -- Metadata
  overridden_by_user_id TEXT REFERENCES auth_users(id),
  override_reason TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  outcome VARCHAR(20) -- 'positive', 'negative', 'neutral'
);

-- Operator patterns (detected from overrides)
CREATE TABLE IF NOT EXISTS operator_patterns (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Pattern info
  pattern_type VARCHAR(50), -- 'consistent_override', 'workflow_variance', etc.
  pattern_description TEXT,
  
  -- Statistics
  occurrence_count INT,
  consistency_pct DECIMAL(5,2), -- 0-100%
  
  -- Rule creation
  rule_id TEXT REFERENCES automation_rules(id), -- If rule was created
  rule_created_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_entity_pattern (entity_id, pattern_type)
);

-- Forensic audit log (immutable, complete audit trail)
CREATE TABLE IF NOT EXISTS forensic_audit_log (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- HUMAN ACTIONS
  user_id TEXT REFERENCES auth_users(id),
  user_name VARCHAR(255),
  user_role VARCHAR(50), -- 'controller', 'cfo', 'accountant'
  
  -- AI ACTIONS
  ai_component VARCHAR(50), -- 'echo_ai3', 'guardian', 'rule_engine'
  ai_action VARCHAR(50), -- 'recommendation', 'auto_post', 'blocked'
  ai_confidence INT, -- 0-100%
  
  -- TRANSACTION DETAILS
  transaction_type VARCHAR(50), -- 'gl_entry', 'invoice', 'reconciliation', 'rule_execution'
  transaction_id TEXT,
  transaction_data JSONB, -- Full data (immutable)
  
  -- DECISION MADE
  decision_type VARCHAR(50), -- 'approved', 'rejected', 'escalated', 'auto_executed'
  decision_reason TEXT,
  decision_impact JSONB, -- Financial impact
  
  -- RULE EXECUTION (if applicable)
  rule_id TEXT REFERENCES automation_rules(id),
  rule_name VARCHAR(255),
  
  -- APPROVAL WORKFLOW
  approval_required BOOLEAN,
  approved_by_user_id TEXT REFERENCES auth_users(id),
  approval_timestamp TIMESTAMP,
  
  -- IMMUTABILITY CHAIN
  prev_hash VARCHAR(256), -- Previous audit entry hash
  this_hash VARCHAR(256) NOT NULL, -- SHA256 of this entry
  chain_valid BOOLEAN DEFAULT true, -- Is chain unbroken?
  
  -- METADATA
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_entity_time (entity_id, created_at DESC),
  INDEX idx_transaction (transaction_id),
  UNIQUE(this_hash)
);

-- ============================================================================
-- SEED SYSTEM RULE TEMPLATES
-- ============================================================================

INSERT INTO rule_templates (id, template_name, template_description, rule_type, is_system_template, created_at) VALUES
('tmpl_1', 'Auto-Post Toast Sales', 'Automatically post Toast POS sales over $1000 during business hours', 'gl_posting', true, NOW()),
('tmpl_2', 'Auto-Approve 3-Way Matched AP', 'Auto-approve invoices when PO, Receipt, and Invoice all match', 'ap_approval', true, NOW()),
('tmpl_3', 'Cash Position Alert', 'Alert if projected cash falls below minimum threshold', 'cash_alert', true, NOW()),
('tmpl_4', 'Labor Cost Alert', 'Alert if labor cost exceeds budget by 5%', 'profitability', true, NOW()),
('tmpl_5', 'Auto-Post Payroll', 'Automatically post approved payroll journal entries', 'gl_posting', true, NOW());

-- Create indexes for common queries
CREATE INDEX idx_automation_rules_entity ON automation_rules(entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_automation_rules_type ON automation_rules(rule_type) WHERE is_active = true;
CREATE INDEX idx_rule_execution_time ON rule_execution_log(entity_id, triggered_at DESC);
CREATE INDEX idx_ai_rules_entity ON ai_generated_rules(entity_id);
CREATE INDEX idx_operator_overrides_entity ON operator_overrides(entity_id, timestamp DESC);
CREATE INDEX idx_patterns_entity ON operator_patterns(entity_id);
CREATE INDEX idx_audit_entity_time ON forensic_audit_log(entity_id, created_at DESC);

-- Grant permissions (adjust based on your auth model)
-- GRANT SELECT, INSERT, UPDATE ON automation_rules TO "service_role";
-- GRANT SELECT ON rule_templates TO "service_role";
-- GRANT SELECT, INSERT ON rule_execution_log TO "service_role";
-- GRANT SELECT, INSERT ON ai_generated_rules TO "service_role";
-- GRANT SELECT, INSERT ON forensic_audit_log TO "service_role";
