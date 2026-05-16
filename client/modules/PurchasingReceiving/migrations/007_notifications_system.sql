-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  body TEXT,
  icon VARCHAR(255),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  metadata JSONB,
  read_at TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_outlet_id ON notifications(outlet_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_template VARCHAR(255),
  body TEXT NOT NULL,
  body_template TEXT,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  variables TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(event_type)
);

CREATE INDEX idx_notification_templates_event_type ON notification_templates(event_type);
CREATE INDEX idx_notification_templates_active ON notification_templates(active);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id VARCHAR(255) NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app', 'email', 'push']::TEXT[],
  event_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  enabled BOOLEAN DEFAULT TRUE,
  unsubscribe_token VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);

-- User Push Tokens Table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  device_name VARCHAR(255),
  platform VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_is_active ON user_push_tokens(is_active);

-- WebSocket Connections Table
CREATE TABLE IF NOT EXISTS websocket_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  outlet_id UUID REFERENCES outlets(id),
  event_subscriptions TEXT[],
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  last_heartbeat TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX idx_websocket_connections_outlet_id ON websocket_connections(outlet_id);
CREATE INDEX idx_websocket_connections_connected_at ON websocket_connections(connected_at);

-- Notification Delivery Stats Table
CREATE TABLE IF NOT EXISTS notification_delivery_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5, 2) DEFAULT 0,
  open_rate DECIMAL(5, 2) DEFAULT 0,
  avg_delivery_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, date)
);

CREATE INDEX idx_notification_delivery_stats_outlet_id ON notification_delivery_stats(outlet_id);
CREATE INDEX idx_notification_delivery_stats_date ON notification_delivery_stats(date);

-- Row Level Security Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can manage their own push tokens"
  ON user_push_tokens FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
  ON user_notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Functions for notification management

CREATE OR REPLACE FUNCTION trigger_notification_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_update_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notification_update();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE recipient_id = p_user_id
    AND status != 'read'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to delete old notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update delivery stats
CREATE OR REPLACE FUNCTION update_notification_stats(p_outlet_id UUID, p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO notification_delivery_stats (outlet_id, date, total_sent, total_delivered, total_failed, total_read, delivery_rate, open_rate)
  SELECT
    p_outlet_id,
    p_date,
    COUNT(*),
    COUNT(CASE WHEN status = 'delivered' THEN 1 END),
    COUNT(CASE WHEN status = 'failed' THEN 1 END),
    COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END),
    ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END)::NUMERIC / COUNT(*) * 100, 2),
    ROUND(COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*) * 100, 2)
  FROM notifications
  WHERE outlet_id = p_outlet_id
  AND DATE(created_at) = p_date
  ON CONFLICT (outlet_id, date) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_failed = EXCLUDED.total_failed,
    total_read = EXCLUDED.total_read,
    delivery_rate = EXCLUDED.delivery_rate,
    open_rate = EXCLUDED.open_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
