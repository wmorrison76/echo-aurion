-- Migration 018: Extended Invoices for 3-Way Matching
-- Enhanced invoice tracking with PO/ASN matching, variance detection, payment status

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- EXTEND INVOICES TABLE (from migration 001)
-- ============================================================================
ALTER TABLE IF EXISTS invoices ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS invoices ADD COLUMN outlet_group_id UUID REFERENCES outlet_groups(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoices ADD COLUMN asn_id UUID REFERENCES asn_headers(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoices ADD COLUMN receiving_transaction_id UUID REFERENCES receiving_transactions(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoices ADD COLUMN invoice_type TEXT DEFAULT 'purchase' CHECK (invoice_type IN ('purchase', 'credit_memo', 'return', 'adjustment'));
ALTER TABLE IF EXISTS invoices ADD COLUMN due_date DATE;
ALTER TABLE IF EXISTS invoices ADD COLUMN payment_due_days INT;
ALTER TABLE IF EXISTS invoices ADD COLUMN three_way_match_status TEXT DEFAULT 'pending' CHECK (three_way_match_status IN ('pending', 'po_pending', 'asn_pending', 'matched', 'variance', 'dispute'));
ALTER TABLE IF EXISTS invoices ADD COLUMN variance_identified BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS invoices ADD COLUMN variance_notes JSONB;
ALTER TABLE IF EXISTS invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'disputed', 'cancelled'));
ALTER TABLE IF EXISTS invoices ADD COLUMN payment_method TEXT CHECK (payment_method IN ('check', 'ach', 'eft', 'credit_card', 'wire'));
ALTER TABLE IF EXISTS invoices ADD COLUMN payment_date DATE;
ALTER TABLE IF EXISTS invoices ADD COLUMN paid_amount NUMERIC(14,4);
ALTER TABLE IF EXISTS invoices ADD COLUMN discount_taken NUMERIC(14,4) DEFAULT 0;  -- Early payment discount
ALTER TABLE IF EXISTS invoices ADD COLUMN gl_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS invoices ADD COLUMN gl_posted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS invoices ADD COLUMN match_quality_score NUMERIC(5,2);  -- 0-100, % of line items matched

CREATE INDEX invoices_org_idx ON invoices (organization_id);
CREATE INDEX invoices_po_idx ON invoices (po_id);
CREATE INDEX invoices_asn_idx ON invoices (asn_id);
CREATE INDEX invoices_3way_idx ON invoices (three_way_match_status);
CREATE INDEX invoices_payment_idx ON invoices (payment_status);
CREATE INDEX invoices_gl_idx ON invoices (gl_posted);

-- ============================================================================
-- EXTEND INVOICE_LINES (from migration 001)
-- ============================================================================
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN po_line_id UUID REFERENCES purchase_order_lines(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN asn_line_id UUID REFERENCES asn_line_items(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN receiving_line_id UUID REFERENCES receiving_line_items(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN qty_invoiced NUMERIC(14,4);
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN unit_price_invoiced NUMERIC(12,4);
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN line_total NUMERIC(14,4);
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN qty_variance NUMERIC(14,4);  -- qty_invoiced - qty_ordered
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN price_variance NUMERIC(12,4);  -- unit_price_invoiced - contracted_price
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN variance_percent NUMERIC(5,2);
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN variance_type TEXT;  -- 'qty_only', 'price_only', 'both'
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN line_match_status TEXT DEFAULT 'unmatched' CHECK (line_match_status IN ('unmatched', 'matched', 'variance', 'disputed'));
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN matched_to_po_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN matched_to_asn_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN gl_code_id UUID REFERENCES gl_codes(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS invoice_lines ADD COLUMN notes TEXT;

CREATE INDEX inv_lines_po_idx ON invoice_lines (po_line_id);
CREATE INDEX inv_lines_asn_idx ON invoice_lines (asn_line_id);
CREATE INDEX inv_lines_match_idx ON invoice_lines (line_match_status);

-- ============================================================================
-- INVOICE VARIANCE DETAIL
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE CASCADE,
  variance_type TEXT NOT NULL CHECK (variance_type IN ('quantity', 'price', 'line_item_missing', 'duplicate_line', 'other')),
  po_value NUMERIC(14,4),
  invoice_value NUMERIC(14,4),
  variance_amount NUMERIC(14,4),
  variance_percent NUMERIC(5,2),
  severity TEXT CHECK (severity IN ('minor', 'major', 'critical')),  -- minor < 2%, major 2-5%, critical > 5%
  description TEXT NOT NULL,
  root_cause TEXT,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'disputed', 'resolved', 'write_off')),
  dispute_raised_at TIMESTAMPTZ,
  dispute_raised_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX inv_var_invoice_idx ON invoice_variances (invoice_id);
CREATE INDEX inv_var_status_idx ON invoice_variances (status);
CREATE INDEX inv_var_amount_idx ON invoice_variances (variance_amount);

-- ============================================================================
-- PAYMENT TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount NUMERIC(14,4) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,  -- Check #, ACH ID, etc
  discount_taken NUMERIC(14,4) DEFAULT 0,
  remaining_balance NUMERIC(14,4),
  posted_to_accounting BOOLEAN DEFAULT FALSE,
  accounting_post_date TIMESTAMPTZ,
  gl_posting_id UUID REFERENCES gl_posting_journal(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX payments_invoice_idx ON invoice_payments (invoice_id);
CREATE INDEX payments_date_idx ON invoice_payments (payment_date);

-- ============================================================================
-- FUNCTION: Auto-match invoice to PO and ASN
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_match_invoice_to_po_asn(
  p_invoice_id UUID
)
RETURNS TABLE (
  matched_po_id UUID,
  matched_asn_id UUID,
  match_quality NUMERIC
) AS $$
DECLARE
  l_po_id UUID;
  l_asn_id UUID;
  l_vendor_id UUID;
  l_matched_lines INT;
  l_total_lines INT;
  l_quality NUMERIC;
BEGIN
  -- Get invoice vendor and PO
  SELECT po_id, vendor_id INTO l_po_id, l_vendor_id
  FROM invoices
  WHERE id = p_invoice_id;
  
  -- Get associated ASN
  SELECT id INTO l_asn_id
  FROM asn_headers
  WHERE po_id = l_po_id
  LIMIT 1;
  
  -- Count matched lines
  SELECT COUNT(*) INTO l_matched_lines
  FROM invoice_lines il
  JOIN purchase_order_lines pol ON il.po_line_id = pol.id
  WHERE il.invoice_id = p_invoice_id;
  
  SELECT COUNT(*) INTO l_total_lines
  FROM invoice_lines
  WHERE invoice_id = p_invoice_id;
  
  -- Calculate quality score
  IF l_total_lines > 0 THEN
    l_quality := (l_matched_lines::NUMERIC / l_total_lines) * 100;
  ELSE
    l_quality := 0;
  END IF;
  
  -- Update invoice
  UPDATE invoices
  SET three_way_match_status = 
    CASE 
      WHEN l_matched_lines = l_total_lines AND l_asn_id IS NOT NULL THEN 'matched'
      WHEN l_asn_id IS NULL THEN 'asn_pending'
      ELSE 'variance'
    END,
    match_quality_score = l_quality,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  RETURN QUERY SELECT l_po_id, l_asn_id, l_quality;
END
$$ LANGUAGE plpgsql;
