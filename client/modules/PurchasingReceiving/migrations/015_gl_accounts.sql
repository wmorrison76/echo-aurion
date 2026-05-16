-- Migration 015: GL Accounts (Chart of Accounts)
-- Organization-specific GL account hierarchy for invoice posting

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- GL ACCOUNT HIERARCHY
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_account_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO gl_account_categories (code, name, account_type, description) VALUES
  ('inventory', 'Inventory Assets', 'asset', 'Inventory and supplies on hand'),
  ('payables', 'Accounts Payable', 'liability', 'Amounts owed to suppliers'),
  ('cogs', 'Cost of Goods Sold', 'expense', 'Direct costs of inventory purchased'),
  ('procurement', 'Procurement Expense', 'expense', 'Supplier-related costs'),
  ('waste', 'Waste & Disposal', 'expense', 'Food waste and spoilage costs')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- EXTEND GL_CODES TABLE (from migration 001)
-- ============================================================================
-- Already exists, just ensure organization_id support
ALTER TABLE IF EXISTS gl_codes ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS gl_codes ADD COLUMN gl_category_id UUID REFERENCES gl_account_categories(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS gl_codes ADD COLUMN parent_code_id UUID REFERENCES gl_codes(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS gl_codes ADD COLUMN account_type TEXT CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense'));
ALTER TABLE IF EXISTS gl_codes ADD COLUMN is_control_account BOOLEAN DEFAULT FALSE;

CREATE INDEX gl_codes_org_idx ON gl_codes (organization_id);
CREATE INDEX gl_codes_category_idx ON gl_codes (gl_category_id);
CREATE INDEX gl_codes_type_idx ON gl_codes (account_type);

-- ============================================================================
-- GL ACCOUNT MAPPINGS (Product/Category -> GL Code)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_account_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_category_tier1_id UUID REFERENCES product_tier1_categories(id) ON DELETE CASCADE,
  product_category_tier2_id UUID REFERENCES product_tier2_categories(id) ON DELETE CASCADE,
  gl_code_id UUID NOT NULL REFERENCES gl_codes(id) ON DELETE CASCADE,
  priority INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, product_category_tier1_id, product_category_tier2_id)
);

CREATE INDEX gl_defaults_org_idx ON gl_account_defaults (organization_id);
CREATE INDEX gl_defaults_category_idx ON gl_account_defaults (product_category_tier1_id);

-- ============================================================================
-- GL POSTING JOURNAL (Audit trail for all GL postings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_posting_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('invoice', 'credit_memo', 'payment', 'adjustment', 'allocation')),
  reference_id UUID,  -- invoice_id, credit_memo_id, etc
  reference_number TEXT,
  gl_code_id UUID NOT NULL REFERENCES gl_codes(id),
  debit_amount NUMERIC(14,4) DEFAULT 0,
  credit_amount NUMERIC(14,4) DEFAULT 0,
  post_date DATE NOT NULL,
  posting_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX gl_posting_org_idx ON gl_posting_journal (organization_id);
CREATE INDEX gl_posting_outlet_idx ON gl_posting_journal (outlet_id);
CREATE INDEX gl_posting_ref_idx ON gl_posting_journal (reference_type, reference_id);
CREATE INDEX gl_posting_code_idx ON gl_posting_journal (gl_code_id);
CREATE INDEX gl_posting_date_idx ON gl_posting_journal (post_date);

-- ============================================================================
-- GL RECONCILIATION TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  gl_code_id UUID NOT NULL REFERENCES gl_codes(id),
  reconciliation_period TEXT NOT NULL,  -- 'YYYY-MM'
  beginning_balance NUMERIC(14,4),
  total_debits NUMERIC(14,4),
  total_credits NUMERIC(14,4),
  ending_balance NUMERIC(14,4),
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  variance_amount NUMERIC(14,4),
  variance_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'variance_identified', 'variance_resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, gl_code_id, reconciliation_period)
);

CREATE INDEX gl_recon_org_code_idx ON gl_reconciliations (organization_id, gl_code_id);
CREATE INDEX gl_recon_status_idx ON gl_reconciliations (status);

-- ============================================================================
-- FUNCTION: Get default GL account for a product
-- ============================================================================
CREATE OR REPLACE FUNCTION get_gl_account_for_product(
  p_organization_id UUID,
  p_product_id UUID
)
RETURNS UUID AS $$
DECLARE
  l_gl_code_id UUID;
  l_tier1_id UUID;
  l_tier2_id UUID;
BEGIN
  -- Get product category
  SELECT tier1_id, tier2_id INTO l_tier1_id, l_tier2_id
  FROM products
  WHERE id = p_product_id;
  
  -- Try exact match (both tier1 and tier2)
  SELECT gl_code_id INTO l_gl_code_id
  FROM gl_account_defaults
  WHERE organization_id = p_organization_id
    AND product_category_tier1_id = l_tier1_id
    AND product_category_tier2_id = l_tier2_id
  ORDER BY priority ASC
  LIMIT 1;
  
  IF l_gl_code_id IS NOT NULL THEN
    RETURN l_gl_code_id;
  END IF;
  
  -- Fall back to tier1 only
  SELECT gl_code_id INTO l_gl_code_id
  FROM gl_account_defaults
  WHERE organization_id = p_organization_id
    AND product_category_tier1_id = l_tier1_id
    AND product_category_tier2_id IS NULL
  ORDER BY priority ASC
  LIMIT 1;
  
  RETURN l_gl_code_id;
END
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- MULTI-CURRENCY GL TRACKING (For organizations with multi-currency)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gl_posting_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gl_posting_id UUID NOT NULL REFERENCES gl_posting_journal(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,  -- 'USD', 'CAD', 'MXN', etc
  exchange_rate NUMERIC(12,6),
  original_debit_amount NUMERIC(14,4) DEFAULT 0,
  original_credit_amount NUMERIC(14,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX gl_posting_curr_idx ON gl_posting_currencies (gl_posting_id);
