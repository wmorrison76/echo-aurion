-- Migration 023: IoT Devices Infrastructure
-- Adds: Device registry, types, locations, device settings
-- Supports: RFID readers, Bluetooth/WiFi scales, temperature/humidity sensors

-- ============================================================================
-- DEVICE TYPES (Enum-like)
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('rfid_reader', 'scale', 'temperature', 'humidity', 'combined')),
  description TEXT,
  connection_type TEXT CHECK (connection_type IN ('bluetooth', 'wifi', 'ble', 'nfc', 'zigbee', 'wired')),
  firmware_version TEXT,
  max_read_range_meters DECIMAL(5, 2),
  battery_powered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX device_types_category_idx ON device_types (category);

-- ============================================================================
-- IOT DEVICES (RFID readers, scales, sensors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
  serial_number TEXT NOT NULL,
  device_name TEXT NOT NULL,
  mac_address TEXT UNIQUE,
  ip_address INET,
  location_description TEXT,  -- "Receiving dock", "Cold storage", "Pantry shelf A"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')),
  last_seen TIMESTAMPTZ,
  battery_level INTEGER,  -- 0-100 for battery-powered devices
  signal_strength INTEGER,  -- WiFi/BLE signal strength
  firmware_version TEXT,
  settings JSONB DEFAULT '{}'::JSONB,  -- {sampling_rate: 60, units: 'kg', threshold: 5, etc}
  metadata JSONB DEFAULT '{}'::JSONB,  -- {manufacturer: 'Impinj', model: 'Speedway', etc}
  installed_at TIMESTAMPTZ DEFAULT now(),
  warranty_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, serial_number)
);

CREATE INDEX iot_devices_org_idx ON iot_devices (organization_id);
CREATE INDEX iot_devices_outlet_idx ON iot_devices (outlet_id);
CREATE INDEX iot_devices_type_idx ON iot_devices (device_type_id);
CREATE INDEX iot_devices_status_idx ON iot_devices (status);
CREATE INDEX iot_devices_last_seen_idx ON iot_devices (last_seen DESC);
CREATE INDEX iot_devices_mac_idx ON iot_devices (mac_address);

-- ============================================================================
-- DEVICE LOCATIONS (Historical tracking of device movements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  location_description TEXT,
  location_zone TEXT,  -- 'receiving', 'storage', 'prep', 'cooking', 'service', 'trash'
  assigned_at TIMESTAMPTZ DEFAULT now(),
  deassigned_at TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT TRUE
);

CREATE INDEX device_locations_device_idx ON device_locations (device_id);
CREATE INDEX device_locations_outlet_idx ON device_locations (outlet_id);
CREATE INDEX device_locations_current_idx ON device_locations (is_current) WHERE is_current = TRUE;

-- ============================================================================
-- DEVICE SETTINGS & CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL UNIQUE REFERENCES iot_devices(id) ON DELETE CASCADE,
  sampling_interval_seconds INTEGER DEFAULT 60,  -- How often to read/send data
  read_power_dbm INTEGER,  -- RFID power setting (-10 to 30 dBm)
  session_number INTEGER,  -- RFID session for tag reading
  antenna_power_level TEXT CHECK (antenna_power_level IN ('low', 'medium', 'high')),
  temperature_unit TEXT DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs', 'oz')),
  alert_thresholds JSONB DEFAULT '{}'::JSONB,  -- {temp_high: 10, temp_low: -5, weight_variance: 10}
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX device_configurations_device_idx ON device_configurations (device_id);

-- ============================================================================
-- DEVICE HEALTH & DIAGNOSTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('online', 'offline', 'battery_low', 'error', 'firmware_update', 'connection_lost', 'signal_weak')),
  message TEXT,
  details JSONB DEFAULT '{}'::JSONB,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX device_health_logs_device_idx ON device_health_logs (device_id);
CREATE INDEX device_health_logs_event_idx ON device_health_logs (event_type);
CREATE INDEX device_health_logs_created_idx ON device_health_logs (created_at DESC);
CREATE INDEX device_health_logs_resolved_idx ON device_health_logs (resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- DEVICE STATUS VIEW (Current health snapshot)
-- ============================================================================
CREATE OR REPLACE VIEW device_status_view AS
SELECT
  d.id,
  d.organization_id,
  d.outlet_id,
  d.device_name,
  d.serial_number,
  dt.name as device_type_name,
  dt.category as device_category,
  d.status,
  d.last_seen,
  d.battery_level,
  d.signal_strength,
  CASE
    WHEN d.last_seen < now() - interval '5 minutes' THEN 'offline'
    WHEN d.battery_level IS NOT NULL AND d.battery_level < 20 THEN 'battery_low'
    ELSE 'healthy'
  END as health_status,
  dl.location_description,
  dl.location_zone,
  d.created_at
FROM iot_devices d
LEFT JOIN device_types dt ON d.device_type_id = dt.id
LEFT JOIN device_locations dl ON d.id = dl.device_id AND dl.is_current = TRUE;

-- ============================================================================
-- DEVICE PAIRING TOKEN (For IoT device self-registration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_pairing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_type_id UUID REFERENCES device_types(id) ON DELETE SET NULL,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  created_by TEXT,  -- User email who created the token
  claimed_by_device_id UUID REFERENCES iot_devices(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX device_pairing_tokens_org_idx ON device_pairing_tokens (organization_id);
CREATE INDEX device_pairing_tokens_claimed_idx ON device_pairing_tokens (claimed_by_device_id);
CREATE INDEX device_pairing_tokens_expires_idx ON device_pairing_tokens (expires_at);
