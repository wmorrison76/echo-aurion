-- Migration: Resort 21-day forecast expansion
-- Purpose: Store resort-wide forecast days, outlet splits, components, and activations
-- Date: 2026-01-21

-- Extend outlet taxonomy for resort categories
ALTER TABLE calendar_outlets
  ADD COLUMN IF NOT EXISTS resort_category VARCHAR(50)
  CHECK (resort_category IN (
    'restaurant',
    'pool',
    'cabana',
    'day_pass',
    'banquet_catering',
    'non_restaurant_outlet'
  ));

CREATE INDEX IF NOT EXISTS idx_calendar_outlets_resort_category
  ON calendar_outlets(resort_category);

-- Resort-wide forecast rollup by day
CREATE TABLE IF NOT EXISTS resort_forecast_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  forecast_date DATE NOT NULL,
  capacity INT DEFAULT 0,
  ooo INT DEFAULT 0,
  occ_pct NUMERIC(6, 4) DEFAULT 0,
  rooms INT DEFAULT 0,
  revenue NUMERIC(14, 2) DEFAULT 0,
  adr NUMERIC(12, 2) DEFAULT 0,
  arrivals INT DEFAULT 0,
  departures INT DEFAULT 0,
  guest_count INT DEFAULT 0,
  forecast_occ_pct NUMERIC(6, 4) DEFAULT 0,
  pickup_rooms INT DEFAULT 0,
  pickup_revenue NUMERIC(14, 2) DEFAULT 0,
  pickup_adr NUMERIC(12, 2) DEFAULT 0,
  actual_guest_count INT DEFAULT 0,
  actual_revenue NUMERIC(14, 2) DEFAULT 0,
  forecast_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, forecast_date, forecast_version)
);

CREATE INDEX IF NOT EXISTS idx_resort_forecast_days_org_date
  ON resort_forecast_days(org_id, forecast_date);

-- Outlet + meal period forecast rows
CREATE TABLE IF NOT EXISTS resort_forecast_outlet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_day_id UUID NOT NULL REFERENCES resort_forecast_days(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  meal_period VARCHAR(20) NOT NULL
    CHECK (meal_period IN ('breakfast', 'lunch', 'dinner', 'late_night', 'all_day')),
  echoai_forecast INT DEFAULT 0,
  user_override INT DEFAULT 0,
  final_forecast INT DEFAULT 0,
  confidence NUMERIC(4, 3) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(forecast_day_id, outlet_id, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_resort_forecast_outlet_day
  ON resort_forecast_outlet(forecast_day_id, outlet_id);

-- Component breakdown for explainability
CREATE TABLE IF NOT EXISTS resort_forecast_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_outlet_id UUID NOT NULL REFERENCES resort_forecast_outlet(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL,
  value NUMERIC(14, 4) DEFAULT 0,
  coefficient NUMERIC(10, 4) DEFAULT 1,
  source VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resort_forecast_components_outlet
  ON resort_forecast_components(forecast_outlet_id, component_type);

-- Group blocks (banquet / catering)
CREATE TABLE IF NOT EXISTS resort_group_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  group_name TEXT NOT NULL,
  block_date DATE NOT NULL,
  rooms INT DEFAULT 0,
  guests INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'definite',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resort_group_blocks_org_date
  ON resort_group_blocks(org_id, block_date);

-- Activations line (sales/marketing events)
CREATE TABLE IF NOT EXISTS resort_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  activation_date DATE NOT NULL,
  name TEXT NOT NULL,
  impact_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resort_activations_org_date
  ON resort_activations(org_id, activation_date);
