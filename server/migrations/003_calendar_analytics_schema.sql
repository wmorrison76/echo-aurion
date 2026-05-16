/**
 * Calendar Analytics Schema
 * Enables revenue tracking, capacity planning, and KPI dashboards
 * 
 * Tables:
 * - calendar_analytics: Snapshots of key metrics
 * - calendar_forecasts: Revenue and capacity predictions
 * - calendar_kpis: KPI definitions and thresholds
 * - calendar_daily_stats: Materialized view for dashboard performance
 */

-- =====================================================
-- ANALYTICS TABLE
-- =====================================================

CREATE TABLE calendar_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  
  -- Date range
  date_snapshot DATE NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Revenue metrics
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  average_revenue_per_event DECIMAL(15, 2) DEFAULT 0,
  revenue_per_guest DECIMAL(10, 2) DEFAULT 0,
  
  -- Event metrics
  total_events INTEGER DEFAULT 0,
  confirmed_events INTEGER DEFAULT 0,
  pending_events INTEGER DEFAULT 0,
  cancelled_events INTEGER DEFAULT 0,
  
  -- Capacity metrics
  total_guest_count INTEGER DEFAULT 0,
  average_guest_count INTEGER DEFAULT 0,
  max_guest_count INTEGER DEFAULT 0,
  capacity_utilization_percent DECIMAL(5, 2) DEFAULT 0,
  
  -- Conflict metrics
  total_conflicts INTEGER DEFAULT 0,
  resolved_conflicts INTEGER DEFAULT 0,
  unresolved_conflicts INTEGER DEFAULT 0,
  conflict_resolution_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Department breakdown
  department_count INTEGER DEFAULT 0,
  top_department VARCHAR(255),
  
  -- Time metrics
  average_event_duration_minutes INTEGER DEFAULT 0,
  peak_hour_start SMALLINT,
  peak_hour_end SMALLINT,
  
  -- Data quality
  data_completeness_percent DECIMAL(5, 2) DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_analytics_org_date 
  ON calendar_analytics(org_id, date_snapshot DESC);
CREATE INDEX idx_calendar_analytics_outlet_date 
  ON calendar_analytics(outlet_id, date_snapshot DESC);
CREATE INDEX idx_calendar_analytics_period 
  ON calendar_analytics(period_start, period_end);

-- =====================================================
-- FORECASTS TABLE
-- =====================================================

CREATE TABLE calendar_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  
  -- Forecast metadata
  forecast_type VARCHAR(50) NOT NULL, -- 'revenue', 'capacity', 'conflict'
  forecast_date DATE NOT NULL,
  forecast_horizon_days INTEGER NOT NULL,
  
  -- Forecast data
  metric_name VARCHAR(255) NOT NULL,
  predicted_value DECIMAL(15, 2) NOT NULL,
  lower_bound DECIMAL(15, 2),
  upper_bound DECIMAL(15, 2),
  confidence_percent DECIMAL(5, 2) NOT NULL,
  
  -- Actual vs predicted
  actual_value DECIMAL(15, 2),
  accuracy_percent DECIMAL(5, 2),
  
  -- Model info
  model_version VARCHAR(50),
  trained_on_days INTEGER,
  last_trained TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_forecasts_org_type 
  ON calendar_forecasts(org_id, forecast_type, forecast_date DESC);
CREATE INDEX idx_calendar_forecasts_outlet 
  ON calendar_forecasts(outlet_id, forecast_date DESC);
CREATE INDEX idx_calendar_forecasts_accuracy 
  ON calendar_forecasts(accuracy_percent DESC)
  WHERE actual_value IS NOT NULL;

-- =====================================================
-- KPI TABLE
-- =====================================================

CREATE TABLE calendar_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- KPI definition
  kpi_name VARCHAR(255) NOT NULL, -- 'revenue_target', 'capacity_utilization', etc
  kpi_type VARCHAR(50) NOT NULL, -- 'numeric', 'percentage', 'ratio'
  
  -- Thresholds
  target_value DECIMAL(15, 2) NOT NULL,
  warning_threshold DECIMAL(15, 2),
  critical_threshold DECIMAL(15, 2),
  
  -- Period
  period_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Calculation
  calculation_method VARCHAR(500), -- How to calculate this KPI
  data_source VARCHAR(255), -- Which table/view to pull from
  
  -- Status
  current_value DECIMAL(15, 2),
  status VARCHAR(20), -- 'on-track', 'warning', 'critical', 'exceeded'
  variance_percent DECIMAL(5, 2),
  
  -- Metadata
  description TEXT,
  owner VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_kpis_org_active 
  ON calendar_kpis(org_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_calendar_kpis_period 
  ON calendar_kpis(period_start, period_end);

-- =====================================================
-- MATERIALIZED VIEW FOR DASHBOARD
-- =====================================================

CREATE MATERIALIZED VIEW calendar_analytics_dashboard AS
SELECT
  DATE(e.start_time) AS event_date,
  e.org_id,
  e.outlet_id,
  o.name AS outlet_name,
  
  -- Event counts
  COUNT(*) AS total_events,
  COUNT(CASE WHEN e.status = 'confirmed' THEN 1 END) AS confirmed_events,
  COUNT(CASE WHEN e.status = 'pending' THEN 1 END) AS pending_events,
  COUNT(CASE WHEN e.status = 'cancelled' THEN 1 END) AS cancelled_events,
  
  -- Revenue
  COALESCE(SUM(e.revenue), 0) AS total_revenue,
  COALESCE(AVG(e.revenue), 0) AS avg_revenue,
  COALESCE(MAX(e.revenue), 0) AS max_revenue,
  
  -- Guests
  COALESCE(SUM(e.guest_count), 0) AS total_guests,
  COALESCE(AVG(e.guest_count)::INTEGER, 0) AS avg_guests,
  COALESCE(MAX(e.guest_count), 0) AS max_guests,
  
  -- Metrics
  COUNT(DISTINCT e.department) AS departments,
  COUNT(DISTINCT e.location_room) AS locations,
  
  -- Time info
  AVG(EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 60)::INTEGER AS avg_duration_minutes,
  MIN(e.start_time) AS earliest_event,
  MAX(e.end_time) AS latest_event
FROM calendar_events e
LEFT JOIN calendar_outlets o ON e.outlet_id = o.id
WHERE e.status != 'cancelled'
GROUP BY DATE(e.start_time), e.org_id, e.outlet_id, o.name;

CREATE INDEX idx_analytics_dashboard_date 
  ON calendar_analytics_dashboard(event_date DESC);
CREATE INDEX idx_analytics_dashboard_org 
  ON calendar_analytics_dashboard(org_id, event_date DESC);

-- =====================================================
-- ANALYTICS CALCULATION FUNCTIONS
-- =====================================================

/**
 * Calculate daily analytics for an organization
 */
CREATE OR REPLACE FUNCTION calculate_daily_analytics(
  p_org_id UUID,
  p_date DATE
)
RETURNS void AS $$
DECLARE
  v_outlet_id UUID;
  v_revenue DECIMAL(15, 2);
  v_events INTEGER;
BEGIN
  -- Calculate for each outlet
  FOR v_outlet_id IN
    SELECT DISTINCT outlet_id FROM calendar_outlets
    WHERE org_id = p_org_id
  LOOP
    INSERT INTO calendar_analytics (
      org_id, outlet_id, date_snapshot, period_start, period_end,
      total_revenue, confirmed_events, total_events, total_guest_count
    )
    SELECT
      p_org_id,
      v_outlet_id,
      p_date,
      p_date::TIMESTAMP WITH TIME ZONE,
      (p_date + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE,
      COALESCE(SUM(revenue), 0),
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END),
      COUNT(*),
      COALESCE(SUM(guest_count), 0)
    FROM calendar_events
    WHERE org_id = p_org_id
      AND outlet_id = v_outlet_id
      AND DATE(start_time) = p_date
      AND status != 'cancelled'
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY calendar_analytics_dashboard;
END;
$$ LANGUAGE plpgsql;

/**
 * Calculate forecast for revenue
 */
CREATE OR REPLACE FUNCTION calculate_revenue_forecast(
  p_org_id UUID,
  p_outlet_id UUID,
  p_days_ahead INTEGER
)
RETURNS TABLE(
  forecast_date DATE,
  predicted_revenue DECIMAL(15, 2),
  confidence DECIMAL(5, 2)
) AS $$
DECLARE
  v_avg_revenue DECIMAL(15, 2);
  v_std_dev DECIMAL(15, 2);
BEGIN
  -- Calculate average revenue over last 30 days
  SELECT 
    AVG(total_revenue),
    STDDEV(total_revenue)
  INTO v_avg_revenue, v_std_dev
  FROM calendar_analytics
  WHERE org_id = p_org_id
    AND (p_outlet_id IS NULL OR outlet_id = p_outlet_id)
    AND date_snapshot >= NOW()::DATE - INTERVAL '30 days';
  
  -- Return forecast for next p_days_ahead days
  RETURN QUERY
  SELECT
    (NOW()::DATE + (n || ' days')::INTERVAL)::DATE,
    v_avg_revenue,
    CASE 
      WHEN v_std_dev IS NULL THEN 100.0
      ELSE GREATEST(50.0, 100.0 - (ABS(v_std_dev) / NULLIF(v_avg_revenue, 0) * 100))
    END
  FROM generate_series(1, p_days_ahead) AS n;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULE DAILY ANALYTICS CALCULATION
-- =====================================================

-- Run daily at 2 AM UTC to calculate previous day's analytics
-- In production, use pg_cron or external scheduler:
-- SELECT cron.schedule('calculate_daily_analytics', '0 2 * * *', 
--   'SELECT calculate_daily_analytics(org_id, NOW()::DATE - 1) 
--    FROM (SELECT DISTINCT org_id FROM calendar_events) AS orgs');

-- =====================================================
-- VERIFY SCHEMA
-- =====================================================

-- Check tables exist:
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename LIKE 'calendar_analytics%';

-- Check materialized view:
-- SELECT schemaname, matviewname FROM pg_matviews 
-- WHERE matviewname = 'calendar_analytics_dashboard';

-- Check functions:
-- SELECT proname FROM pg_proc 
-- WHERE proname LIKE 'calculate_%' AND pronamespace = 'public'::regnamespace;
