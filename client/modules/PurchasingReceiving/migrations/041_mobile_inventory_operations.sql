-- Mobile-First Inventory Operations Schema
-- Supports offline-first counts, barcode scanning, transfers, and par level management

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mobile count sessions for offline inventory counts
CREATE TABLE IF NOT EXISTS mobile_count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  record_count INT DEFAULT 0,
  last_sync_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_count_sessions_org_outlet_idx
  ON mobile_count_sessions (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS mobile_count_sessions_user_idx
  ON mobile_count_sessions (user_id);
CREATE INDEX IF NOT EXISTS mobile_count_sessions_status_idx
  ON mobile_count_sessions (status);

-- Mobile count records for offline inventory lines
CREATE TABLE IF NOT EXISTS mobile_count_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mobile_count_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  quantity NUMERIC(14,4) NOT NULL,
  unit TEXT NOT NULL,
  location TEXT,
  bin TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  barcode_scanned BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_count_records_session_idx
  ON mobile_count_records (session_id);
CREATE INDEX IF NOT EXISTS mobile_count_records_org_outlet_idx
  ON mobile_count_records (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS mobile_count_records_item_idx
  ON mobile_count_records (item_id);
CREATE INDEX IF NOT EXISTS mobile_count_records_synced_idx
  ON mobile_count_records (synced);

-- Product barcodes for scanning
CREATE TABLE IF NOT EXISTS product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  sku TEXT,
  format TEXT DEFAULT 'UPC' CHECK (format IN ('UPC', 'EAN', 'CODE128', 'QR', 'RFID')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, barcode)
);

CREATE INDEX IF NOT EXISTS product_barcodes_org_idx
  ON product_barcodes (organization_id);
CREATE INDEX IF NOT EXISTS product_barcodes_item_idx
  ON product_barcodes (item_id);

-- Barcode scan logs for audit trail
CREATE TABLE IF NOT EXISTS barcode_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('scanned', 'linked', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barcode_scan_logs_org_outlet_idx
  ON barcode_scan_logs (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS barcode_scan_logs_user_idx
  ON barcode_scan_logs (user_id);

-- Par levels for inventory management
CREATE TABLE IF NOT EXISTS par_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  qty NUMERIC(14,4) NOT NULL,
  min_qty NUMERIC(14,4),
  max_qty NUMERIC(14,4),
  reorder_point NUMERIC(14,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, outlet_id, item_id)
);

CREATE INDEX IF NOT EXISTS par_levels_org_outlet_idx
  ON par_levels (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS par_levels_item_idx
  ON par_levels (item_id);

-- Par level alerts
CREATE TABLE IF NOT EXISTS par_level_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('below_par', 'above_par', 'critical')),
  current_qty NUMERIC(14,4),
  par_level NUMERIC(14,4),
  variance NUMERIC(14,4),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS par_level_alerts_org_outlet_idx
  ON par_level_alerts (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS par_level_alerts_type_idx
  ON par_level_alerts (alert_type);

-- Inventory transfers between outlets
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  to_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_transfers_org_idx
  ON inventory_transfers (organization_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_outlets_idx
  ON inventory_transfers (from_outlet_id, to_outlet_id);
CREATE INDEX IF NOT EXISTS inventory_transfers_status_idx
  ON inventory_transfers (status);

-- Transfer line items
CREATE TABLE IF NOT EXISTS transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  quantity NUMERIC(14,4) NOT NULL,
  unit TEXT NOT NULL,
  location TEXT,
  bin TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'packed', 'shipped', 'received')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transfer_lines_transfer_idx
  ON transfer_lines (transfer_id);
CREATE INDEX IF NOT EXISTS transfer_lines_item_idx
  ON transfer_lines (item_id);

-- Inventory sync queue for background processing
CREATE TABLE IF NOT EXISTS inventory_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  record_ids TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempt_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS inventory_sync_queue_status_idx
  ON inventory_sync_queue (status);
CREATE INDEX IF NOT EXISTS inventory_sync_queue_org_outlet_idx
  ON inventory_sync_queue (organization_id, outlet_id);

-- Inventory conflicts from sync
CREATE TABLE IF NOT EXISTS inventory_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  mobile_quantity NUMERIC(14,4) NOT NULL,
  system_quantity NUMERIC(14,4) NOT NULL,
  variance NUMERIC(14,4),
  variance_percent NUMERIC(5,2),
  resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'auto_resolved')),
  resolution_method TEXT CHECK (resolution_method IN ('mobile', 'system', 'split', 'manual')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_sync_conflicts_org_idx
  ON inventory_sync_conflicts (organization_id);
CREATE INDEX IF NOT EXISTS inventory_sync_conflicts_status_idx
  ON inventory_sync_conflicts (resolution_status);

-- Inventory transactions log (if not already exists)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'count', 'transfer_out', 'transfer_in', 'adjustment', 'waste')),
  quantity NUMERIC(14,4) NOT NULL,
  unit TEXT NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_transactions_org_outlet_idx
  ON inventory_transactions (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_item_idx
  ON inventory_transactions (item_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_type_idx
  ON inventory_transactions (type);

-- RLS Policies for mobile inventory operations
ALTER TABLE mobile_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_count_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE par_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_sync_conflicts ENABLE ROW LEVEL SECURITY;

-- User can access their own organization's mobile sessions
CREATE POLICY mobile_sessions_user_access ON mobile_count_sessions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access records in their organization's outlets
CREATE POLICY mobile_records_user_access ON mobile_count_records
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Users can access par levels for their outlets
CREATE POLICY par_levels_user_access ON par_levels
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Users can access transfers for their outlets
CREATE POLICY transfers_user_access ON inventory_transfers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS mobile_count_sessions_created_at_idx
  ON mobile_count_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS mobile_count_records_timestamp_idx
  ON mobile_count_records (timestamp DESC);
CREATE INDEX IF NOT EXISTS inventory_transfers_created_at_idx
  ON inventory_transfers (created_at DESC);
