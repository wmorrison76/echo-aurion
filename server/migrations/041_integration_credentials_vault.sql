-- Migration: Integration Credentials Vault
-- Purpose: Centralized credential storage for all integrations (POS, payment, HR, etc.)
-- Date: 2025-01-16
-- Addresses: LUCCCA OS Grade Evaluation - Integration Framework (TODO-027)

-- ============================================================================
-- INTEGRATION CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_credentials (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  integration_type TEXT NOT NULL, -- 'pos', 'payment', 'hr', 'calendar', etc.
  integration_provider TEXT NOT NULL, -- 'toast', 'square', 'rippling', etc.
  credential_key TEXT NOT NULL, -- 'api_key', 'client_secret', 'access_token', etc.
  credential_value_encrypted TEXT NOT NULL, -- Encrypted credential value
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(tenant_id, integration_type, integration_provider, credential_key),
  
  INDEX idx_credentials_tenant (tenant_id),
  INDEX idx_credentials_integration (tenant_id, integration_type, integration_provider),
  INDEX idx_credentials_expires (expires_at) WHERE expires_at IS NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY integration_credentials_tenant_isolation ON integration_credentials
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));
