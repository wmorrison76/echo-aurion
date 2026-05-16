-- Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'api',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_from_currency ON exchange_rates(from_currency);
CREATE INDEX idx_exchange_rates_to_currency ON exchange_rates(to_currency);
CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_timestamp ON exchange_rates(timestamp DESC);
CREATE INDEX idx_exchange_rates_source ON exchange_rates(source);

-- Outlet Currency Configuration
CREATE TABLE IF NOT EXISTS outlet_currency_config (
  outlet_id UUID PRIMARY KEY REFERENCES outlets(id) ON DELETE CASCADE,
  base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  supported_currencies VARCHAR(3)[] NOT NULL DEFAULT ARRAY['USD']::VARCHAR[],
  display_format VARCHAR(50) NOT NULL DEFAULT 'symbol' CHECK (display_format IN ('symbol', 'code', 'name')),
  auto_convert BOOLEAN DEFAULT FALSE,
  rounding_mode VARCHAR(50) NOT NULL DEFAULT 'round' CHECK (rounding_mode IN ('round', 'ceil', 'floor')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outlet_currency_config_base_currency ON outlet_currency_config(base_currency);

-- Currency Conversion Logs
CREATE TABLE IF NOT EXISTS currency_conversion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  from_amount DECIMAL(12, 2) NOT NULL,
  from_currency VARCHAR(3) NOT NULL,
  to_amount DECIMAL(12, 2) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  reference_id VARCHAR(255),
  reference_type VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_currency_conversion_logs_outlet_id ON currency_conversion_logs(outlet_id);
CREATE INDEX idx_currency_conversion_logs_reference ON currency_conversion_logs(reference_type, reference_id);
CREATE INDEX idx_currency_conversion_logs_created_at ON currency_conversion_logs(created_at);

-- Currency-based Pricing
CREATE TABLE IF NOT EXISTS product_pricing_by_currency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  cost DECIMAL(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(product_id, outlet_id, currency)
);

CREATE INDEX idx_product_pricing_by_currency_product_id ON product_pricing_by_currency(product_id);
CREATE INDEX idx_product_pricing_by_currency_outlet_id ON product_pricing_by_currency(outlet_id);
CREATE INDEX idx_product_pricing_by_currency_currency ON product_pricing_by_currency(currency);

-- Vendor Pricing by Currency
CREATE TABLE IF NOT EXISTS vendor_pricing_by_currency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  currency VARCHAR(3) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  minimum_order DECIMAL(10, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, outlet_id, product_id, currency)
);

CREATE INDEX idx_vendor_pricing_by_currency_vendor_id ON vendor_pricing_by_currency(vendor_id);
CREATE INDEX idx_vendor_pricing_by_currency_outlet_id ON vendor_pricing_by_currency(outlet_id);
CREATE INDEX idx_vendor_pricing_by_currency_currency ON vendor_pricing_by_currency(currency);

-- Currency Exchange History
CREATE TABLE IF NOT EXISTS currency_exchange_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL,
  opening_rate DECIMAL(18, 8),
  closing_rate DECIMAL(18, 8),
  high_rate DECIMAL(18, 8),
  low_rate DECIMAL(18, 8),
  volume BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, date, currency)
);

CREATE INDEX idx_currency_exchange_history_outlet_id ON currency_exchange_history(outlet_id);
CREATE INDEX idx_currency_exchange_history_date ON currency_exchange_history(date);
CREATE INDEX idx_currency_exchange_history_currency ON currency_exchange_history(currency);

-- Update existing transactions table to support multi-currency
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3);
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS converted_rate DECIMAL(18, 8);

CREATE INDEX idx_payment_transactions_original_currency ON payment_transactions(original_currency);

-- Functions for currency operations

-- Function to get current exchange rate
CREATE OR REPLACE FUNCTION get_current_exchange_rate(
  p_from_currency VARCHAR,
  p_to_currency VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL;
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN 1;
  END IF;

  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
  ORDER BY timestamp DESC
  LIMIT 1;

  RETURN COALESCE(v_rate, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(
  p_amount DECIMAL,
  p_from_currency VARCHAR,
  p_to_currency VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL;
BEGIN
  v_rate := get_current_exchange_rate(p_from_currency, p_to_currency);
  RETURN p_amount * v_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to get converted amount with rounding
CREATE OR REPLACE FUNCTION convert_currency_rounded(
  p_amount DECIMAL,
  p_from_currency VARCHAR,
  p_to_currency VARCHAR,
  p_decimal_places INTEGER DEFAULT 2,
  p_rounding_mode VARCHAR DEFAULT 'round'
)
RETURNS DECIMAL AS $$
DECLARE
  v_converted DECIMAL;
  v_factor DECIMAL;
BEGIN
  v_converted := convert_currency(p_amount, p_from_currency, p_to_currency);
  v_factor := POWER(10, p_decimal_places);

  CASE p_rounding_mode
    WHEN 'ceil' THEN
      RETURN CEIL(v_converted * v_factor) / v_factor;
    WHEN 'floor' THEN
      RETURN FLOOR(v_converted * v_factor) / v_factor;
    ELSE
      RETURN ROUND(v_converted, p_decimal_places);
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to log currency conversion
CREATE OR REPLACE FUNCTION log_currency_conversion(
  p_outlet_id UUID,
  p_from_amount DECIMAL,
  p_from_currency VARCHAR,
  p_to_amount DECIMAL,
  p_to_currency VARCHAR,
  p_rate DECIMAL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id VARCHAR DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO currency_conversion_logs (
    outlet_id, from_amount, from_currency, to_amount, to_currency, rate, reference_type, reference_id
  ) VALUES (
    p_outlet_id, p_from_amount, p_from_currency, p_to_amount, p_to_currency, p_rate, p_reference_type, p_reference_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get pricing in different currency
CREATE OR REPLACE FUNCTION get_product_price_in_currency(
  p_product_id UUID,
  p_outlet_id UUID,
  p_currency VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_price DECIMAL;
  v_base_currency VARCHAR;
  v_base_price DECIMAL;
BEGIN
  -- Check if specific pricing exists for this currency
  SELECT price INTO v_price
  FROM product_pricing_by_currency
  WHERE product_id = p_product_id
    AND outlet_id = p_outlet_id
    AND currency = p_currency;

  IF v_price IS NOT NULL THEN
    RETURN v_price;
  END IF;

  -- Get base currency and price
  SELECT base_currency INTO v_base_currency
  FROM outlet_currency_config
  WHERE outlet_id = p_outlet_id;

  SELECT price INTO v_base_price
  FROM products
  WHERE id = p_product_id;

  -- Convert from base currency if needed
  IF v_base_currency != p_currency THEN
    RETURN convert_currency_rounded(v_base_price, v_base_currency, p_currency);
  END IF;

  RETURN v_base_price;
END;
$$ LANGUAGE plpgsql;

-- Periodic job to update exchange rates (run hourly)
-- This would typically be triggered by a background job
CREATE OR REPLACE FUNCTION refresh_exchange_rates()
RETURNS void AS $$
BEGIN
  -- Update exchange rate records from external API
  -- This is a placeholder - actual implementation would call external service
  RAISE NOTICE 'Exchange rates refresh job started';
END;
$$ LANGUAGE plpgsql;
