-- Migration: Create Personal Workload Dashboard Schema
-- Purpose: Track individual employee obligations, cross-department commitments, and workload analysis
-- Date: 2025-01-15
-- Features: Personal obligations, workload analysis, conflict indicators, capacity planning

-- =====================================================
-- EMPLOYEE PERSONAL OBLIGATIONS TABLE
-- =====================================================
-- Tracks all obligations for a specific employee across all events
CREATE TABLE IF NOT EXISTS employee_personal_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  event_id UUID NOT NULL,
  event_title VARCHAR(255) NOT NULL,
  event_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  event_department VARCHAR(100) NOT NULL,
  
  obligation_type VARCHAR(50) NOT NULL CHECK (obligation_type IN (
    'mandatory_acknowledgment',
    'attendance_required',
    'training',
    'approval_required',
    'manager_duty',
    'cross_dept_support'
  )),
  
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'acknowledged',
    'completed',
    'escalated',
    'cancelled',
    'exempted'
  )),
  
  -- Workload impact
  estimated_hours NUMERIC(5,2),
  priority INTEGER DEFAULT 1, -- 1=high, 5=low
  
  -- Status tracking
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 5),
  
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(employee_id, event_id, obligation_type)
);

CREATE INDEX IF NOT EXISTS idx_obligations_employee ON employee_personal_obligations(employee_id);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON employee_personal_obligations(status) WHERE status IN ('pending', 'escalated');
CREATE INDEX IF NOT EXISTS idx_obligations_event ON employee_personal_obligations(event_id);
CREATE INDEX IF NOT EXISTS idx_obligations_time ON employee_personal_obligations(event_start_time);

-- =====================================================
-- CROSS-DEPARTMENT COMMITMENTS TABLE
-- =====================================================
-- Tracks when an employee works across multiple departments simultaneously
CREATE TABLE IF NOT EXISTS employee_cross_dept_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  primary_event_id UUID NOT NULL,
  primary_department VARCHAR(100) NOT NULL,
  primary_event_title VARCHAR(255),
  
  secondary_event_id UUID NOT NULL,
  secondary_department VARCHAR(100) NOT NULL,
  secondary_event_title VARCHAR(255),
  
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN (
    'full_overlap',
    'partial_overlap',
    'adjacent_shifts',
    'insufficient_rest'
  )),
  
  conflict_duration_minutes INTEGER,
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('low', 'warning', 'critical')),
  
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT different_events CHECK (primary_event_id != secondary_event_id),
  
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (primary_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (secondary_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(employee_id, primary_event_id, secondary_event_id)
);

CREATE INDEX IF NOT EXISTS idx_cross_dept_employee ON employee_cross_dept_commitments(employee_id);
CREATE INDEX IF NOT EXISTS idx_cross_dept_severity ON employee_cross_dept_commitments(severity);
CREATE INDEX IF NOT EXISTS idx_cross_dept_resolved ON employee_cross_dept_commitments(is_resolved);

-- =====================================================
-- EMPLOYEE WORKLOAD ANALYSIS TABLE
-- =====================================================
-- Stores computed workload metrics for employees
CREATE TABLE IF NOT EXISTS employee_workload_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  analysis_date DATE NOT NULL,
  analysis_period VARCHAR(20) NOT NULL CHECK (analysis_period IN ('daily', 'weekly', 'monthly', 'custom')),
  
  total_obligations INTEGER DEFAULT 0,
  acknowledged_obligations INTEGER DEFAULT 0,
  pending_obligations INTEGER DEFAULT 0,
  
  total_estimated_hours NUMERIC(8,2) DEFAULT 0,
  mandatory_hours NUMERIC(8,2) DEFAULT 0,
  training_hours NUMERIC(8,2) DEFAULT 0,
  
  conflict_count INTEGER DEFAULT 0,
  critical_conflicts INTEGER DEFAULT 0,
  
  -- Workload capacity
  capacity_used_percent NUMERIC(5,2) DEFAULT 0, -- 0-100
  capacity_available_hours NUMERIC(8,2) DEFAULT 0,
  is_overloaded BOOLEAN DEFAULT FALSE,
  
  -- Department distribution
  primary_department VARCHAR(100),
  secondary_departments TEXT[], -- Comma-separated
  
  -- Recommendations
  workload_recommendation VARCHAR(50), -- 'balanced', 'busy', 'overloaded', 'available'
  
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_capacity CHECK (capacity_used_percent >= 0 AND capacity_used_percent <= 100),
  
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(employee_id, analysis_date, analysis_period)
);

CREATE INDEX IF NOT EXISTS idx_workload_employee ON employee_workload_analysis(employee_id);
CREATE INDEX IF NOT EXISTS idx_workload_date ON employee_workload_analysis(analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_workload_overloaded ON employee_workload_analysis(is_overloaded) WHERE is_overloaded = TRUE;

-- =====================================================
-- WORKLOAD CAPACITY PREFERENCES TABLE
-- =====================================================
-- Allows employees to set their preferred workload capacity
CREATE TABLE IF NOT EXISTS employee_workload_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  max_weekly_hours NUMERIC(5,2) NOT NULL DEFAULT 40,
  max_daily_hours NUMERIC(5,2) NOT NULL DEFAULT 8,
  min_rest_between_shifts_hours INTEGER NOT NULL DEFAULT 12,
  
  primary_department VARCHAR(100),
  can_work_secondary_depts BOOLEAN DEFAULT FALSE,
  max_secondary_depts INTEGER DEFAULT 0,
  
  -- Preferences
  prefers_morning_shifts BOOLEAN DEFAULT FALSE,
  prefers_evening_shifts BOOLEAN DEFAULT FALSE,
  cannot_work_days TEXT[], -- e.g., ['Sunday', 'Saturday']
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_hours CHECK (max_weekly_hours > 0 AND max_daily_hours > 0),
  
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_capacity_employee ON employee_workload_capacity(employee_id);

-- =====================================================
-- PERSONAL OBLIGATIONS AUDIT TABLE
-- =====================================================
-- Audit trail for obligation status changes
CREATE TABLE IF NOT EXISTS employee_obligations_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'created',
    'acknowledged',
    'completed',
    'escalated',
    'cancelled',
    'exempted'
  )),
  
  action_by_user_id UUID,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  notes TEXT,
  
  FOREIGN KEY (obligation_id) REFERENCES employee_personal_obligations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (action_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_obligation ON employee_obligations_audit(obligation_id);
CREATE INDEX IF NOT EXISTS idx_audit_employee ON employee_obligations_audit(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON employee_obligations_audit(action_timestamp DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE employee_personal_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_cross_dept_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_workload_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_workload_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_obligations_audit ENABLE ROW LEVEL SECURITY;

-- Users can see their own obligations
CREATE POLICY obligations_view_policy ON employee_personal_obligations
  FOR SELECT USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- Users can update their own obligation status
CREATE POLICY obligations_update_policy ON employee_personal_obligations
  FOR UPDATE USING (
    employee_id = auth.uid()
    AND status IN ('pending', 'escalated')
  )
  WITH CHECK (
    status IN ('acknowledged', 'exempted')
  );

-- Cross-dept commitments visible to employee and admins
CREATE POLICY cross_dept_view_policy ON employee_cross_dept_commitments
  FOR SELECT USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Workload analysis visible to self and admins
CREATE POLICY workload_view_policy ON employee_workload_analysis
  FOR SELECT USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- Capacity preferences visible to self
CREATE POLICY capacity_view_policy ON employee_workload_capacity
  FOR SELECT USING (
    employee_id = auth.uid()
  );

-- Users can manage their own capacity preferences
CREATE POLICY capacity_manage_policy ON employee_workload_capacity
  FOR ALL USING (
    employee_id = auth.uid()
  );

-- =====================================================
-- HELPER FUNCTION: Calculate Workload Capacity
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_employee_workload_capacity(
  p_employee_id UUID,
  p_org_id UUID,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
  total_obligations INTEGER,
  total_hours NUMERIC,
  capacity_percent NUMERIC,
  is_overloaded BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(epo.id)::INTEGER as total_obligations,
    COALESCE(SUM(epo.estimated_hours), 0) as total_hours,
    ROUND(COALESCE(SUM(epo.estimated_hours), 0)::NUMERIC / 
      COALESCE(ewc.max_weekly_hours, 40) * 100, 2) as capacity_percent,
    COALESCE(SUM(epo.estimated_hours), 0) > COALESCE(ewc.max_weekly_hours, 40) as is_overloaded
  FROM employee_personal_obligations epo
  LEFT JOIN employee_workload_capacity ewc ON epo.employee_id = ewc.employee_id
  WHERE epo.employee_id = p_employee_id
    AND epo.org_id = p_org_id
    AND epo.event_start_time >= p_period_start
    AND epo.event_start_time <= p_period_end
    AND epo.status NOT IN ('cancelled', 'exempted');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_obligation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_obligation_timestamp
BEFORE UPDATE ON employee_personal_obligations
FOR EACH ROW
EXECUTE FUNCTION update_obligation_timestamp();

CREATE OR REPLACE FUNCTION update_capacity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_capacity_timestamp
BEFORE UPDATE ON employee_workload_capacity
FOR EACH ROW
EXECUTE FUNCTION update_capacity_timestamp();

COMMIT;
