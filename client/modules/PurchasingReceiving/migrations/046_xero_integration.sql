-- Migration 046: Xero Integration
-- Adds: OAuth token storage, export records, GL account mappings

-- ============================================================================
-- XERO OAUTH TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS xero_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX xero_oauth_tokens_org_idx ON xero_oauth_tokens (organization_id);

-- ============================================================================
-- XERO EXPORT RECORDS (Invoice export audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS xero_export_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  xero_invoice_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'error')),
  error_message TEXT,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, invoice_id)
);

CREATE INDEX xero_export_records_org_idx ON xero_export_records (organization_id, created_at DESC);
CREATE INDEX xero_export_records_status_idx ON xero_export_records (status) WHERE status IN ('pending', 'error');

-- ============================================================================
-- GL ACCOUNT XERO MAPPINGS
-- ============================================================================
ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS xero_account_code TEXT;
ALTER TABLE gl_accounts ADD COLUMN IF NOT EXISTS xero_sync_enabled BOOLEAN DEFAULT TRUE;

CREATE INDEX gl_accounts_xero_code_idx ON gl_accounts (xero_account_code) WHERE xero_account_code IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Xero OAuth Tokens RLS
ALTER TABLE xero_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY xero_oauth_tokens_org_isolation ON xero_oauth_tokens
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM auth.users WHERE auth.uid() = id)
  );

CREATE POLICY xero_oauth_tokens_insert ON xero_oauth_tokens
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM auth.users WHERE auth.uid() = id)
  );

-- Xero Export Records RLS
ALTER TABLE xero_export_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY xero_export_records_select ON xero_export_records
  FOR SELECT USING (
    organization_id IN (SELECT id FROM organizations WHERE id = organization_id)
  );

CREATE POLICY xero_export_records_insert ON xero_export_records
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT id FROM organizations WHERE id = organization_id)
  );
