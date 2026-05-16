-- Migration: Post-Event Evaluations with Encryption
-- Purpose: Store encrypted employee evaluations and history
-- Date: 2025-01-XX
-- Features: Encrypted evaluations, employee history, EchoAI^3 training data

-- =====================================================
-- POST-EVENT EVALUATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_event_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID NOT NULL,
  beo_id UUID,
  employee_id UUID NOT NULL,
  evaluated_by UUID NOT NULL, -- Manager ID
  
  -- Performance Metrics (Stored as JSON, encrypted in application layer)
  performance_data JSONB NOT NULL, -- {punctuality, quality, teamwork, etc.}
  
  -- Role-Specific Data
  role_code VARCHAR(100) NOT NULL,
  role_name VARCHAR(255) NOT NULL,
  role_metrics JSONB DEFAULT '{}'::JSONB,
  
  -- Feedback (Encrypted)
  strengths TEXT[] DEFAULT '{}',
  areas_for_improvement TEXT[] DEFAULT '{}',
  manager_notes TEXT, -- Encrypted
  
  -- Sensitive Data (Encrypted)
  sensitive_data JSONB DEFAULT '{}'::JSONB, -- {payRate, tipsEarned, bonuses, etc.}
  
  -- AI Training Data
  ai_training_data JSONB NOT NULL, -- {eventType, serviceType, difficulty, workload, etc.}
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'archived')),
  encrypted BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  evaluation_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluated_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evaluations_employee ON post_event_evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_event ON post_event_evaluations(event_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_beo ON post_event_evaluations(beo_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON post_event_evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON post_event_evaluations(status);

-- =====================================================
-- EMPLOYEE HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Entry Type
  entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
    'evaluation',
    'performance_review',
    'training',
    'incident',
    'achievement',
    'promotion'
  )),
  
  -- Related Data
  event_id UUID,
  related_entry_id UUID, -- Link to evaluation, training record, etc.
  
  -- Entry Data
  title VARCHAR(255) NOT NULL,
  description TEXT, -- Encrypted
  entry_data JSONB DEFAULT '{}'::JSONB, -- Encrypted
  
  -- Metadata
  created_by UUID NOT NULL,
  encrypted BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  entry_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_employee ON employee_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_history_type ON employee_history(entry_type);
CREATE INDEX IF NOT EXISTS idx_history_date ON employee_history(entry_date);

-- =====================================================
-- ECHOAI^3 LEARNING PATTERNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS echo_ai3_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Pattern Data
  pattern_text TEXT NOT NULL, -- e.g., "Excels in high-pressure plated service events"
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER DEFAULT 1,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, employee_id, pattern_text)
);

CREATE INDEX IF NOT EXISTS idx_learning_patterns_employee ON echo_ai3_learning_patterns(employee_id);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_confidence ON echo_ai3_learning_patterns(confidence);

-- =====================================================
-- PREDICTION ACCURACY TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS echo_ai3_prediction_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Prediction Type
  prediction_type VARCHAR(100) NOT NULL, -- e.g., "skill_match", "performance_forecast"
  
  -- Accuracy Metrics
  accuracy DECIMAL(3,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
  sample_size INTEGER DEFAULT 0,
  improvements TEXT[] DEFAULT '{}',
  
  -- Timestamps
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, prediction_type)
);

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_org ON echo_ai3_prediction_accuracy(org_id);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_type ON echo_ai3_prediction_accuracy(prediction_type);

-- =====================================================
-- ENCRYPTION KEY MANAGEMENT (Optional - for key rotation)
-- =====================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Key Data
  key_id VARCHAR(100) NOT NULL,
  key_hash TEXT NOT NULL, -- Hash of the key (never store actual key)
  algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, key_id)
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_org ON encryption_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active);

-- =====================================================
-- ACCESS LOG (Audit trail for encrypted data access)
-- =====================================================
CREATE TABLE IF NOT EXISTS encrypted_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Access Details
  resource_type VARCHAR(50) NOT NULL, -- 'evaluation', 'history', etc.
  resource_id UUID NOT NULL,
  accessed_by UUID NOT NULL,
  
  -- Access Type
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'decrypt', 'export')),
  sensitive_data_accessed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (accessed_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_access_log_resource ON encrypted_data_access_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_log_user ON encrypted_data_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_access_log_date ON encrypted_data_access_log(accessed_at);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE post_event_evaluations IS 'Stores encrypted post-event employee evaluations';
COMMENT ON TABLE employee_history IS 'Stores encrypted employee history entries';
COMMENT ON TABLE echo_ai3_learning_patterns IS 'Stores AI learning patterns extracted from evaluations';
COMMENT ON TABLE echo_ai3_prediction_accuracy IS 'Tracks accuracy of AI predictions for continuous improvement';
COMMENT ON TABLE encryption_keys IS 'Manages encryption keys for data protection';
COMMENT ON TABLE encrypted_data_access_log IS 'Audit trail for access to encrypted sensitive data';
