-- Migration: CRM Monthly Revenue Goals
-- Purpose: Store deterministic monthly revenue targets for gap analysis
-- Date: 2026-01-21

CREATE TABLE IF NOT EXISTS crm_monthly_revenue_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  month DATE NOT NULL, -- normalized to first day of month (YYYY-MM-01)
  goal_revenue NUMERIC(12, 2) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, month)
);

CREATE INDEX IF NOT EXISTS idx_crm_goals_org_month
  ON crm_monthly_revenue_goals(org_id, month);

