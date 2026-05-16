-- Migration: Comprehensive Forecast System Expansion
-- Purpose: Reservations, hotel PMS, POS, forecast aggregation tables
-- Date: 2026-01-28

-- =====================================================
-- RESTAURANT RESERVATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  outlet_name VARCHAR(255),
  reservation_date DATE NOT NULL,
  time TIME,
  party_size INT DEFAULT 1,
  guest_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'confirmed',
  source VARCHAR(100),
  external_id TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_org_date
  ON reservations(org_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_outlet_date
  ON reservations(outlet_id, reservation_date) WHERE outlet_id IS NOT NULL;

-- =====================================================
-- HOTEL PMS INTEGRATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS hotel_pms_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  pms_type TEXT NOT NULL,
  api_endpoint TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_pms_org ON hotel_pms_integrations(org_id);

CREATE TABLE IF NOT EXISTS hotel_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  pms_reservation_id TEXT,
  pms_type TEXT,
  guest_name TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  room_count INT DEFAULT 0,
  guest_count INT DEFAULT 0,
  room_type TEXT,
  rate_code TEXT,
  total_revenue NUMERIC(12, 2),
  status TEXT DEFAULT 'confirmed',
  raw_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_org_dates
  ON hotel_reservations(org_id, check_in_date, check_out_date);

CREATE TABLE IF NOT EXISTS hotel_guest_spending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  reservation_id UUID REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  guest_id TEXT,
  date DATE NOT NULL,
  outlet_name TEXT,
  spending_category TEXT,
  amount NUMERIC(12, 2) DEFAULT 0,
  transaction_count INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_guest_spending_org_date
  ON hotel_guest_spending(org_id, date);

-- =====================================================
-- POS INTEGRATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS pos_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  pos_type TEXT NOT NULL,
  api_endpoint TEXT,
  location_id TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_integrations_org ON pos_integrations(org_id);

CREATE TABLE IF NOT EXISTS pos_sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  pos_transaction_id TEXT,
  pos_type TEXT,
  date DATE NOT NULL,
  time TIME,
  meal_period VARCHAR(20),
  revenue NUMERIC(14, 2) DEFAULT 0,
  guest_count INT DEFAULT 0,
  item_count INT DEFAULT 0,
  table_number TEXT,
  server_name TEXT,
  raw_data JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_org_outlet_date
  ON pos_sales_data(org_id, outlet_id, date);

-- =====================================================
-- FORECAST AGGREGATION TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS forecast_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  date DATE NOT NULL,
  outlet_id UUID,
  meal_period VARCHAR(20) NOT NULL,
  guest_count INT DEFAULT 0,
  revenue NUMERIC(14, 2),
  source VARCHAR(50) NOT NULL,
  source_id TEXT,
  confidence NUMERIC(4, 3) DEFAULT 0.5,
  raw JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_data_points_org_date
  ON forecast_data_points(org_id, date, outlet_id, meal_period);

CREATE TABLE IF NOT EXISTS forecast_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  date DATE NOT NULL,
  outlet_id UUID,
  meal_period VARCHAR(20) NOT NULL,
  guest_count INT DEFAULT 0,
  revenue NUMERIC(14, 2),
  source_weights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, date, outlet_id, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_forecast_aggregations_org_date
  ON forecast_aggregations(org_id, date);

CREATE TABLE IF NOT EXISTS forecast_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  date DATE NOT NULL,
  meal_period VARCHAR(20),
  forecast_guest_count INT DEFAULT 0,
  actual_guest_count INT DEFAULT 0,
  forecast_revenue NUMERIC(14, 2),
  actual_revenue NUMERIC(14, 2),
  variance_guest INT DEFAULT 0,
  variance_revenue NUMERIC(14, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_variances_org_outlet_date
  ON forecast_variances(org_id, outlet_id, date);

CREATE TABLE IF NOT EXISTS forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  algorithm VARCHAR(100),
  parameters JSONB DEFAULT '{}',
  trained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, outlet_id)
);

CREATE TABLE IF NOT EXISTS forecast_lock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  date DATE NOT NULL,
  meal_period VARCHAR(20),
  locked_guest_count INT DEFAULT 0,
  locked_revenue NUMERIC(14, 2),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, outlet_id, date, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_forecast_lock_ins_org_date
  ON forecast_lock_ins(org_id, date);

CREATE TABLE IF NOT EXISTS forecast_refinements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  date DATE NOT NULL,
  meal_period VARCHAR(20),
  refinement_type VARCHAR(50),
  previous_value NUMERIC(14, 4),
  new_value NUMERIC(14, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  date DATE NOT NULL,
  recommendation_type VARCHAR(50),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_recommendations_org_date
  ON forecast_recommendations(org_id, date);
