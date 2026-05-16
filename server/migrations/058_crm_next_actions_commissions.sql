-- Migration: CRM Next Actions + Commission Rules
-- Purpose: support SLA next-actions and commission models
-- Date: 2026-01-20

CREATE TABLE IF NOT EXISTS crm_next_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  owner_id UUID,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'overdue', 'completed', 'scheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_next_actions_org ON crm_next_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_next_actions_owner ON crm_next_actions(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_next_actions_due ON crm_next_actions(due_at);

CREATE TABLE IF NOT EXISTS crm_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID,
  model VARCHAR(32) NOT NULL CHECK (model IN ('commission_only', 'salary_plus_commission', 'tiered_accelerator')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  base_salary NUMERIC(12, 2),
  commission_rate NUMERIC(6, 4),
  tiers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_commission_rules_org ON crm_commission_rules(org_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_crm_commission_rules_outlet ON crm_commission_rules(outlet_id);

CREATE TABLE IF NOT EXISTS crm_commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  outlet_id UUID,
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  model VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_commission_entries_org ON crm_commission_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_commission_entries_user ON crm_commission_entries(user_id);

CREATE TABLE IF NOT EXISTS crm_pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'
);
