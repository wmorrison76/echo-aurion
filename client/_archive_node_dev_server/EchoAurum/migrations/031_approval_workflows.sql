-- ============================================================================
-- MIGRATION: Approval Workflows System
-- Supports multi-level approval chains, escalation, delegation, audit trails
-- ============================================================================

-- ============================================================================
-- APPROVAL WORKFLOW TEMPLATES
-- ============================================================================

-- Define approval workflow templates
CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Workflow metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'journal_entry', 'invoice', 'payment', 'gl_posting'
  
  -- Approval chain
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb, -- Conditions that trigger this workflow
  approver_chain JSONB NOT NULL DEFAULT '[]'::jsonb, -- Multi-level approver configuration
  escalation_days INT DEFAULT 2,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'archived'
  is_default BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT REFERENCES auth_users(id),
  updated_by TEXT REFERENCES auth_users(id),
  
  UNIQUE(entity_id, name),
  INDEX idx_workflow_entity (entity_id),
  INDEX idx_workflow_type (type)
);

-- ============================================================================
-- APPROVAL REQUESTS
-- ============================================================================

-- Individual approval requests submitted for transactions
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES approval_workflows(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Transaction being approved
  transaction_type VARCHAR(50) NOT NULL, -- 'journal_entry', 'invoice', etc.
  transaction_id TEXT NOT NULL,
  transaction_details JSONB, -- Snapshot of transaction data
  
  -- Approval status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated', 'completed'
  current_approval_level INT DEFAULT 1,
  required_approval_level INT,
  
  -- Tracking
  created_by TEXT REFERENCES auth_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by TEXT REFERENCES auth_users(id),
  approved_at TIMESTAMP,
  rejected_by TEXT REFERENCES auth_users(id),
  rejected_at TIMESTAMP,
  
  -- Escalation tracking
  escalation_level INT DEFAULT 0,
  escalated_at TIMESTAMP,
  escalation_reason TEXT,
  
  -- Auto-posting
  can_auto_post BOOLEAN DEFAULT false,
  auto_posted BOOLEAN DEFAULT false,
  auto_posted_at TIMESTAMP,
  
  -- Completion
  completed_at TIMESTAMP,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  
  INDEX idx_request_entity (entity_id),
  INDEX idx_request_status (status),
  INDEX idx_request_transaction (transaction_id),
  INDEX idx_request_created (created_at DESC),
  INDEX idx_request_pending (status, current_approval_level) WHERE status = 'pending'
);

-- ============================================================================
-- APPROVAL ACTIONS (AUDIT TRAIL)
-- ============================================================================

-- Records of all actions taken on approval requests (immutable)
CREATE TABLE IF NOT EXISTS approval_actions (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Action metadata
  action_type VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'escalated', 'delegated', 'commented'
  action_status VARCHAR(50), -- 'completed', 'pending'
  
  -- Actor
  performed_by_user_id TEXT REFERENCES auth_users(id),
  performed_by_role VARCHAR(50),
  
  -- Action details
  comments TEXT,
  reason TEXT,
  approval_tier VARCHAR(50), -- 'level1', 'level2', 'executive', 'system'
  
  -- Immutable chain
  prev_hash VARCHAR(256),
  this_hash VARCHAR(256) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(this_hash),
  INDEX idx_action_request (approval_request_id),
  INDEX idx_action_entity (entity_id),
  INDEX idx_action_created (created_at DESC)
);

-- ============================================================================
-- APPROVAL DELEGATIONS
-- ============================================================================

-- Track delegation of approvals from one person to another
CREATE TABLE IF NOT EXISTS approval_delegations (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Delegation details
  delegated_from_user_id TEXT NOT NULL REFERENCES auth_users(id),
  delegated_to_user_id TEXT NOT NULL REFERENCES auth_users(id),
  delegation_reason TEXT,
  
  -- Time period for delegation (if applicable)
  effective_from TIMESTAMP,
  effective_until TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_delegation_request (approval_request_id),
  INDEX idx_delegation_entity (entity_id),
  INDEX idx_delegation_from (delegated_from_user_id),
  INDEX idx_delegation_to (delegated_to_user_id)
);

-- ============================================================================
-- APPROVAL ESCALATIONS
-- ============================================================================

-- Track escalations when approvers don't respond in time
CREATE TABLE IF NOT EXISTS approval_escalations (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Escalation details
  escalation_level INT NOT NULL,
  escalated_from_user_id TEXT REFERENCES auth_users(id),
  escalated_to_user_id TEXT REFERENCES auth_users(id),
  escalation_reason VARCHAR(255),
  
  -- Timing
  due_at TIMESTAMP,
  escalated_at TIMESTAMP DEFAULT NOW(),
  
  -- Status
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by_user_id TEXT REFERENCES auth_users(id),
  
  INDEX idx_escalation_request (approval_request_id),
  INDEX idx_escalation_entity (entity_id),
  INDEX idx_escalation_pending (resolved) WHERE resolved = false,
  INDEX idx_escalation_created (escalated_at DESC)
);

-- ============================================================================
-- APPROVER ASSIGNMENTS
-- ============================================================================

-- Track which users are assigned as approvers at each level
CREATE TABLE IF NOT EXISTS approval_approver_assignments (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Assignment details
  approval_level INT NOT NULL,
  assigned_to_user_id TEXT NOT NULL REFERENCES auth_users(id),
  required_role VARCHAR(50),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated', 'skipped'
  
  -- Due date
  assigned_at TIMESTAMP DEFAULT NOW(),
  due_at TIMESTAMP,
  
  -- Completion
  responded_at TIMESTAMP,
  
  INDEX idx_assignment_request (approval_request_id),
  INDEX idx_assignment_user (assigned_to_user_id),
  INDEX idx_assignment_level (approval_level),
  INDEX idx_assignment_pending (status) WHERE status = 'pending'
);

-- ============================================================================
-- APPROVAL RULES
-- ============================================================================

-- Rules that determine which approval path a transaction takes
CREATE TABLE IF NOT EXISTS approval_rules (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  workflow_id TEXT NOT NULL REFERENCES approval_workflows(id),
  
  -- Rule metadata
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  priority INT DEFAULT 0,
  
  -- Rule logic
  conditions JSONB NOT NULL, -- When to apply this rule
  action_required VARCHAR(50) NOT NULL, -- approval action to take
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT REFERENCES auth_users(id),
  
  UNIQUE(entity_id, rule_name),
  INDEX idx_rule_entity (entity_id),
  INDEX idx_rule_workflow (workflow_id),
  INDEX idx_rule_active (is_active)
);

-- ============================================================================
-- APPROVAL COMMENTS
-- ============================================================================

-- Comments/discussion on approval requests
CREATE TABLE IF NOT EXISTS approval_comments (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Comment content
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50), -- 'comment', 'mention', 'decision_note'
  is_internal BOOLEAN DEFAULT true, -- Internal notes vs. submitter-visible
  
  -- Author
  created_by_user_id TEXT NOT NULL REFERENCES auth_users(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_comment_request (approval_request_id),
  INDEX idx_comment_entity (entity_id),
  INDEX idx_comment_created (created_at DESC)
);

-- ============================================================================
-- APPROVAL QUEUE (FOR PERFORMANCE)
-- ============================================================================

-- Denormalized view for fast queue queries
CREATE TABLE IF NOT EXISTS approval_queue_view (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL UNIQUE REFERENCES approval_requests(id),
  entity_id TEXT NOT NULL REFERENCES aurum_entities(id),
  
  -- Quick access fields
  transaction_id TEXT NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_approver_user_id TEXT REFERENCES auth_users(id),
  current_approver_role VARCHAR(50),
  
  -- Dates
  created_at TIMESTAMP,
  due_at TIMESTAMP,
  escalated_at TIMESTAMP,
  
  -- Priority
  is_escalated BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  
  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_queue_entity (entity_id),
  INDEX idx_queue_status (status),
  INDEX idx_queue_approver (current_approver_user_id),
  INDEX idx_queue_updated (updated_at DESC)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_approval_workflow_entity_status ON approval_workflows(entity_id, status);
CREATE INDEX idx_approval_request_workflow ON approval_requests(workflow_id);
CREATE INDEX idx_approval_request_entity_status_level ON approval_requests(entity_id, status, current_approval_level);
CREATE INDEX idx_approval_request_timeline ON approval_requests(entity_id, created_at DESC, completed_at DESC);
CREATE INDEX idx_approval_action_entity ON approval_actions(entity_id, created_at DESC);
CREATE INDEX idx_approval_rule_entity_active ON approval_rules(entity_id, is_active);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
