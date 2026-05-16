-- Migration: Phase 5 - Staff Assignment, Analytics, and Advanced Labor Management
-- Purpose: Bidirectional Schedule sync, actual hours tracking, analytics, custom labor rates
-- Date: 2025-01-15
-- Features: Staff assignments, actual vs estimated tracking, custom rates, skill-based assignment, availability constraints

-- =====================================================
-- STAFF SKILL MATRIX TABLE
-- =====================================================
-- Tracks which employees have which skills/roles
CREATE TABLE IF NOT EXISTS staff_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  skill_code VARCHAR(100) NOT NULL, -- e.g., 'prep_chef', 'pastry_chef', 'plating', 'expediting'
  skill_name VARCHAR(255) NOT NULL,
  proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  certified BOOLEAN DEFAULT FALSE,
  certified_date DATE,
  years_experience NUMERIC(4,1),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, employee_id, skill_code)
);

CREATE INDEX IF NOT EXISTS idx_staff_skills_employee ON staff_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_skills_skill ON staff_skills(skill_code, proficiency_level);
CREATE INDEX IF NOT EXISTS idx_staff_skills_org ON staff_skills(org_id);

-- =====================================================
-- STAFF AVAILABILITY & CONSTRAINTS TABLE
-- =====================================================
-- Track availability windows and constraints for each staff member
CREATE TABLE IF NOT EXISTS staff_availability_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Availability type
  constraint_type VARCHAR(50) CHECK (constraint_type IN (
    'unavailable_date',      -- Not available on specific date
    'unavailable_time_window', -- Not available during time window (e.g., 3pm-5pm)
    'max_hours_per_week',    -- Maximum hours allowed per week
    'max_consecutive_days',  -- Max days in a row
    'max_hours_per_day',     -- Max hours per day
    'requires_rest_day',     -- Needs at least 1 day off per week
    'prefers_no_nights',     -- Avoids night shifts
    'prefers_morning',       -- Prefers morning shifts
    'dietary_restriction',   -- Cannot work in certain food areas
    'language_requirement'   -- Speaks specific languages for customer interaction
  )),
  
  -- Constraint details
  constraint_value VARCHAR(500), -- e.g., date, time window, hour limit
  notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_availability_constraints_employee ON staff_availability_constraints(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_availability_constraints_type ON staff_availability_constraints(constraint_type);

-- =====================================================
-- DEPARTMENT HOURLY RATES TABLE
-- =====================================================
-- Custom labor rates per department and position
CREATE TABLE IF NOT EXISTS department_labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  department_id UUID NOT NULL,
  
  -- Position/role in department
  position_code VARCHAR(100), -- e.g., 'prep_chef', 'pastry_assistant'
  position_name VARCHAR(255),
  
  -- Rates
  base_hourly_rate NUMERIC(10,2) NOT NULL,
  overtime_multiplier NUMERIC(3,2) DEFAULT 1.5, -- 1.5x for overtime
  weekend_multiplier NUMERIC(3,2) DEFAULT 1.0, -- Can vary per org
  holiday_multiplier NUMERIC(3,2) DEFAULT 2.0,
  
  -- Effective dates
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, department_id, position_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_labor_rates_dept ON department_labor_rates(department_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_labor_rates_org ON department_labor_rates(org_id);

-- =====================================================
-- STAFF ASSIGNMENT TO PRODUCTION TASKS TABLE
-- =====================================================
-- Who is assigned to work on which production tasks
CREATE TABLE IF NOT EXISTS staff_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  production_task_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Assignment details
  assigned_by_user_id UUID,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Role in task
  role_in_task VARCHAR(100), -- e.g., 'lead_prep', 'sous_chef', 'assistant'
  task_allocation_percentage NUMERIC(5,2) DEFAULT 100, -- How much of their time on this task
  
  -- Status
  assignment_status VARCHAR(30) DEFAULT 'pending' CHECK (assignment_status IN (
    'pending',      -- Awaiting confirmation
    'confirmed',    -- Staff confirmed availability
    'in_progress',  -- Currently working
    'completed',    -- Finished
    'cancelled',    -- Assignment cancelled
    'no_show'       -- Didn't show up
  )),
  
  -- Actual hours tracking
  estimated_hours NUMERIC(10,2),
  actual_hours_worked NUMERIC(10,2),
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_allocation CHECK (task_allocation_percentage > 0 AND task_allocation_percentage <= 100),
  CONSTRAINT valid_times CHECK (actual_start_time IS NULL OR actual_end_time IS NULL OR actual_start_time < actual_end_time),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(production_task_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_task ON staff_task_assignments(production_task_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_employee ON staff_task_assignments(employee_id, assignment_status);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_status ON staff_task_assignments(assignment_status);

-- =====================================================
-- LABOR PERFORMANCE ANALYTICS TABLE
-- =====================================================
-- Track actual vs estimated for analysis and forecasting improvements
CREATE TABLE IF NOT EXISTS labor_performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  department_id UUID NOT NULL,
  
  -- Estimates
  estimated_hours NUMERIC(10,2),
  estimated_staff_count INTEGER,
  estimated_labor_cost NUMERIC(12,2),
  
  -- Actuals
  actual_hours_worked NUMERIC(10,2),
  actual_staff_count INTEGER, -- May differ from estimated
  actual_labor_cost NUMERIC(12,2),
  
  -- Variance analysis
  hours_variance NUMERIC(10,2), -- Actual - Estimated (positive = over)
  hours_variance_percentage NUMERIC(6,2), -- Percentage over/under
  cost_variance NUMERIC(12,2),
  cost_variance_percentage NUMERIC(6,2),
  
  -- Productivity metrics
  productivity_score NUMERIC(5,2), -- 0-100 based on variance
  quality_score NUMERIC(5,2), -- 0-100 (if available from feedback)
  efficiency_index NUMERIC(5,2), -- Actual output / Estimated effort
  
  -- Event context
  guest_count INTEGER,
  event_type VARCHAR(50),
  plating_type VARCHAR(50),
  prep_days_used INTEGER,
  
  -- Notes for variance
  variance_reason VARCHAR(255), -- Why was there variance? (scope change, team size, etc.)
  improvement_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  
  UNIQUE(production_task_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_task ON labor_performance_analytics(production_task_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dept ON labor_performance_analytics(department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_variance ON labor_performance_analytics(hours_variance_percentage);

-- =====================================================
-- REALTIME COLLABORATION LOG TABLE
-- =====================================================
-- Track all real-time updates and collaboration events
CREATE TABLE IF NOT EXISTS realtime_collaboration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  production_task_id UUID NOT NULL,
  
  -- Event details
  event_type VARCHAR(50) CHECK (event_type IN (
    'task_status_changed',
    'staff_assigned',
    'staff_removed',
    'hours_updated',
    'actual_hours_logged',
    'comment_added',
    'task_blocked',
    'task_unblocked',
    'completion_estimated_updated',
    'quality_feedback',
    'schedule_conflict_detected'
  )),
  
  event_description TEXT NOT NULL,
  event_data JSONB,
  
  -- Who triggered it
  triggered_by_user_id UUID,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Real-time broadcast status
  broadcast_status VARCHAR(30) DEFAULT 'pending' CHECK (broadcast_status IN ('pending', 'sent', 'failed')),
  broadcast_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_collab_events_task ON realtime_collaboration_events(production_task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collab_events_type ON realtime_collaboration_events(event_type);
CREATE INDEX IF NOT EXISTS idx_collab_events_broadcast ON realtime_collaboration_events(broadcast_status);

-- =====================================================
-- ALTER EXISTING TABLES
-- =====================================================

-- Add fields to production_task_labor_hours for custom rates
ALTER TABLE production_task_labor_hours
ADD COLUMN IF NOT EXISTS custom_hourly_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS actual_labor_cost NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assigned_staff_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Add fields to maestro_production_tasks for analytics
ALTER TABLE maestro_production_tasks
ADD COLUMN IF NOT EXISTS actual_hours_completed NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS actual_staff_count_used INTEGER,
ADD COLUMN IF NOT EXISTS actual_labor_cost_final NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS task_quality_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS task_efficiency_rating VARCHAR(20),
ADD COLUMN IF NOT EXISTS completion_feedback TEXT,
ADD COLUMN IF NOT EXISTS analytics_reviewed BOOLEAN DEFAULT FALSE;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get available staff for a production task
CREATE OR REPLACE FUNCTION get_available_staff_for_task(
  p_production_task_id UUID,
  p_required_skill VARCHAR(100) DEFAULT NULL
) RETURNS TABLE (
  employee_id UUID,
  employee_name VARCHAR,
  proficiency_level VARCHAR,
  has_required_skill BOOLEAN,
  availability_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    COALESCE(u.user_metadata ->> 'full_name', u.email)::VARCHAR,
    COALESCE(ss.proficiency_level, 'unrated')::VARCHAR,
    (ss.id IS NOT NULL)::BOOLEAN,
    CASE 
      WHEN ss.proficiency_level = 'expert' THEN 100
      WHEN ss.proficiency_level = 'advanced' THEN 85
      WHEN ss.proficiency_level = 'intermediate' THEN 70
      WHEN ss.proficiency_level = 'beginner' THEN 50
      ELSE 30
    END::NUMERIC
  FROM auth.users u
  LEFT JOIN staff_skills ss ON u.id = ss.employee_id 
    AND (p_required_skill IS NULL OR ss.skill_code = p_required_skill)
  WHERE u.id IN (
    SELECT employee_id FROM staff_task_assignments
    UNION SELECT employee_id FROM employees
  )
  ORDER BY has_required_skill DESC, proficiency_level DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate actual labor cost for a task
CREATE OR REPLACE FUNCTION calculate_actual_labor_cost(
  p_production_task_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_total_cost NUMERIC(12,2) := 0;
BEGIN
  SELECT COALESCE(SUM(
    COALESCE(sta.actual_hours_worked, 0) *
    COALESCE(dlr.base_hourly_rate, 20)::NUMERIC
  ), 0)
  INTO v_total_cost
  FROM staff_task_assignments sta
  LEFT JOIN maestro_production_tasks mpt ON mpt.id = sta.production_task_id
  LEFT JOIN department_labor_rates dlr ON dlr.department_id = mpt.department_id
  WHERE sta.production_task_id = p_production_task_id
    AND sta.assignment_status IN ('in_progress', 'completed');
  
  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Log a collaboration event and trigger broadcast
CREATE OR REPLACE FUNCTION log_collaboration_event(
  p_org_id UUID,
  p_production_task_id UUID,
  p_event_type VARCHAR,
  p_event_description TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_triggered_by_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO realtime_collaboration_events (
    org_id,
    production_task_id,
    event_type,
    event_description,
    event_data,
    triggered_by_user_id,
    broadcast_status
  ) VALUES (
    p_org_id,
    p_production_task_id,
    p_event_type,
    p_event_description,
    p_event_data,
    p_triggered_by_user_id,
    'pending'
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_collaboration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_skills_view_policy ON staff_skills
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY staff_assignments_view_policy ON staff_task_assignments
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY analytics_view_policy ON labor_performance_analytics
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY collab_events_view_policy ON realtime_collaboration_events
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_phase5_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_skills_timestamp
BEFORE UPDATE ON staff_skills
FOR EACH ROW
EXECUTE FUNCTION update_phase5_timestamp();

CREATE TRIGGER trigger_update_availability_constraints_timestamp
BEFORE UPDATE ON staff_availability_constraints
FOR EACH ROW
EXECUTE FUNCTION update_phase5_timestamp();

CREATE TRIGGER trigger_update_staff_assignments_timestamp
BEFORE UPDATE ON staff_task_assignments
FOR EACH ROW
EXECUTE FUNCTION update_phase5_timestamp();

-- =====================================================
-- INITIAL DATA: Default Labor Rates
-- =====================================================

INSERT INTO department_labor_rates (id, org_id, department_id, position_code, position_name, base_hourly_rate, overtime_multiplier, weekend_multiplier, holiday_multiplier)
VALUES
  (gen_random_uuid(), (SELECT id FROM organizations LIMIT 1), (SELECT id FROM departments WHERE name = 'Banquet' LIMIT 1), 'prep_chef', 'Prep Chef', 28.00, 1.5, 1.25, 2.0),
  (gen_random_uuid(), (SELECT id FROM organizations LIMIT 1), (SELECT id FROM departments WHERE name = 'Banquet' LIMIT 1), 'sous_chef', 'Sous Chef', 35.00, 1.5, 1.25, 2.0),
  (gen_random_uuid(), (SELECT id FROM organizations LIMIT 1), (SELECT id FROM departments WHERE name = 'Pastry' LIMIT 1), 'pastry_chef', 'Pastry Chef', 30.00, 1.5, 1.25, 2.0)
ON CONFLICT DO NOTHING;

COMMIT;
