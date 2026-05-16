-- Migration: Create Email Parsing & Outlook Sync Schema
-- Purpose: Track email sources for events, sync state with Outlook, and AI parsing metadata
-- Date: 2025-01-15
-- Features: Email message tracking, Outlook sync state, AI parsing results, natural language history

-- =====================================================
-- EMAIL SOURCE TRACKING TABLE
-- =====================================================
-- Tracks which emails created which calendar events
CREATE TABLE IF NOT EXISTS calendar_event_email_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  
  email_message_id VARCHAR(500) NOT NULL, -- Outlook message ID or email UID
  email_from VARCHAR(255) NOT NULL,
  email_from_name VARCHAR(255),
  email_subject TEXT NOT NULL,
  email_body_preview TEXT,
  email_received_at TIMESTAMP WITH TIME ZONE,
  
  is_forward_chain BOOLEAN DEFAULT FALSE,
  original_sender_email VARCHAR(255),
  forwarded_chain_length INTEGER DEFAULT 0,
  
  parsed_by_ai BOOLEAN DEFAULT FALSE,
  ai_confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  ai_parsing_error TEXT,
  
  outlook_sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT confidence_range CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(event_id, email_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_sources_event ON calendar_event_email_sources(event_id);
CREATE INDEX IF NOT EXISTS idx_email_sources_message_id ON calendar_event_email_sources(email_message_id);
CREATE INDEX IF NOT EXISTS idx_email_sources_from ON calendar_event_email_sources(email_from);

-- =====================================================
-- OUTLOOK CALENDAR SYNC STATE TABLE
-- =====================================================
-- Tracks sync state of events with Outlook calendars
CREATE TABLE IF NOT EXISTS calendar_outlook_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  integration_id UUID NOT NULL,
  
  outlook_event_id VARCHAR(500),
  outlook_change_key VARCHAR(255),
  
  sync_status VARCHAR(30) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'syncing', 'failed', 'conflict', 'archived')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_attempt_at TIMESTAMP WITH TIME ZONE,
  sync_error_message TEXT,
  sync_retry_count INTEGER DEFAULT 0,
  
  -- Conflict tracking
  has_conflict BOOLEAN DEFAULT FALSE,
  conflict_reason VARCHAR(255),
  conflict_resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Version control
  local_version_hash VARCHAR(64), -- SHA256 of local event
  outlook_version_hash VARCHAR(64), -- SHA256 of Outlook event
  
  -- Sync direction
  sync_direction VARCHAR(20) DEFAULT 'bidirectional' CHECK (sync_direction IN ('to_outlook', 'from_outlook', 'bidirectional', 'one_way')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  
  UNIQUE(event_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_state_event ON calendar_outlook_sync_state(event_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_integration ON calendar_outlook_sync_state(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON calendar_outlook_sync_state(sync_status) WHERE sync_status IN ('pending', 'failed', 'conflict');
CREATE INDEX IF NOT EXISTS idx_sync_state_outlook_event ON calendar_outlook_sync_state(outlook_event_id);

-- =====================================================
-- EMAIL PARSING CACHE TABLE
-- =====================================================
-- Caches AI parsing results for emails to avoid re-parsing
CREATE TABLE IF NOT EXISTS calendar_email_parsing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  email_message_id VARCHAR(500) NOT NULL UNIQUE,
  email_from VARCHAR(255) NOT NULL,
  email_subject TEXT NOT NULL,
  email_body_preview TEXT,
  email_received_at TIMESTAMP WITH TIME ZONE,
  
  -- Parsed fields (result of AI parsing)
  parsed_title VARCHAR(255),
  parsed_description TEXT,
  parsed_start_time TIMESTAMP WITH TIME ZONE,
  parsed_end_time TIMESTAMP WITH TIME ZONE,
  parsed_department_list TEXT[], -- Array of department names
  parsed_required_roles TEXT[], -- Array of role types
  parsed_location VARCHAR(255),
  parsed_is_mandatory BOOLEAN DEFAULT FALSE,
  parsed_mandatory_keyword VARCHAR(50), -- e.g., [MENU_LAUNCH], [TRAINING], [MANDATORY]
  
  -- AI metadata
  ai_model_version VARCHAR(50), -- e.g., 'gpt-4-turbo'
  ai_tokens_used INTEGER,
  ai_parsing_duration_ms INTEGER,
  ai_confidence_score NUMERIC(3,2),
  ai_parsing_timestamp TIMESTAMP WITH TIME ZONE,
  ai_error_message TEXT,
  
  -- Cache control
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT confidence_range CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_parse_cache_message_id ON calendar_email_parsing_cache(email_message_id);
CREATE INDEX IF NOT EXISTS idx_parse_cache_is_valid ON calendar_email_parsing_cache(is_valid) WHERE is_valid = TRUE;
CREATE INDEX IF NOT EXISTS idx_parse_cache_expires ON calendar_email_parsing_cache(expires_at) WHERE is_valid = TRUE;

-- =====================================================
-- EMAIL WEBHOOK EVENTS TABLE
-- =====================================================
-- Logs all incoming email webhook events for debugging and audit
CREATE TABLE IF NOT EXISTS calendar_email_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  webhook_timestamp TIMESTAMP WITH TIME ZONE,
  email_from VARCHAR(255) NOT NULL,
  email_subject TEXT NOT NULL,
  email_message_id VARCHAR(500) NOT NULL,
  
  webhook_payload JSONB DEFAULT '{}',
  parsing_requested BOOLEAN DEFAULT TRUE,
  parsed_event_id UUID,
  
  processing_status VARCHAR(30) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (parsed_event_id) REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_org ON calendar_email_webhook_events(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON calendar_email_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON calendar_email_webhook_events(created_at DESC);

-- =====================================================
-- OUTLOOK SUBSCRIPTION/WATCH STATE TABLE
-- =====================================================
-- Manages Outlook webhook subscriptions for real-time sync
CREATE TABLE IF NOT EXISTS calendar_outlook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  
  subscription_id VARCHAR(500) NOT NULL UNIQUE,
  resource_type VARCHAR(50) NOT NULL, -- 'me/calendar/events' or 'me/mailFolders/inbox/messages'
  
  notification_url TEXT NOT NULL,
  filter_query TEXT, -- OData filter for incoming events
  
  is_active BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  expiration_reminder_sent BOOLEAN DEFAULT FALSE,
  
  notification_count INTEGER DEFAULT 0,
  last_notification_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (integration_id) REFERENCES calendar_integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_integration ON calendar_outlook_subscriptions(integration_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON calendar_outlook_subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON calendar_outlook_subscriptions(expires_at) WHERE is_active = TRUE;

-- =====================================================
-- NATURAL LANGUAGE PARSING HISTORY TABLE
-- =====================================================
-- Audit trail for AI parsing results
CREATE TABLE IF NOT EXISTS calendar_parsing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_message_id VARCHAR(500) NOT NULL,
  
  parse_attempt_number INTEGER NOT NULL DEFAULT 1,
  ai_model_used VARCHAR(50), -- gpt-4-turbo, gpt-3.5-turbo, claude, etc
  ai_system_prompt_version VARCHAR(50),
  
  raw_email_subject TEXT,
  raw_email_body TEXT,
  
  parsed_result JSONB, -- Complete AI parsing result
  confidence_score NUMERIC(3,2),
  
  was_approved_by_user UUID, -- If user corrected the parsing
  user_corrections JSONB, -- What the user changed
  
  created_event_id UUID,
  parsing_status VARCHAR(30), -- success, rejected, needs_review, error
  error_details TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1),
  FOREIGN KEY (created_event_id) REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_parsing_history_message_id ON calendar_parsing_history(email_message_id);
CREATE INDEX IF NOT EXISTS idx_parsing_history_event_id ON calendar_parsing_history(created_event_id);
CREATE INDEX IF NOT EXISTS idx_parsing_history_status ON calendar_parsing_history(parsing_status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE calendar_event_email_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_outlook_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_email_parsing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_email_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_outlook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_parsing_history ENABLE ROW LEVEL SECURITY;

-- Email sources visible to event owners
CREATE POLICY email_sources_view_policy ON calendar_event_email_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND ce.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Sync state visible to org members
CREATE POLICY sync_state_view_policy ON calendar_outlook_sync_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND ce.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Webhook events visible to admins
CREATE POLICY webhook_events_view_policy ON calendar_email_webhook_events
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- =====================================================
-- TRIGGERS FOR AUTO TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_sync_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sync_state_timestamp
BEFORE UPDATE ON calendar_outlook_sync_state
FOR EACH ROW
EXECUTE FUNCTION update_sync_state_timestamp();

CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_timestamp
BEFORE UPDATE ON calendar_outlook_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscription_timestamp();

COMMIT;
