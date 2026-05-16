-- Migration 016: Extended Purchase Orders
-- Supports group purchasing, ASN tracking, 3-way matching, EDI/punchout

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- EXTEND PURCHASE_ORDERS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN outlet_group_id UUID REFERENCES outlet_groups(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN contract_id UUID REFERENCES supplier_contracts(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN parent_po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;  -- For split shipments
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN is_group_po BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN consolidation_master BOOLEAN DEFAULT FALSE;  -- Is this the master for group PO?
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN approval_required BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN sent_via TEXT CHECK (sent_via IN ('email', 'edi', 'punchout', 'api', 'manual'));
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN edi_transaction_id TEXT UNIQUE;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN asn_received BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN asn_number TEXT;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN asn_received_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN invoice_received BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN invoice_id UUID;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN invoice_received_date TIMESTAMPTZ;
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN three_way_match_status TEXT CHECK (three_way_match_status IN ('pending', 'complete', 'variance_identified', 'resolved'));
ALTER TABLE IF EXISTS purchase_orders ADD COLUMN variance_notes JSONB;

CREATE INDEX po_org_idx ON purchase_orders (organization_id);
CREATE INDEX po_group_idx ON purchase_orders (outlet_group_id);
CREATE INDEX po_contract_idx ON purchase_orders (contract_id);
CREATE INDEX po_status_idx ON purchase_orders (status);
CREATE INDEX po_asn_idx ON purchase_orders (asn_received, asn_number);
CREATE INDEX po_3way_idx ON purchase_orders (three_way_match_status);

-- ============================================================================
-- PURCHASE ORDER ALLOCATION (For group POs split across multiple outlets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS purchase_order_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  child_po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  allocated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX po_alloc_parent_idx ON purchase_order_allocations (parent_po_id);
CREATE INDEX po_alloc_outlet_idx ON purchase_order_allocations (outlet_id);

-- ============================================================================
-- PURCHASE ORDER LINE ITEMS (Extended)
-- ============================================================================
-- purchase_order_lines already exists, extend it
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN contract_line_id UUID REFERENCES contract_volume_tiers(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN contracted_price NUMERIC(12,4);
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN promotional_pricing_id UUID;  -- ref to promotional_pricing
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN gl_code_id UUID REFERENCES gl_codes(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN qty_expected_delivery NUMERIC(14,4);  -- Forecasted delivery quantity (for variance)
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN qty_received NUMERIC(14,4) DEFAULT 0;
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN qty_variance NUMERIC(14,4);  -- qty_ordered - qty_received
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN price_variance NUMERIC(12,4);  -- contracted_price - actual_invoice_price
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN variance_reason TEXT;
ALTER TABLE IF EXISTS purchase_order_lines ADD COLUMN line_status TEXT DEFAULT 'ordered' CHECK (line_status IN ('ordered', 'partial_receipt', 'received', 'variance', 'cancelled'));

CREATE INDEX po_lines_gl_idx ON purchase_order_lines (gl_code_id);
CREATE INDEX po_lines_variance_idx ON purchase_order_lines (line_status);

-- ============================================================================
-- PO APPROVAL WORKFLOW
-- ============================================================================
CREATE TABLE IF NOT EXISTS po_approval_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  approval_level INT,  -- 1, 2, 3, etc.
  required_approver_role TEXT,  -- 'manager', 'finance', 'owner'
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_threshold_amount NUMERIC(14,2),  -- PO amount that requires this approval level
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(po_id, approval_level)
);

CREATE INDEX po_approval_po_idx ON po_approval_workflow (po_id);
CREATE INDEX po_approval_status_idx ON po_approval_workflow (approved);

-- ============================================================================
-- PO COMMUNICATION LOG (Email, EDI, punchout attempts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS po_communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  communication_type TEXT CHECK (communication_type IN ('edi_sent', 'email_sent', 'punchout_click', 'api_call', 'manual_entry')),
  sent_to TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivery_confirmed', 'failed')),
  error_message TEXT,
  attempt_number INT DEFAULT 1,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX po_comm_po_idx ON po_communication_log (po_id);
CREATE INDEX po_comm_status_idx ON po_communication_log (status);

-- ============================================================================
-- FUNCTION: Auto-check for 3-way match completion
-- ============================================================================
CREATE OR REPLACE FUNCTION check_three_way_match(
  p_po_id UUID
)
RETURNS TEXT AS $$
DECLARE
  l_has_asn BOOLEAN;
  l_has_invoice BOOLEAN;
  l_variance_count INT;
  l_match_status TEXT;
BEGIN
  -- Check if ASN received
  SELECT asn_received INTO l_has_asn FROM purchase_orders WHERE id = p_po_id;
  
  -- Check if invoice received
  SELECT invoice_received INTO l_has_invoice FROM purchase_orders WHERE id = p_po_id;
  
  -- Check for variances
  SELECT COUNT(*) INTO l_variance_count
  FROM purchase_order_lines
  WHERE po_id = p_po_id
    AND (line_status = 'variance' OR qty_variance IS NOT NULL AND qty_variance != 0);
  
  IF l_has_asn AND l_has_invoice THEN
    IF l_variance_count = 0 THEN
      l_match_status := 'complete';
    ELSE
      l_match_status := 'variance_identified';
    END IF;
  ELSE
    l_match_status := 'pending';
  END IF;
  
  -- Update PO
  UPDATE purchase_orders
  SET three_way_match_status = l_match_status,
      updated_at = now()
  WHERE id = p_po_id;
  
  RETURN l_match_status;
END
$$ LANGUAGE plpgsql;
