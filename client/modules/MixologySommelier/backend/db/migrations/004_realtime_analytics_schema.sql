-- Alerts table for storing all alerts
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(255) PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  INDEX idx_venue_created (venue_id, created_at),
  INDEX idx_severity (severity),
  INDEX idx_alert_type (alert_type),
  INDEX idx_acknowledged (acknowledged)
);

-- Notification preferences for users
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_alerts BOOLEAN DEFAULT true,
  sms_alerts BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  alert_types JSONB DEFAULT '[]',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (venue_id, user_id),
  INDEX idx_venue_user (venue_id, user_id)
);

-- Forecasts table for storing generated sales forecasts
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_qty DECIMAL(10, 2) NOT NULL,
  confidence_lower DECIMAL(10, 2),
  confidence_upper DECIMAL(10, 2),
  confidence_score DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_venue_date (venue_id, forecast_date),
  INDEX idx_item_date (item_id, forecast_date)
);

-- Anomalies detection log
CREATE TABLE IF NOT EXISTS anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  anomaly_type VARCHAR(100) NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL,
  description TEXT,
  recommended_action TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  INDEX idx_venue_detected (venue_id, detected_at),
  INDEX idx_resolved (resolved)
);

-- Sync operations log
CREATE TABLE IF NOT EXISTS sync_operations (
  id VARCHAR(255) PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  items_processed INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT,
  error_message TEXT,
  INDEX idx_venue_date (venue_id, started_at),
  INDEX idx_status (status)
);

-- Inventory optimization recommendations
CREATE TABLE IF NOT EXISTS inventory_optimization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  current_qty DECIMAL(10, 2),
  avg_daily_sales DECIMAL(10, 2),
  days_of_stock DECIMAL(10, 2),
  optimal_stock DECIMAL(10, 2),
  recommendation VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_venue_item (venue_id, item_id)
);

-- Real-time event log for audit trail
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_venue_type (venue_id, event_type),
  INDEX idx_created (created_at)
);

-- Revenue analysis snapshots
CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  transaction_count INT,
  total_revenue DECIMAL(12, 2),
  avg_transaction_value DECIMAL(10, 2),
  total_margin DECIMAL(12, 2),
  unique_items INT,
  margin_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (venue_id, snapshot_date),
  INDEX idx_venue_date (venue_id, snapshot_date)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_alerts_venue_created ON alerts(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged ON alerts(venue_id, acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_anomaly_unresolved ON anomaly_detections(venue_id, resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_sync_active ON sync_operations(venue_id, status) WHERE status IN ('pending', 'in_progress');

-- Add trigger to update notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_update_timestamp ON notification_preferences;
CREATE TRIGGER notification_preferences_update_timestamp
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_updated_at();
