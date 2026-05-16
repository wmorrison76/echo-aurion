-- Migration: ForecastHub capture rates and transient overrides
-- Purpose: Per-outlet capture rate % and per-day transient (outside) guest count
-- Date: 2026-01

-- =====================================================
-- OUTLET CAPTURE RATES (percent of hotel guests captured by outlet)
-- =====================================================
CREATE TABLE IF NOT EXISTS outlet_capture_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  capture_rate_percent NUMERIC(6, 2) NOT NULL DEFAULT 100 CHECK (capture_rate_percent >= 0 AND capture_rate_percent <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, outlet_id)
);

CREATE INDEX IF NOT EXISTS idx_outlet_capture_rates_org ON outlet_capture_rates(org_id);

-- Optional: per-meal override for finer granularity
CREATE TABLE IF NOT EXISTS outlet_capture_rate_meal_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  meal_period VARCHAR(20) NOT NULL,
  capture_rate_percent NUMERIC(6, 2) NOT NULL DEFAULT 100 CHECK (capture_rate_percent >= 0 AND capture_rate_percent <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, outlet_id, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_outlet_capture_meal_org ON outlet_capture_rate_meal_overrides(org_id);

-- =====================================================
-- TRANSIENT (OUTSIDE) GUEST COUNT PER DAY (user-editable)
-- =====================================================
CREATE TABLE IF NOT EXISTS forecast_transient_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  date DATE NOT NULL,
  transient_guest_count INT NOT NULL DEFAULT 0 CHECK (transient_guest_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, date)
);

CREATE INDEX IF NOT EXISTS idx_forecast_transient_org_date ON forecast_transient_override(org_id, date);
