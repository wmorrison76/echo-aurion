-- Migration 025: Sensor Telemetry Data
-- Adds: Sensor readings (temperature, humidity, weight)
-- Tracks: Spoilage risk, equipment status, inventory counts

-- ============================================================================
-- SENSOR READING TYPES (Enum-like)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensor_reading_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,  -- 'celsius', 'kg', 'humidity %', etc
  data_type TEXT CHECK (data_type IN ('numeric', 'boolean', 'text')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SENSOR READINGS (Temperature, humidity, weight from devices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,  -- High throughput, use bigserial
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  reading_type TEXT NOT NULL,  -- 'temperature', 'humidity', 'weight', 'pressure'
  value DECIMAL(10, 3) NOT NULL,
  unit TEXT NOT NULL,  -- 'celsius', '%', 'kg', 'hPa'
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'suspect', 'error')),
  metadata JSONB DEFAULT '{}'::JSONB,  -- {antenna: 1, location: 'storage A', etc}
  read_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX sensor_readings_org_outlet_idx ON sensor_readings (organization_id, outlet_id, read_at DESC);
CREATE INDEX sensor_readings_device_idx ON sensor_readings (device_id);
CREATE INDEX sensor_readings_type_idx ON sensor_readings (reading_type);
CREATE INDEX sensor_readings_status_idx ON sensor_readings (status) WHERE status != 'valid';
-- Partial index on recent readings
CREATE INDEX sensor_readings_recent_idx ON sensor_readings (read_at DESC) WHERE read_at > now() - interval '7 days';

-- Table partitioning by month (recommended)
-- Can be enabled later with: SELECT create_range_partitions_on_date_field('sensor_readings', 'read_at', 'month');

-- ============================================================================
-- HOURLY AGGREGATES (For performance - roll up raw readings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensor_readings_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  reading_type TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  avg_value DECIMAL(10, 3),
  min_value DECIMAL(10, 3),
  max_value DECIMAL(10, 3),
  reading_count INTEGER,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, reading_type, hour_start)
);

CREATE INDEX sensor_readings_hourly_org_idx ON sensor_readings_hourly (organization_id, outlet_id, hour_start DESC);
CREATE INDEX sensor_readings_hourly_device_idx ON sensor_readings_hourly (device_id, hour_start DESC);

-- ============================================================================
-- DAILY AGGREGATES (For long-term trending)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensor_readings_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  reading_type TEXT NOT NULL,
  day_start DATE NOT NULL,
  avg_value DECIMAL(10, 3),
  min_value DECIMAL(10, 3),
  max_value DECIMAL(10, 3),
  reading_count INTEGER,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, reading_type, day_start)
);

CREATE INDEX sensor_readings_daily_org_idx ON sensor_readings_daily (organization_id, outlet_id, day_start DESC);
CREATE INDEX sensor_readings_daily_device_idx ON sensor_readings_daily (device_id, day_start DESC);

-- ============================================================================
-- WEIGHT READINGS (Specialized for scales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS weight_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  weight_kg DECIMAL(10, 3) NOT NULL,
  expected_weight_kg DECIMAL(10, 3),
  variance_percent DECIMAL(5, 2),  -- Actual vs expected
  material TEXT,  -- 'liquid', 'dry', 'meat', 'produce', etc
  container_type TEXT,  -- 'bag', 'box', 'case', 'bin', etc
  is_spoilage_risk BOOLEAN DEFAULT FALSE,
  notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX weight_readings_device_idx ON weight_readings (device_id);
CREATE INDEX weight_readings_product_idx ON weight_readings (product_id);
CREATE INDEX weight_readings_org_idx ON weight_readings (organization_id, outlet_id, measured_at DESC);
CREATE INDEX weight_readings_spoilage_idx ON weight_readings (is_spoilage_risk) WHERE is_spoilage_risk = TRUE;

-- ============================================================================
-- SPOILAGE PREDICTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS spoilage_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category TEXT,  -- 'produce', 'meat', 'dairy', 'dry', 'spirits', etc
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score DECIMAL(3, 2),  -- 0.0 to 1.0
  temperature_avg DECIMAL(5, 2),
  temperature_max DECIMAL(5, 2),
  humidity_avg DECIMAL(5, 2),
  storage_days INTEGER,
  predicted_spoilage_date DATE,
  factors JSONB DEFAULT '{}'::JSONB,  -- {temp_high: true, stored_too_long: true, etc}
  recommended_action TEXT,  -- "Use first", "Move to cold storage", "Dispose", etc
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX spoilage_predictions_org_idx ON spoilage_predictions (organization_id, outlet_id);
CREATE INDEX spoilage_predictions_product_idx ON spoilage_predictions (product_id);
CREATE INDEX spoilage_predictions_risk_idx ON spoilage_predictions (risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX spoilage_predictions_date_idx ON spoilage_predictions (predicted_spoilage_date);

-- ============================================================================
-- TEMPERATURE/HUMIDITY COMPLIANCE (For cold storage monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS temperature_compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES iot_devices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('threshold_exceeded', 'threshold_cleared', 'sensor_malfunction')),
  threshold_type TEXT CHECK (threshold_type IN ('high_temp', 'low_temp', 'high_humidity', 'low_humidity')),
  threshold_value DECIMAL(5, 2),
  recorded_value DECIMAL(5, 2),
  duration_seconds INTEGER,  -- How long it was out of spec
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX temperature_compliance_device_idx ON temperature_compliance_events (device_id);
CREATE INDEX temperature_compliance_org_idx ON temperature_compliance_events (organization_id, outlet_id);
CREATE INDEX temperature_compliance_unresolved_idx ON temperature_compliance_events (cleared_at) WHERE cleared_at IS NULL;
CREATE INDEX temperature_compliance_severity_idx ON temperature_compliance_events (severity) WHERE severity = 'critical';
