-- migrations/001_init_invoices.sql
-- LUCCCA Invoice Scanner Upgrade: Initial Schema

CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  external_ref TEXT UNIQUE,
  email TEXT,
  edi_enabled BOOLEAN DEFAULT FALSE,
  ap_contact_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gl_codes (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  restricted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gl_mapping_rules (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  match_sku TEXT,
  match_name_ilike TEXT,
  fallback_category TEXT,
  gl_code_id UUID REFERENCES gl_codes(id) NOT NULL,
  priority INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE items (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  sku TEXT,
  name TEXT NOT NULL,
  uom TEXT NOT NULL,
  pack_size TEXT,
  catch_weight BOOLEAN DEFAULT FALSE,
  allergens TEXT[],
  gl_code_id UUID REFERENCES gl_codes(id),
  last_cost NUMERIC(12,4) DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(vendor_id, sku)
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created','sent','confirmed','shipped','delivered','closed','void')),
  outlet_id UUID,
  eta TIMESTAMPTZ,
  currency TEXT DEFAULT 'USD',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY,
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) NOT NULL,
  uom TEXT NOT NULL,
  qty_ordered NUMERIC(14,4) NOT NULL,
  unit_price NUMERIC(12,4),
  notes TEXT
);

CREATE INDEX purchase_orders_number_vendor_idx ON purchase_orders (number, vendor_id);
CREATE INDEX purchase_order_lines_item_po_idx ON purchase_order_lines (item_id, po_id);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  number TEXT NOT NULL,
  invoice_date DATE,
  outlet_id UUID,
  po_id UUID REFERENCES purchase_orders(id),
  subtotal NUMERIC(14,4),
  tax NUMERIC(14,4),
  shipping NUMERIC(14,4),
  total NUMERIC(14,4),
  currency TEXT DEFAULT 'USD',
  ocr_confidence NUMERIC(5,2),
  source_file_uri TEXT,
  hash_sha256 TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('new','processed','error')) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  raw_description TEXT,
  sku TEXT,
  uom TEXT,
  qty NUMERIC(14,4),
  unit_price NUMERIC(12,4),
  ext_price NUMERIC(14,4),
  lot_required BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE TABLE inventory_lots (
  id UUID PRIMARY KEY,
  item_id UUID REFERENCES items(id),
  lot_code TEXT,
  qty NUMERIC(14,4) NOT NULL,
  unit_cost NUMERIC(12,4) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date DATE,
  source_ref TEXT,
  outlet_id UUID
);

CREATE TABLE inventory_balances (
  item_id UUID PRIMARY KEY REFERENCES items(id),
  qty_on_hand NUMERIC(14,4) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(12,4) NOT NULL DEFAULT 0
);

CREATE TABLE domain_events (
  id UUID PRIMARY KEY,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  hmac TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_trail (
  id UUID PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID,
  diff_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE price_contracts (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  item_id UUID REFERENCES items(id),
  contract_price NUMERIC(12,4) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  notes TEXT
);
