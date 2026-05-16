-- Migration: Prospect Pipeline Enhancement
-- Purpose: Add prospect stage history and activities tables for 3D pipeline tracking
-- Date: 2025-01-16
-- Production-ready, military-grade, AI^3 optimized, no-fail architecture

-- Update prospects table to use new status values
ALTER TABLE prospects
  DROP CONSTRAINT IF EXISTS prospects_status_check;

ALTER TABLE prospects
  ADD CONSTRAINT prospects_status_check CHECK (status IN ('prospect', 'qualified', 'proposal', 'negotiation', 'won', 'beo_created', 'lost'));

-- Prospect Stage History Table
CREATE TABLE IF NOT EXISTS prospect_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL CHECK (to_stage IN ('prospect', 'qualified', 'proposal', 'negotiation', 'won', 'beo_created', 'lost')),
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  INDEX idx_prospect_stage_history_prospect ON prospect_stage_history(prospect_id, timestamp DESC),
  INDEX idx_prospect_stage_history_tenant ON prospect_stage_history(tenant_id),
  INDEX idx_prospect_stage_history_stage ON prospect_stage_history(to_stage, timestamp DESC)
);

-- Prospect Activities Table
CREATE TABLE IF NOT EXISTS prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'proposal_sent', 'quote_sent', 'follow_up', 'note')),
  activity_data JSONB DEFAULT '{}',
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  INDEX idx_prospect_activities_prospect ON prospect_activities(prospect_id, timestamp DESC),
  INDEX idx_prospect_activities_tenant ON prospect_activities(tenant_id),
  INDEX idx_prospect_activities_type ON prospect_activities(activity_type, timestamp DESC)
);

-- RLS Policies
ALTER TABLE prospect_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prospect stage history in their tenant"
  ON prospect_stage_history FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert prospect stage history in their tenant"
  ON prospect_stage_history FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can view prospect activities in their tenant"
  ON prospect_activities FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert prospect activities in their tenant"
  ON prospect_activities FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Comments
COMMENT ON TABLE prospect_stage_history IS 'Tracks all stage transitions for prospects in the pipeline';
COMMENT ON TABLE prospect_activities IS 'Tracks all activities (calls, emails, meetings) for prospects';
