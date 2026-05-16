/**
 * Unified POS Integration Schema
 * Provides centralized POS system integration for all LUCCCA modules
 * 
 * This migration creates tables for:
 * - POS configuration management
 * - POS transaction storage
 * - POS menu synchronization
 * - POS webhook logging
 * - Multi-tenant isolation
 */

-- =====================================================
-- POS CONFIGURATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pos_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  
  -- POS system identification
  pos_type VARCHAR(50) NOT NULL CHECK (pos_type IN ('toast', 'square', 'resy', 'opentable', 'lightspeed', 'margin_edge', 'other')),
  display_name VARCHAR(255),
  
  -- API credentials (should be encrypted in production)
  api_key TEXT NOT NULL,
  api_secret TEXT,
  api_token TEXT,
  
  -- Webhook configuration
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Sync configuration
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_frequency_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Additional configuration
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_outlet_pos UNIQUE (org_id, outlet_id, pos_type)
);

CREATE INDEX idx_pos_configs_org ON pos_configs(org_id);
CREATE INDEX idx_pos_configs_outlet ON pos_configs(outlet_id);
CREATE INDEX idx_pos_configs_type ON pos_configs(pos_type);
CREATE INDEX idx_pos_configs_active ON pos_configs(active) WHERE active = TRUE;
CREATE INDEX idx_pos_configs_last_sync ON pos_configs(last_sync_at) WHERE sync_enabled = TRUE;

-- =====================================================
-- POS TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_transaction_id VARCHAR(255) NOT NULL,
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  
  -- Transaction details
  check_id VARCHAR(255),
  check_number VARCHAR(255),
  table_number VARCHAR(100),
  server_name VARCHAR(255),
  
  -- Items (stored as JSONB array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Financial breakdown
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tip DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  
  -- Payment information
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('pending', 'completed', 'refunded', 'voided')),
  
  -- Transaction metadata
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pos_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pos_transaction UNIQUE (pos_transaction_id, org_id, outlet_id)
);

CREATE INDEX idx_pos_transactions_org ON pos_transactions(org_id);
CREATE INDEX idx_pos_transactions_outlet ON pos_transactions(outlet_id);
CREATE INDEX idx_pos_transactions_date ON pos_transactions(transaction_date);
CREATE INDEX idx_pos_transactions_pos_type ON pos_transactions(pos_type);
CREATE INDEX idx_pos_transactions_payment_status ON pos_transactions(payment_status);
CREATE INDEX idx_pos_transactions_check_id ON pos_transactions(check_id) WHERE check_id IS NOT NULL;
CREATE INDEX idx_pos_transactions_created_at ON pos_transactions(created_at DESC);

-- GIN index for JSONB items search
CREATE INDEX idx_pos_transactions_items_gin ON pos_transactions USING GIN (items);

-- =====================================================
-- POS MENU ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pos_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_item_id VARCHAR(255) NOT NULL,
  org_id UUID NOT NULL,
  outlet_id UUID,
  pos_type VARCHAR(50) NOT NULL,
  
  -- Menu item details
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  sku VARCHAR(100),
  
  -- Availability
  available BOOLEAN DEFAULT TRUE,
  
  -- Modifiers (stored as JSONB)
  modifiers JSONB,
  
  -- Sync metadata
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_version INTEGER DEFAULT 1,
  
  -- Additional metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pos_menu_item UNIQUE (pos_item_id, org_id, outlet_id, pos_type)
);

CREATE INDEX idx_pos_menu_items_org ON pos_menu_items(org_id);
CREATE INDEX idx_pos_menu_items_outlet ON pos_menu_items(outlet_id);
CREATE INDEX idx_pos_menu_items_pos_type ON pos_menu_items(pos_type);
CREATE INDEX idx_pos_menu_items_category ON pos_menu_items(category);
CREATE INDEX idx_pos_menu_items_available ON pos_menu_items(available) WHERE available = TRUE;
CREATE INDEX idx_pos_menu_items_last_synced ON pos_menu_items(last_synced_at);

-- =====================================================
-- POS WEBHOOK LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pos_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  pos_type VARCHAR(50) NOT NULL,
  
  -- Webhook details
  webhook_type VARCHAR(100),
  payload JSONB NOT NULL,
  signature TEXT,
  signature_valid BOOLEAN,
  
  -- Processing status
  status VARCHAR(50) NOT NULL DEFAULT 'received', -- "received", "processed", "failed", "ignored"
  error_message TEXT,
  transaction_id UUID REFERENCES pos_transactions(id),
  
  -- Timestamps
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB
);

CREATE INDEX idx_pos_webhook_log_org ON pos_webhook_log(org_id);
CREATE INDEX idx_pos_webhook_log_outlet ON pos_webhook_log(outlet_id);
CREATE INDEX idx_pos_webhook_log_pos_type ON pos_webhook_log(pos_type);
CREATE INDEX idx_pos_webhook_log_status ON pos_webhook_log(status);
CREATE INDEX idx_pos_webhook_log_received_at ON pos_webhook_log(received_at DESC);
CREATE INDEX idx_pos_webhook_log_transaction ON pos_webhook_log(transaction_id) WHERE transaction_id IS NOT NULL;

-- =====================================================
-- POS SYNC STATUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pos_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  pos_type VARCHAR(50) NOT NULL,
  
  -- Sync status
  sync_status VARCHAR(50) NOT NULL DEFAULT 'idle', -- "idle", "syncing", "success", "failed"
  
  -- Timing
  last_attempted_sync TIMESTAMP WITH TIME ZONE,
  last_successful_sync TIMESTAMP WITH TIME ZONE,
  next_scheduled_sync TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  transactions_pending INTEGER DEFAULT 0,
  transactions_processed_today INTEGER DEFAULT 0,
  
  -- Error tracking
  last_error TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pos_sync_status UNIQUE (org_id, outlet_id, pos_type)
);

CREATE INDEX idx_pos_sync_status_org ON pos_sync_status(org_id);
CREATE INDEX idx_pos_sync_status_outlet ON pos_sync_status(outlet_id);
CREATE INDEX idx_pos_sync_status_pos_type ON pos_sync_status(pos_type);
CREATE INDEX idx_pos_sync_status_status ON pos_sync_status(sync_status);
CREATE INDEX idx_pos_sync_status_next_sync ON pos_sync_status(next_scheduled_sync) WHERE sync_status = 'idle';

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE pos_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_configs
CREATE POLICY pos_configs_tenant_isolation ON pos_configs
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- RLS Policies for pos_transactions
CREATE POLICY pos_transactions_tenant_isolation ON pos_transactions
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- RLS Policies for pos_menu_items
CREATE POLICY pos_menu_items_tenant_isolation ON pos_menu_items
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- RLS Policies for pos_webhook_log
CREATE POLICY pos_webhook_log_tenant_isolation ON pos_webhook_log
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- RLS Policies for pos_sync_status
CREATE POLICY pos_sync_status_tenant_isolation ON pos_sync_status
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::uuid);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pos_configs_updated_at
  BEFORE UPDATE ON pos_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_transactions_updated_at
  BEFORE UPDATE ON pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_menu_items_updated_at
  BEFORE UPDATE ON pos_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_sync_status_updated_at
  BEFORE UPDATE ON pos_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE pos_configs IS 'Configuration for POS system integrations per organization/outlet';
COMMENT ON TABLE pos_transactions IS 'Transactions synced from POS systems';
COMMENT ON TABLE pos_menu_items IS 'Menu items synced from POS systems';
COMMENT ON TABLE pos_webhook_log IS 'Audit log for webhooks received from POS systems';
COMMENT ON TABLE pos_sync_status IS 'Status tracking for POS sync operations';
