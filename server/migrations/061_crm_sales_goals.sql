-- Migration: CRM Sales Goals + Prospect Owner
-- Purpose: Store annual/monthly sales goals and pipeline conversion rules per manager
-- Date: 2026-01-21

CREATE TABLE IF NOT EXISTS crm_sales_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  year INT NOT NULL,
  annual_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monthly_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversion_ratio JSONB NOT NULL DEFAULT '{"prospects":10,"clients":3,"wins":1}'::jsonb,
  pipeline_target INT NOT NULL DEFAULT 80,
  goal_status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (goal_status IN ('draft', 'submitted', 'revision_requested', 'approved')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  UNIQUE(org_id, user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_crm_sales_goals_org_year
  ON crm_sales_goals(org_id, year);

CREATE INDEX IF NOT EXISTS idx_crm_sales_goals_org_user
  ON crm_sales_goals(org_id, user_id);

CREATE INDEX IF NOT EXISTS idx_crm_sales_goals_status
  ON crm_sales_goals(goal_status);

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS owner_id UUID;

CREATE INDEX IF NOT EXISTS idx_prospects_owner_id
  ON prospects(owner_id);
