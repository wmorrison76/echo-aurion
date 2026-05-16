-- Demand Forecasting and Predictive Analytics Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Demand forecasts
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecasted_quantity NUMERIC(14,4) NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.75,
  forecast_model TEXT NOT NULL DEFAULT 'ml_ensemble' CHECK (forecast_model IN ('exponential_smoothing', 'arima', 'ml_ensemble')),
  lower_bound NUMERIC(14,4),
  upper_bound NUMERIC(14,4),
  factors TEXT[],
  accuracy NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demand_forecasts_org_outlet_idx
  ON demand_forecasts (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS demand_forecasts_item_idx
  ON demand_forecasts (item_id);
CREATE INDEX IF NOT EXISTS demand_forecasts_date_idx
  ON demand_forecasts (forecast_date DESC);
CREATE INDEX IF NOT EXISTS demand_forecasts_confidence_idx
  ON demand_forecasts (confidence_score DESC);

-- Forecast accuracy metrics
CREATE TABLE IF NOT EXISTS forecast_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  forecast_model TEXT NOT NULL,
  mae NUMERIC(10,4),
  rmse NUMERIC(10,4),
  mape NUMERIC(5,2),
  r2 NUMERIC(5,4),
  sample_size INT,
  evaluation_period_days INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forecast_accuracy_org_outlet_idx
  ON forecast_accuracy_metrics (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS forecast_accuracy_model_idx
  ON forecast_accuracy_metrics (forecast_model);

-- Seasonal patterns
CREATE TABLE IF NOT EXISTS seasonal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  day_of_week INT,
  month_of_year INT,
  seasonal_index NUMERIC(5,3),
  frequency INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seasonal_patterns_org_item_idx
  ON seasonal_patterns (organization_id, item_id);

-- Demand anomalies
CREATE TABLE IF NOT EXISTS demand_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  anomaly_date DATE NOT NULL,
  expected_quantity NUMERIC(14,4),
  actual_quantity NUMERIC(14,4),
  deviation_percent NUMERIC(5,2),
  anomaly_type TEXT CHECK (anomaly_type IN ('spike', 'drop', 'trend_change')),
  root_cause TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demand_anomalies_org_outlet_idx
  ON demand_anomalies (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS demand_anomalies_date_idx
  ON demand_anomalies (anomaly_date DESC);
CREATE INDEX IF NOT EXISTS demand_anomalies_type_idx
  ON demand_anomalies (anomaly_type);

-- Forecast feedback and model updates
CREATE TABLE IF NOT EXISTS forecast_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_id UUID NOT NULL REFERENCES demand_forecasts(id) ON DELETE CASCADE,
  actual_quantity NUMERIC(14,4),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  helpful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forecast_feedback_forecast_idx
  ON forecast_feedback (forecast_id);
CREATE INDEX IF NOT EXISTS forecast_feedback_org_idx
  ON forecast_feedback (organization_id);

-- Forecast-driven reorder recommendations
CREATE TABLE IF NOT EXISTS reorder_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES standard_products(id) ON DELETE CASCADE,
  recommended_quantity NUMERIC(14,4) NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  reason TEXT,
  forecast_id UUID REFERENCES demand_forecasts(id) ON DELETE SET NULL,
  order_created BOOLEAN DEFAULT FALSE,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reorder_recommendations_org_outlet_idx
  ON reorder_recommendations (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS reorder_recommendations_urgency_idx
  ON reorder_recommendations (urgency);
CREATE INDEX IF NOT EXISTS reorder_recommendations_expires_idx
  ON reorder_recommendations (expires_at);

-- RLS Policies
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_accuracy_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_recommendations ENABLE ROW LEVEL SECURITY;

-- User can access forecasts for their organization
CREATE POLICY forecasts_user_access ON demand_forecasts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access metrics for their organization
CREATE POLICY metrics_user_access ON forecast_accuracy_metrics
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access anomalies for their organization
CREATE POLICY anomalies_user_access ON demand_anomalies
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access reorder recommendations for their organization
CREATE POLICY reorder_user_access ON reorder_recommendations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS demand_forecasts_created_at_idx
  ON demand_forecasts (created_at DESC);
CREATE INDEX IF NOT EXISTS reorder_recommendations_created_at_idx
  ON reorder_recommendations (created_at DESC);
