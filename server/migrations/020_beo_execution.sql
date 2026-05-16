-- Migration: BEO Execution System
-- Creates tables for day-of event execution, checklist, timeline, and real-time updates

-- BEO Execution Status
CREATE TABLE IF NOT EXISTS beo_execution_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beo_id UUID NOT NULL REFERENCES beo_banquet_orders(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  started_by UUID,
  ended_at TIMESTAMPTZ,
  ended_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(beo_id, org_id)
);

-- BEO Execution Checklist
CREATE TABLE IF NOT EXISTS beo_execution_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beo_id UUID NOT NULL REFERENCES beo_banquet_orders(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  category VARCHAR(100) NOT NULL,
  task TEXT NOT NULL,
  assigned_to VARCHAR(255),
  due_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'blocked')),
  notes TEXT,
  dependencies UUID[],
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BEO Execution Timeline
CREATE TABLE IF NOT EXISTS beo_execution_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beo_id UUID NOT NULL REFERENCES beo_banquet_orders(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  time TIMESTAMPTZ NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in-progress', 'completed', 'delayed')),
  assigned_to VARCHAR(255),
  category VARCHAR(100),
  actual_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BEO Execution Updates (Real-time updates)
CREATE TABLE IF NOT EXISTS beo_execution_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beo_id UUID NOT NULL REFERENCES beo_banquet_orders(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('status', 'issue', 'note', 'photo')),
  message TEXT NOT NULL,
  author VARCHAR(255) NOT NULL,
  author_id UUID NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  attachments TEXT[],
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beo_execution_status_beo ON beo_execution_status(beo_id, org_id);
CREATE INDEX IF NOT EXISTS idx_beo_execution_checklist_beo ON beo_execution_checklist(beo_id, org_id);
CREATE INDEX IF NOT EXISTS idx_beo_execution_checklist_status ON beo_execution_checklist(status);
CREATE INDEX IF NOT EXISTS idx_beo_execution_timeline_beo ON beo_execution_timeline(beo_id, org_id);
CREATE INDEX IF NOT EXISTS idx_beo_execution_timeline_time ON beo_execution_timeline(time);
CREATE INDEX IF NOT EXISTS idx_beo_execution_updates_beo ON beo_execution_updates(beo_id, org_id);
CREATE INDEX IF NOT EXISTS idx_beo_execution_updates_timestamp ON beo_execution_updates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_beo_execution_updates_type ON beo_execution_updates(type);
CREATE INDEX IF NOT EXISTS idx_beo_execution_updates_resolved ON beo_execution_updates(resolved);

-- Row-level security (if using RLS)
-- ALTER TABLE beo_execution_status ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE beo_execution_checklist ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE beo_execution_timeline ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE beo_execution_updates ENABLE ROW LEVEL SECURITY;

-- Add actual_guest_count to beo_banquet_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beo_banquet_orders' 
    AND column_name = 'actual_guest_count'
  ) THEN
    ALTER TABLE beo_banquet_orders ADD COLUMN actual_guest_count INTEGER;
  END IF;
END $$;

-- Add actual_cost to beo_banquet_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'beo_banquet_orders' 
    AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE beo_banquet_orders ADD COLUMN actual_cost DECIMAL(10, 2);
  END IF;
END $$;
