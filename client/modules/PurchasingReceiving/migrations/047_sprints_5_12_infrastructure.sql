-- Migration 047: SPRINTS 5-12 Comprehensive Infrastructure
-- Covers: RFQ Marketplace, RFID, 3-Way Matching, Supplier Portal, Contracts, Yield DB, etc.

-- ============================================================================
-- RFQ MARKETPLACE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_admin_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  distributed_to UUID[] DEFAULT ARRAY[]::UUID[],
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('draft', 'published', 'closed', 'awarded')) DEFAULT 'draft',
  delivery_date DATE,
  delivery_location TEXT,
  awarded_to UUID,
  awarded_date TIMESTAMPTZ,
  UNIQUE(organization_id, title)
);

CREATE TABLE IF NOT EXISTS supplier_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  bid_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_bid_amount DECIMAL(14, 2) NOT NULL,
  delivery_terms TEXT,
  payment_terms TEXT,
  quality_metrics JSONB DEFAULT '{}'::JSONB,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('submitted', 'withdrawn', 'accepted', 'rejected')) DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rfqs_org_idx ON rfqs (organization_id, status);
CREATE INDEX rfqs_expires_idx ON rfqs (expires_at) WHERE status = 'published';
CREATE INDEX supplier_bids_rfq_idx ON supplier_bids (rfq_id, status);

-- ============================================================================
-- RFID TAGS & READS
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfid_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  epc TEXT NOT NULL UNIQUE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  sku_code TEXT,
  status TEXT CHECK (status IN ('active', 'archived', 'lost')) DEFAULT 'active',
  track_movement BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfid_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  epc TEXT NOT NULL,
  reader_id TEXT NOT NULL,
  location_id TEXT,
  location TEXT,
  signal_strength DECIMAL(5, 2),
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spoilage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES rfid_tags(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  location TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER,
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  factors JSONB DEFAULT '{}'::JSONB,
  recommended_action TEXT,
  detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rfid_tags_org_idx ON rfid_tags (organization_id, status);
CREATE INDEX rfid_reads_location_idx ON rfid_reads (location, read_at DESC);
CREATE INDEX spoilage_alerts_risk_idx ON spoilage_alerts (risk_level) WHERE risk_level IN ('high', 'critical');

-- ============================================================================
-- THREE-WAY MATCHING (PO → ASN → Invoice)
-- ============================================================================

CREATE TABLE IF NOT EXISTS three_way_matchings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  asn_id UUID REFERENCES asn_receipts(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('matched', 'variance', 'unmatched')) DEFAULT 'unmatched',
  match_score INTEGER DEFAULT 0,
  items JSONB DEFAULT '[]'::JSONB,
  variances JSONB DEFAULT '[]'::JSONB,
  gl_posted BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(po_id, invoice_id)
);

CREATE INDEX three_way_matchings_org_idx ON three_way_matchings (organization_id, status);
CREATE INDEX three_way_matchings_po_idx ON three_way_matchings (po_id);

-- ============================================================================
-- SUPPLIER PORTAL & CATALOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  portal_url TEXT,
  white_label_name TEXT,
  white_label_logo_url TEXT,
  api_key TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS supplier_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  unit_price DECIMAL(12, 4) NOT NULL,
  unit_of_measure TEXT,
  packaging TEXT,
  availability TEXT DEFAULT 'in_stock',
  lead_time_days INTEGER DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, sku_code)
);

CREATE INDEX supplier_catalogs_search_idx ON supplier_catalogs (supplier_id, product_name, category);

-- ============================================================================
-- CONTRACT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pricing_tiers JSONB DEFAULT '[]'::JSONB,
  volume_discounts JSONB DEFAULT '[]'::JSONB,
  payment_terms TEXT,
  delivery_terms TEXT,
  rebate_rules JSONB DEFAULT '{}'::JSONB,
  effective_date DATE,
  end_date DATE,
  auto_renewal BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  version_number INTEGER,
  changes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rebate_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES supplier_contracts(id) ON DELETE SET NULL,
  purchase_amount DECIMAL(14, 2),
  rebate_percentage DECIMAL(5, 2),
  rebate_amount DECIMAL(14, 2),
  accrual_month DATE,
  status TEXT DEFAULT 'accrued',
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX contracts_org_supplier_idx ON supplier_contracts (organization_id, supplier_id);
CREATE INDEX rebate_accruals_org_idx ON rebate_accruals (organization_id, accrual_month DESC);

-- ============================================================================
-- YIELD DATABASE & RECIPE COSTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS yield_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  food_group TEXT NOT NULL,
  item_name TEXT NOT NULL,
  raw_weight_grams INTEGER,
  edible_weight_grams INTEGER,
  yield_percentage DECIMAL(5, 2),
  waste_percentage DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipe_id UUID,
  recipe_name TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_cost DECIMAL(10, 2),
  cost_per_serving DECIMAL(8, 2),
  waste_factor DECIMAL(3, 2) DEFAULT 1.0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX yield_tables_org_idx ON yield_tables (organization_id, food_group);
CREATE INDEX recipe_costs_org_idx ON recipe_costs (organization_id);

-- ============================================================================
-- SUPPLIER SCORECARDS & PERFORMANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  period_month DATE,
  on_time_delivery_percent DECIMAL(5, 2),
  quality_score DECIMAL(5, 2),
  price_competitiveness DECIMAL(5, 2),
  responsiveness_score DECIMAL(5, 2),
  overall_score DECIMAL(5, 2),
  total_spend DECIMAL(14, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id, period_month)
);

CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  metric_type TEXT,
  metric_value DECIMAL(12, 4),
  recorded_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX supplier_scorecards_org_idx ON supplier_scorecards (organization_id, period_month DESC);

-- ============================================================================
-- EXTERNAL INTEGRATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS netsuite_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT,
  expires_at TIMESTAMPTZ,
  realm TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS netsuite_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  netsuite_transaction_id TEXT,
  status TEXT,
  error_message TEXT,
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfid_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE three_way_matchings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for organization isolation
CREATE POLICY rfqs_org_isolation ON rfqs FOR ALL USING (organization_id = (SELECT organization_id FROM auth.users WHERE auth.uid() = id));
CREATE POLICY supplier_contracts_org ON supplier_contracts FOR ALL USING (organization_id = (SELECT organization_id FROM auth.users WHERE auth.uid() = id));
CREATE POLICY three_way_matchings_org ON three_way_matchings FOR ALL USING (organization_id = (SELECT organization_id FROM auth.users WHERE auth.uid() = id));
