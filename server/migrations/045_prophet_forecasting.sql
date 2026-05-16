/**
 * Prophet Forecasting Schema
 * Enables ML-based time-series forecasting with Prophet
 */

-- =====================================================
-- PROPHET FORECASTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS prophet_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Forecast definition
  metric_type VARCHAR(50) NOT NULL, -- "labor_hours", "guest_count", "revenue", "cost"
  forecast_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Prediction
  predicted_value NUMERIC NOT NULL,
  lower_bound NUMERIC NOT NULL,
  upper_bound NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL, -- 0-1
  
  -- Model components
  seasonality JSONB, -- { daily, weekly, monthly, yearly }
  trend JSONB, -- { slope, changepoints }
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_metric_date UNIQUE (org_id, metric_type, forecast_date)
);

CREATE INDEX idx_prophet_forecasts_org ON prophet_forecasts(org_id);
CREATE INDEX idx_prophet_forecasts_metric ON prophet_forecasts(metric_type);
CREATE INDEX idx_prophet_forecasts_date ON prophet_forecasts(forecast_date DESC);

-- =====================================================
-- PROPHET FORECAST ACCURACY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS prophet_forecast_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  
  -- Accuracy metrics
  mape NUMERIC NOT NULL, -- Mean Absolute Percentage Error
  mae NUMERIC NOT NULL, -- Mean Absolute Error
  rmse NUMERIC NOT NULL, -- Root Mean Squared Error
  r2 NUMERIC NOT NULL, -- R-squared
  accuracy_percent NUMERIC NOT NULL, -- 100 - MAPE
  
  -- Timestamp
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prophet_accuracy_model ON prophet_forecast_accuracy(model_id);
CREATE INDEX idx_prophet_accuracy_metric ON prophet_forecast_accuracy(metric_type);
CREATE INDEX idx_prophet_accuracy_evaluated ON prophet_forecast_accuracy(evaluated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE prophet_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prophet_forecast_accuracy ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY prophet_forecasts_tenant_isolation ON prophet_forecasts
  FOR ALL
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY prophet_accuracy_tenant_isolation ON prophet_forecast_accuracy
  FOR ALL
  USING (TRUE); -- Accuracy metrics can be shared across orgs for benchmarking
