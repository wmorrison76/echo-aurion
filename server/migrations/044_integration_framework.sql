/**
 * Integration Framework Schema
 * Provides unified integration management, credential vault, sync scheduler, and webhook framework
 */

-- =====================================================
-- INTEGRATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Integration definition
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  provider VARCHAR(100) NOT NULL, -- e.g., "square", "toast", "gusto", "sysco"
  type VARCHAR(50) NOT NULL, -- e.g., "pos", "payroll", "supplier"
  
  -- Status and configuration
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- "active", "inactive", "error"
  config JSONB NOT NULL, -- Integration-specific configuration
  credentials_id VARCHAR(255), -- Reference to credential vault
  
  -- Sync scheduling
  sync_frequency VARCHAR(50) NOT NULL DEFAULT 'hourly', -- "realtime", "hourly", "daily", "weekly", "manual"
  last_sync_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_integration UNIQUE (org_id, name)
);

CREATE INDEX idx_integrations_org ON integrations(org_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_next_sync ON integrations(next_sync_at) WHERE status = 'active';

-- =====================================================
-- INTEGRATION CREDENTIALS TABLE (Vault)
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  
  -- Credential definition
  key VARCHAR(255) NOT NULL, -- e.g., "api_key", "access_token", "secret"
  value TEXT NOT NULL, -- Encrypted credential value
  encrypted BOOLEAN DEFAULT TRUE,
  
  -- Vault provider
  provider VARCHAR(50) DEFAULT 'supabase_vault', -- "aws_secrets_manager", "hashicorp_vault", "supabase_vault"
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_integration_key UNIQUE (integration_id, key)
);

CREATE INDEX idx_integration_credentials_org ON integration_credentials(org_id);
CREATE INDEX idx_integration_credentials_integration ON integration_credentials(integration_id);

-- =====================================================
-- SYNC JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  -- Job status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- "pending", "running", "completed", "failed"
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Results
  error TEXT,
  records_processed INTEGER,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_integration ON sync_jobs(integration_id);
CREATE INDEX idx_sync_jobs_org ON sync_jobs(org_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created_at ON sync_jobs(created_at DESC);

-- =====================================================
-- INTEGRATION WEBHOOKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  
  -- Webhook definition
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- e.g., ["order.created", "payment.completed"]
  secret VARCHAR(255), -- Webhook secret for signature verification
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integration_webhooks_org ON integration_webhooks(org_id);
CREATE INDEX idx_integration_webhooks_integration ON integration_webhooks(integration_id);
CREATE INDEX idx_integration_webhooks_active ON integration_webhooks(active) WHERE active = TRUE;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY integrations_tenant_isolation ON integrations
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY integration_credentials_tenant_isolation ON integration_credentials
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY sync_jobs_tenant_isolation ON sync_jobs
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY integration_webhooks_tenant_isolation ON integration_webhooks
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
