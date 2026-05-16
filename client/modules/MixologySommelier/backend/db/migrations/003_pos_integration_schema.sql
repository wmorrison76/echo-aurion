-- POS Integration Schema
-- This migration creates tables for POS system integration, real-time sync, and dynamic pricing

-- POS Configuration table
CREATE TABLE IF NOT EXISTS pos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id),
  pos_type VARCHAR(50) NOT NULL CHECK (pos_type IN ('square', 'toast', 'margin_edge', 'other')),
  api_key TEXT ENCRYPTED,
  api_secret TEXT ENCRYPTED,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT ENCRYPTED,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_config_org ON pos_config(org_id);
CREATE INDEX idx_pos_config_venue ON pos_config(venue_id);

-- POS Transactions table (sales from POS)
CREATE TABLE IF NOT EXISTS pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  pos_id VARCHAR(255) NOT NULL,
  item_id UUID REFERENCES liquor_spirits(id),
  item_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  qty_sold DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2),
  margin_amount DECIMAL(12, 2),
  margin_percent DECIMAL(5, 2),
  transaction_date TIMESTAMP NOT NULL,
  payment_method VARCHAR(50),
  server_name VARCHAR(255),
  table_number VARCHAR(50),
  check_number VARCHAR(100),
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_transactions_venue ON pos_transactions(venue_id);
CREATE INDEX idx_pos_transactions_item ON pos_transactions(item_id);
CREATE INDEX idx_pos_transactions_date ON pos_transactions(transaction_date);
CREATE INDEX idx_pos_transactions_synced ON pos_transactions(synced_at);

-- Dynamic Pricing Rules
CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES liquor_spirits(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id),
  base_price DECIMAL(12, 2) NOT NULL,
  min_price DECIMAL(12, 2),
  max_price DECIMAL(12, 2),
  current_price DECIMAL(12, 2),
  pricing_formula VARCHAR(500),
  demand_multiplier DECIMAL(5, 3) DEFAULT 1.0,
  inventory_multiplier DECIMAL(5, 3) DEFAULT 1.0,
  competition_multiplier DECIMAL(5, 3) DEFAULT 1.0,
  active BOOLEAN DEFAULT true,
  last_adjusted_at TIMESTAMP,
  adjustment_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dynamic_pricing_org ON dynamic_pricing_rules(org_id);
CREATE INDEX idx_dynamic_pricing_item ON dynamic_pricing_rules(item_id);
CREATE INDEX idx_dynamic_pricing_venue ON dynamic_pricing_rules(venue_id);

-- Menu Synchronization Log
CREATE TABLE IF NOT EXISTS menu_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('push', 'pull', 'merge')),
  items_count INTEGER DEFAULT 0,
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_deleted INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_sync_venue ON menu_sync_log(venue_id);
CREATE INDEX idx_menu_sync_status ON menu_sync_log(status);

-- POS Webhook Log
CREATE TABLE IF NOT EXISTS pos_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  webhook_type VARCHAR(100) NOT NULL,
  payload JSONB,
  status VARCHAR(50) NOT NULL CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_webhook_venue ON pos_webhook_log(venue_id);
CREATE INDEX idx_pos_webhook_type ON pos_webhook_log(webhook_type);
CREATE INDEX idx_pos_webhook_status ON pos_webhook_log(status);

-- Pricing Recommendations Log
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES liquor_spirits(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  current_price DECIMAL(12, 2) NOT NULL,
  recommended_price DECIMAL(12, 2) NOT NULL,
  reason VARCHAR(255),
  confidence_score DECIMAL(3, 2),
  accepted BOOLEAN,
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_rec_item ON pricing_recommendations(item_id);
CREATE INDEX idx_pricing_rec_venue ON pricing_recommendations(venue_id);
CREATE INDEX idx_pricing_rec_accepted ON pricing_recommendations(accepted);

-- POS Sync Status
CREATE TABLE IF NOT EXISTS pos_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  last_successful_sync TIMESTAMP,
  last_attempted_sync TIMESTAMP,
  sync_status VARCHAR(50) NOT NULL CHECK (sync_status IN ('idle', 'syncing', 'success', 'failed')),
  last_error TEXT,
  transactions_pending INTEGER DEFAULT 0,
  transactions_synced_total INTEGER DEFAULT 0,
  next_scheduled_sync TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_sync_status_venue ON pos_sync_status(venue_id);

-- Competitor Pricing Intelligence
CREATE TABLE IF NOT EXISTS competitor_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES liquor_spirits(id),
  competitor_name VARCHAR(255),
  competitor_price DECIMAL(12, 2),
  price_difference DECIMAL(12, 2),
  price_difference_percent DECIMAL(5, 2),
  source VARCHAR(100),
  last_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitor_pricing_venue ON competitor_pricing(venue_id);
CREATE INDEX idx_competitor_pricing_item ON competitor_pricing(item_id);
CREATE INDEX idx_competitor_pricing_verified ON competitor_pricing(last_verified);

-- Demand Forecast
CREATE TABLE IF NOT EXISTS demand_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES liquor_spirits(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_qty DECIMAL(10, 3),
  predicted_revenue DECIMAL(12, 2),
  confidence_level DECIMAL(3, 2),
  actual_qty DECIMAL(10, 3),
  actual_revenue DECIMAL(12, 2),
  forecast_accuracy DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_demand_forecast_item ON demand_forecast(item_id);
CREATE INDEX idx_demand_forecast_venue ON demand_forecast(venue_id);
CREATE INDEX idx_demand_forecast_date ON demand_forecast(forecast_date);

-- Add POS fields to liquor_spirits
ALTER TABLE liquor_spirits ADD COLUMN IF NOT EXISTS pos_sku VARCHAR(100);
ALTER TABLE liquor_spirits ADD COLUMN IF NOT EXISTS priceable BOOLEAN DEFAULT true;
ALTER TABLE liquor_spirits ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled BOOLEAN DEFAULT false;
ALTER TABLE liquor_spirits ADD COLUMN IF NOT EXISTS last_price_adjusted TIMESTAMP;

-- Add functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pos_config_timestamp BEFORE UPDATE ON pos_config
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER pos_transactions_timestamp BEFORE UPDATE ON pos_transactions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER dynamic_pricing_timestamp BEFORE UPDATE ON dynamic_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER competitor_pricing_timestamp BEFORE UPDATE ON competitor_pricing
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER demand_forecast_timestamp BEFORE UPDATE ON demand_forecast
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
