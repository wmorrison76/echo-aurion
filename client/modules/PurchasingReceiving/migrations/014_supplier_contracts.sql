-- Migration 014: Supplier Contracts & Pricing Management
-- Master contracts with volume tiers, rebate rules, GL code mappings per line item

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SUPPLIER CONTRACTS (Master agreement level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  outlet_group_id UUID REFERENCES outlet_groups(id) ON DELETE SET NULL,  -- NULL = org-wide
  contract_type TEXT DEFAULT 'supply' CHECK (contract_type IN ('supply', 'service', 'exclusive')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'suspended', 'terminated')),
  payment_terms TEXT,  -- 'net_30', 'net_60', 'cod', etc
  primary_contact_email TEXT,
  notes TEXT,
  contract_document_url TEXT,
  auto_renewal BOOLEAN DEFAULT FALSE,
  renewal_days_before INT DEFAULT 60,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, contract_number)
);

CREATE INDEX contracts_org_supplier_idx ON supplier_contracts (organization_id, supplier_id);
CREATE INDEX contracts_status_idx ON supplier_contracts (status);
CREATE INDEX contracts_dates_idx ON supplier_contracts (start_date, end_date);

-- ============================================================================
-- CONTRACT VOLUME PRICING TIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_volume_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_tier1_id UUID REFERENCES product_tier1_categories(id) ON DELETE CASCADE,
  category_tier2_id UUID REFERENCES product_tier2_categories(id) ON DELETE CASCADE,
  min_volume NUMERIC(14,4) NOT NULL,
  max_volume NUMERIC(14,4),
  volume_unit TEXT,  -- 'cases', 'lbs', 'units', 'dollars'
  unit_price NUMERIC(12,4),
  discount_percent NUMERIC(5,2),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, product_id, min_volume, effective_from)
);

CREATE INDEX tier_contract_idx ON contract_volume_tiers (contract_id);
CREATE INDEX tier_dates_idx ON contract_volume_tiers (effective_from, effective_to);

-- ============================================================================
-- CONTRACT REBATE RULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_rebates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  rebate_type TEXT CHECK (rebate_type IN ('volume', 'tiered', 'category', 'annual', 'lump_sum')),
  category_tier1_id UUID REFERENCES product_tier1_categories(id) ON DELETE CASCADE,
  min_annual_spend NUMERIC(14,2),
  rebate_percent NUMERIC(5,2),
  rebate_amount NUMERIC(14,2),
  payment_frequency TEXT CHECK (payment_frequency IN ('quarterly', 'semi_annual', 'annual')),
  accrual_method TEXT DEFAULT 'automatic',  -- 'automatic' or 'manual_claim'
  claim_deadline_days INT,  -- Days after end of period to claim rebate
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, rebate_type, category_tier1_id, effective_from)
);

CREATE INDEX rebates_contract_idx ON contract_rebates (contract_id);
CREATE INDEX rebates_dates_idx ON contract_rebates (effective_from, effective_to);

-- ============================================================================
-- CONTRACT GL CODE MAPPINGS
-- Maps supplier products/categories to GL accounts for proper accounting
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_gl_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_tier1_id UUID REFERENCES product_tier1_categories(id) ON DELETE CASCADE,
  category_tier2_id UUID REFERENCES product_tier2_categories(id) ON DELETE CASCADE,
  gl_code_id UUID NOT NULL REFERENCES gl_codes(id),
  default_mapping BOOLEAN DEFAULT TRUE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, product_id, gl_code_id, effective_from)
);

CREATE INDEX gl_mappings_contract_idx ON contract_gl_mappings (contract_id);
CREATE INDEX gl_mappings_gl_idx ON contract_gl_mappings (gl_code_id);

-- ============================================================================
-- PROMOTIONAL PRICING (Temporary prices during promotions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotional_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  promotion_name TEXT,
  promotional_price NUMERIC(12,4),
  regular_price NUMERIC(12,4),
  discount_percent NUMERIC(5,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  min_order_qty NUMERIC(14,4),
  max_usage_qty NUMERIC(14,4),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, product_id, start_date, end_date)
);

CREATE INDEX promos_contract_idx ON promotional_pricing (contract_id);
CREATE INDEX promos_dates_idx ON promotional_pricing (start_date, end_date);
CREATE INDEX promos_status_idx ON promotional_pricing (status);

-- ============================================================================
-- FUNCTION: Get applicable price for a product on a contract
-- ============================================================================
CREATE OR REPLACE FUNCTION get_contract_price(
  p_contract_id UUID,
  p_product_id UUID,
  p_volume NUMERIC DEFAULT 1
)
RETURNS NUMERIC AS $$
DECLARE
  l_price NUMERIC;
BEGIN
  -- Check for active promotional pricing first
  SELECT promotional_price INTO l_price
  FROM promotional_pricing
  WHERE contract_id = p_contract_id
    AND product_id = p_product_id
    AND CURRENT_DATE BETWEEN start_date AND end_date
    AND status = 'active'
    AND (max_usage_qty IS NULL OR p_volume <= max_usage_qty)
  LIMIT 1;
  
  IF l_price IS NOT NULL THEN
    RETURN l_price;
  END IF;
  
  -- Fall back to volume tier pricing
  SELECT unit_price INTO l_price
  FROM contract_volume_tiers
  WHERE contract_id = p_contract_id
    AND product_id = p_product_id
    AND p_volume >= min_volume
    AND (max_volume IS NULL OR p_volume <= max_volume)
    AND CURRENT_DATE BETWEEN effective_from AND COALESCE(effective_to, CURRENT_DATE)
  ORDER BY min_volume DESC
  LIMIT 1;
  
  RETURN COALESCE(l_price, 0);
END
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- CONTRACT RENEWAL TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  renewal_number INT,
  old_end_date DATE,
  new_end_date DATE,
  renewal_initiated_date DATE,
  renewal_approved_date DATE,
  renewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contract_id, renewal_number)
);

-- ============================================================================
-- FUNCTION: Check contracts due for renewal
-- ============================================================================
CREATE OR REPLACE FUNCTION get_contracts_due_for_renewal(
  p_organization_id UUID,
  p_days_notice INT DEFAULT 60
)
RETURNS TABLE (
  contract_id UUID,
  supplier_name TEXT,
  contract_number TEXT,
  current_end_date DATE,
  days_until_renewal_due INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    v.name,
    sc.contract_number,
    sc.end_date,
    (sc.end_date - CURRENT_DATE - p_days_notice)::INT
  FROM supplier_contracts sc
  JOIN vendors v ON sc.supplier_id = v.id
  WHERE sc.organization_id = p_organization_id
    AND sc.status = 'active'
    AND sc.auto_renewal = TRUE
    AND sc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_days_notice || ' days')::INTERVAL
  ORDER BY sc.end_date ASC;
END
$$ LANGUAGE plpgsql STABLE;
