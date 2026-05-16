/**
 * PHASE 0: ENTERPRISE FOUNDATION - Day 2 Task 2
 * AI Decision Metrics Tables
 * 
 * These tables track:
 * 1. Forecast decisions (AI staffing recommendations with versions)
 * 2. KPI snapshots (daily/hourly KPI tracking)
 * 3. Shift predictions (overtime predictions for individuals)
 * 
 * Used for:
 * - AI decision audit trail
 * - Forecast accuracy tracking
 * - Model retraining and improvement
 * - Executive dashboards
 */

-- Forecast decisions table
-- Logs every AI decision made for staffing recommendations
CREATE TABLE IF NOT EXISTS forecast_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  decision_id VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'forecast-2024-01-15-loc123-v1'
  version INT NOT NULL DEFAULT 1, -- increments for revaluations
  parent_decision_id UUID, -- reference to previous version if revaluation
  
  -- Forecast window
  forecast_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Predictions from AI
  predicted_staffing_need INT NOT NULL, -- number of employees needed
  predicted_sales_revenue DECIMAL(12, 2) NOT NULL,
  predicted_covers INT NOT NULL,
  ai_confidence DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00
  
  -- Revaluation tracking
  revaluation_count INT DEFAULT 0,
  
  -- Actual outcomes (filled later when shift completes)
  actual_staffing_scheduled INT,
  actual_sales_revenue DECIMAL(12, 2),
  actual_covers INT,
  actual_labor_hours DECIMAL(10, 2),
  
  -- Accuracy metrics
  forecast_accuracy DECIMAL(5, 2), -- percentage
  notes TEXT,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_decision_id) REFERENCES forecast_decisions(id) ON DELETE SET NULL
);

-- Enable RLS on forecast_decisions
ALTER TABLE forecast_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY forecast_decisions_org_isolation ON forecast_decisions
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Indexes for forecast decisions
CREATE INDEX IF NOT EXISTS idx_forecast_decisions_org_id_forecast_date 
  ON forecast_decisions(org_id, forecast_date DESC);

CREATE INDEX IF NOT EXISTS idx_forecast_decisions_decision_id 
  ON forecast_decisions(decision_id);

CREATE INDEX IF NOT EXISTS idx_forecast_decisions_parent_id 
  ON forecast_decisions(parent_decision_id);

CREATE INDEX IF NOT EXISTS idx_forecast_decisions_location_date 
  ON forecast_decisions(location_id, forecast_date DESC);

-- KPI snapshots table
-- Captures daily/hourly KPI snapshots for trending and analysis
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  snapshot_time TIMESTAMPTZ NOT NULL,
  
  -- Financial metrics
  sales_total DECIMAL(12, 2) NOT NULL,
  labor_cost DECIMAL(12, 2) NOT NULL,
  labor_pct DECIMAL(5, 2) NOT NULL, -- (labor_cost / sales_total) * 100, 0-100%
  
  -- Staffing metrics
  staffing_efficiency DECIMAL(5, 2) NOT NULL, -- actual hours / forecasted hours * 100
  scheduled_staff INT,
  clocked_staff INT,
  
  -- Performance metrics
  no_show_count INT DEFAULT 0,
  covers INT DEFAULT 0,
  revenue_per_labor_hour DECIMAL(10, 2),
  covers_per_labor_hour DECIMAL(10, 2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Enable RLS on kpi_snapshots
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY kpi_snapshots_org_isolation ON kpi_snapshots
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Indexes for KPI snapshots
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_org_id_snapshot_time 
  ON kpi_snapshots(org_id, snapshot_time DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_location_time 
  ON kpi_snapshots(location_id, snapshot_time DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_labor_pct 
  ON kpi_snapshots(org_id, labor_pct);

-- Shift predictions table
-- Tracks AI predictions for individual employees (overtime, no-show risk, etc.)
CREATE TABLE IF NOT EXISTS shift_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Prediction details
  prediction_type VARCHAR(50) NOT NULL, -- 'overtime', 'no_show_risk', 'break_violation'
  predicted_date DATE NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL, -- 0.00 to 1.00
  
  -- When prediction was made
  trigger_date DATE NOT NULL,
  
  -- Prediction specifics
  predicted_hours DECIMAL(10, 2),
  overtime_expected_hours DECIMAL(10, 2),
  no_show_risk_pct DECIMAL(5, 2),
  
  -- Actual outcome (filled after day completes)
  actual_hours DECIMAL(10, 2),
  actual_outcome VARCHAR(50), -- 'overtime_confirmed', 'no_show', 'on_time', 'accurate'
  accuracy_score DECIMAL(3, 2), -- 0-1.0
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Enable RLS on shift_predictions
ALTER TABLE shift_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_predictions_org_isolation ON shift_predictions
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Indexes for shift predictions
CREATE INDEX IF NOT EXISTS idx_shift_predictions_org_id_predicted_date 
  ON shift_predictions(org_id, predicted_date DESC);

CREATE INDEX IF NOT EXISTS idx_shift_predictions_employee_date 
  ON shift_predictions(employee_id, predicted_date DESC);

CREATE INDEX IF NOT EXISTS idx_shift_predictions_confidence 
  ON shift_predictions(org_id, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_shift_predictions_type 
  ON shift_predictions(prediction_type, confidence DESC);

-- Model metrics table
-- Tracks AI model performance over time for monitoring and improvement
CREATE TABLE IF NOT EXISTS model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  model_name VARCHAR(100) NOT NULL, -- 'demand_forecaster', 'staffing_optimizer', 'no_show_predictor'
  metric_date DATE NOT NULL,
  
  -- Accuracy metrics
  mae DECIMAL(10, 4), -- mean absolute error
  rmse DECIMAL(10, 4), -- root mean square error
  accuracy_pct DECIMAL(5, 2),
  precision_pct DECIMAL(5, 2),
  recall_pct DECIMAL(5, 2),
  f1_score DECIMAL(5, 4),
  
  -- Volume metrics
  predictions_made INT,
  correct_predictions INT,
  
  -- Performance vs baseline
  improvement_vs_baseline DECIMAL(5, 2), -- percentage
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
);

-- Enable RLS on model_metrics
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY model_metrics_org_isolation ON model_metrics
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Index for model metrics
CREATE INDEX IF NOT EXISTS idx_model_metrics_model_date 
  ON model_metrics(model_name, metric_date DESC);

-- Revaluation history table
-- Tracks how forecast decisions change over time
CREATE TABLE IF NOT EXISTS decision_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  forecast_decision_id UUID NOT NULL,
  
  -- What changed
  revision_number INT NOT NULL,
  change_reason VARCHAR(255), -- 'demand_increase', 'availability_change', 'schedule_conflict'
  
  -- Before/after values
  old_staffing_need INT,
  new_staffing_need INT,
  old_sales_forecast DECIMAL(12, 2),
  new_sales_forecast DECIMAL(12, 2),
  old_ai_confidence DECIMAL(3, 2),
  new_ai_confidence DECIMAL(3, 2),
  
  -- Metadata
  revised_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (forecast_decision_id) REFERENCES forecast_decisions(id) ON DELETE CASCADE
);

-- Enable RLS on decision_revisions
ALTER TABLE decision_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_revisions_org_isolation ON decision_revisions
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Index for decision revisions
CREATE INDEX IF NOT EXISTS idx_decision_revisions_decision_id 
  ON decision_revisions(forecast_decision_id, revision_number);

-- Materialized view: forecast accuracy trending
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_forecast_accuracy_trend AS
SELECT 
  org_id,
  location_id,
  DATE_TRUNC('day', forecast_date)::DATE as day,
  DATE_TRUNC('week', forecast_date)::DATE as week,
  DATE_TRUNC('month', forecast_date)::DATE as month,
  COUNT(*) as total_forecasts,
  COUNT(CASE WHEN forecast_accuracy >= 90 THEN 1 END) as accurate_count,
  AVG(forecast_accuracy) as avg_accuracy,
  MIN(forecast_accuracy) as min_accuracy,
  MAX(forecast_accuracy) as max_accuracy,
  STDDEV(forecast_accuracy) as stddev_accuracy
FROM forecast_decisions
WHERE forecast_accuracy IS NOT NULL
GROUP BY org_id, location_id, DATE_TRUNC('day', forecast_date), DATE_TRUNC('week', forecast_date), DATE_TRUNC('month', forecast_date);

CREATE INDEX IF NOT EXISTS idx_mv_forecast_accuracy_org_date 
  ON mv_forecast_accuracy_trend(org_id, day DESC);

-- Verify table creation
SELECT 
  'forecast_decisions' as table_name, COUNT(*) as row_count 
FROM forecast_decisions
UNION ALL
SELECT 'kpi_snapshots', COUNT(*) FROM kpi_snapshots
UNION ALL
SELECT 'shift_predictions', COUNT(*) FROM shift_predictions
UNION ALL
SELECT 'model_metrics', COUNT(*) FROM model_metrics
UNION ALL
SELECT 'decision_revisions', COUNT(*) FROM decision_revisions;
