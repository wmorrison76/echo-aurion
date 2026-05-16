-- Sprint 3-5: Advanced Procurement, ML Forecasting, and Supplier Integration Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- EDI Messages (for Sysco, US Foods, GFS, etc.)
CREATE TABLE IF NOT EXISTS edi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('PO', 'INVOICE', 'ASN')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  po_number TEXT,
  invoice_number TEXT,
  asn_number TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'error')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edi_messages_org_supplier_idx
  ON edi_messages (organization_id, supplier_id);
CREATE INDEX IF NOT EXISTS edi_messages_status_idx
  ON edi_messages (status);
CREATE INDEX IF NOT EXISTS edi_messages_po_number_idx
  ON edi_messages (po_number);

-- Purchase Orders (Extended for automation)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  vendor_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'acknowledged', 'received', 'invoiced')),
  total_amount NUMERIC(14,2),
  lines JSONB,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_date TIMESTAMPTZ,
  UNIQUE (organization_id, po_number)
);

CREATE INDEX IF NOT EXISTS purchase_orders_org_idx
  ON purchase_orders (organization_id);
CREATE INDEX IF NOT EXISTS purchase_orders_status_idx
  ON purchase_orders (status);
CREATE INDEX IF NOT EXISTS purchase_orders_vendor_idx
  ON purchase_orders (vendor_id);

-- Auto-PO Requests (from forecasts)
CREATE TABLE IF NOT EXISTS auto_po_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  forecasted_quantity NUMERIC(14,4),
  par_level NUMERIC(14,4),
  recommended_quantity NUMERIC(14,4),
  supplier_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  approval_workflow JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_due_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auto_po_requests_org_outlet_idx
  ON auto_po_requests (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS auto_po_requests_status_idx
  ON auto_po_requests (status);

-- Advanced Forecasts (ML Ensemble)
CREATE TABLE IF NOT EXISTS advanced_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  p10 NUMERIC(14,4),
  p50 NUMERIC(14,4),
  p90 NUMERIC(14,4),
  point_estimate NUMERIC(14,4),
  confidence NUMERIC(3,2),
  model TEXT NOT NULL DEFAULT 'ensemble',
  signals JSONB,
  explanations TEXT[],
  baseline_error NUMERIC(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advanced_forecasts_org_outlet_idx
  ON advanced_forecasts (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS advanced_forecasts_item_idx
  ON advanced_forecasts (item_id);
CREATE INDEX IF NOT EXISTS advanced_forecasts_date_idx
  ON advanced_forecasts (forecast_date DESC);

-- Receiving Schedules (ASN tracking)
CREATE TABLE IF NOT EXISTS receiving_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  asn_number TEXT,
  carrier TEXT,
  tracking_number TEXT,
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_receipt' CHECK (status IN ('pending_receipt', 'received', 'partial', 'damaged')),
  expected_qty NUMERIC(14,4),
  received_qty NUMERIC(14,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receiving_schedules_outlet_idx
  ON receiving_schedules (outlet_id);
CREATE INDEX IF NOT EXISTS receiving_schedules_status_idx
  ON receiving_schedules (status);
CREATE INDEX IF NOT EXISTS receiving_schedules_asn_idx
  ON receiving_schedules (asn_number);

-- Three-Way Match (PO → ASN → Invoice)
CREATE TABLE IF NOT EXISTS three_way_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  asn_id UUID REFERENCES receiving_schedules(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('pending', 'partial_match', 'full_match', 'variance')),
  quantity_variance NUMERIC(14,4),
  price_variance NUMERIC(14,2),
  date_variance INT,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS three_way_matches_org_idx
  ON three_way_matches (organization_id);
CREATE INDEX IF NOT EXISTS three_way_matches_status_idx
  ON three_way_matches (match_status);

-- Supplier Contracts (pricing, volume tiers)
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  region TEXT,
  outlet_type TEXT,
  price_per_unit NUMERIC(14,4),
  volume_tiers JSONB,
  rebate_rules JSONB,
  gl_code TEXT,
  effective_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, supplier_id, region, effective_date)
);

CREATE INDEX IF NOT EXISTS supplier_contracts_org_supplier_idx
  ON supplier_contracts (organization_id, supplier_id);

-- Approved Suppliers List (ASL)
CREATE TABLE IF NOT EXISTS approved_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  region TEXT,
  outlet_type TEXT,
  categories TEXT[],
  effective_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, supplier_id, outlet_id)
);

CREATE INDEX IF NOT EXISTS approved_suppliers_org_idx
  ON approved_suppliers (organization_id);
CREATE INDEX IF NOT EXISTS approved_suppliers_status_idx
  ON approved_suppliers (status);

-- RFQ (Request For Quote) - for marketplace
CREATE TABLE IF NOT EXISTS rfq_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  rfq_number TEXT UNIQUE,
  items JSONB NOT NULL,
  description TEXT,
  delivery_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  close_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rfq_requests_org_idx
  ON rfq_requests (organization_id);
CREATE INDEX IF NOT EXISTS rfq_requests_status_idx
  ON rfq_requests (status);

-- RFQ Responses
CREATE TABLE IF NOT EXISTS rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL,
  delivery_days INT,
  terms TEXT,
  response_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'evaluated', 'awarded', 'rejected'))
);

CREATE INDEX IF NOT EXISTS rfq_responses_rfq_idx
  ON rfq_responses (rfq_id);

-- Punchout Catalog Sessions (cXML support)
CREATE TABLE IF NOT EXISTS punchout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  session_token TEXT UNIQUE,
  return_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  cart JSONB
);

CREATE INDEX IF NOT EXISTS punchout_sessions_org_idx
  ON punchout_sessions (organization_id);
CREATE INDEX IF NOT EXISTS punchout_sessions_supplier_idx
  ON punchout_sessions (supplier_id);

-- RLS Policies
ALTER TABLE edi_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_po_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE three_way_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE punchout_sessions ENABLE ROW LEVEL SECURITY;

-- User can access org data
CREATE POLICY edi_messages_user_access ON edi_messages
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY purchase_orders_user_access ON purchase_orders
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY auto_po_requests_user_access ON auto_po_requests
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY advanced_forecasts_user_access ON advanced_forecasts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY receiving_schedules_user_access ON receiving_schedules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS edi_messages_created_at_idx
  ON edi_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_orders_created_at_idx
  ON purchase_orders (created_at DESC);
