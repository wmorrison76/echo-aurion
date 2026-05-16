-- Migration 022: Row-Level Security (RLS) Policies
-- Ensures users only see data from their organization and have appropriate access levels

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE product_tier1_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tier2_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tier3_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_audit_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_audit_findings ENABLE ROW LEVEL SECURITY;

ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_volume_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_rebates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_gl_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewal_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE gl_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_account_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_account_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_posting_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_posting_currencies ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_approval_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_communication_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE asn_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE asn_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE rfq_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_supplier_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_response_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_evaluation_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_evaluation_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE rebate_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_accrual_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebate_reconciliations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user's organizations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (organization_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id, om.role
  FROM org_memberships om
  WHERE om.user_id = p_user_id;
END
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ORGANIZATIONS: Users see only their organizations
-- ============================================================================

CREATE POLICY org_select_policy ON organizations
  FOR SELECT
  USING (
    id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY org_insert_policy ON organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); -- Admin creation only

CREATE POLICY org_update_policy ON organizations
  FOR UPDATE
  USING (
    id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
    AND (SELECT role FROM get_user_organizations(auth.uid()) WHERE organization_id = organizations.id LIMIT 1) IN ('owner', 'admin')
  );

-- ============================================================================
-- OUTLETS: Users see outlets from their organizations
-- ============================================================================

CREATE POLICY outlets_select_policy ON outlets
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY outlets_insert_policy ON outlets
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
    AND (SELECT role FROM get_user_organizations(auth.uid()) WHERE organization_id = outlets.organization_id LIMIT 1) IN ('owner', 'admin')
  );

CREATE POLICY outlets_update_policy ON outlets
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
    AND (SELECT role FROM get_user_organizations(auth.uid()) WHERE organization_id = outlets.organization_id LIMIT 1) IN ('owner', 'admin', 'manager')
  );

-- ============================================================================
-- OUTLET_GROUPS: Users see groups in their organizations
-- ============================================================================

CREATE POLICY outlet_groups_select_policy ON outlet_groups
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY outlet_groups_insert_policy ON outlet_groups
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- VENDORS (Suppliers): Users see vendors from their organizations
-- ============================================================================

CREATE POLICY vendors_select_policy ON vendors
  FOR SELECT
  USING (
    organization_id IS NULL  -- Global vendors
    OR organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY vendors_insert_policy ON vendors
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- APPROVED_SUPPLIERS: Users see ASL from their organizations
-- ============================================================================

CREATE POLICY asl_select_policy ON approved_suppliers
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY asl_insert_policy ON approved_suppliers
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- PRODUCTS: Users see products (global + org-specific)
-- ============================================================================

CREATE POLICY products_select_policy ON products
  FOR SELECT
  USING (
    organization_id IS NULL  -- Global products
    OR organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- PURCHASE_ORDERS: Users see POs from their organization and outlets
-- ============================================================================

CREATE POLICY po_select_policy ON purchase_orders
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY po_insert_policy ON purchase_orders
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY po_update_policy ON purchase_orders
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- INVOICES: Users see invoices from their organization
-- ============================================================================

CREATE POLICY invoices_select_policy ON invoices
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY invoices_insert_policy ON invoices
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- GL_POSTING_JOURNAL: Users see GL postings from their organization
-- ============================================================================

CREATE POLICY gl_posting_select_policy ON gl_posting_journal
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY gl_posting_insert_policy ON gl_posting_journal
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- RFQ: Users see RFQs from their organization
-- ============================================================================

CREATE POLICY rfq_select_policy ON rfq_headers
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY rfq_insert_policy ON rfq_headers
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- REBATES: Users see rebates from their organization
-- ============================================================================

CREATE POLICY rebate_accrual_select_policy ON rebate_accruals
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY rebate_accrual_insert_policy ON rebate_accruals
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- AUDIT LOG: Users can insert audit entries for their org
-- ============================================================================

CREATE POLICY audit_log_insert_policy ON organization_audit_log
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

CREATE POLICY audit_log_select_policy ON organization_audit_log
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
    AND (SELECT role FROM get_user_organizations(auth.uid()) WHERE organization_id = organization_audit_log.organization_id LIMIT 1) IN ('owner', 'admin')
  );

-- ============================================================================
-- MEMBERSHIPS: Users can see memberships for their organizations
-- ============================================================================

CREATE POLICY org_memberships_select_policy ON org_memberships
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM get_user_organizations(auth.uid()))
  );

-- ============================================================================
-- NOTE: Role-based access control (finance vs manager vs viewer) is handled
-- in application logic, not in RLS policies, as it's complex and performant in app
-- ============================================================================
