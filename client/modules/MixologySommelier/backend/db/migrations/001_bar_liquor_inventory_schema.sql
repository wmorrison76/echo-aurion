-- Venues: Support for multi-location operations (25+ locations)
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location_type TEXT NOT NULL, -- 'restaurant', 'hotel', 'resort', 'casino', 'bar'
  address TEXT,
  city TEXT,
  state TEXT NOT NULL,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  manager_id UUID REFERENCES users(id),
  liquor_license_number TEXT,
  liquor_license_expiry DATE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Liquor & Spirits: Complete liquor library (spirits, vodka, gin, rum, tequila, whiskey, etc.)
CREATE TABLE IF NOT EXISTS liquor_spirits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  spirit_type TEXT NOT NULL, -- 'vodka', 'gin', 'rum', 'tequila', 'whiskey', 'brandy', 'liqueur', 'mezcal', 'scotch'
  producer TEXT,
  country TEXT,
  region TEXT,
  abv NUMERIC(5,2),
  bottle_size_ml INT DEFAULT 750, -- standard 750ml, but can be 50ml, 375ml, 1000ml, 1750ml
  proof INT,
  age_statement TEXT, -- 'XO', 'VSOP', '10 Year', etc.
  flavor_profile JSONB, -- {vanilla, oak, spice, citrus, etc.}
  proof_type TEXT, -- 'bottled_in_bond', 'barrel_proof', 'cask_strength'
  retail_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  par_level INT DEFAULT 5,
  reorder_point INT DEFAULT 3,
  supplier_id UUID REFERENCES suppliers(id),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Beer Catalog: Microbreweries, craft beers, beer styles
CREATE TABLE IF NOT EXISTS beer_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brewery TEXT NOT NULL,
  beer_style TEXT NOT NULL, -- 'IPA', 'Lager', 'Stout', 'Porter', 'Wheat', 'Pale Ale', 'Sour', 'Cider'
  country TEXT,
  region TEXT,
  abv NUMERIC(5,2),
  ibu INT, -- International Bitterness Units
  bottle_size_ml INT DEFAULT 355,
  package_type TEXT, -- 'bottle', 'can', 'draft', 'cask'
  flavor_profile JSONB,
  hop_varieties TEXT[],
  retail_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  par_level INT DEFAULT 12,
  reorder_point INT DEFAULT 6,
  supplier_id UUID REFERENCES suppliers(id),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Inventory Transfers: Inter-location movements with workflow
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id TEXT UNIQUE NOT NULL, -- T-2024-001-A-B format
  from_venue_id UUID NOT NULL REFERENCES venues(id),
  to_venue_id UUID NOT NULL REFERENCES venues(id),
  requested_by_user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'in_transit', 'received', 'rejected'
  requested_at TIMESTAMP DEFAULT now(),
  approved_at TIMESTAMP,
  approved_by_user_id UUID REFERENCES users(id),
  received_at TIMESTAMP,
  received_by_user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Transfer Line Items: Individual items in a transfer
CREATE TABLE IF NOT EXISTS transfer_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  wine_id UUID REFERENCES wines(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT now()
);

-- Transfer Approvals: Confirmation on receiving side with signature
CREATE TABLE IF NOT EXISTS transfer_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES inventory_transfers(id),
  approved_at TIMESTAMP DEFAULT now(),
  approved_by_user_id UUID REFERENCES users(id),
  signature_data TEXT, -- Base64 encoded digital signature
  signature_timestamp TIMESTAMP,
  verified_count INT, -- Actual items received
  discrepancy_notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Comped Drinks: Manager/bartender comps for tracking and R&D
CREATE TABLE IF NOT EXISTS comped_drinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  comp_id TEXT UNIQUE NOT NULL, -- C-2024-001 format
  wine_id UUID REFERENCES wines(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  bottle_size_ml INT DEFAULT 750,
  quantity_poured NUMERIC(5,2), -- ml
  comped_by_user_id UUID NOT NULL REFERENCES users(id),
  comp_reason TEXT NOT NULL, -- 'wait_time', 'service_recovery', 'vip_courtesy', 'staff_training', 'r_and_d', 'quality_issue'
  table_number INT,
  guest_notes TEXT,
  pos_entry_made BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Breakage & Variance: Track loss and flag unusual variances (0.05%+ or 1% configurable)
CREATE TABLE IF NOT EXISTS breakage_variance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  wine_id UUID REFERENCES wines(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  expected_count INT,
  actual_count INT,
  variance_qty INT,
  variance_percentage NUMERIC(5,2),
  variance_type TEXT, -- 'overage', 'shortage', 'breakage', 'spillage', 'unaccounted'
  flagged_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'flagged', -- 'flagged', 'investigated', 'written_off', 'recovered'
  write_off_amount NUMERIC(10,2),
  write_off_date DATE,
  investigation_notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Inventory Audit: Photo timestamps and physical count records
CREATE TABLE IF NOT EXISTS inventory_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  audit_id TEXT UNIQUE NOT NULL, -- A-2024-001 format
  audit_date DATE NOT NULL,
  audited_by_user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'variance_review'
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Audit Line Items: Individual bottle counts with photo evidence
CREATE TABLE IF NOT EXISTS audit_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES inventory_audit(id) ON DELETE CASCADE,
  wine_id UUID REFERENCES wines(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  expected_count INT,
  actual_count INT,
  volume_percentage NUMERIC(5,2), -- For partial bottles: 50%, 75%, etc.
  photo_url TEXT, -- Timestamp photo of bottles
  photo_timestamp TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Kitchen Ingredients: Recipe portion tracking (1/8 cup transfers, etc.)
CREATE TABLE IF NOT EXISTS kitchen_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  wine_id UUID REFERENCES wines(id),
  recipe_id UUID REFERENCES recipes(id),
  unit_type TEXT, -- 'ml', 'oz', 'cup', 'tbsp', 'tsp'
  quantity_per_portion NUMERIC(10,2),
  par_level INT,
  transferred_from_inventory_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Mini Bar POIs: Points of Service (room numbers, locations)
CREATE TABLE IF NOT EXISTS mini_bar_pois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  poi_id TEXT UNIQUE NOT NULL, -- MB-2024-001 format
  location_name TEXT NOT NULL, -- 'Room 501', 'Suite 701', 'VIP Lounge'
  location_type TEXT, -- 'guest_room', 'suite', 'presidential_suite', 'lounge', 'spa'
  floor INT,
  last_restocked_at TIMESTAMP,
  restocked_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Mini Bar Inventory: Current stock at each POI
CREATE TABLE IF NOT EXISTS mini_bar_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mini_bar_poi_id UUID NOT NULL REFERENCES mini_bar_pois(id),
  wine_id UUID REFERENCES wines(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  quantity_stocked INT,
  quantity_remaining INT,
  last_audited_at TIMESTAMP,
  auto_deplete_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Banquet Events: Event-specific inventory snapshots
CREATE TABLE IF NOT EXISTS banquet_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  event_id TEXT UNIQUE NOT NULL, -- BAN-2024-001 format
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_location TEXT, -- 'Ballroom A', 'Offsite', etc.
  is_offsite BOOLEAN DEFAULT FALSE,
  estimated_guests INT,
  event_setup_by_user_id UUID REFERENCES users(id),
  event_breakdown_by_user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed'
  created_at TIMESTAMP DEFAULT now()
);

-- Banquet Inventory: Snapshot of inventory at event start and end
CREATE TABLE IF NOT EXISTS banquet_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banquet_event_id UUID NOT NULL REFERENCES banquet_events(id),
  wine_id UUID REFERENCES wines(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  opening_inventory INT,
  closing_inventory INT,
  used_count INT,
  variance INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Inventory Cost Methods: FIFO/LIFO/WAC selection per venue
CREATE TABLE IF NOT EXISTS inventory_cost_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  cost_method TEXT NOT NULL DEFAULT 'fifo', -- 'fifo', 'lifo', 'weighted_average_cost'
  effective_date DATE DEFAULT CURRENT_DATE,
  updated_by_user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Compliance Regulations: State-by-state rules and requirements
CREATE TABLE IF NOT EXISTS compliance_regulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state TEXT UNIQUE NOT NULL,
  state_name TEXT,
  license_type TEXT, -- 'on_premise', 'off_premise', 'both'
  min_age_requirement INT DEFAULT 21,
  max_alcohol_per_transaction NUMERIC(5,2), -- oz or ml
  id_verification_required BOOLEAN DEFAULT TRUE,
  responsible_service_training_required BOOLEAN DEFAULT TRUE,
  training_certification TEXT, -- 'TIPS', 'ServSafe', 'State-specific'
  inventory_reporting_frequency TEXT, -- 'monthly', 'quarterly', 'annually'
  reporting_format TEXT, -- 'PDF', 'Digital', 'Both'
  variance_tolerance_percentage NUMERIC(5,2) DEFAULT 1.0,
  breakage_allowance_percentage NUMERIC(5,2) DEFAULT 0.5,
  record_retention_days INT DEFAULT 1095, -- 3 years
  digital_signature_required BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Transfer Invoices: Invoice generation with digital signatures
CREATE TABLE IF NOT EXISTS transfer_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES inventory_transfers(id),
  invoice_number TEXT UNIQUE NOT NULL, -- INV-2024-001 format
  invoice_date DATE DEFAULT CURRENT_DATE,
  invoice_pdf_url TEXT,
  generated_by_user_id UUID REFERENCES users(id),
  signed_by_user_id UUID REFERENCES users(id),
  signature_data TEXT, -- Base64 encoded signature
  signature_timestamp TIMESTAMP,
  issued_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

-- Inventory Variance Log: Audit trail for POS discrepancies
CREATE TABLE IF NOT EXISTS inventory_variance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  variance_log_id TEXT UNIQUE NOT NULL,
  variance_date DATE,
  wine_id UUID REFERENCES wines(id),
  liquor_id UUID REFERENCES liquor_spirits(id),
  beer_id UUID REFERENCES beer_catalog(id),
  pos_recorded_sales INT,
  physical_count INT,
  expected_count INT,
  variance_qty INT,
  variance_percentage NUMERIC(5,2),
  flagged_by_system BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  investigated_by_user_id UUID REFERENCES users(id),
  resolution TEXT, -- 'data_entry_error', 'breakage_written_off', 'missing_sales_entry', 'variance_accepted'
  created_at TIMESTAMP DEFAULT now()
);

-- Staff Comps Tracking: Manager + bartender comps for R&D analysis
CREATE TABLE IF NOT EXISTS staff_comps_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id),
  staff_user_id UUID NOT NULL REFERENCES users(id),
  comp_id UUID REFERENCES comped_drinks(id),
  tracking_month DATE DEFAULT CURRENT_DATE,
  total_comps_count INT,
  total_comps_value NUMERIC(10,2),
  comps_for_rd INT,
  comps_for_vip INT,
  comps_for_service INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- System Configuration: Onboarding and setup parameters
CREATE TABLE IF NOT EXISTS system_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID UNIQUE,
  org_name TEXT NOT NULL,
  primary_venue_id UUID REFERENCES venues(id),
  variance_tolerance_percentage NUMERIC(5,2) DEFAULT 1.0,
  breakage_allowance_percentage NUMERIC(5,2) DEFAULT 0.5,
  default_cost_method TEXT DEFAULT 'fifo',
  state_regulations_configured BOOLEAN DEFAULT FALSE,
  pos_system TEXT, -- 'square', 'toast', 'margine_edge', 'lightspeed', 'other'
  pos_api_key TEXT, -- Encrypted
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  onboarding_completed_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- User Rights: Establish role-based access control
CREATE TABLE IF NOT EXISTS user_rights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  venue_id UUID REFERENCES venues(id),
  role TEXT NOT NULL, -- 'admin', 'manager', 'sommelier', 'bartender', 'housekeeping', 'auditor'
  permissions JSONB, -- {can_transfer, can_approve_transfer, can_comp_drinks, can_audit, can_edit_settings}
  can_view_analytics BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_configure_settings BOOLEAN DEFAULT FALSE,
  can_generate_reports BOOLEAN DEFAULT FALSE,
  can_approve_transfers BOOLEAN DEFAULT FALSE,
  can_manage_inventory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indices for performance
CREATE INDEX idx_venues_state ON venues(state);
CREATE INDEX idx_venues_manager_id ON venues(manager_id);
CREATE INDEX idx_liquor_spirits_spirit_type ON liquor_spirits(spirit_type);
CREATE INDEX idx_liquor_spirits_supplier_id ON liquor_spirits(supplier_id);
CREATE INDEX idx_beer_catalog_brewery ON beer_catalog(brewery);
CREATE INDEX idx_beer_catalog_supplier_id ON beer_catalog(supplier_id);
CREATE INDEX idx_inventory_transfers_from_venue ON inventory_transfers(from_venue_id);
CREATE INDEX idx_inventory_transfers_to_venue ON inventory_transfers(to_venue_id);
CREATE INDEX idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX idx_comped_drinks_venue_id ON comped_drinks(venue_id);
CREATE INDEX idx_comped_drinks_comped_by ON comped_drinks(comped_by_user_id);
CREATE INDEX idx_comped_drinks_created_at ON comped_drinks(created_at);
CREATE INDEX idx_breakage_venue_id ON breakage_variance(venue_id);
CREATE INDEX idx_breakage_status ON breakage_variance(status);
CREATE INDEX idx_inventory_audit_venue_id ON inventory_audit(venue_id);
CREATE INDEX idx_inventory_audit_date ON inventory_audit(audit_date);
CREATE INDEX idx_mini_bar_pois_venue_id ON mini_bar_pois(venue_id);
CREATE INDEX idx_banquet_events_venue_id ON banquet_events(venue_id);
CREATE INDEX idx_banquet_events_date ON banquet_events(event_date);
CREATE INDEX idx_compliance_regulations_state ON compliance_regulations(state);
CREATE INDEX idx_transfer_invoices_transfer_id ON transfer_invoices(transfer_id);
CREATE INDEX idx_inventory_variance_log_venue_id ON inventory_variance_log(venue_id);
CREATE INDEX idx_inventory_variance_log_date ON inventory_variance_log(variance_date);
CREATE INDEX idx_user_rights_user_id ON user_rights(user_id);
CREATE INDEX idx_user_rights_venue_id ON user_rights(venue_id);
