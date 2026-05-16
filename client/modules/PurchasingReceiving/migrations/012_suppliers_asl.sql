-- Migration 012: Suppliers Extended & Approved Supplier List (ASL)
-- ASL enforces which suppliers can supply which products to which outlets
-- Critical for group purchasing governance and cost control

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- EXTEND VENDORS TABLE (Suppliers)
-- ============================================================================
ALTER TABLE IF EXISTS vendors ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS vendors ADD COLUMN supplier_type TEXT CHECK (supplier_type IN ('distributor', 'specialty', 'importer', 'manufacturer', 'cash_carry'));
ALTER TABLE IF EXISTS vendors ADD COLUMN primary_region TEXT;  -- 'Northeast', 'Southwest', etc
ALTER TABLE IF EXISTS vendors ADD COLUMN coverage_regions TEXT[];  -- Array of regions they serve
ALTER TABLE IF EXISTS vendors ADD COLUMN min_order_value NUMERIC(12,2);
ALTER TABLE IF EXISTS vendors ADD COLUMN lead_time_days INT;
ALTER TABLE IF EXISTS vendors ADD COLUMN order_frequency TEXT DEFAULT 'daily';  -- 'daily', '3x_weekly', 'weekly', 'biweekly'
ALTER TABLE IF EXISTS vendors ADD COLUMN edi_vendor_id TEXT;  -- Trading partner ID for EDI
ALTER TABLE IF EXISTS vendors ADD COLUMN edi_test_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS vendors ADD COLUMN api_endpoint TEXT;
ALTER TABLE IF EXISTS vendors ADD COLUMN api_auth_type TEXT CHECK (api_auth_type IN ('oauth2', 'api_key', 'basic', 'none'));
ALTER TABLE IF EXISTS vendors ADD COLUMN punchout_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS vendors ADD COLUMN punchout_url TEXT;
ALTER TABLE IF EXISTS vendors ADD COLUMN risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high'));
ALTER TABLE IF EXISTS vendors ADD COLUMN compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'verified', 'at_risk', 'restricted'));
ALTER TABLE IF EXISTS vendors ADD COLUMN notes JSONB DEFAULT '{}'::JSONB;

CREATE INDEX vendors_org_idx ON vendors (organization_id);
CREATE INDEX vendors_region_idx ON vendors (primary_region);
CREATE INDEX vendors_supplier_type_idx ON vendors (supplier_type);
CREATE INDEX vendors_compliance_idx ON vendors (compliance_status);

-- ============================================================================
-- APPROVED SUPPLIER LIST (ASL)
-- Controls which suppliers can supply specific products/categories to specific outlets/regions
-- ============================================================================
CREATE TABLE IF NOT EXISTS approved_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  outlet_group_id UUID REFERENCES outlet_groups(id) ON DELETE CASCADE,  -- If NULL, applies org-wide
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,             -- If NULL, applies to group/org
  category_tier1_id UUID REFERENCES product_tier1_categories(id) ON DELETE CASCADE,  -- If NULL, supplier approved for all categories
  category_tier2_id UUID REFERENCES product_tier2_categories(id) ON DELETE CASCADE,
  category_tier3_id UUID REFERENCES product_tier3_categories(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review', 'suspended')),
  approval_date DATE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason_suspended TEXT,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  priority INT DEFAULT 100,  -- Lower number = higher priority (supplier preference order)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX asl_org_idx ON approved_suppliers (organization_id);
CREATE INDEX asl_supplier_idx ON approved_suppliers (supplier_id);
CREATE INDEX asl_outlet_group_idx ON approved_suppliers (outlet_group_id);
CREATE INDEX asl_outlet_idx ON approved_suppliers (outlet_id);
CREATE INDEX asl_category_idx ON approved_suppliers (category_tier1_id, category_tier2_id);
CREATE INDEX asl_status_idx ON approved_suppliers (status);

-- ============================================================================
-- FUNCTION: Get applicable suppliers for an outlet + category
-- Used in ordering portal to filter available suppliers
-- ============================================================================
CREATE OR REPLACE FUNCTION get_applicable_suppliers(
  p_outlet_id UUID,
  p_category_tier1_id UUID DEFAULT NULL,
  p_category_tier2_id UUID DEFAULT NULL
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  priority INT,
  min_order_value NUMERIC,
  lead_time_days INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    v.id,
    v.name,
    COALESCE(asl.priority, 100),
    v.min_order_value,
    v.lead_time_days
  FROM approved_suppliers asl
  JOIN vendors v ON asl.supplier_id = v.id
  WHERE
    asl.outlet_id = p_outlet_id
    AND asl.status = 'active'
    AND CURRENT_DATE BETWEEN COALESCE(asl.effective_from, CURRENT_DATE) AND COALESCE(asl.effective_to, CURRENT_DATE)
    AND (p_category_tier1_id IS NULL OR asl.category_tier1_id = p_category_tier1_id)
    AND (p_category_tier2_id IS NULL OR asl.category_tier2_id = p_category_tier2_id)
  ORDER BY COALESCE(asl.priority, 100) ASC, v.name ASC;
END
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SUPPLIER CONTACT & DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('order', 'billing', 'technical', 'account_manager', 'dispute')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX supplier_contacts_supplier_idx ON supplier_contacts (supplier_id);
CREATE INDEX supplier_contacts_type_idx ON supplier_contacts (contact_type);

-- ============================================================================
-- SUPPLIER PERFORMANCE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  orders_received INT DEFAULT 0,
  on_time_count INT DEFAULT 0,
  quality_issues_count INT DEFAULT 0,
  variance_count INT DEFAULT 0,
  avg_price_variance_percent NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id, metric_date)
);

CREATE INDEX supplier_perf_org_supplier_idx ON supplier_performance_metrics (organization_id, supplier_id);
CREATE INDEX supplier_perf_date_idx ON supplier_performance_metrics (metric_date);

-- ============================================================================
-- SUPPLIER SCORE (Calculated view)
-- ============================================================================
CREATE OR REPLACE VIEW supplier_scores AS
SELECT
  spm.organization_id,
  spm.supplier_id,
  v.name as supplier_name,
  AVG(CASE WHEN spm.orders_received > 0 THEN (spm.on_time_count::NUMERIC / spm.orders_received) * 100 ELSE 100 END) as on_time_percent,
  AVG(CASE WHEN spm.orders_received > 0 THEN ((spm.orders_received - spm.quality_issues_count)::NUMERIC / spm.orders_received) * 100 ELSE 100 END) as quality_percent,
  AVG(ABS(COALESCE(spm.avg_price_variance_percent, 0))) as avg_price_variance,
  (AVG(CASE WHEN spm.orders_received > 0 THEN (spm.on_time_count::NUMERIC / spm.orders_received) * 100 ELSE 100 END) * 0.4 +
   AVG(CASE WHEN spm.orders_received > 0 THEN ((spm.orders_received - spm.quality_issues_count)::NUMERIC / spm.orders_received) * 100 ELSE 100 END) * 0.4 +
   (100 - AVG(ABS(COALESCE(spm.avg_price_variance_percent, 0)))) * 0.2) as overall_score
FROM supplier_performance_metrics spm
JOIN vendors v ON spm.supplier_id = v.id
WHERE spm.metric_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY spm.organization_id, spm.supplier_id, v.name;
