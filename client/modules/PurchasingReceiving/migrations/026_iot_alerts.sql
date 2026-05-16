-- Migration 026: IoT Alert System & Automation Rules
-- Adds: Alert definitions, alert instances, automation rules
-- Triggers: Spoilage warnings, device offline alerts, anomaly detection

-- ============================================================================
-- ALERT RULES (Define when to trigger alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('temperature', 'humidity', 'weight', 'movement', 'spoilage', 'device_offline', 'battery_low', 'signal_weak', 'custom')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('threshold', 'range', 'change_rate', 'pattern', 'custom')),
  
  -- Threshold values
  threshold_value DECIMAL(10, 3),
  threshold_operator TEXT CHECK (threshold_operator IN ('>', '<', '>=', '<=', '==', '!=')),
  min_value DECIMAL(10, 3),
  max_value DECIMAL(10, 3),
  
  -- Change rate (e.g., temperature changes > 2C per minute)
  change_rate DECIMAL(10, 3),
  change_rate_unit TEXT,  -- 'per_minute', 'per_hour', etc
  
  -- Conditions
  duration_seconds INTEGER,  -- Alert only if condition true for X seconds
  min_occurrences INTEGER DEFAULT 1,  -- Number of readings before alert
  
  -- Notifications
  notify_roles TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ['outlet_manager', 'organization_admin']
  notify_channels TEXT[] DEFAULT ARRAY['in_app'],  -- 'in_app', 'email', 'sms', 'webhook'
  escalate_after_minutes INTEGER,  -- Re-notify after X minutes if unresolved
  
  enabled BOOLEAN DEFAULT TRUE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by TEXT,  -- User email
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX iot_alert_rules_org_idx ON iot_alert_rules (organization_id);
CREATE INDEX iot_alert_rules_outlet_idx ON iot_alert_rules (outlet_id);
CREATE INDEX iot_alert_rules_type_idx ON iot_alert_rules (alert_type);
CREATE INDEX iot_alert_rules_enabled_idx ON iot_alert_rules (enabled) WHERE enabled = TRUE;

-- ============================================================================
-- ALERT INSTANCES (Actual triggered alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  alert_rule_id UUID REFERENCES iot_alert_rules(id) ON DELETE SET NULL,
  device_id UUID REFERENCES iot_devices(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reading_value DECIMAL(10, 3),  -- The value that triggered it
  expected_value DECIMAL(10, 3),  -- What we expected
  threshold DECIMAL(10, 3),  -- Alert threshold
  
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  related_data JSONB DEFAULT '{}'::JSONB,  -- {device_name: 'Reader 1', location: 'Storage', etc}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX iot_alerts_org_idx ON iot_alerts (organization_id, outlet_id, created_at DESC);
CREATE INDEX iot_alerts_status_idx ON iot_alerts (status) WHERE status IN ('open', 'acknowledged');
CREATE INDEX iot_alerts_severity_idx ON iot_alerts (severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX iot_alerts_device_idx ON iot_alerts (device_id);
CREATE INDEX iot_alerts_product_idx ON iot_alerts (product_id);
CREATE INDEX iot_alerts_created_idx ON iot_alerts (created_at DESC);

-- ============================================================================
-- AUTOMATION ACTIONS (What to do when alert triggers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot_automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_rule_id UUID NOT NULL REFERENCES iot_alert_rules(id) ON DELETE CASCADE,
  
  action_type TEXT NOT NULL CHECK (action_type IN ('notification', 'auto_order', 'adjust_par', 'reduce_par', 'move_item', 'quarantine', 'webhook', 'workflow')),
  action_name TEXT,
  description TEXT,
  
  -- Action-specific parameters
  action_params JSONB DEFAULT '{}'::JSONB,  -- {quantity: 100, supplier_id: 'xxx', reduction_percent: 20, etc}
  
  -- Execution settings
  auto_execute BOOLEAN DEFAULT FALSE,  -- Auto-execute or manual review?
  requires_approval BOOLEAN DEFAULT TRUE,
  approval_roles TEXT[] DEFAULT ARRAY['outlet_manager'],
  
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX iot_automation_actions_alert_idx ON iot_automation_actions (alert_rule_id);
CREATE INDEX iot_automation_actions_org_idx ON iot_automation_actions (organization_id);
CREATE INDEX iot_automation_actions_type_idx ON iot_automation_actions (action_type);

-- ============================================================================
-- AUTOMATION EXECUTIONS (Log of when actions were triggered)
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot_automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  automation_action_id UUID REFERENCES iot_automation_actions(id) ON DELETE SET NULL,
  alert_id UUID REFERENCES iot_alerts(id) ON DELETE SET NULL,
  
  action_type TEXT NOT NULL,
  execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  
  triggered_by TEXT,  -- User email or 'system'
  input_data JSONB DEFAULT '{}'::JSONB,  -- Data used to execute
  result_data JSONB DEFAULT '{}'::JSONB,  -- Result of execution
  error_message TEXT,
  
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX iot_automation_executions_org_idx ON iot_automation_executions (organization_id, created_at DESC);
CREATE INDEX iot_automation_executions_status_idx ON iot_automation_executions (execution_status);
CREATE INDEX iot_automation_executions_alert_idx ON iot_automation_executions (alert_id);

-- ============================================================================
-- ALERT NOTIFICATION LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS iot_alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES iot_alerts(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT,
  notification_channel TEXT CHECK (notification_channel IN ('email', 'sms', 'in_app', 'webhook')),
  
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX iot_alert_notifications_alert_idx ON iot_alert_notifications (alert_id);
CREATE INDEX iot_alert_notifications_recipient_idx ON iot_alert_notifications (recipient_email);
CREATE INDEX iot_alert_notifications_status_idx ON iot_alert_notifications (delivery_status);
