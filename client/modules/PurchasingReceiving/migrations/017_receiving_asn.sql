-- Migration 017: Receiving & ASN Workflow
-- Tracks advance shipping notifications and receiving transactions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ADVANCE SHIPPING NOTIFICATION (ASN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS asn_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  asn_number TEXT NOT NULL UNIQUE,
  asn_date DATE NOT NULL,
  expected_delivery_date DATE,
  carrier_name TEXT,
  tracking_number TEXT,
  shipment_method TEXT CHECK (shipment_method IN ('truck', 'ltl', 'parcel', 'pickup', 'other')),
  pallets_count INT,
  gross_weight NUMERIC(14,4),  -- Weight in lbs
  edi_transaction_id TEXT UNIQUE,
  received_at TIMESTAMPTZ,
  received_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  asn_match_status TEXT DEFAULT 'pending' CHECK (asn_match_status IN ('pending', 'received', 'partial', 'discrepancy')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX asn_org_idx ON asn_headers (organization_id);
CREATE INDEX asn_po_idx ON asn_headers (po_id);
CREATE INDEX asn_supplier_idx ON asn_headers (supplier_id);
CREATE INDEX asn_tracking_idx ON asn_headers (tracking_number);
CREATE INDEX asn_status_idx ON asn_headers (asn_match_status);

-- ============================================================================
-- ASN LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS asn_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asn_id UUID NOT NULL REFERENCES asn_headers(id) ON DELETE CASCADE,
  po_line_id UUID REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_shipped NUMERIC(14,4) NOT NULL,
  uom TEXT NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX asn_lines_asn_idx ON asn_line_items (asn_id);
CREATE INDEX asn_lines_po_line_idx ON asn_line_items (po_line_id);

-- ============================================================================
-- RECEIVING TRANSACTION (Physical receipt)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receiving_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  asn_id UUID REFERENCES asn_headers(id) ON DELETE SET NULL,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  receiving_number TEXT NOT NULL UNIQUE,
  received_date TIMESTAMPTZ DEFAULT now(),
  received_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  receiving_method TEXT CHECK (receiving_method IN ('barcode_scan', 'manual_count', 'weight', 'voice', 'other')),
  dock_location TEXT,
  storage_location TEXT,
  receiving_status TEXT DEFAULT 'completed' CHECK (receiving_status IN ('in_progress', 'completed', 'discrepancy', 'partial')),
  discrepancy_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX recv_org_idx ON receiving_transactions (organization_id);
CREATE INDEX recv_outlet_idx ON receiving_transactions (outlet_id);
CREATE INDEX recv_po_idx ON receiving_transactions (po_id);
CREATE INDEX recv_asn_idx ON receiving_transactions (asn_id);
CREATE INDEX recv_date_idx ON receiving_transactions (received_date);
CREATE INDEX recv_status_idx ON receiving_transactions (receiving_status);

-- ============================================================================
-- RECEIVING LINE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS receiving_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_transaction_id UUID NOT NULL REFERENCES receiving_transactions(id) ON DELETE CASCADE,
  asn_line_id UUID REFERENCES asn_line_items(id) ON DELETE SET NULL,
  po_line_id UUID NOT NULL REFERENCES purchase_order_lines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_expected NUMERIC(14,4),
  qty_received NUMERIC(14,4) NOT NULL,
  uom TEXT NOT NULL,
  variance_qty NUMERIC(14,4),
  variance_reason TEXT,
  lot_number TEXT,
  expiry_date DATE,
  condition_notes TEXT,  -- 'damaged', 'wet', 'expired', 'good'
  actual_weight NUMERIC(14,4),  -- For weight-based items
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX recv_lines_recv_idx ON receiving_line_items (receiving_transaction_id);
CREATE INDEX recv_lines_po_line_idx ON receiving_line_items (po_line_id);
CREATE INDEX recv_lines_product_idx ON receiving_line_items (product_id);

-- ============================================================================
-- DISCREPANCY REPORT
-- ============================================================================
CREATE TABLE IF NOT EXISTS receiving_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  receiving_line_id UUID NOT NULL REFERENCES receiving_line_items(id) ON DELETE CASCADE,
  discrepancy_type TEXT CHECK (discrepancy_type IN ('quantity', 'quality', 'damaged', 'expired', 'wrong_item', 'other')),
  expected_qty NUMERIC(14,4),
  received_qty NUMERIC(14,4),
  variance_qty NUMERIC(14,4),
  severity TEXT CHECK (severity IN ('minor', 'major', 'critical')),
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  return_authorized BOOLEAN DEFAULT FALSE,
  rma_number TEXT,  -- Return Merchandise Authorization
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'disputed', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX disc_org_idx ON receiving_discrepancies (organization_id);
CREATE INDEX disc_status_idx ON receiving_discrepancies (status);
CREATE INDEX disc_type_idx ON receiving_discrepancies (discrepancy_type);

-- ============================================================================
-- RECEIVING QUEUE (For staff to manage receiving tasks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS receiving_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  asn_id UUID REFERENCES asn_headers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
  expected_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority INT DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(po_id, outlet_id)
);

CREATE INDEX recv_queue_org_idx ON receiving_queue (organization_id);
CREATE INDEX recv_queue_outlet_idx ON receiving_queue (outlet_id);
CREATE INDEX recv_queue_status_idx ON receiving_queue (status);

-- ============================================================================
-- FUNCTION: Process ASN receipt
-- ============================================================================
CREATE OR REPLACE FUNCTION process_asn_receipt(
  p_asn_id UUID,
  p_received_by_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Mark ASN as received
  UPDATE asn_headers
  SET received_at = now(),
      received_by_user_id = p_received_by_user_id,
      asn_match_status = 'received',
      updated_at = now()
  WHERE id = p_asn_id;
  
  -- Update associated PO
  UPDATE purchase_orders
  SET asn_received = TRUE,
      asn_received_date = now(),
      updated_at = now()
  WHERE id = (SELECT po_id FROM asn_headers WHERE id = p_asn_id);
  
  -- Check 3-way match
  PERFORM check_three_way_match(
    (SELECT po_id FROM asn_headers WHERE id = p_asn_id)
  );
  
END
$$ LANGUAGE plpgsql;
