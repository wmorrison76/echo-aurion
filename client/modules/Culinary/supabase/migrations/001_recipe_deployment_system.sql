-- Recipe Deployment System Tables
-- This migration creates the infrastructure for deploying recipe packets across store locations

-- Enable necessary extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Recipe Deployments - Main deployment records
CREATE TABLE IF NOT EXISTS recipe_deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL,
  deployment_name TEXT NOT NULL,
  description TEXT,
  
  -- Deployment status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Deployment scope
  target_outlets TEXT[] NOT NULL, -- Array of outlet IDs this deployment targets
  target_locations TEXT[] NOT NULL, -- Array of location IDs (null = all)
  all_outlets BOOLEAN DEFAULT FALSE, -- If true, deploy to all outlets
  
  -- Metadata
  deployment_type TEXT NOT NULL DEFAULT 'recipe_update' CHECK (deployment_type IN ('recipe_update', 'menu_rollout', 'procedure_update')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  requires_confirmation BOOLEAN DEFAULT TRUE,
  confirmation_deadline TIMESTAMP WITH TIME ZONE,
  
  -- Rollback configuration
  allow_rollback BOOLEAN DEFAULT TRUE,
  rollback_deadline TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- RLS
  organization_id UUID NOT NULL,
  
  CONSTRAINT valid_schedule CHECK (scheduled_at IS NULL OR scheduled_at > NOW())
);

-- Deployment Packets - Individual recipes in a deployment
CREATE TABLE IF NOT EXISTS deployment_packets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id UUID NOT NULL REFERENCES recipe_deployments(id) ON DELETE CASCADE,
  
  -- Recipe reference
  recipe_id UUID NOT NULL,
  recipe_name TEXT NOT NULL,
  
  -- Packet data
  packet_version INTEGER NOT NULL DEFAULT 1,
  packet_data JSONB NOT NULL, -- Full recipe object as it should be deployed
  
  -- Version tracking
  previous_recipe_version_hash TEXT, -- Hash of what it's replacing
  new_recipe_version_hash TEXT NOT NULL, -- Hash of new recipe
  
  -- Changes summary
  changes_summary JSONB, -- Summary of what changed (ingredients, instructions, etc)
  
  -- Metadata
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT packet_data_not_empty CHECK (packet_data IS NOT NULL AND packet_data != '{}'::JSONB)
);

-- Store Deployment Confirmations - Track which stores have received/confirmed
CREATE TABLE IF NOT EXISTS store_deployment_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id UUID NOT NULL REFERENCES recipe_deployments(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL,
  location_id UUID,
  
  -- Confirmation stages
  received_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  
  -- Confirmation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'confirmed', 'applied', 'failed', 'rejected')),
  
  -- Store confirmation details
  confirmed_by_user_id UUID,
  confirmed_by_username TEXT,
  rejection_reason TEXT,
  failure_reason TEXT,
  
  -- Sync metadata
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- RLS
  organization_id UUID NOT NULL,
  
  UNIQUE(deployment_id, outlet_id)
);

-- Deployment Activity Log - Track all changes and confirmations
CREATE TABLE IF NOT EXISTS deployment_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id UUID NOT NULL REFERENCES recipe_deployments(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'deployment_created',
    'deployment_scheduled',
    'deployment_started',
    'deployment_completed',
    'deployment_failed',
    'deployment_cancelled',
    'packet_added',
    'packet_removed',
    'packet_updated',
    'store_notification_sent',
    'store_received',
    'store_confirmed',
    'store_applied',
    'store_failed',
    'store_rejected',
    'deployment_notes_added'
  )),
  
  -- User who performed the action
  performed_by_user_id UUID,
  performed_by_username TEXT,
  
  -- Related entity
  outlet_id UUID,
  related_packet_id UUID REFERENCES deployment_packets(id) ON DELETE SET NULL,
  
  -- Activity details
  details JSONB,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID NOT NULL
);

-- Deployment Notifications - Track notification delivery
CREATE TABLE IF NOT EXISTS deployment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id UUID NOT NULL REFERENCES recipe_deployments(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL,
  
  -- Notification tracking
  notification_type TEXT NOT NULL CHECK (notification_type IN ('deployment_ready', 'confirmation_required', 'confirmation_reminder', 'deployment_applied')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  
  -- Delivery details
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT[] DEFAULT '{"in_app"}', -- in_app, email, sms
  sent_via TEXT[] DEFAULT '{}',
  failed_attempts INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  organization_id UUID NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_recipe_deployments_org ON recipe_deployments(organization_id);
CREATE INDEX idx_recipe_deployments_status ON recipe_deployments(status);
CREATE INDEX idx_recipe_deployments_created ON recipe_deployments(created_at DESC);
CREATE INDEX idx_recipe_deployments_scheduled ON recipe_deployments(scheduled_at) WHERE status = 'scheduled';

CREATE INDEX idx_deployment_packets_deployment ON deployment_packets(deployment_id);
CREATE INDEX idx_deployment_packets_recipe ON deployment_packets(recipe_id);

CREATE INDEX idx_store_confirmations_deployment ON store_deployment_confirmations(deployment_id);
CREATE INDEX idx_store_confirmations_outlet ON store_deployment_confirmations(outlet_id);
CREATE INDEX idx_store_confirmations_status ON store_deployment_confirmations(status);
CREATE INDEX idx_store_confirmations_org ON store_deployment_confirmations(organization_id);

CREATE INDEX idx_deployment_activity_deployment ON deployment_activity_log(deployment_id);
CREATE INDEX idx_deployment_activity_outlet ON deployment_activity_log(outlet_id);
CREATE INDEX idx_deployment_activity_org ON deployment_activity_log(organization_id);

CREATE INDEX idx_deployment_notifications_deployment ON deployment_notifications(deployment_id);
CREATE INDEX idx_deployment_notifications_outlet ON deployment_notifications(outlet_id);
CREATE INDEX idx_deployment_notifications_status ON deployment_notifications(status);

-- Create updated_at trigger for recipe_deployments
CREATE OR REPLACE FUNCTION update_recipe_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_deployments_updated_at
BEFORE UPDATE ON recipe_deployments
FOR EACH ROW
EXECUTE FUNCTION update_recipe_deployments_updated_at();

-- Create updated_at trigger for store_deployment_confirmations
CREATE OR REPLACE FUNCTION update_store_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_confirmations_updated_at
BEFORE UPDATE ON store_deployment_confirmations
FOR EACH ROW
EXECUTE FUNCTION update_store_confirmations_updated_at();

-- Create updated_at trigger for deployment_notifications
CREATE OR REPLACE FUNCTION update_deployment_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deployment_notifications_updated_at
BEFORE UPDATE ON deployment_notifications
FOR EACH ROW
EXECUTE FUNCTION update_deployment_notifications_updated_at();

-- Deployment completion trigger - auto-complete when all confirmations are done
CREATE OR REPLACE FUNCTION check_deployment_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_outlets INTEGER;
  applied_outlets INTEGER;
BEGIN
  -- Count total outlets in this deployment
  SELECT array_length(target_outlets, 1) INTO total_outlets
  FROM recipe_deployments
  WHERE id = NEW.deployment_id;
  
  -- Count how many have been applied
  SELECT COUNT(*) INTO applied_outlets
  FROM store_deployment_confirmations
  WHERE deployment_id = NEW.deployment_id
  AND status = 'applied';
  
  -- If all have been applied, mark deployment as completed
  IF total_outlets IS NOT NULL AND applied_outlets >= total_outlets THEN
    UPDATE recipe_deployments
    SET status = 'completed', completed_at = NOW()
    WHERE id = NEW.deployment_id AND status != 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_deployment_completion_trigger
AFTER UPDATE ON store_deployment_confirmations
FOR EACH ROW
WHEN (NEW.status = 'applied')
EXECUTE FUNCTION check_deployment_completion();
