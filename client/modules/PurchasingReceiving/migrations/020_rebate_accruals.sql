-- Migration 020: Rebate Accruals & Distribution
-- Tracks volume rebates, accrual calculation, and distribution to outlets

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- REBATE ACCRUAL TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS rebate_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contract_rebate_id UUID REFERENCES contract_rebates(id) ON DELETE SET NULL,
  accrual_period TEXT NOT NULL,  -- 'YYYY-Q1', 'YYYY-Q2', 'YYYY', 'YYYY-MM'
  accrual_start_date DATE NOT NULL,
  accrual_end_date DATE NOT NULL,
  spending_category TEXT,
  purchases_count INT DEFAULT 0,
  total_purchase_amount NUMERIC(14,2) DEFAULT 0,
  rebate_percent NUMERIC(5,2),
  rebate_amount NUMERIC(14,2) DEFAULT 0,
  rebate_payment_method TEXT CHECK (rebate_payment_method IN ('credit_memo', 'check', 'deduction', 'invoice_credit')),
  payment_status TEXT DEFAULT 'accrued' CHECK (payment_status IN ('accrued', 'claimed', 'pending_approval', 'paid', 'disputed')),
  claim_submitted_date TIMESTAMPTZ,
  claim_submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rebate_paid_date DATE,
  rebate_paid_amount NUMERIC(14,2),
  paid_by_check_number TEXT,
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id, accrual_period, spending_category)
);

CREATE INDEX rebate_accrual_org_supplier_idx ON rebate_accruals (organization_id, supplier_id);
CREATE INDEX rebate_accrual_period_idx ON rebate_accruals (accrual_period);
CREATE INDEX rebate_accrual_status_idx ON rebate_accruals (payment_status);
CREATE INDEX rebate_accrual_dates_idx ON rebate_accruals (accrual_start_date, accrual_end_date);

-- ============================================================================
-- REBATE ACCRUAL DETAIL LINES
-- Detailed breakdown of purchases that contributed to rebate
-- ============================================================================
CREATE TABLE IF NOT EXISTS rebate_accrual_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rebate_accrual_id UUID NOT NULL REFERENCES rebate_accruals(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category_tier1_id UUID REFERENCES product_tier1_categories(id),
  purchase_amount NUMERIC(14,4),
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rebate_lines_accrual_idx ON rebate_accrual_lines (rebate_accrual_id);
CREATE INDEX rebate_lines_invoice_idx ON rebate_accrual_lines (invoice_id);

-- ============================================================================
-- REBATE DISTRIBUTION (How accrued rebates are distributed to outlets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rebate_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rebate_accrual_id UUID NOT NULL REFERENCES rebate_accruals(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  allocation_basis TEXT DEFAULT 'purchase_volume',  -- 'equal', 'purchase_volume', 'custom'
  allocated_amount NUMERIC(14,2) NOT NULL,
  allocated_percent NUMERIC(5,2),
  distribution_date DATE,
  distribution_method TEXT CHECK (distribution_method IN ('direct_credit', 'outlet_credit', 'check', 'payment_deduction')),
  status TEXT DEFAULT 'allocated' CHECK (status IN ('allocated', 'distributed', 'recorded')),
  recorded_to_outlet_gl BOOLEAN DEFAULT FALSE,
  gl_posting_id UUID REFERENCES gl_posting_journal(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rebate_accrual_id, outlet_id)
);

CREATE INDEX rebate_dist_accrual_idx ON rebate_distributions (rebate_accrual_id);
CREATE INDEX rebate_dist_outlet_idx ON rebate_distributions (outlet_id);

-- ============================================================================
-- REBATE CLAIMS (For suppliers with manual claim process)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rebate_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL UNIQUE,
  accrual_period TEXT NOT NULL,
  claimed_amount NUMERIC(14,2) NOT NULL,
  supporting_documentation_url TEXT,
  submitted_date TIMESTAMPTZ DEFAULT now(),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approval_date TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_notes TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  rejection_reason TEXT,
  payment_date DATE,
  actual_paid_amount NUMERIC(14,2),
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rebate_claims_org_supplier_idx ON rebate_claims (organization_id, supplier_id);
CREATE INDEX rebate_claims_status_idx ON rebate_claims (status);
CREATE INDEX rebate_claims_period_idx ON rebate_claims (accrual_period);

-- ============================================================================
-- REBATE RECONCILIATION (Verify accrued vs paid)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rebate_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reconciliation_period TEXT NOT NULL,  -- 'YYYY-MM' or 'YYYY-Q'
  total_accrued NUMERIC(14,2),
  total_claimed NUMERIC(14,2),
  total_paid NUMERIC(14,2),
  variance_amount NUMERIC(14,2),
  variance_percent NUMERIC(5,2),
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'variance_identified', 'dispute')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id, reconciliation_period)
);

CREATE INDEX rebate_recon_org_supplier_idx ON rebate_reconciliations (organization_id, supplier_id);

-- ============================================================================
-- FUNCTION: Calculate rebate accrual for a period
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_rebate_accrual(
  p_organization_id UUID,
  p_supplier_id UUID,
  p_accrual_period TEXT  -- 'YYYY-Q1', 'YYYY-MM', or 'YYYY'
)
RETURNS UUID AS $$
DECLARE
  l_accrual_id UUID;
  l_start_date DATE;
  l_end_date DATE;
  l_total_spent NUMERIC;
  l_rebate_amount NUMERIC;
  l_rebate_record RECORD;
BEGIN
  -- Parse period to dates
  IF p_accrual_period ~ '^\d{4}-Q[1-4]$' THEN
    l_start_date := to_date(SPLIT_PART(p_accrual_period, '-', 1) || '-' || 
      CASE SPLIT_PART(p_accrual_period, 'Q', 2) 
        WHEN '1' THEN '01-01'
        WHEN '2' THEN '04-01'
        WHEN '3' THEN '07-01'
        WHEN '4' THEN '10-01'
      END, 'YYYY-MM-DD');
    l_end_date := l_start_date + INTERVAL '3 months' - INTERVAL '1 day';
  ELSIF p_accrual_period ~ '^\d{4}-\d{2}$' THEN
    l_start_date := (p_accrual_period || '-01')::DATE;
    l_end_date := l_start_date + INTERVAL '1 month' - INTERVAL '1 day';
  ELSIF p_accrual_period ~ '^\d{4}$' THEN
    l_start_date := (p_accrual_period || '-01-01')::DATE;
    l_end_date := (p_accrual_period || '-12-31')::DATE;
  ELSE
    RAISE EXCEPTION 'Invalid accrual period format: %', p_accrual_period;
  END IF;
  
  -- Calculate total spending
  SELECT COALESCE(SUM(i.total), 0) INTO l_total_spent
  FROM invoices i
  WHERE i.organization_id = p_organization_id
    AND i.vendor_id = p_supplier_id
    AND i.invoice_date BETWEEN l_start_date AND l_end_date
    AND i.status != 'error';
  
  -- Get rebate rules for this supplier/period
  FOR l_rebate_record IN
    SELECT cr.id, cr.rebate_type, cr.rebate_percent, cr.rebate_amount, cr.min_annual_spend
    FROM contract_rebates cr
    JOIN supplier_contracts sc ON cr.contract_id = sc.id
    WHERE sc.organization_id = p_organization_id
      AND sc.supplier_id = p_supplier_id
      AND cr.effective_from <= CURRENT_DATE
      AND (cr.effective_to IS NULL OR cr.effective_to >= CURRENT_DATE)
  LOOP
    -- Check if rebate is applicable
    IF l_rebate_record.min_annual_spend IS NULL OR l_total_spent >= l_rebate_record.min_annual_spend THEN
      IF l_rebate_record.rebate_percent IS NOT NULL THEN
        l_rebate_amount := (l_total_spent * l_rebate_record.rebate_percent) / 100;
      ELSE
        l_rebate_amount := l_rebate_record.rebate_amount;
      END IF;
      
      -- Create accrual record
      INSERT INTO rebate_accruals (
        organization_id,
        supplier_id,
        contract_rebate_id,
        accrual_period,
        accrual_start_date,
        accrual_end_date,
        total_purchase_amount,
        rebate_percent,
        rebate_amount
      ) VALUES (
        p_organization_id,
        p_supplier_id,
        l_rebate_record.id,
        p_accrual_period,
        l_start_date,
        l_end_date,
        l_total_spent,
        l_rebate_record.rebate_percent,
        l_rebate_amount
      )
      ON CONFLICT (organization_id, supplier_id, accrual_period, spending_category)
      DO UPDATE SET
        total_purchase_amount = EXCLUDED.total_purchase_amount,
        rebate_amount = EXCLUDED.rebate_amount,
        updated_at = now()
      RETURNING l_accrual_id = id;
    END IF;
  END LOOP;
  
  RETURN l_accrual_id;
END
$$ LANGUAGE plpgsql;
