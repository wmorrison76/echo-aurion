/**
 * Feature Flags Schema
 * Enables runtime feature toggling without deployment
 */

-- =====================================================
-- FEATURE FLAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flag definition
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status and targeting
  status VARCHAR(50) NOT NULL DEFAULT 'disabled', -- "enabled", "disabled", "experiment"
  target_type VARCHAR(50) NOT NULL DEFAULT 'all', -- "all", "percentage", "org_ids", "user_ids", "experiment"
  target_config JSONB, -- { percentage: 50, orgIds: [...], userIds: [...] }
  
  -- Time-based flags
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_status ON feature_flags(status);
CREATE INDEX idx_feature_flags_active ON feature_flags(status, start_date, end_date);

-- =====================================================
-- FEATURE FLAG EVALUATIONS TABLE (Analytics)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flag reference
  flag_name VARCHAR(255) NOT NULL REFERENCES feature_flags(name) ON DELETE CASCADE,
  
  -- Context
  org_id UUID,
  user_id UUID,
  
  -- Result
  enabled BOOLEAN NOT NULL,
  
  -- Timestamp
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feature_flag_evaluations_flag ON feature_flag_evaluations(flag_name);
CREATE INDEX idx_feature_flag_evaluations_org ON feature_flag_evaluations(org_id);
CREATE INDEX idx_feature_flag_evaluations_user ON feature_flag_evaluations(user_id);
CREATE INDEX idx_feature_flag_evaluations_evaluated ON feature_flag_evaluations(evaluated_at DESC);

-- =====================================================
-- APPLIED MIGRATIONS TABLE (for rollback tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS applied_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Migration info
  name VARCHAR(255) NOT NULL UNIQUE,
  version VARCHAR(50) NOT NULL,
  checksum VARCHAR(64) NOT NULL, -- SHA256 hash of migration file
  
  -- Rollback
  rollback_script TEXT,
  
  -- Metadata
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_applied_migrations_name ON applied_migrations(name);
CREATE INDEX idx_applied_migrations_applied_at ON applied_migrations(applied_at DESC);

-- =====================================================
-- MIGRATION ROLLBACKS TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Migration reference
  migration_name VARCHAR(255) NOT NULL,
  migration_version VARCHAR(50) NOT NULL,
  
  -- Rollback info
  rolled_back_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rolled_back_by VARCHAR(255) NOT NULL,
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT
);

CREATE INDEX idx_migration_rollbacks_migration ON migration_rollbacks(migration_name);
CREATE INDEX idx_migration_rollbacks_rolled_back_at ON migration_rollbacks(rolled_back_at DESC);
