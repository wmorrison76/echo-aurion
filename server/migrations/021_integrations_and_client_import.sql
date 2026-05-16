-- Migration: Integrations Framework and Client Import System
-- Creates tables for integrations (Teams, Slack, webhooks) and client import tracking
-- All text fields support i18n translation keys

-- Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('teams', 'slack', 'webhook', 'custom')),
  name VARCHAR(255) NOT NULL,
  name_key VARCHAR(255), -- i18n key: "integrations.teams"
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  credentials JSONB DEFAULT '{}'::jsonb, -- Encrypted in production
  permissions JSONB DEFAULT '[]'::jsonb,
  last_sync TIMESTAMPTZ,
  sync_status VARCHAR(20) CHECK (sync_status IN ('success', 'error', 'pending')),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, type, name)
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_key VARCHAR(255), -- i18n key
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}'::jsonb,
  retry_count INT DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  last_success TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration Events (for tracking)
CREATE TABLE IF NOT EXISTS integration_events (
  id VARCHAR(255) PRIMARY KEY,
  integration_id VARCHAR(255) NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INT DEFAULT 0,
  error TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Client Import Sessions
CREATE TABLE IF NOT EXISTS client_import_sessions (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('csv', 'excel')),
  field_mapping JSONB DEFAULT '{}'::jsonb,
  validation_results JSONB DEFAULT '[]'::jsonb,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Import Results
CREATE TABLE IF NOT EXISTS client_import_results (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('csv', 'excel')),
  total_rows INT NOT NULL,
  successful INT DEFAULT 0,
  failed INT DEFAULT 0,
  duplicates INT DEFAULT 0,
  skipped INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients Table (if not exists)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(50),
  address_zip VARCHAR(20),
  address_country VARCHAR(100) DEFAULT 'USA',
  event_type VARCHAR(100),
  budget DECIMAL(12, 2),
  guest_count INT,
  notes TEXT,
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_integration ON integration_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_timestamp ON integration_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_client_import_sessions_org ON client_import_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_client_import_sessions_user ON client_import_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_client_import_results_org ON client_import_results(org_id);
CREATE INDEX IF NOT EXISTS idx_client_import_results_uploaded ON client_import_results(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(org_id, email);

-- Video Calls Table (for native collaboration)
CREATE TABLE IF NOT EXISTS video_calls (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_key VARCHAR(255), -- i18n key: "video.call.title"
  description TEXT,
  description_key VARCHAR(255), -- i18n key
  participants UUID[] NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
  recording BOOLEAN DEFAULT false,
  recording_url TEXT,
  breakout_rooms JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(255) PRIMARY KEY,
  channel_id VARCHAR(255) NOT NULL,
  sender_id UUID NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_key VARCHAR(255), -- i18n key
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'file', 'image', 'voice', 'system')),
  attachments JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '[]'::jsonb,
  thread_id VARCHAR(255),
  mentions UUID[],
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT false
);

-- Chat Channels Table
CREATE TABLE IF NOT EXISTS chat_channels (
  id VARCHAR(255) PRIMARY KEY,
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_key VARCHAR(255), -- i18n key: "chat.channel.name"
  description TEXT,
  description_key VARCHAR(255), -- i18n key
  type VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
  members UUID[] NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presence Statuses Table
CREATE TABLE IF NOT EXISTS presence_statuses (
  user_id UUID PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  status_key VARCHAR(255), -- i18n key: "presence.status.online"
  message TEXT,
  message_key VARCHAR(255), -- i18n key
  location VARCHAR(255),
  location_key VARCHAR(255), -- i18n key
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  activity VARCHAR(255),
  activity_key VARCHAR(255), -- i18n key
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collaboration tables
CREATE INDEX IF NOT EXISTS idx_video_calls_org ON video_calls(org_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_created ON video_calls(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(org_id);
CREATE INDEX IF NOT EXISTS idx_presence_statuses_last_seen ON presence_statuses(last_seen);
