/**
 * Migration: Shift Swap, Compliance, Payroll Integration Schema
 * --------------------------------------------------------------
 * Creates database tables for:
 * - Shift swap marketplace (postings, swap requests)
 * - Labor compliance (violations, rules)
 * - Payroll integration (exports, reconciliations)
 */

-- Shift Swap Marketplace Tables

CREATE TABLE IF NOT EXISTS shift_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  dept_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  position_id UUID NOT NULL,
  required_skills TEXT[],
  required_certifications TEXT[],
  notes TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'pending', 'approved', 'completed', 'cancelled'
  accepted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_postings_org ON shift_postings(org_id);
CREATE INDEX IF NOT EXISTS idx_shift_postings_employee ON shift_postings(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_postings_status ON shift_postings(status);
CREATE INDEX IF NOT EXISTS idx_shift_postings_shift_date ON shift_postings(shift_date);

CREATE TABLE IF NOT EXISTS swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  posting_id UUID NOT NULL REFERENCES shift_postings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  matching_score DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swap_requests_org ON swap_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_posting ON swap_requests(posting_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);

-- Labor Compliance Tables

CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'federal', 'state', 'local'
  jurisdiction VARCHAR(50) NOT NULL, -- 'US', 'CA', 'NYC', etc.
  rule_type VARCHAR(50) NOT NULL, -- 'overtime', 'break', 'meal', 'consecutive_days', 'rest_period', 'max_hours'
  conditions JSONB,
  threshold DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'hours', 'minutes', 'days', 'percentage'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type ON compliance_rules(type);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_enabled ON compliance_rules(enabled);

CREATE TABLE IF NOT EXISTS compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  schedule_id UUID,
  rule_id UUID NOT NULL REFERENCES compliance_rules(id),
  rule_type VARCHAR(50) NOT NULL,
  violation_type VARCHAR(20) NOT NULL, -- 'warning', 'error', 'critical'
  message TEXT NOT NULL,
  details JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_org ON compliance_violations(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_employee ON compliance_violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_resolved ON compliance_violations(resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_violation_type ON compliance_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_detected_at ON compliance_violations(detected_at);

-- Payroll Integration Tables

CREATE TABLE IF NOT EXISTS payroll_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'gusto', 'adp', '7shifts', 'custom'
  api_key TEXT,
  api_secret TEXT,
  webhook_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, type)
);

CREATE INDEX IF NOT EXISTS idx_payroll_providers_org ON payroll_providers(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_providers_enabled ON payroll_providers(enabled);

CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'processing', 'completed', 'failed'
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_org ON payroll_periods(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON payroll_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);

CREATE TABLE IF NOT EXISTS payroll_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES payroll_periods(id),
  org_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES payroll_providers(id),
  data JSONB NOT NULL, -- Array of PayrollData objects
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exported_by UUID NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_exports_period ON payroll_exports(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_org ON payroll_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_provider ON payroll_exports(provider_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_status ON payroll_exports(status);

CREATE TABLE IF NOT EXISTS payroll_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES payroll_periods(id),
  org_id UUID NOT NULL,
  schedule_hours DECIMAL(10,2) NOT NULL,
  payroll_hours DECIMAL(10,2) NOT NULL,
  variance DECIMAL(10,2) NOT NULL,
  variance_percent DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'matched', 'variance', 'error'
  details JSONB NOT NULL, -- Array of employee reconciliation details
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_reconciliations_period ON payroll_reconciliations(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_reconciliations_org ON payroll_reconciliations(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_reconciliations_status ON payroll_reconciliations(status);

-- RLS Policies (if using Supabase)

-- Shift Postings
ALTER TABLE shift_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shift postings in their org"
  ON shift_postings FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Users can create shift postings in their org"
  ON shift_postings FOR INSERT
  WITH CHECK (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Users can update their own shift postings"
  ON shift_postings FOR UPDATE
  USING (org_id = current_setting('app.org_id', true)::UUID AND employee_id = current_setting('app.user_id', true)::UUID);

-- Swap Requests
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view swap requests in their org"
  ON swap_requests FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Users can create swap requests in their org"
  ON swap_requests FOR INSERT
  WITH CHECK (org_id = current_setting('app.org_id', true)::UUID);

-- Compliance Violations
ALTER TABLE compliance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance violations in their org"
  ON compliance_violations FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Managers can update compliance violations"
  ON compliance_violations FOR UPDATE
  USING (org_id = current_setting('app.org_id', true)::UUID);

-- Payroll Providers
ALTER TABLE payroll_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll providers in their org"
  ON payroll_providers FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Admins can manage payroll providers"
  ON payroll_providers FOR ALL
  USING (org_id = current_setting('app.org_id', true)::UUID);

-- Payroll Periods
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll periods in their org"
  ON payroll_periods FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Users can create payroll periods in their org"
  ON payroll_periods FOR INSERT
  WITH CHECK (org_id = current_setting('app.org_id', true)::UUID);

-- Payroll Exports
ALTER TABLE payroll_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll exports in their org"
  ON payroll_exports FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Users can create payroll exports in their org"
  ON payroll_exports FOR INSERT
  WITH CHECK (org_id = current_setting('app.org_id', true)::UUID);

-- Payroll Reconciliations
ALTER TABLE payroll_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll reconciliations in their org"
  ON payroll_reconciliations FOR SELECT
  USING (org_id = current_setting('app.org_id', true)::UUID);

CREATE POLICY "Users can create payroll reconciliations in their org"
  ON payroll_reconciliations FOR INSERT
  WITH CHECK (org_id = current_setting('app.org_id', true)::UUID);
