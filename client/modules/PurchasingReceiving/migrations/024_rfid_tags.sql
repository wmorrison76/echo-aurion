-- Migration 024: RFID Tag Management
-- Adds: Tag registry, tag-to-product mappings, tag locations
-- Tracks: High-value items (spirits, equipment), spoilage risks

-- ============================================================================
-- RFID TAGS (Physical tags attached to SKUs/items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rfid_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  epc TEXT NOT NULL,  -- Electronic Product Code (unique tag ID)
  tag_type TEXT NOT NULL CHECK (tag_type IN ('permanent', 'temporary', 'case_level', 'item_level')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost', 'damaged')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, epc)
);

CREATE INDEX rfid_tags_org_idx ON rfid_tags (organization_id);
CREATE INDEX rfid_tags_epc_idx ON rfid_tags (epc);
CREATE INDEX rfid_tags_status_idx ON rfid_tags (status);

-- ============================================================================
-- TAG-TO-PRODUCT ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tag_product_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_code TEXT,  -- Fallback if product_id not available
  product_name TEXT,  -- Cache product name for quick display
  track_spoilage BOOLEAN DEFAULT FALSE,  -- Should we monitor for spoilage?
  track_movement BOOLEAN DEFAULT FALSE,  -- Should we track intra-warehouse movement?
  high_value BOOLEAN DEFAULT FALSE,  -- Is this a high-value item (spirits, equipment)?
  assigned_at TIMESTAMPTZ DEFAULT now(),
  deassigned_at TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE INDEX tag_product_assignments_tag_idx ON tag_product_assignments (tag_id);
CREATE INDEX tag_product_assignments_org_idx ON tag_product_assignments (organization_id);
CREATE INDEX tag_product_assignments_product_idx ON tag_product_assignments (product_id);
CREATE INDEX tag_product_assignments_high_value_idx ON tag_product_assignments (high_value) WHERE high_value = TRUE;
CREATE INDEX tag_product_assignments_current_idx ON tag_product_assignments (is_current) WHERE is_current = TRUE;

-- ============================================================================
-- TAG TRACKING (Real-time location of tagged items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tag_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  device_id UUID REFERENCES iot_devices(id) ON DELETE SET NULL,
  zone TEXT CHECK (zone IN ('receiving', 'storage', 'cold', 'dry', 'prep', 'cooking', 'service', 'trash', 'unknown')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  signal_strength INTEGER,  -- RSSI (Received Signal Strength Indicator)
  read_at TIMESTAMPTZ DEFAULT now(),
  is_latest BOOLEAN DEFAULT TRUE
);

CREATE INDEX tag_locations_tag_idx ON tag_locations (tag_id);
CREATE INDEX tag_locations_device_idx ON tag_locations (device_id);
CREATE INDEX tag_locations_zone_idx ON tag_locations (zone);
CREATE INDEX tag_locations_read_at_idx ON tag_locations (read_at DESC);
CREATE INDEX tag_locations_latest_idx ON tag_locations (is_latest) WHERE is_latest = TRUE;

-- ============================================================================
-- TAG MOVEMENT HISTORY (Detect suspicious movements, theft)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tag_movement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_zone TEXT,
  to_zone TEXT,
  from_device_id UUID REFERENCES iot_devices(id) ON DELETE SET NULL,
  to_device_id UUID REFERENCES iot_devices(id) ON DELETE SET NULL,
  movement_type TEXT CHECK (movement_type IN ('normal', 'unusual', 'theft_risk', 'manual_adjustment')),
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX tag_movement_history_tag_idx ON tag_movement_history (tag_id);
CREATE INDEX tag_movement_history_org_idx ON tag_movement_history (organization_id);
CREATE INDEX tag_movement_history_type_idx ON tag_movement_history (movement_type);
CREATE INDEX tag_movement_history_detected_idx ON tag_movement_history (detected_at DESC);

-- ============================================================================
-- TAG EVENTS (Raw read events from devices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tag_read_events (
  id BIGSERIAL PRIMARY KEY,  -- High throughput table, use bigserial
  tag_id UUID NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE SET NULL,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  epc TEXT NOT NULL,
  signal_strength INTEGER,
  antenna_number INTEGER,
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX tag_read_events_org_outlet_idx ON tag_read_events (organization_id, outlet_id, read_at DESC);
CREATE INDEX tag_read_events_tag_idx ON tag_read_events (tag_id);
CREATE INDEX tag_read_events_device_idx ON tag_read_events (device_id);
-- Partial index on recent events only (saves space)
CREATE INDEX tag_read_events_recent_idx ON tag_read_events (read_at DESC) WHERE read_at > now() - interval '7 days';

-- Table partitioning by month (recommended for high-volume data)
-- Can be enabled later with: SELECT create_range_partitions_on_date_field('tag_read_events', 'read_at', 'month');
