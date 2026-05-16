-- Migration: Unified Notification Service
-- Purpose: Enterprise-grade notification service with deduplication, delivery tracking, dead letter queue
-- Date: 2025-01-15
-- Addresses: LUCCCA OS Grade Evaluation - Notifications Pipeline (2.5/5 → 4.0/5)

-- ============================================================================
-- UNIFIED NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS unified_notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'employee', 'department', 'role')),
  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  channels TEXT[] NOT NULL, -- ['email', 'sms', 'slack', 'push', 'in_app']
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'dead_letter')),
  deduplication_key TEXT UNIQUE NOT NULL, -- For deduplication
  delivery_status JSONB DEFAULT '{}'::jsonb, -- Per-channel status
  delivery_attempts INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_notifications_tenant (tenant_id),
  INDEX idx_notifications_recipient (tenant_id, recipient_id, created_at DESC),
  INDEX idx_notifications_status (tenant_id, status),
  INDEX idx_notifications_dedup (deduplication_key),
  INDEX idx_notifications_type (tenant_id, notification_type),
  INDEX idx_notifications_expires (expires_at) WHERE expires_at IS NOT NULL
);

-- ============================================================================
-- NOTIFICATION DEAD LETTER QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_dead_letter_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  notification_id TEXT NOT NULL REFERENCES unified_notifications(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  failure_reason TEXT,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_dlq_tenant (tenant_id),
  INDEX idx_dlq_notification (notification_id),
  INDEX idx_dlq_created (created_at DESC)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE unified_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY unified_notifications_tenant_isolation ON unified_notifications
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY notification_dlq_tenant_isolation ON notification_dead_letter_queue
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ============================================================================
-- CLEANUP: Delete expired notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM unified_notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status IN ('delivered', 'dead_letter');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON unified_notifications(tenant_id, recipient_id, delivered_at)
  WHERE delivered_at IS NULL AND status = 'delivered';
