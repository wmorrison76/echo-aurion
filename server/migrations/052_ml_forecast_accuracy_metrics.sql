/**
 * ML Forecast Accuracy Metrics Schema
 * Stores accuracy metrics for ML labor forecasting models
 */

-- =====================================================
-- ML FORECAST ACCURACY METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ml_forecast_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Metric definition
  metric_type VARCHAR(50) NOT NULL, -- "labor_hours", "labor_cost", "staff_count"
  
  -- Accuracy metrics
  mape NUMERIC NOT NULL, -- Mean Absolute Percentage Error
  mae NUMERIC NOT NULL, -- Mean Absolute Error
  rmse NUMERIC NOT NULL, -- Root Mean Squared Error
  accuracy_percent NUMERIC NOT NULL, -- 100 - MAPE
  
  -- Evaluation period
  evaluation_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  evaluation_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Timestamp
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ml_accuracy_metrics_org ON ml_forecast_accuracy_metrics(org_id);
CREATE INDEX idx_ml_accuracy_metrics_type ON ml_forecast_accuracy_metrics(metric_type);
CREATE INDEX idx_ml_accuracy_metrics_evaluated ON ml_forecast_accuracy_metrics(evaluated_at DESC);
CREATE INDEX idx_ml_accuracy_metrics_period ON ml_forecast_accuracy_metrics(evaluation_period_start, evaluation_period_end);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ml_forecast_accuracy_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY ml_accuracy_metrics_tenant_isolation ON ml_forecast_accuracy_metrics
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE ml_forecast_accuracy_metrics IS 'Stores accuracy metrics for ML labor forecasting models over evaluation periods';
