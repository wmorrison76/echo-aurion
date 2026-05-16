-- Manager Alert Dashboard System
-- Real-time alerts for inventory shortages, discrepancies, invoicing issues

CREATE TABLE IF NOT EXISTS alert_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'inventory_shortage', 'inventory_variance', 'receiving_discrepancy',
    'invoice_issue', 'payment_overdue', 'vendor_notification',
    'quality_issue', 'system_error'
  )),
  alert_name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT TRUE,
  threshold_value NUMERIC(14,4),
  threshold_type TEXT CHECK (threshold_type IN ('absolute', 'percentage', 'count')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, alert_type)
);

CREATE INDEX IF NOT EXISTS alert_defs_org_type_idx ON alert_definitions(organization_id, alert_type);

CREATE TABLE IF NOT EXISTS manager_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_definition_id UUID NOT NULL REFERENCES alert_definitions(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  action_required BOOLEAN DEFAULT TRUE,
  reference_type TEXT CHECK (reference_type IN (
    'shipment', 'invoice', 'inventory', 'vendor', 'payment', 'receiving'
  )),
  reference_id UUID,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_org_status_idx ON manager_alerts(organization_id, status);
CREATE INDEX IF NOT EXISTS alerts_outlet_idx ON manager_alerts(outlet_id, status);
CREATE INDEX IF NOT EXISTS alerts_severity_idx ON manager_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_reference_idx ON manager_alerts(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS alerts_created_idx ON manager_alerts(created_at DESC);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  min_severity TEXT DEFAULT 'medium' CHECK (min_severity IN ('low', 'medium', 'high', 'critical')),
  outlet_ids UUID[] DEFAULT '{}',
  delivery_methods TEXT[] DEFAULT '{dashboard}',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, alert_type)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON alert_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_org_idx ON alert_subscriptions(organization_id);

CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES manager_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('dashboard', 'email', 'sms', 'push')),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'read')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON alert_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS notifications_alert_idx ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS notifications_status_idx ON alert_notifications(delivery_status);

CREATE TABLE IF NOT EXISTS alert_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_resolved BOOLEAN DEFAULT FALSE,
  auto_refresh_seconds INT DEFAULT 30 CHECK (auto_refresh_seconds >= 10 AND auto_refresh_seconds <= 300),
  filter_severity TEXT DEFAULT 'medium',
  filter_outlet_ids UUID[] DEFAULT '{}',
  custom_filters JSONB,
  layout_preference TEXT DEFAULT 'cards' CHECK (layout_preference IN ('cards', 'list', 'timeline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS prefs_user_idx ON alert_dashboard_preferences(user_id);

CREATE TABLE IF NOT EXISTS alert_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  time_to_escalate_minutes INT DEFAULT 60,
  escalate_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  escalate_to_email TEXT,
  escalate_to_phone TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, alert_type, time_to_escalate_minutes)
);

CREATE INDEX IF NOT EXISTS escalation_rules_org_type_idx ON alert_escalation_rules(organization_id, alert_type);

CREATE TABLE IF NOT EXISTS alert_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES manager_alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'acknowledged', 'resolved', 'dismissed', 'escalated')),
  action_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_notes TEXT,
  previous_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_alert_idx ON alert_audit_log(alert_id);
CREATE INDEX IF NOT EXISTS audit_log_org_idx ON alert_audit_log(organization_id, created_at DESC);

-- RLS POLICIES

ALTER TABLE alert_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY definitions_org_access ON alert_definitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY alerts_org_access ON manager_alerts
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = manager_alerts.outlet_id
      OR manager_alerts.outlet_id IS NULL
    )
  );

CREATE POLICY alerts_acknowledge ON manager_alerts
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = manager_alerts.outlet_id
      OR manager_alerts.outlet_id IS NULL
    )
  );

CREATE POLICY subscriptions_user_access ON alert_subscriptions
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY notifications_user_access ON alert_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY preferences_user_access ON alert_dashboard_preferences
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY escalation_rules_org_access ON alert_escalation_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

CREATE POLICY audit_log_org_access ON alert_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
    )
  );

-- VIEWS AND FUNCTIONS FOR DASHBOARD

CREATE OR REPLACE VIEW alert_summary_by_severity AS
SELECT
  organization_id,
  severity,
  COUNT(*) as alert_count
FROM manager_alerts
WHERE status = 'active'
GROUP BY organization_id, severity;

CREATE OR REPLACE VIEW alert_summary_by_type AS
SELECT
  organization_id,
  alert_type,
  COUNT(*) as alert_count,
  MAX(severity) as max_severity
FROM manager_alerts
WHERE status = 'active'
GROUP BY organization_id, alert_type;

CREATE OR REPLACE VIEW alert_summary_by_outlet AS
SELECT
  organization_id,
  outlet_id,
  COUNT(*) as alert_count,
  MAX(severity) as max_severity
FROM manager_alerts
WHERE status = 'active' AND outlet_id IS NOT NULL
GROUP BY organization_id, outlet_id;

-- PERFORMANCE INDEXES

CREATE INDEX IF NOT EXISTS alerts_composite_idx ON manager_alerts(
  organization_id, outlet_id, status, severity, created_at DESC
);

CREATE INDEX IF NOT EXISTS notifications_composite_idx ON alert_notifications(
  user_id, delivery_status, read_at
);
