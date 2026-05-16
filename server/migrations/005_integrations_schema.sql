/**
 * Calendar Integrations Schema
 * Tables for OAuth token storage, sync management, and webhooks
 * Supports Outlook, Google Calendar, and custom webhooks
 */

-- =====================================================
-- CALENDAR INTEGRATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('outlook', 'google', 'slack')),
  provider_account_id VARCHAR(255),
  provider_display_name VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
  last_error TEXT,
  error_count INT DEFAULT 0,
  consecutive_failures INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,

  CONSTRAINT fk_integrations_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_integrations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_calendar_integrations_org_id ON calendar_integrations(org_id);
CREATE INDEX idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX idx_calendar_integrations_is_active ON calendar_integrations(is_active);
CREATE INDEX idx_calendar_integrations_sync_status ON calendar_integrations(sync_status);
CREATE INDEX idx_calendar_integrations_last_sync ON calendar_integrations(last_sync_at);

-- =====================================================
-- SYNC LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  sync_type VARCHAR(50) NOT NULL DEFAULT 'incremental' CHECK (sync_type IN ('full', 'incremental', 'manual')),
  status VARCHAR(50) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'success', 'partial', 'failed')),
  direction VARCHAR(50) NOT NULL DEFAULT 'bidirectional' CHECK (direction IN ('bidirectional', 'incoming', 'outgoing')),
  events_created INT NOT NULL DEFAULT 0,
  events_updated INT NOT NULL DEFAULT 0,
  events_deleted INT NOT NULL DEFAULT 0,
  conflicts_detected INT NOT NULL DEFAULT 0,
  conflicts_resolved INT NOT NULL DEFAULT 0,
  errors TEXT[],
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_sync_logs_integration FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE
);

CREATE INDEX idx_integration_sync_logs_integration_id ON calendar_integration_sync_logs(integration_id);
CREATE INDEX idx_integration_sync_logs_status ON calendar_integration_sync_logs(status);
CREATE INDEX idx_integration_sync_logs_started_at ON calendar_integration_sync_logs(started_at DESC);
CREATE INDEX idx_integration_sync_logs_completed_at ON calendar_integration_sync_logs(completed_at DESC);

-- =====================================================
-- WEBHOOKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  integration_id UUID REFERENCES calendar_integrations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  webhook_url VARCHAR(2048) NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INT DEFAULT 100,
  max_retries INT DEFAULT 3,
  retry_delay_ms INT DEFAULT 1000,
  timeout_ms INT DEFAULT 30000,
  headers JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  last_tested_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_webhooks_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_calendar_webhooks_org_id ON calendar_webhooks(org_id);
CREATE INDEX idx_calendar_webhooks_integration_id ON calendar_webhooks(integration_id);
CREATE INDEX idx_calendar_webhooks_is_active ON calendar_webhooks(is_active);
CREATE INDEX idx_calendar_webhooks_created_at ON calendar_webhooks(created_at DESC);

-- =====================================================
-- WEBHOOK EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255),
  event_data JSONB NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'skipped')),
  delivery_attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_error_message TEXT,
  http_status_code INT,
  response_body TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT fk_webhook_events_webhook FOREIGN KEY (webhook_id) REFERENCES calendar_webhooks(id) ON DELETE CASCADE
);

CREATE INDEX idx_webhook_events_webhook_id ON calendar_webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_delivery_status ON calendar_webhook_events(delivery_status);
CREATE INDEX idx_webhook_events_created_at ON calendar_webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_next_retry ON calendar_webhook_events(next_retry_at) WHERE delivery_status = 'pending';

-- =====================================================
-- INTEGRATION TOKENS HISTORY TABLE (for audit)
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_integration_token_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  token_type VARCHAR(50) NOT NULL, -- 'access_token', 'refresh_token'
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_token_history_integration FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE
);

CREATE INDEX idx_token_history_integration_id ON calendar_integration_token_history(integration_id);
CREATE INDEX idx_token_history_expires_at ON calendar_integration_token_history(expires_at);

-- =====================================================
-- SYNC CHANGE TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_integration_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  source_system VARCHAR(50) NOT NULL CHECK (source_system IN ('luccca', 'outlook', 'google')),
  external_event_id VARCHAR(255),
  change_data JSONB,
  sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  last_sync_attempt TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_changes_integration FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  CONSTRAINT fk_changes_event FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE
);

CREATE INDEX idx_integration_changes_integration_id ON calendar_integration_changes(integration_id);
CREATE INDEX idx_integration_changes_event_id ON calendar_integration_changes(event_id);
CREATE INDEX idx_integration_changes_sync_status ON calendar_integration_changes(sync_status);
CREATE INDEX idx_integration_changes_source ON calendar_integration_changes(source_system);
CREATE INDEX idx_integration_changes_created ON calendar_integration_changes(created_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_calendar_integrations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calendar_integrations_updated_at
BEFORE UPDATE ON calendar_integrations
FOR EACH ROW
EXECUTE FUNCTION update_calendar_integrations_timestamp();

CREATE OR REPLACE FUNCTION update_calendar_webhooks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calendar_webhooks_updated_at
BEFORE UPDATE ON calendar_webhooks
FOR EACH ROW
EXECUTE FUNCTION update_calendar_webhooks_timestamp();

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

INSERT INTO schema_migrations (version, name, executed_at) 
VALUES ('005', 'integrations_schema', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;
