-- Event Cost Allocation & EchoEvents-EchoAurum Bridge
-- Enables tracking of costs at the event level for accurate COGS and financial reporting

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Event Cost Allocations
-- Tracks line-item costs allocated to specific events for event-level COGS calculations
CREATE TABLE IF NOT EXISTS event_cost_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  beo_id TEXT NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_line_id UUID NOT NULL,
  product_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity_base NUMERIC(14,4) NOT NULL,
  unit_cost_base NUMERIC(14,2) NOT NULL,
  total_cost NUMERIC(14,2) NOT NULL,
  gl_account TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT event_cost_allocation_positive_cost CHECK (total_cost >= 0),
  CONSTRAINT event_cost_allocation_positive_qty CHECK (quantity_base > 0)
);

CREATE INDEX IF NOT EXISTS event_cost_allocations_org_idx
  ON event_cost_allocations (organization_id);

CREATE INDEX IF NOT EXISTS event_cost_allocations_event_idx
  ON event_cost_allocations (event_id, beo_id);

CREATE INDEX IF NOT EXISTS event_cost_allocations_invoice_idx
  ON event_cost_allocations (invoice_id);

CREATE INDEX IF NOT EXISTS event_cost_allocations_outlet_event_idx
  ON event_cost_allocations (outlet_id, event_id);

CREATE INDEX IF NOT EXISTS event_cost_allocations_created_at_idx
  ON event_cost_allocations (created_at DESC);

-- Receiving Session Event Links
-- Optional: Links receiving sessions to events for batch cost tracking
CREATE TABLE IF NOT EXISTS receiving_session_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES receiving_transactions(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  beo_id TEXT NOT NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  property_code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receiving_session_event_links_session_idx
  ON receiving_session_event_links (session_id);

CREATE INDEX IF NOT EXISTS receiving_session_event_links_event_idx
  ON receiving_session_event_links (event_id, beo_id);

CREATE INDEX IF NOT EXISTS receiving_session_event_links_outlet_idx
  ON receiving_session_event_links (outlet_id);

-- RLS Policies for Event Cost Allocations
ALTER TABLE event_cost_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event costs for their organization"
  ON event_cost_allocations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert event costs for their organization"
  ON event_cost_allocations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete event costs for their organization"
  ON event_cost_allocations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for Receiving Session Event Links
ALTER TABLE receiving_session_event_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session event links for their organization"
  ON receiving_session_event_links
  FOR SELECT
  USING (
    outlet_id IN (
      SELECT id FROM outlets
      WHERE organization_id IN (
        SELECT organization_id FROM user_roles
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert session event links for their organization"
  ON receiving_session_event_links
  FOR INSERT
  WITH CHECK (
    outlet_id IN (
      SELECT id FROM outlets
      WHERE organization_id IN (
        SELECT organization_id FROM user_roles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Event Cost Summary View (for dashboards)
CREATE OR REPLACE VIEW event_cost_summary AS
SELECT
  organization_id,
  outlet_id,
  event_id,
  beo_id,
  COUNT(*) as line_count,
  SUM(quantity_base) as total_quantity,
  SUM(total_cost) as total_event_cost,
  MIN(created_at) as first_allocation_at,
  MAX(created_at) as last_allocation_at
FROM event_cost_allocations
GROUP BY organization_id, outlet_id, event_id, beo_id;

-- Invoice Event Allocation View (for invoice reconciliation)
CREATE OR REPLACE VIEW invoice_event_allocations AS
SELECT
  eca.invoice_id,
  eca.event_id,
  eca.beo_id,
  COUNT(*) as allocation_count,
  SUM(eca.total_cost) as allocated_cost,
  i.total as invoice_total,
  CASE
    WHEN i.total > 0 THEN ROUND((SUM(eca.total_cost) / i.total * 100)::numeric, 2)
    ELSE 0
  END as allocation_percentage
FROM event_cost_allocations eca
LEFT JOIN invoices i ON eca.invoice_id = i.id
GROUP BY eca.invoice_id, eca.event_id, eca.beo_id, i.total;
