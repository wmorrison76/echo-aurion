-- ============================================================================
-- RECEIVING WORKFLOW SYSTEM
-- Comprehensive tables for delivery scheduling, truck tracking, HACCP, QA, 
-- and multi-outlet item check-in for 30+ outlets + 25 restaurants
-- ============================================================================

-- Delivery Schedules (Master schedule for all orders)
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  delivery_type TEXT CHECK (delivery_type IN ('standing_order', 'po_based', 'emergency', 'scheduled')),
  expected_items_count INT DEFAULT 0,
  expected_value DECIMAL(12, 2),
  po_numbers TEXT[], -- Array of PO numbers for this delivery
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_transit', 'arrived', 'unloading', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  notes TEXT,
  CONSTRAINT valid_time_range CHECK (scheduled_time_start IS NULL OR scheduled_time_end IS NULL OR scheduled_time_start < scheduled_time_end)
);

-- Shipment/Truck Tracking
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  delivery_schedule_id UUID NOT NULL REFERENCES delivery_schedules(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  truck_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  carrier_id UUID REFERENCES vendors(id),
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  actual_departure TIMESTAMP,
  truck_condition_notes TEXT,
  seal_number TEXT,
  seal_intact BOOLEAN,
  temperature_control_active BOOLEAN,
  temperature_current DECIMAL(5, 2),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_transit', 'arrived', 'unloading', 'completed', 'left')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Truck Inspection (QA before unload)
CREATE TABLE IF NOT EXISTS truck_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  inspected_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  inspection_date TIMESTAMP DEFAULT now(),
  
  -- Exterior inspection
  truck_cleanliness_score INT CHECK (truck_cleanliness_score BETWEEN 1 AND 10),
  no_visible_damage BOOLEAN,
  damage_notes TEXT,
  
  -- Temperature control
  temp_control_working BOOLEAN,
  interior_temperature DECIMAL(5, 2),
  temperature_acceptable BOOLEAN,
  
  -- Seal integrity
  seal_intact BOOLEAN,
  seal_broken_notes TEXT,
  
  -- Overall assessment
  inspection_status TEXT CHECK (inspection_status IN ('pass', 'conditional', 'fail')),
  fail_reason TEXT,
  can_proceed_to_unload BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- HACCP Checks (Food safety protocols)
CREATE TABLE IF NOT EXISTS haccp_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  checked_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  check_date TIMESTAMP DEFAULT now(),
  check_time TIME,
  
  -- Frozen/Chilled Products
  frozen_product_temp DECIMAL(5, 2),
  frozen_acceptable BOOLEAN,
  chilled_product_temp DECIMAL(5, 2),
  chilled_acceptable BOOLEAN,
  
  -- Ambient Products
  ambient_temp DECIMAL(5, 2),
  ambient_acceptable BOOLEAN,
  
  -- Cleanliness
  exterior_cleanliness INT CHECK (exterior_cleanliness BETWEEN 1 AND 10),
  interior_cleanliness INT CHECK (interior_cleanliness BETWEEN 1 AND 10),
  cleanliness_acceptable BOOLEAN,
  
  -- Documentation
  delivery_documentation_present BOOLEAN,
  origin_cert_present BOOLEAN,
  allergen_info_present BOOLEAN,
  
  -- Overall
  haccp_status TEXT CHECK (haccp_status IN ('pass', 'conditional', 'fail')),
  corrective_action_required TEXT,
  approver_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Item Check-in (Per outlet - 30+ outlets + 25 restaurants)
CREATE TABLE IF NOT EXISTS receiving_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  receiving_user_id UUID NOT NULL REFERENCES auth.users(id),
  checkin_date TIMESTAMP DEFAULT now(),
  
  -- Line item info
  line_item_id UUID REFERENCES purchase_order_items(id),
  product_id UUID REFERENCES products(id),
  sku TEXT,
  product_name TEXT NOT NULL,
  category TEXT, -- produce, proteins, dairy, dry_goods, etc
  
  -- Quantities
  po_quantity INT,
  po_unit TEXT,
  received_quantity INT,
  short_quantity INT,
  
  -- Quality checks
  expiration_date DATE,
  received_condition TEXT CHECK (received_condition IN ('good', 'damaged', 'expired', 'partial', 'missing')),
  condition_notes TEXT,
  
  -- Receiving notes
  received_by_vendor_rep TEXT,
  vendor_rep_phone TEXT,
  
  -- Status
  checkin_status TEXT DEFAULT 'received' CHECK (checkin_status IN ('received', 'verified', 'flagged', 'short', 'damaged', 'disputed')),
  requires_action BOOLEAN DEFAULT false,
  action_notes TEXT,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Discrepancies/Shorts (Tracked for each item)
CREATE TABLE IF NOT EXISTS receiving_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES receiving_checkins(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  
  discrepancy_type TEXT CHECK (discrepancy_type IN ('short', 'damaged', 'expired', 'wrong_item', 'quality_issue')),
  product_id UUID REFERENCES products(id),
  sku TEXT,
  quantity_affected INT,
  
  -- Vendor notification
  vendor_notified BOOLEAN DEFAULT false,
  vendor_notified_at TIMESTAMP,
  vendor_notified_by_user_id UUID REFERENCES auth.users(id),
  notification_method TEXT CHECK (notification_method IN ('phone', 'email', 'sms', 'in_app')),
  
  -- Resolution
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'pending_vendor_response', 'pending_credit', 'received_credit', 'resolved', 'disputed')),
  vendor_response TEXT,
  vendor_response_date TIMESTAMP,
  credit_amount DECIMAL(10, 2),
  credit_received BOOLEAN DEFAULT false,
  
  -- Manager alerts
  manager_alert_sent BOOLEAN DEFAULT false,
  manager_alert_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Receiving Summary Per Shipment Per Outlet
CREATE TABLE IF NOT EXISTS receiving_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  
  total_expected_items INT,
  total_received_items INT,
  total_short_items INT,
  total_damaged_items INT,
  
  total_expected_value DECIMAL(12, 2),
  total_received_value DECIMAL(12, 2),
  total_short_value DECIMAL(12, 2),
  
  checkin_completed BOOLEAN DEFAULT false,
  checkin_completed_by_user_id UUID REFERENCES auth.users(id),
  checkin_completed_at TIMESTAMP,
  
  shortages_notified BOOLEAN DEFAULT false,
  manager_alerts_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(shipment_id, outlet_id)
);

-- HACCP Protocols (Configurable by organization)
CREATE TABLE IF NOT EXISTS haccp_protocol_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  protocol_name TEXT NOT NULL,
  product_category TEXT, -- For specific product types
  
  frozen_temp_threshold DECIMAL(5, 2) DEFAULT -18.0,
  chilled_temp_threshold DECIMAL(5, 2) DEFAULT 4.0,
  ambient_temp_threshold DECIMAL(5, 2) DEFAULT 21.0,
  
  required_checks TEXT[], -- Array of required check types
  requires_documentation BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Audit Log for Receiving Operations
CREATE TABLE IF NOT EXISTS receiving_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  outlet_id UUID REFERENCES outlets(id),
  shipment_id UUID REFERENCES shipments(id),
  
  action TEXT NOT NULL,
  action_type TEXT CHECK (action_type IN ('schedule_created', 'truck_arrived', 'inspection_completed', 'haccp_passed', 'item_checkin', 'discrepancy_logged', 'vendor_notified', 'checkin_completed')),
  performed_by_user_id UUID REFERENCES auth.users(id),
  
  details JSONB,
  
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance (30+ outlets + 25 restaurants = 55+ locations)
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_org_date ON delivery_schedules(organization_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_vendor ON delivery_schedules(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shipments_org_status ON shipments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_arrival ON shipments(actual_arrival);
CREATE INDEX IF NOT EXISTS idx_receiving_checkins_outlet ON receiving_checkins(outlet_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_receiving_checkins_shipment ON receiving_checkins(shipment_id);
CREATE INDEX IF NOT EXISTS idx_receiving_discrepancies_org ON receiving_discrepancies(organization_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_receiving_discrepancies_vendor ON receiving_discrepancies(vendor_id, vendor_notified);
CREATE INDEX IF NOT EXISTS idx_receiving_summaries_outlet ON receiving_summaries(outlet_id);
CREATE INDEX IF NOT EXISTS idx_receiving_audit_log_org ON receiving_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_haccp_checks_shipment ON haccp_checks(shipment_id, check_date);

-- RLS Policies for multi-tenant safety (30+ outlets)
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_protocol_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization isolation
CREATE POLICY "Users can view their org's delivery schedules"
  ON delivery_schedules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their org's shipments"
  ON shipments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view outlet-specific receiving checkins"
  ON receiving_checkins FOR SELECT
  USING (
    outlet_id IN (
      SELECT outlet_id FROM user_roles WHERE user_id = auth.uid()
    ) OR organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view org-level discrepancies"
  ON receiving_discrepancies FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON delivery_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON truck_inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON haccp_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON receiving_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE ON receiving_discrepancies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON receiving_summaries TO authenticated;
GRANT INSERT ON receiving_audit_log TO authenticated;
