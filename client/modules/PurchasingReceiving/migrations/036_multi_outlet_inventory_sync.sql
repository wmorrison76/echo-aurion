-- Multi-Outlet Inventory Sync System
-- Supports real-time inventory updates across 30+ outlets + 25 restaurants

CREATE TABLE IF NOT EXISTS outlet_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  standard_product_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  quantity_on_hand NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(14,4) NOT NULL DEFAULT 0,
  available_quantity NUMERIC(14,4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  unit_cost NUMERIC(14,6),
  total_value NUMERIC(14,2) GENERATED ALWAYS AS (quantity_on_hand * COALESCE(unit_cost, 0)) STORED,
  last_counted_at TIMESTAMPTZ,
  last_counted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  variance_percentage NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, standard_product_id)
);

CREATE INDEX IF NOT EXISTS outlet_inventory_org_outlet_idx ON outlet_inventory(organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS outlet_inventory_product_idx ON outlet_inventory(standard_product_id);
CREATE INDEX IF NOT EXISTS outlet_inventory_value_idx ON outlet_inventory(total_value);
CREATE INDEX IF NOT EXISTS outlet_inventory_updated_idx ON outlet_inventory(updated_at);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  standard_product_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'receiving', 'physical_count', 'adjustment', 'waste', 'transfer_out', 'transfer_in',
    'preparation', 'sale', 'spoilage', 'inventory_correction'
  )),
  reference_type TEXT CHECK (reference_type IN ('shipment', 'purchase_order', 'invoice', 'transfer', 'physical_count', 'waste_log', 'manual')),
  reference_id UUID,
  quantity_change NUMERIC(14,4) NOT NULL,
  unit_cost NUMERIC(14,6),
  total_cost NUMERIC(14,2),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS inventory_transactions_org_idx ON inventory_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_transactions_outlet_idx ON inventory_transactions(outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_transactions_product_idx ON inventory_transactions(standard_product_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_reference_idx ON inventory_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_type_idx ON inventory_transactions(transaction_type);

CREATE TABLE IF NOT EXISTS inventory_par_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  standard_product_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  par_quantity NUMERIC(14,4) NOT NULL,
  min_quantity NUMERIC(14,4) NOT NULL,
  max_quantity NUMERIC(14,4) NOT NULL,
  reorder_point NUMERIC(14,4) NOT NULL,
  reorder_quantity NUMERIC(14,4) NOT NULL,
  lead_time_days INT DEFAULT 2,
  days_to_par INT DEFAULT 7,
  preferred_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  auto_reorder BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, standard_product_id)
);

CREATE INDEX IF NOT EXISTS par_levels_org_outlet_idx ON inventory_par_levels(organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS par_levels_product_idx ON inventory_par_levels(standard_product_id);
CREATE INDEX IF NOT EXISTS par_levels_vendor_idx ON inventory_par_levels(preferred_vendor_id);

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  standard_product_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('below_minimum', 'above_maximum', 'out_of_stock', 'variance', 'expiring')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  current_quantity NUMERIC(14,4),
  expected_quantity NUMERIC(14,4),
  variance_percentage NUMERIC(5,2),
  message TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, standard_product_id, alert_type, created_at)
);

CREATE INDEX IF NOT EXISTS alerts_org_unresolved_idx ON inventory_alerts(organization_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS alerts_outlet_idx ON inventory_alerts(outlet_id, resolved_at);
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON inventory_alerts(severity);

CREATE TABLE IF NOT EXISTS outlet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  to_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  standard_product_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  quantity NUMERIC(14,4) NOT NULL,
  unit_cost NUMERIC(14,6),
  total_cost NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS transfers_from_outlet_idx ON outlet_transfers(from_outlet_id, status);
CREATE INDEX IF NOT EXISTS transfers_to_outlet_idx ON outlet_transfers(to_outlet_id, status);
CREATE INDEX IF NOT EXISTS transfers_product_idx ON outlet_transfers(standard_product_id);
CREATE INDEX IF NOT EXISTS transfers_status_idx ON outlet_transfers(status, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES inventory_transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  target_outlets TEXT[] DEFAULT '{}',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS sync_queue_org_status_idx ON inventory_sync_queue(organization_id, status);
CREATE INDEX IF NOT EXISTS sync_queue_created_idx ON inventory_sync_queue(created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sync_queue_id UUID REFERENCES inventory_sync_queue(id) ON DELETE SET NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES inventory_transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'conflict')),
  previous_value JSONB,
  new_value JSONB,
  error_details JSONB,
  conflict_reason TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_log_org_idx ON inventory_sync_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_log_outlet_idx ON inventory_sync_log(outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_log_status_idx ON inventory_sync_log(status, created_at DESC);

CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'manual')),
  total_items INT DEFAULT 0,
  total_value NUMERIC(14,2),
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshots_org_outlet_idx ON inventory_snapshots(organization_id, outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS snapshots_type_idx ON inventory_snapshots(snapshot_type, created_at DESC);

-- RLS Policies for outlet_inventory
ALTER TABLE outlet_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY outlet_inventory_org_access ON outlet_inventory
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = outlet_inventory.outlet_id
    )
  );

CREATE POLICY outlet_inventory_insert ON outlet_inventory
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = outlet_inventory.outlet_id
      AND om.role IN ('admin', 'manager', 'receiver')
    )
  );

-- RLS Policies for inventory_transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_transactions_org_access ON inventory_transactions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_transactions.outlet_id
    )
  );

CREATE POLICY inventory_transactions_insert ON inventory_transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_transactions.outlet_id
      AND om.role IN ('admin', 'manager', 'receiver', 'chef')
    )
  );

-- RLS Policies for inventory_par_levels
ALTER TABLE inventory_par_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY par_levels_org_access ON inventory_par_levels
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_par_levels.outlet_id
      AND om.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for inventory_alerts
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_org_access ON inventory_alerts
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_alerts.outlet_id
    )
  );

-- RLS Policies for outlet_transfers
ALTER TABLE outlet_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY transfers_view ON outlet_transfers
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = outlet_transfers.from_outlet_id
      OR om.outlet_id = outlet_transfers.to_outlet_id
    )
  );

CREATE POLICY transfers_insert ON outlet_transfers
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = outlet_transfers.from_outlet_id
      AND om.role IN ('admin', 'manager', 'receiver')
    )
  );

-- RLS Policies for inventory_sync_queue
ALTER TABLE inventory_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_queue_admin_access ON inventory_sync_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin')
    )
  );

-- RLS Policies for inventory_sync_log
ALTER TABLE inventory_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_log_org_access ON inventory_sync_log
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_sync_log.outlet_id
    )
  );

-- RLS Policies for inventory_snapshots
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshots_outlet_access ON inventory_snapshots
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_snapshots.outlet_id
    )
  );

CREATE POLICY snapshots_insert ON inventory_snapshots
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = inventory_snapshots.outlet_id
      AND om.role IN ('admin', 'manager', 'receiver')
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS outlet_inventory_composite_idx 
  ON outlet_inventory(organization_id, outlet_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS inventory_transactions_composite_idx 
  ON inventory_transactions(organization_id, outlet_id, transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS alerts_composite_idx 
  ON inventory_alerts(organization_id, severity, resolved_at, created_at DESC);

CREATE INDEX IF NOT EXISTS transfers_composite_idx 
  ON outlet_transfers(organization_id, status, initiated_at DESC);
