-- ============================================================================
-- MIGRATION 031: ACCOUNTS PAYABLE SYSTEM
-- Complete AP, GL integration, and P&L reporting tables
-- ============================================================================

-- ============================================================================
-- INVOICE PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'ach' CHECK (
    payment_method IN ('check', 'ach', 'wire', 'card', 'cash', 'crypto', 'other')
  ),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')
  ),
  due_date DATE NOT NULL,
  payment_date DATE,
  early_discount_percent DECIMAL(5, 2),
  early_discount_days INTEGER,
  early_discount_amount DECIMAL(12, 2),
  early_payment_date DATE,
  external_invoice_id VARCHAR(255),
  external_vendor_id VARCHAR(255),
  transaction_id VARCHAR(255),
  notes TEXT,
  gl_account_id VARCHAR(20),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_payments_organization_id ON invoice_payments(organization_id);
CREATE INDEX idx_invoice_payments_outlet_id ON invoice_payments(outlet_id);
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_vendor_id ON invoice_payments(vendor_id);
CREATE INDEX idx_invoice_payments_status ON invoice_payments(status);
CREATE INDEX idx_invoice_payments_due_date ON invoice_payments(due_date);
CREATE INDEX idx_invoice_payments_payment_date ON invoice_payments(payment_date);
CREATE INDEX idx_invoice_payments_created_at ON invoice_payments(created_at);
CREATE INDEX idx_invoice_payments_currency ON invoice_payments(currency);

-- ============================================================================
-- PAYMENT SCHEDULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (
    schedule_type IN ('manual', 'daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly')
  ),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'archived')
  ),
  run_hour INTEGER DEFAULT 9 CHECK (run_hour >= 0 AND run_hour <= 23),
  run_day_of_week INTEGER,
  run_day_of_month INTEGER,
  is_automation_enabled BOOLEAN DEFAULT FALSE,
  include_early_pay_discounts BOOLEAN DEFAULT TRUE,
  min_payment_amount DECIMAL(12, 2) DEFAULT 0,
  max_payment_amount DECIMAL(12, 2),
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_schedules_organization_id ON payment_schedules(organization_id);
CREATE INDEX idx_payment_schedules_outlet_id ON payment_schedules(outlet_id);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX idx_payment_schedules_next_run_at ON payment_schedules(next_run_at);

-- ============================================================================
-- PAYMENT SCHEDULE RUNS - Track execution history
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES payment_schedules(id) ON DELETE CASCADE,
  payment_ids UUID[] NOT NULL DEFAULT '{}',
  total_amount DECIMAL(12, 2) NOT NULL,
  total_discount_savings DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_message TEXT,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_schedule_runs_schedule_id ON payment_schedule_runs(schedule_id);
CREATE INDEX idx_payment_schedule_runs_status ON payment_schedule_runs(status);
CREATE INDEX idx_payment_schedule_runs_executed_at ON payment_schedule_runs(executed_at);

-- ============================================================================
-- VENDOR PAYMENT TERMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  term_code VARCHAR(20) NOT NULL DEFAULT 'NET_30' CHECK (
    term_code IN ('NET_10', 'NET_15', 'NET_30', 'NET_60', 'NET_90', 'COD', 'PREPAID', 'CUSTOM')
  ),
  days INTEGER NOT NULL DEFAULT 30,
  early_discount_percent DECIMAL(5, 2),
  early_discount_days INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, vendor_id)
);

CREATE INDEX idx_vendor_payment_terms_organization_id ON vendor_payment_terms(organization_id);
CREATE INDEX idx_vendor_payment_terms_vendor_id ON vendor_payment_terms(vendor_id);
CREATE INDEX idx_vendor_payment_terms_is_active ON vendor_payment_terms(is_active);

-- ============================================================================
-- GL ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs')
  ),
  account_class VARCHAR(20) CHECK (account_class IN ('current_asset', 'fixed_asset', 'current_liability', 'longterm_liability')),
  description TEXT,
  parent_account_id UUID REFERENCES gl_accounts(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  allow_manual_entry BOOLEAN DEFAULT TRUE,
  balance DECIMAL(15, 2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_gl_accounts_organization_id ON gl_accounts(organization_id);
CREATE INDEX idx_gl_accounts_code ON gl_accounts(code);
CREATE INDEX idx_gl_accounts_type ON gl_accounts(type);
CREATE INDEX idx_gl_accounts_is_active ON gl_accounts(is_active);

-- ============================================================================
-- GL ENTRIES TABLE - Double-entry bookkeeping
-- ============================================================================

CREATE TABLE IF NOT EXISTS gl_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  batch_id VARCHAR(255),
  journal_id VARCHAR(255),
  description TEXT NOT NULL,
  debit_account_id UUID NOT NULL REFERENCES gl_accounts(id),
  debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  credit_account_id UUID NOT NULL REFERENCES gl_accounts(id),
  credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  reference_type VARCHAR(50) CHECK (
    reference_type IN ('invoice_payment', 'expense', 'manual', 'adjustment', 'reversal')
  ),
  reference_id VARCHAR(255),
  invoice_payment_id UUID REFERENCES invoice_payments(id),
  status VARCHAR(50) NOT NULL DEFAULT 'posted' CHECK (
    status IN ('draft', 'posted', 'reversed')
  ),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gl_entries_organization_id ON gl_entries(organization_id);
CREATE INDEX idx_gl_entries_outlet_id ON gl_entries(outlet_id);
CREATE INDEX idx_gl_entries_entry_date ON gl_entries(entry_date);
CREATE INDEX idx_gl_entries_status ON gl_entries(status);
CREATE INDEX idx_gl_entries_debit_account_id ON gl_entries(debit_account_id);
CREATE INDEX idx_gl_entries_credit_account_id ON gl_entries(credit_account_id);
CREATE INDEX idx_gl_entries_invoice_payment_id ON gl_entries(invoice_payment_id);

-- ============================================================================
-- P&L STATEMENTS - Cached for performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS pandl_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0,
  food_revenue DECIMAL(15, 2) DEFAULT 0,
  beverage_revenue DECIMAL(15, 2) DEFAULT 0,
  other_revenue DECIMAL(15, 2) DEFAULT 0,
  cost_of_goods DECIMAL(15, 2) NOT NULL DEFAULT 0,
  gross_profit DECIMAL(15, 2) GENERATED ALWAYS AS (total_revenue - cost_of_goods) STORED,
  operating_expenses JSONB DEFAULT '{"labor": 0, "utilities": 0, "rent": 0, "maintenance": 0, "equipment": 0, "other": 0}'::jsonb,
  total_expenses DECIMAL(15, 2) NOT NULL DEFAULT 0,
  operating_profit DECIMAL(15, 2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
  other_income DECIMAL(15, 2) DEFAULT 0,
  other_expenses DECIMAL(15, 2) DEFAULT 0,
  net_profit DECIMAL(15, 2) GENERATED ALWAYS AS ((total_revenue - total_expenses) + other_income - other_expenses) STORED,
  gross_margin_percent DECIMAL(5, 2) GENERATED ALWAYS AS CASE WHEN total_revenue > 0 THEN ((total_revenue - cost_of_goods) / total_revenue * 100) ELSE 0 END STORED,
  operating_margin_percent DECIMAL(5, 2) GENERATED ALWAYS AS CASE WHEN total_revenue > 0 THEN ((total_revenue - total_expenses) / total_revenue * 100) ELSE 0 END STORED,
  net_margin_percent DECIMAL(5, 2) GENERATED ALWAYS AS CASE WHEN total_revenue > 0 THEN (net_profit / total_revenue * 100) ELSE 0 END STORED,
  is_draft BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pandl_statements_organization_id ON pandl_statements(organization_id);
CREATE INDEX idx_pandl_statements_outlet_id ON pandl_statements(outlet_id);
CREATE INDEX idx_pandl_statements_period_start ON pandl_statements(period_start);
CREATE INDEX idx_pandl_statements_period_end ON pandl_statements(period_end);

-- ============================================================================
-- FINANCIAL METRICS - Real-time KPIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  liquidity_ratio DECIMAL(5, 2),
  current_ratio DECIMAL(5, 2),
  quick_ratio DECIMAL(5, 2),
  debt_to_equity DECIMAL(5, 2),
  operating_margin DECIMAL(5, 2),
  net_profit_margin DECIMAL(5, 2),
  roa DECIMAL(5, 2),
  roe DECIMAL(5, 2),
  days_payable_outstanding INTEGER,
  days_sales_outstanding INTEGER,
  inventory_turnover DECIMAL(10, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_metrics_organization_id ON financial_metrics(organization_id);
CREATE INDEX idx_financial_metrics_outlet_id ON financial_metrics(outlet_id);
CREATE INDEX idx_financial_metrics_metric_date ON financial_metrics(metric_date);

-- ============================================================================
-- VENDOR ANALYSIS - Aggregated metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  total_invoices INTEGER DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  paid_invoices INTEGER DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  overdue_invoices INTEGER DEFAULT 0,
  overdue_amount DECIMAL(15, 2) DEFAULT 0,
  avg_days_to_pay DECIMAL(10, 2),
  on_time_payment_rate DECIMAL(5, 2),
  avg_invoice_amount DECIMAL(12, 2),
  early_payment_discount_taken INTEGER,
  early_payment_savings DECIMAL(15, 2) DEFAULT 0,
  quality_issues_count INTEGER DEFAULT 0,
  last_invoice_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, vendor_id, analysis_period_start, analysis_period_end)
);

CREATE INDEX idx_vendor_analysis_organization_id ON vendor_analysis(organization_id);
CREATE INDEX idx_vendor_analysis_vendor_id ON vendor_analysis(vendor_id);
CREATE INDEX idx_vendor_analysis_analysis_period_start ON vendor_analysis(analysis_period_start);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandl_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_analysis ENABLE ROW LEVEL SECURITY;

-- AP Invoice Payments RLS
CREATE POLICY "Users can view payments for their organization"
  ON invoice_payments FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert payments for their organization"
  ON invoice_payments FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ) AND outlet_id IN (
    SELECT outlet_id FROM user_outlets WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update payments in their organization"
  ON invoice_payments FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- GL Accounts RLS
CREATE POLICY "Users can view GL accounts for their organization"
  ON gl_accounts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- GL Entries RLS
CREATE POLICY "Users can view GL entries for their organization"
  ON gl_entries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- P&L Statements RLS
CREATE POLICY "Users can view P&L for their organization"
  ON pandl_statements FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ) AND (outlet_id IS NULL OR outlet_id IN (
    SELECT outlet_id FROM user_outlets WHERE user_id = auth.uid()
  )));

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to calculate early payment discount
CREATE OR REPLACE FUNCTION calculate_early_discount(
  p_invoice_amount DECIMAL,
  p_early_discount_percent DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE 
    WHEN p_early_discount_percent IS NULL OR p_early_discount_percent = 0 THEN 0
    ELSE (p_invoice_amount * p_early_discount_percent / 100)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update GL balance when payment is recorded
CREATE OR REPLACE FUNCTION update_gl_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update GL account balance
    UPDATE gl_accounts
    SET balance = balance - NEW.amount
    WHERE id = NEW.gl_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gl_on_payment
  AFTER UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_gl_balance_on_payment();

-- ============================================================================
-- INITIAL DATA - Default GL Accounts
-- ============================================================================

-- Insert default GL accounts for new organizations (to be called on org creation)
CREATE OR REPLACE FUNCTION create_default_gl_accounts(p_organization_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO gl_accounts (organization_id, code, name, type, account_class, is_system, allow_manual_entry)
  VALUES
    (p_organization_id, '1000', 'Cash', 'asset', 'current_asset', TRUE, FALSE),
    (p_organization_id, '1100', 'Accounts Receivable', 'asset', 'current_asset', TRUE, FALSE),
    (p_organization_id, '1200', 'Inventory', 'asset', 'current_asset', TRUE, FALSE),
    (p_organization_id, '2000', 'Accounts Payable', 'liability', 'current_liability', TRUE, FALSE),
    (p_organization_id, '2100', 'Accrued Expenses', 'liability', 'current_liability', TRUE, TRUE),
    (p_organization_id, '3000', 'Retained Earnings', 'equity', NULL, TRUE, FALSE),
    (p_organization_id, '4000', 'Food Sales', 'revenue', NULL, TRUE, TRUE),
    (p_organization_id, '4100', 'Beverage Sales', 'revenue', NULL, TRUE, TRUE),
    (p_organization_id, '4200', 'Other Revenue', 'revenue', NULL, TRUE, TRUE),
    (p_organization_id, '5000', 'Cost of Goods Sold', 'cogs', NULL, TRUE, TRUE),
    (p_organization_id, '6000', 'Labor Expense', 'expense', NULL, TRUE, TRUE),
    (p_organization_id, '6100', 'Utilities', 'expense', NULL, TRUE, TRUE),
    (p_organization_id, '6200', 'Rent', 'expense', NULL, TRUE, TRUE),
    (p_organization_id, '6300', 'Equipment & Maintenance', 'expense', NULL, TRUE, TRUE),
    (p_organization_id, '6400', 'Other Operating Expenses', 'expense', NULL, TRUE, TRUE)
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
