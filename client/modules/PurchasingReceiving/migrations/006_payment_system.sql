-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  customer_id UUID,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  method VARCHAR(50) NOT NULL CHECK (method IN ('credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'ach', 'check')),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'paypal', 'square', 'manual')),
  payment_intent_id VARCHAR(255) NOT NULL,
  reference VARCHAR(255),
  description TEXT,
  metadata JSONB,
  failure_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_outlet_id ON payment_transactions(outlet_id);
CREATE INDEX idx_payment_transactions_vendor_id ON payment_transactions(vendor_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX idx_payment_transactions_payment_intent_id ON payment_transactions(payment_intent_id);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  customer_id UUID,
  provider_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'paypal', 'square')),
  type VARCHAR(50) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'ach')),
  last_4 VARCHAR(4),
  brand VARCHAR(50),
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_payment_methods_outlet_id ON payment_methods(outlet_id);
CREATE INDEX idx_payment_methods_vendor_id ON payment_methods(vendor_id);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider);

-- Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reason VARCHAR(255),
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);

-- Payment Webhook Events Table
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_webhook_events_provider ON payment_webhook_events(provider);
CREATE INDEX idx_payment_webhook_events_type ON payment_webhook_events(type);
CREATE INDEX idx_payment_webhook_events_processed ON payment_webhook_events(processed);
CREATE INDEX idx_payment_webhook_events_created_at ON payment_webhook_events(created_at);

-- Payment Configuration Table
CREATE TABLE IF NOT EXISTS payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, provider)
);

CREATE INDEX idx_payment_config_outlet_id ON payment_config(outlet_id);
CREATE INDEX idx_payment_config_provider ON payment_config(provider);

-- Row Level Security Policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments for their outlet"
  ON payment_transactions FOR SELECT
  USING (outlet_id IN (
    SELECT outlet_id FROM user_outlets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view payment methods for their outlet"
  ON payment_methods FOR SELECT
  USING (outlet_id IN (
    SELECT outlet_id FROM user_outlets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view refunds for their outlet"
  ON refunds FOR SELECT
  USING (transaction_id IN (
    SELECT id FROM payment_transactions
    WHERE outlet_id IN (
      SELECT outlet_id FROM user_outlets WHERE user_id = auth.uid()
    )
  ));

-- Stored Procedures for Payment Operations
CREATE OR REPLACE FUNCTION process_refund(
  p_transaction_id UUID,
  p_amount DECIMAL,
  p_reason VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_transaction payment_transactions;
  v_refund refunds;
  v_refundable DECIMAL;
BEGIN
  -- Get the transaction
  SELECT * INTO v_transaction FROM payment_transactions WHERE id = p_transaction_id;

  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Check if already refunded
  SELECT COALESCE(SUM(amount), 0) INTO v_refundable
  FROM refunds
  WHERE transaction_id = p_transaction_id AND status = 'completed';

  IF (v_transaction.amount - v_refundable) < p_amount THEN
    RAISE EXCEPTION 'Refund amount exceeds remaining balance';
  END IF;

  -- Create refund record
  INSERT INTO refunds (transaction_id, amount, currency, reason)
  VALUES (p_transaction_id, p_amount, v_transaction.currency, p_reason)
  RETURNING * INTO v_refund;

  RETURN jsonb_build_object(
    'id', v_refund.id,
    'amount', v_refund.amount,
    'status', v_refund.status,
    'created_at', v_refund.created_at
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate payment stats
CREATE OR REPLACE FUNCTION get_payment_stats(
  p_outlet_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_transactions BIGINT,
  total_amount DECIMAL,
  completed_amount DECIMAL,
  failed_count BIGINT,
  refunded_amount DECIMAL,
  avg_transaction_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT,
    COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0),
    COALESCE(AVG(amount), 0)
  FROM payment_transactions
  WHERE outlet_id = p_outlet_id
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;
