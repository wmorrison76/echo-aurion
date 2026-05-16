/**
 * Persistent Event Store Migration
 * 
 * Creates database-backed event store for unified event bus
 * - Persistent storage for all events
 * - Event replay capability
 * - Idempotency key tracking
 * - Dead letter queue
 * - Event versioning
 */

-- Event Store Table (All events persisted)
CREATE TABLE IF NOT EXISTS event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  source_bus TEXT NOT NULL CHECK (source_bus IN ('os', 'financial', 'maestro', 'dialogue', 'stratus')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  
  -- Event payload
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Idempotency
  idempotency_key TEXT,
  event_hash TEXT NOT NULL, -- SHA-256 hash for deduplication
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  
  -- Event versioning
  schema_version INTEGER DEFAULT 1,
  
  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_store_tenant ON event_store(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_org ON event_store(org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_type ON event_store(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_status ON event_store(status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_priority ON event_store(priority, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_idempotency ON event_store(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_store_hash ON event_store(event_hash, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_source ON event_store(source_bus, occurred_at DESC);

-- Index for event replay (chronological order)
CREATE INDEX IF NOT EXISTS idx_event_store_replay ON event_store(tenant_id, occurred_at ASC) WHERE status = 'completed';

-- Dead Letter Queue Table (Failed events)
CREATE TABLE IF NOT EXISTS event_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_store_id UUID NOT NULL REFERENCES event_store(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  source_bus TEXT NOT NULL,
  priority TEXT NOT NULL,
  
  -- Original payload
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  
  -- Failure information
  failure_reason TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER NOT NULL,
  last_attempt_at TIMESTAMPTZ NOT NULL,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_tenant ON event_dead_letter_queue(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dead_letter_resolved ON event_dead_letter_queue(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dead_letter_type ON event_dead_letter_queue(event_type, created_at DESC);

-- Event Replay Log Table (Track replay operations)
CREATE TABLE IF NOT EXISTS event_replay_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Replay details
  replay_id TEXT NOT NULL UNIQUE,
  replay_type TEXT NOT NULL CHECK (replay_type IN ('full', 'incremental', 'event_type', 'date_range')),
  start_event_id UUID REFERENCES event_store(id),
  end_event_id UUID REFERENCES event_store(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Replay criteria
  event_types TEXT[],
  filters JSONB,
  
  -- Results
  events_replayed INTEGER DEFAULT 0,
  events_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_replay_log_tenant ON event_replay_log(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_replay_log_status ON event_replay_log(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_replay_log_replay_id ON event_replay_log(replay_id);

-- Event Subscription Table (Track event subscribers)
CREATE TABLE IF NOT EXISTS event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscriber_id TEXT NOT NULL, -- Module/service identifier
  subscriber_type TEXT NOT NULL CHECK (subscriber_type IN ('module', 'service', 'webhook', 'queue')),
  
  -- Subscription criteria
  event_types TEXT[] NOT NULL,
  event_sources TEXT[],
  filters JSONB DEFAULT '{}',
  
  -- Subscription config
  webhook_url TEXT,
  queue_name TEXT,
  batch_size INTEGER DEFAULT 1,
  batch_interval_ms INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_processed_event_id UUID REFERENCES event_store(id),
  last_processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, subscriber_id, subscriber_type)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON event_subscriptions(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_types ON event_subscriptions USING GIN(event_types);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON event_subscriptions(is_active, tenant_id);

-- Row-Level Security (RLS) Policies
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_replay_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see events for their organization
CREATE POLICY event_store_org_isolation ON event_store
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY dead_letter_org_isolation ON event_dead_letter_queue
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY replay_log_org_isolation ON event_replay_log
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', true)::UUID);

CREATE POLICY subscriptions_org_isolation ON event_subscriptions
  FOR ALL
  USING (tenant_id = current_setting('app.current_org_id', true)::UUID);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_store_updated_at
  BEFORE UPDATE ON event_store
  FOR EACH ROW
  EXECUTE FUNCTION update_event_store_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON event_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_event_store_updated_at();

-- Function for event replay
CREATE OR REPLACE FUNCTION replay_events(
  p_tenant_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_event_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  event_id TEXT,
  event_type TEXT,
  occurred_at TIMESTAMPTZ,
  payload JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.event_id,
    es.event_type,
    es.occurred_at,
    es.payload
  FROM event_store es
  WHERE es.tenant_id = p_tenant_id
    AND es.status = 'completed'
    AND es.occurred_at >= p_start_time
    AND es.occurred_at <= p_end_time
    AND (p_event_types IS NULL OR es.event_type = ANY(p_event_types))
  ORDER BY es.occurred_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE event_store IS 'Persistent event store for unified event bus - all events stored here for replay and audit';
COMMENT ON TABLE event_dead_letter_queue IS 'Failed events that exceeded retry limits - requires manual intervention';
COMMENT ON TABLE event_replay_log IS 'Track event replay operations for audit and debugging';
COMMENT ON TABLE event_subscriptions IS 'Event subscribers configuration - which modules/services subscribe to which events';
