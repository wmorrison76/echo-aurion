-- Exception Auto-Resolution Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Business exceptions table
CREATE TABLE IF NOT EXISTS exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'price_variance',
    'quantity_variance',
    'receiving_discrepancy',
    'deadline_missed',
    'compliance_issue',
    'inventory_anomaly'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  reference_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'auto_resolved', 'manual_resolved', 'escalated')),
  auto_resolution_attempted BOOLEAN DEFAULT FALSE,
  auto_resolution_method TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exceptions_org_outlet_idx
  ON exceptions (organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS exceptions_status_idx
  ON exceptions (status);
CREATE INDEX IF NOT EXISTS exceptions_type_idx
  ON exceptions (type);
CREATE INDEX IF NOT EXISTS exceptions_severity_idx
  ON exceptions (severity);
CREATE INDEX IF NOT EXISTS exceptions_created_at_idx
  ON exceptions (created_at DESC);

-- Exception rules for auto-resolution
CREATE TABLE IF NOT EXISTS exception_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  condition TEXT NOT NULL,
  auto_resolve_threshold NUMERIC(5,2),
  resolution_action TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, exception_type, condition)
);

CREATE INDEX IF NOT EXISTS exception_rules_org_type_idx
  ON exception_rules (organization_id, exception_type);
CREATE INDEX IF NOT EXISTS exception_rules_enabled_idx
  ON exception_rules (enabled);

-- Variance thresholds configuration
CREATE TABLE IF NOT EXISTS variance_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  price_variance_percent NUMERIC(5,2) DEFAULT 5.0,
  quantity_variance_percent NUMERIC(5,2) DEFAULT 2.0,
  deadline_days_buffer INT DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, outlet_id)
);

CREATE INDEX IF NOT EXISTS variance_thresholds_org_idx
  ON variance_thresholds (organization_id);

-- Exception resolution audit trail
CREATE TABLE IF NOT EXISTS exception_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resolution_method TEXT NOT NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  impact_analysis TEXT,
  manual_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exception_resolutions_exception_idx
  ON exception_resolutions (exception_id);
CREATE INDEX IF NOT EXISTS exception_resolutions_org_idx
  ON exception_resolutions (organization_id);

-- Exception notifications
CREATE TABLE IF NOT EXISTS exception_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('email', 'in_app', 'sms')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exception_notifications_user_idx
  ON exception_notifications (user_id);
CREATE INDEX IF NOT EXISTS exception_notifications_exception_idx
  ON exception_notifications (exception_id);

-- RLS Policies
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE variance_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_notifications ENABLE ROW LEVEL SECURITY;

-- User can access exceptions for their organization
CREATE POLICY exceptions_user_access ON exceptions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access rules for their organization
CREATE POLICY rules_user_access ON exception_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access thresholds for their organization
CREATE POLICY thresholds_user_access ON variance_thresholds
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access resolutions for their organization
CREATE POLICY resolutions_user_access ON exception_resolutions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM outlet_memberships
      WHERE user_id = auth.uid()
    )
  );

-- User can access their own notifications
CREATE POLICY notifications_user_access ON exception_notifications
  FOR SELECT USING (user_id = auth.uid());

-- Performance indexes
CREATE INDEX IF NOT EXISTS exceptions_updated_at_idx
  ON exceptions (updated_at DESC);
CREATE INDEX IF NOT EXISTS exception_resolutions_created_at_idx
  ON exception_resolutions (created_at DESC);
