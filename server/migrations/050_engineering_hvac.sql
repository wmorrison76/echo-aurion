/**
 * Engineering HVAC Integration Schema
 * Enables IoT device integration, real-time temperature control, and energy optimization
 */

-- =====================================================
-- IOT DEVICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  
  -- Device definition
  device_type VARCHAR(50) NOT NULL, -- "thermostat", "sensor", "controller", "monitor"
  device_name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL, -- "Nest", "Ecobee", "Honeywell"
  model VARCHAR(100) NOT NULL,
  
  -- API integration
  api_provider VARCHAR(50) NOT NULL, -- "nest", "ecobee", "honeywell", "generic", "custom"
  api_key VARCHAR(255), -- Encrypted API key
  api_endpoint TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- "online", "offline", "error"
  last_seen TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_iot_devices_org ON iot_devices(org_id);
CREATE INDEX idx_iot_devices_outlet ON iot_devices(outlet_id);
CREATE INDEX idx_iot_devices_type ON iot_devices(device_type);
CREATE INDEX idx_iot_devices_status ON iot_devices(status);
CREATE INDEX idx_iot_devices_provider ON iot_devices(api_provider);

-- =====================================================
-- TEMPERATURE READINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS temperature_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  outlet_id UUID,
  
  -- Reading data
  temperature NUMERIC NOT NULL, -- Celsius
  humidity NUMERIC, -- Percentage
  zone VARCHAR(100), -- "kitchen", "dining", "bar"
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_temperature_readings_device ON temperature_readings(device_id);
CREATE INDEX idx_temperature_readings_org ON temperature_readings(org_id);
CREATE INDEX idx_temperature_readings_outlet ON temperature_readings(outlet_id);
CREATE INDEX idx_temperature_readings_timestamp ON temperature_readings(timestamp DESC);
CREATE INDEX idx_temperature_readings_zone ON temperature_readings(zone);

-- =====================================================
-- TEMPERATURE CONTROLS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS temperature_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  outlet_id UUID,
  
  -- Control settings
  target_temperature NUMERIC NOT NULL, -- Celsius
  mode VARCHAR(20) NOT NULL, -- "heat", "cool", "auto", "off"
  
  -- Schedule (JSONB array of time/temperature pairs)
  schedule JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_device_control UNIQUE (device_id, org_id)
);

CREATE INDEX idx_temperature_controls_device ON temperature_controls(device_id);
CREATE INDEX idx_temperature_controls_org ON temperature_controls(org_id);
CREATE INDEX idx_temperature_controls_active ON temperature_controls(is_active) WHERE is_active = TRUE;

-- =====================================================
-- ENERGY OPTIMIZATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS energy_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  -- Consumption data
  current_consumption NUMERIC NOT NULL, -- kWh
  target_consumption NUMERIC NOT NULL, -- kWh
  savings_percent NUMERIC NOT NULL, -- Percentage saved
  
  -- Recommendations
  recommendations JSONB NOT NULL,
  
  -- Timestamp
  optimized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_energy_optimizations_device ON energy_optimizations(device_id);
CREATE INDEX idx_energy_optimizations_org ON energy_optimizations(org_id);
CREATE INDEX idx_energy_optimizations_optimized_at ON energy_optimizations(optimized_at DESC);

-- =====================================================
-- MAINTENANCE RECORDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  
  -- Maintenance info
  maintenance_type VARCHAR(50) NOT NULL, -- "filter_replacement", "calibration", "maintenance", "repair"
  description TEXT,
  cost NUMERIC,
  
  -- Timestamps
  maintenance_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performed_by UUID
);

CREATE INDEX idx_maintenance_records_device ON maintenance_records(device_id);
CREATE INDEX idx_maintenance_records_org ON maintenance_records(org_id);
CREATE INDEX idx_maintenance_records_type ON maintenance_records(maintenance_type);
CREATE INDEX idx_maintenance_records_date ON maintenance_records(maintenance_date DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY iot_devices_tenant_isolation ON iot_devices
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY temperature_readings_tenant_isolation ON temperature_readings
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY temperature_controls_tenant_isolation ON temperature_controls
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY energy_optimizations_tenant_isolation ON energy_optimizations
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY maintenance_records_tenant_isolation ON maintenance_records
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);
