-- Migration: Create Cross-Department Conflict Detection Schema
-- Purpose: Enhanced conflict detection with staff overlap analysis, impact scoring, and alternative time suggestions
-- Date: 2025-01-15
-- Features: Department-aware conflicts, affected staff tracking, smart alternative suggestions

-- =====================================================
-- ENHANCED CALENDAR CONFLICTS TABLE (ALTER EXISTING)
-- =====================================================

-- Add cross-department fields to existing calendar_conflicts table
ALTER TABLE calendar_conflicts
ADD COLUMN IF NOT EXISTS affected_departments TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS affected_staff_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_score NUMERIC(5,2) DEFAULT 0.0, -- 0-100 scale
ADD COLUMN IF NOT EXISTS conflict_breakdown JSONB DEFAULT '{}', -- Per-department breakdown
ADD COLUMN IF NOT EXISTS is_hard_locked BOOLEAN DEFAULT FALSE, -- Prevent ANY conflicting shifts
ADD COLUMN IF NOT EXISTS hard_lock_reason VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_conflicts_departments ON calendar_conflicts USING gin(affected_departments);
CREATE INDEX IF NOT EXISTS idx_conflicts_impact ON calendar_conflicts(impact_score DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conflicts_hard_locked ON calendar_conflicts(is_hard_locked) WHERE is_hard_locked = TRUE;

-- =====================================================
-- CONFLICT RESOLUTION SUGGESTIONS TABLE
-- =====================================================
-- Stores AI-generated alternative time slots to reduce conflicts
CREATE TABLE IF NOT EXISTS calendar_conflict_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_conflict_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  suggested_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  suggested_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  suggested_date DATE NOT NULL,
  
  estimated_conflict_count INTEGER DEFAULT 0,
  estimated_affected_staff INTEGER DEFAULT 0,
  estimated_impact_score NUMERIC(5,2),
  
  affected_departments_reduction TEXT[], -- Departments no longer affected
  estimated_savings_percent NUMERIC(5,2), -- What % of conflicts this eliminates
  
  reasoning TEXT, -- Why this time is better
  ai_suggested BOOLEAN DEFAULT TRUE,
  
  approved_by_user_id UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_times CHECK (suggested_start_time < suggested_end_time),
  CONSTRAINT valid_savings CHECK (estimated_savings_percent >= 0 AND estimated_savings_percent <= 100),
  
  FOREIGN KEY (original_conflict_id) REFERENCES calendar_conflicts(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alternatives_conflict ON calendar_conflict_alternatives(original_conflict_id);
CREATE INDEX IF NOT EXISTS idx_alternatives_event ON calendar_conflict_alternatives(event_id);
CREATE INDEX IF NOT EXISTS idx_alternatives_savings ON calendar_conflict_alternatives(estimated_savings_percent DESC) WHERE approved_at IS NULL;

-- =====================================================
-- CROSS-DEPARTMENT STAFF OVERLAP TABLE
-- =====================================================
-- Tracks which individual employees are affected by conflicts across departments
CREATE TABLE IF NOT EXISTS calendar_conflict_affected_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL,
  
  employee_id UUID NOT NULL,
  primary_department VARCHAR(100) NOT NULL,
  secondary_department VARCHAR(100),
  
  primary_event_id UUID NOT NULL, -- Event from primary dept
  secondary_event_id UUID NOT NULL, -- Event from secondary dept
  
  conflict_type VARCHAR(50) NOT NULL, -- 'overlap', 'adjacent', 'insufficient_rest'
  severity VARCHAR(20) DEFAULT 'warning', -- low, warning, critical
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT different_events CHECK (primary_event_id != secondary_event_id),
  
  FOREIGN KEY (conflict_id) REFERENCES calendar_conflicts(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (primary_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (secondary_event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(conflict_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_conflict ON calendar_conflict_affected_staff(conflict_id);
CREATE INDEX IF NOT EXISTS idx_staff_employee ON calendar_conflict_affected_staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_severity ON calendar_conflict_affected_staff(severity);
CREATE INDEX IF NOT EXISTS idx_staff_type ON calendar_conflict_affected_staff(conflict_type);

-- =====================================================
-- CONFLICT RESOLUTION AUDIT TABLE
-- =====================================================
-- Tracks how conflicts are resolved (moved, cancelled, approved, hard-locked, etc)
CREATE TABLE IF NOT EXISTS calendar_conflict_resolution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  resolution_action VARCHAR(50) NOT NULL CHECK (resolution_action IN (
    'moved_event',
    'cancelled_event',
    'manager_approval',
    'hard_locked',
    'auto_resolved',
    'escalated',
    'staff_reassigned'
  )),
  
  resolution_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_by_user_id UUID NOT NULL,
  
  action_details JSONB DEFAULT '{}', -- Store specifics: new time, reason, etc
  staffing_impact JSONB DEFAULT '{}', -- Which staff affected by resolution
  
  FOREIGN KEY (conflict_id) REFERENCES calendar_conflicts(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resolution_conflict ON calendar_conflict_resolution_audit(conflict_id);
CREATE INDEX IF NOT EXISTS idx_resolution_action ON calendar_conflict_resolution_audit(resolution_action);
CREATE INDEX IF NOT EXISTS idx_resolution_timestamp ON calendar_conflict_resolution_audit(resolution_timestamp DESC);

-- =====================================================
-- CONFLICT PREVENTION RULES TABLE
-- =====================================================
-- Allows admins to set rules that prevent certain types of conflicts
CREATE TABLE IF NOT EXISTS calendar_conflict_prevention_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
    'max_hours_per_day',
    'min_rest_between_shifts',
    'no_back_to_back_departments',
    'same_staff_same_location_only',
    'manager_approval_required',
    'hard_lock_mandatory',
    'no_double_booking'
  )),
  
  applies_to_departments TEXT[], -- NULL = all departments
  applies_to_roles TEXT[], -- NULL = all roles
  
  rule_value VARCHAR(255), -- e.g., "8" for max hours, "12" for min rest hours
  enforcement_level VARCHAR(30) DEFAULT 'warning' CHECK (enforcement_level IN ('warning', 'soft_block', 'hard_block')),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_org ON calendar_conflict_prevention_rules(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rules_type ON calendar_conflict_prevention_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_departments ON calendar_conflict_prevention_rules USING gin(applies_to_departments);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE calendar_conflict_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflict_affected_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflict_resolution_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflict_prevention_rules ENABLE ROW LEVEL SECURITY;

-- Users can view conflicts for events they have access to
CREATE POLICY alternatives_view_policy ON calendar_conflict_alternatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_conflicts cc
      WHERE cc.id = original_conflict_id
      AND cc.org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- Staff can see they are affected by a conflict
CREATE POLICY affected_staff_view_policy ON calendar_conflict_affected_staff
  FOR SELECT USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

-- Resolution audit visible to admins and event creators
CREATE POLICY resolution_audit_view_policy ON calendar_conflict_resolution_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id
      AND (
        ce.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE id = auth.uid()
          AND role IN ('admin', 'owner')
        )
      )
    )
  );

-- Rules visible to org members
CREATE POLICY rules_view_policy ON calendar_conflict_prevention_rules
  FOR SELECT USING (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
  );

-- Only admins can manage rules
CREATE POLICY rules_manage_policy ON calendar_conflict_prevention_rules
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- HELPER FUNCTION: Calculate Impact Score
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_conflict_impact_score(
  affected_staff_count INTEGER,
  affected_departments_count INTEGER,
  severity_level VARCHAR
) RETURNS NUMERIC AS $$
DECLARE
  base_score NUMERIC := 0;
  staff_multiplier NUMERIC := 1.0;
  dept_multiplier NUMERIC := 1.0;
  severity_multiplier NUMERIC := 1.0;
BEGIN
  -- Base score from affected staff (1 staff = 10 points, max 50)
  staff_multiplier := LEAST(affected_staff_count::NUMERIC / 10, 5.0);
  
  -- Department multiplier (more depts = higher impact, max 2x)
  dept_multiplier := LEAST(1.0 + (affected_departments_count::NUMERIC / 5.0), 2.0);
  
  -- Severity multiplier
  severity_multiplier := CASE 
    WHEN severity_level = 'critical' THEN 3.0
    WHEN severity_level = 'warning' THEN 2.0
    WHEN severity_level = 'info' THEN 1.0
    ELSE 1.5
  END;
  
  base_score := 10 * staff_multiplier * dept_multiplier * severity_multiplier;
  
  RETURN LEAST(base_score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- HELPER FUNCTION: Find Alternative Time Slots
-- =====================================================

CREATE OR REPLACE FUNCTION find_alternative_times(
  p_event_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_max_alternatives INTEGER DEFAULT 5
) RETURNS TABLE (
  suggested_start_time TIMESTAMP WITH TIME ZONE,
  suggested_end_time TIMESTAMP WITH TIME ZONE,
  estimated_conflicts INTEGER,
  estimated_impact_score NUMERIC
) AS $$
BEGIN
  -- This is a placeholder for the actual algorithm
  -- In production, this would search the calendar for optimal time slots
  -- by checking for minimum overlaps across all affected departments
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_prevention_rules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prevention_rules_timestamp
BEFORE UPDATE ON calendar_conflict_prevention_rules
FOR EACH ROW
EXECUTE FUNCTION update_prevention_rules_timestamp();

COMMIT;
