-- ============================================================================
-- MIGRATION: Guardian Audit Trail + Automation Settings
-- ============================================================================

-- Table 1: Guardian Audit Trail (Immutable Cryptographic Record)
-- Stores complete immutable history of all Guardian checks
CREATE TABLE IF NOT EXISTS guardian_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  
  -- Transaction being checked
  transaction_type VARCHAR(50) NOT NULL, -- 'journal_entry', 'ap_invoice'
  transaction_id UUID NOT NULL,
  transaction_data JSONB, -- Full transaction data (immutable snapshot)
  
  -- Guardian checks results
  argus_passed BOOLEAN NOT NULL,
  argus_errors TEXT[], -- Array of error messages
  argus_warnings TEXT[], -- Array of warning messages
  argus_checks_run TEXT[], -- Which checks ran
  
  zelda_passed BOOLEAN DEFAULT true,
  zelda_duplicates_detected JSONB, -- Duplicate detection results
  zelda_auto_heals JSONB, -- Auto-corrections applied
  
  phoenix_passed BOOLEAN DEFAULT true,
  phoenix_risk_score INT DEFAULT 0, -- 0-100
  phoenix_anomalies JSONB, -- Detected anomalies
  
  odin_hash VARCHAR(256) NOT NULL, -- SHA256 hash for immutability
  odin_prev_hash VARCHAR(256), -- Previous record's hash (for chain)
  odin_audit_trail_id VARCHAR(255), -- Audit trail identifier
  
  -- Metadata
  checked_by VARCHAR(50) NOT NULL DEFAULT 'guardian_system', -- Which system checked
  overall_status VARCHAR(20) NOT NULL, -- 'PASSED', 'WARNINGS', 'BLOCKED'
  blocking_errors TEXT[], -- Critical errors that block posting
  risk_score NUMERIC(5,2) DEFAULT 0, -- Combined risk (0-100)
  
  -- Timestamps (verified by server)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for fast queries
  CONSTRAINT fk_entity FOREIGN KEY (entity_id) REFERENCES aurum_entities(id),
  UNIQUE(odin_hash) -- Prevent duplicate hashes (tamper detection)
);

CREATE INDEX idx_guardian_entity_date ON guardian_audit_trail(entity_id, created_at DESC);
CREATE INDEX idx_guardian_transaction ON guardian_audit_trail(transaction_id);
CREATE INDEX idx_guardian_status ON guardian_audit_trail(overall_status);
CREATE INDEX idx_guardian_risk ON guardian_audit_trail(risk_score DESC);

-- ============================================================================
-- AUTOMATION SETTINGS TABLES
-- ============================================================================

-- Table 2: Global Automation Settings (per entity)
-- Operator configurable 0-100% automation levels per feature
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL UNIQUE,
  
  -- GL Automation (0-100%)
  gl_entry_auto_create_enabled BOOLEAN DEFAULT false,
  gl_entry_auto_create_pct INT DEFAULT 0 CHECK (gl_entry_auto_create_pct >= 0 AND gl_entry_auto_create_pct <= 100),
  gl_entry_from_toast BOOLEAN DEFAULT true,
  gl_entry_from_opera BOOLEAN DEFAULT true,
  gl_entry_from_gusto BOOLEAN DEFAULT true,
  gl_entry_approval_mode VARCHAR(20) DEFAULT 'recommend_only', -- 'auto_post', 'recommend_only', 'manual'
  
  -- AP Automation (0-100%)
  ap_invoice_auto_match_enabled BOOLEAN DEFAULT false,
  ap_invoice_auto_match_pct INT DEFAULT 0 CHECK (ap_invoice_auto_match_pct >= 0 AND ap_invoice_auto_match_pct <= 100),
  ap_invoice_match_confidence INT DEFAULT 80,
  ap_invoice_auto_approve_enabled BOOLEAN DEFAULT false,
  ap_invoice_auto_approve_pct INT DEFAULT 0 CHECK (ap_invoice_auto_approve_pct >= 0 AND ap_invoice_auto_approve_pct <= 100),
  ap_invoice_approval_mode VARCHAR(20) DEFAULT 'recommend_only',
  ap_payment_auto_schedule_enabled BOOLEAN DEFAULT false,
  ap_payment_auto_schedule_pct INT DEFAULT 0 CHECK (ap_payment_auto_schedule_pct >= 0 AND ap_payment_auto_schedule_pct <= 100),
  
  -- Reconciliation Automation
  bank_auto_match_enabled BOOLEAN DEFAULT false,
  bank_auto_match_pct INT DEFAULT 0 CHECK (bank_auto_match_pct >= 0 AND bank_auto_match_pct <= 100),
  bank_match_confidence INT DEFAULT 80,
  gl_auto_recon_enabled BOOLEAN DEFAULT false,
  gl_auto_recon_pct INT DEFAULT 0 CHECK (gl_auto_recon_pct >= 0 AND gl_auto_recon_pct <= 100),
  
  -- Month-End Close Automation
  auto_accruals_enabled BOOLEAN DEFAULT false,
  auto_accruals_pct INT DEFAULT 0,
  auto_depreciation_enabled BOOLEAN DEFAULT false,
  auto_depreciation_pct INT DEFAULT 0,
  auto_consolidation_enabled BOOLEAN DEFAULT false,
  auto_consolidation_pct INT DEFAULT 0,
  full_close_automation_enabled BOOLEAN DEFAULT false,
  full_close_automation_pct INT DEFAULT 0,
  
  -- Cash & CFO Automation
  cash_monitor_enabled BOOLEAN DEFAULT true,
  cash_forecast_days INT DEFAULT 30,
  cash_minimum_threshold NUMERIC(19,5) DEFAULT 20000.00000,
  profitability_recommendations_enabled BOOLEAN DEFAULT true,
  
  -- Time-Based Automation
  gl_auto_hours_start TIME DEFAULT '06:00:00',
  gl_auto_hours_end TIME DEFAULT '22:00:00',
  ap_auto_hours_start TIME DEFAULT '06:00:00',
  ap_auto_hours_end TIME DEFAULT '17:00:00',
  auto_during_weekends BOOLEAN DEFAULT false,
  
  -- Approval Settings
  default_approval_mode VARCHAR(20) DEFAULT 'recommend_only', -- 'full_autonomy', 'recommend', 'manual'
  escalation_to_roles VARCHAR(500) DEFAULT 'CFO,Controller', -- Comma-separated roles
  escalation_after_hours INT DEFAULT 24, -- Hours before auto-escalate
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  
  CONSTRAINT fk_entity FOREIGN KEY (entity_id) REFERENCES aurum_entities(id)
);

CREATE INDEX idx_automation_entity ON automation_settings(entity_id);

-- ============================================================================
-- TABLE 3: Per-Account Automation Overrides
-- ============================================================================

-- Operator can override global settings per GL account
CREATE TABLE IF NOT EXISTS automation_account_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  gl_account_id UUID NOT NULL,
  
  feature_name VARCHAR(50) NOT NULL, -- 'gl_auto_post', 'ap_approve', etc.
  override_enabled BOOLEAN,
  override_pct INT CHECK (override_pct IS NULL OR (override_pct >= 0 AND override_pct <= 100)),
  override_mode VARCHAR(20), -- 'auto', 'recommend', 'manual'
  reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_entity FOREIGN KEY (entity_id) REFERENCES aurum_entities(id),
  CONSTRAINT fk_account FOREIGN KEY (gl_account_id) REFERENCES gl_accounts(id),
  UNIQUE(entity_id, gl_account_id, feature_name)
);

CREATE INDEX idx_overrides_entity ON automation_account_overrides(entity_id);
CREATE INDEX idx_overrides_account ON automation_account_overrides(gl_account_id);

-- ============================================================================
-- TABLE 4: Time-Based Automation Schedules
-- ============================================================================

-- Configure when automation runs (e.g., business hours only)
CREATE TABLE IF NOT EXISTS automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  feature_name VARCHAR(50) NOT NULL, -- 'gl_posting', 'ap_approval', etc.
  
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon, 7=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  automation_pct INT DEFAULT 100 CHECK (automation_pct >= 0 AND automation_pct <= 100),
  queue_if_outside BOOLEAN DEFAULT true, -- Queue & execute in next window
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_entity FOREIGN KEY (entity_id) REFERENCES aurum_entities(id),
  UNIQUE(entity_id, feature_name, day_of_week)
);

CREATE INDEX idx_schedules_entity ON automation_schedules(entity_id);
CREATE INDEX idx_schedules_feature ON automation_schedules(feature_name);

-- ============================================================================
-- VERIFY FOREIGN KEY TABLES EXIST
-- ============================================================================

-- These tables should already exist from main schema, but we reference them:
-- - aurum_entities
-- - gl_accounts
-- If they don't exist, the migrations will fail and you'll need to run them first.

-- End of migration
