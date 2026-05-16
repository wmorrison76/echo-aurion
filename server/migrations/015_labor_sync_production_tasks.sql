-- Migration: Labor Hours Sync for Production Tasks
-- Purpose: Add labor hours tracking and Schedule module integration
-- Date: 2025-01-01
-- Features: Estimated hours per prep day, actual hours tracking, schedule sync status

-- =====================================================
-- ALTER MAESTRO_PRODUCTION_TASKS - Add Labor Fields
-- =====================================================

ALTER TABLE maestro_production_tasks
ADD COLUMN IF NOT EXISTS estimated_total_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours_spent NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_rate_hourly NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS estimated_labor_cost NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS actual_labor_cost NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS assigned_staff_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS synced_to_schedule BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS schedule_sync_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS schedule_entry_id UUID;

CREATE INDEX IF NOT EXISTS idx_maestro_tasks_synced ON maestro_production_tasks(synced_to_schedule);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_labor_cost ON maestro_production_tasks(estimated_labor_cost);

-- =====================================================
-- LABOR HOURS BY PREP DAY TABLE
-- =====================================================
-- Breakdown of labor hours needed per prep day
CREATE TABLE IF NOT EXISTS production_task_labor_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  prep_day_date DATE NOT NULL,
  days_before_event INTEGER NOT NULL,
  
  -- Labor requirements
  estimated_hours NUMERIC(10,2) NOT NULL,
  estimated_staff_count INTEGER DEFAULT 1,
  labor_type VARCHAR(100), -- 'banquet_prep', 'pastry_prep', 'plating', etc
  
  -- Tracking
  actual_hours NUMERIC(10,2),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed')),
  
  -- Schedule module sync
  synced_to_schedule BOOLEAN DEFAULT FALSE,
  schedule_sync_timestamp TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT positive_hours CHECK (estimated_hours > 0),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(production_task_id, prep_day_date)
);

CREATE INDEX IF NOT EXISTS idx_labor_hours_task ON production_task_labor_hours(production_task_id);
CREATE INDEX IF NOT EXISTS idx_labor_hours_date ON production_task_labor_hours(prep_day_date);
CREATE INDEX IF NOT EXISTS idx_labor_hours_synced ON production_task_labor_hours(synced_to_schedule);

-- =====================================================
-- SCHEDULE MODULE SYNC LOG TABLE
-- =====================================================
-- Track all syncs to Schedule module for audit and troubleshooting
CREATE TABLE IF NOT EXISTS labor_schedule_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID,
  production_task_id UUID,
  department_id UUID,
  
  -- Sync details
  sync_type VARCHAR(50) CHECK (sync_type IN (
    'initial_sync',      -- First time syncing
    'hours_update',      -- Hours updated
    'status_change',     -- Task status changed
    'assignment_change', -- Assignment changed
    'manual_override'    -- User manually updated
  )),
  
  hours_synced NUMERIC(10,2),
  staff_count_synced INTEGER,
  
  -- Status
  sync_status VARCHAR(30) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'reverted')),
  error_message TEXT,
  
  -- Metadata
  synced_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (synced_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_log_event ON labor_schedule_sync_log(event_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_task ON labor_schedule_sync_log(production_task_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON labor_schedule_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_log_date ON labor_schedule_sync_log(created_at DESC);

-- =====================================================
-- HELPER FUNCTION: Calculate total labor hours for production task
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_total_labor_hours(
  p_production_task_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_total_hours NUMERIC(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(estimated_hours), 0)
  INTO v_total_hours
  FROM production_task_labor_hours
  WHERE production_task_id = p_production_task_id;
  
  RETURN v_total_hours;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Sync labor hours to Schedule module
-- =====================================================

CREATE OR REPLACE FUNCTION sync_production_task_to_schedule(
  p_production_task_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  sync_id UUID,
  task_id UUID,
  hours_synced NUMERIC,
  staff_count INTEGER,
  sync_status VARCHAR
) AS $$
DECLARE
  v_task RECORD;
  v_total_hours NUMERIC(10,2);
  v_sync_id UUID;
  v_avg_staff INTEGER;
BEGIN
  -- Get production task details
  SELECT id, event_id, department_id, estimated_total_hours, assigned_staff_count
  INTO v_task
  FROM maestro_production_tasks
  WHERE id = p_production_task_id;
  
  IF v_task IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate total hours from labor breakdown
  v_total_hours := calculate_total_labor_hours(p_production_task_id);
  
  -- Get average staff count from labor hours
  SELECT COALESCE(AVG(estimated_staff_count), 1)
  INTO v_avg_staff
  FROM production_task_labor_hours
  WHERE production_task_id = p_production_task_id;
  
  -- Create sync log entry
  INSERT INTO labor_schedule_sync_log (
    id,
    org_id,
    event_id,
    production_task_id,
    department_id,
    sync_type,
    hours_synced,
    staff_count_synced,
    sync_status,
    synced_by_user_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    (SELECT org_id FROM maestro_production_tasks WHERE id = p_production_task_id),
    v_task.event_id,
    p_production_task_id,
    v_task.department_id,
    'initial_sync',
    v_total_hours,
    COALESCE(v_avg_staff, 1),
    'synced',
    p_user_id,
    NOW()
  )
  RETURNING labor_schedule_sync_log.id INTO v_sync_id;
  
  -- Update production task sync status
  UPDATE maestro_production_tasks
  SET
    estimated_total_hours = v_total_hours,
    assigned_staff_count = COALESCE(v_avg_staff, 1),
    synced_to_schedule = TRUE,
    schedule_sync_timestamp = NOW()
  WHERE id = p_production_task_id;
  
  RETURN QUERY SELECT
    v_sync_id,
    p_production_task_id,
    v_total_hours,
    COALESCE(v_avg_staff, 1),
    'synced'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Get upcoming events for department mini-panel
-- =====================================================

CREATE OR REPLACE FUNCTION get_department_upcoming_events(
  p_department_id UUID,
  p_days_ahead INTEGER DEFAULT 7
) RETURNS TABLE (
  event_id UUID,
  event_title VARCHAR,
  event_date DATE,
  event_start_time TIMESTAMP WITH TIME ZONE,
  outlet_id UUID,
  outlet_name VARCHAR,
  task_id UUID,
  task_status VARCHAR,
  task_title VARCHAR,
  guest_count INTEGER,
  estimated_hours NUMERIC,
  assigned_staff_count INTEGER,
  plating_type VARCHAR,
  days_until_event INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mpt.event_id,
    mpt.event_title,
    mpt.event_date,
    mpt.event_start_time,
    mpt.outlet_id,
    co.name,
    mpt.id,
    mpt.status,
    mpt.title,
    mpt.guest_count,
    mpt.estimated_total_hours,
    mpt.assigned_staff_count,
    mpt.plating_type,
    (mpt.event_date - CURRENT_DATE)::INTEGER
  FROM maestro_production_tasks mpt
  LEFT JOIN calendar_outlets co ON mpt.outlet_id = co.id
  WHERE mpt.department_id = p_department_id
    AND mpt.event_date >= CURRENT_DATE
    AND mpt.event_date <= CURRENT_DATE + INTERVAL '1 day' * p_days_ahead
    AND mpt.status != 'cancelled'
  ORDER BY mpt.event_date ASC, mpt.event_start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Get labor hours breakdown for upcoming prep
-- =====================================================

CREATE OR REPLACE FUNCTION get_prep_labor_breakdown(
  p_production_task_id UUID
) RETURNS TABLE (
  prep_day_date DATE,
  days_before_event INTEGER,
  estimated_hours NUMERIC,
  estimated_staff_count INTEGER,
  labor_type VARCHAR,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ptlh.prep_day_date,
    ptlh.days_before_event,
    ptlh.estimated_hours,
    ptlh.estimated_staff_count,
    ptlh.labor_type,
    ptlh.status
  FROM production_task_labor_hours ptlh
  WHERE ptlh.production_task_id = p_production_task_id
  ORDER BY ptlh.prep_day_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_task_labor_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_schedule_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY labor_hours_view_policy ON production_task_labor_hours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maestro_production_tasks
      WHERE id = production_task_id
        AND org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY sync_log_view_policy ON labor_schedule_sync_log
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_labor_hours_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_labor_hours_timestamp
BEFORE UPDATE ON production_task_labor_hours
FOR EACH ROW
EXECUTE FUNCTION update_labor_hours_timestamp();

COMMIT;
