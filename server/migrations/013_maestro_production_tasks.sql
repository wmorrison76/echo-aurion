-- Migration: Maestro Production Tasks and Timeline
-- Purpose: Production calendar entries for Banquet, Pastry, and other departments
-- Date: 2025-01-01
-- Features: Production tasks, prep timelines, execution scheduling, plating types

-- =====================================================
-- PRODUCTION TASK TYPES TABLE
-- =====================================================
-- Defines what types of production tasks are possible
CREATE TABLE IF NOT EXISTS production_task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Task definition
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- e.g., 'menu_prep', 'dessert_prep', 'plating', 'setup'
  description TEXT,
  
  -- Department that executes
  department_id UUID NOT NULL,
  
  -- Timing
  typical_duration_hours NUMERIC(8,2),
  advance_prep_days INTEGER DEFAULT 3, -- How many days before event to start
  
  -- Configuration
  requires_recipe BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  allows_parallel_execution BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  
  UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_prod_task_types_org ON production_task_types(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_prod_task_types_dept ON production_task_types(department_id);

-- =====================================================
-- PRODUCTION TASKS TABLE (Main)
-- =====================================================
-- Individual production tasks linked to events
CREATE TABLE IF NOT EXISTS maestro_production_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  
  -- Task definition
  task_type_id UUID NOT NULL,
  department_id UUID NOT NULL,
  
  -- Task description
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Event details cached
  event_title VARCHAR(255),
  event_date DATE,
  event_start_time TIMESTAMP WITH TIME ZONE,
  event_end_time TIMESTAMP WITH TIME ZONE,
  guest_count INTEGER,
  
  -- Task status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',          -- Not yet started
    'in_progress',      -- Currently being worked on
    'paused',           -- Temporarily stopped
    'completed',        -- Finished
    'cancelled',        -- Cancelled (event cancelled)
    'blocked',          -- Blocked (awaiting something)
    'failed'            -- Failed/needs rework
  )),
  
  -- Plating/Service type (for banquets)
  plating_type VARCHAR(50) CHECK (plating_type IN (
    'plated',           -- Individual plated service
    'buffet',           -- Buffet-style service
    'family_style',     -- Family-style service
    'stations',         -- Food stations
    'cocktail',         -- Cocktail reception style
    'other'
  )),
  
  -- Prep timeline
  prep_start_date DATE,    -- When prep starts (event_date - advance_prep_days)
  prep_end_date DATE,      -- Day before event
  execution_date DATE,     -- Day of event
  
  -- Execution timing
  execution_start_time TIMESTAMP WITH TIME ZONE,  -- When to start on day of event
  execution_end_time TIMESTAMP WITH TIME ZONE,    -- When to complete
  
  -- Assignments
  assigned_to_user_id UUID,
  approved_by_user_id UUID,
  approval_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Progress tracking
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  blockers TEXT,  -- What's blocking this task
  
  -- Dependencies
  depends_on_task_ids UUID[],  -- Other tasks that must complete first
  
  -- Related data
  recipe_ids UUID[],  -- Recipes involved (for Culinary integration)
  ingredient_list_id UUID,  -- Link to ingredient list/shopping list
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (prep_start_date <= prep_end_date),
  CONSTRAINT valid_execution CHECK (
    (execution_start_time IS NULL AND execution_end_time IS NULL) OR
    (execution_start_time IS NOT NULL AND execution_end_time IS NOT NULL AND execution_start_time < execution_end_time)
  ),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (task_type_id) REFERENCES production_task_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  
  UNIQUE(event_id, task_type_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_maestro_tasks_event ON maestro_production_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_outlet ON maestro_production_tasks(outlet_id);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_dept ON maestro_production_tasks(department_id, status);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_date ON maestro_production_tasks(execution_date, status);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_prep_date ON maestro_production_tasks(prep_start_date, prep_end_date);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_status ON maestro_production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maestro_tasks_assigned ON maestro_production_tasks(assigned_to_user_id, status);

-- =====================================================
-- PRODUCTION PREP TIMELINE TABLE
-- =====================================================
-- Detailed timeline of prep work days
CREATE TABLE IF NOT EXISTS production_prep_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  prep_day_date DATE NOT NULL,
  days_before_event INTEGER NOT NULL, -- 5=5 days before, 1=day before, 0=day of
  
  -- Daily task
  daily_task_description TEXT,
  estimated_hours NUMERIC(8,2),
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed',
    'skipped',
    'blocked'
  )),
  
  -- Checkpoint
  checkpoint_required BOOLEAN DEFAULT FALSE,
  checkpoint_name VARCHAR(255),
  checkpoint_approved BOOLEAN DEFAULT FALSE,
  checkpoint_approved_by UUID,
  checkpoint_approved_at TIMESTAMP WITH TIME ZONE,
  
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(production_task_id, prep_day_date)
);

CREATE INDEX IF NOT EXISTS idx_prep_timeline_task ON production_prep_timeline(production_task_id);
CREATE INDEX IF NOT EXISTS idx_prep_timeline_date ON production_prep_timeline(prep_day_date);
CREATE INDEX IF NOT EXISTS idx_prep_timeline_status ON production_prep_timeline(status);

-- =====================================================
-- PRODUCTION CHECKLIST TABLE
-- =====================================================
-- Day-of event checklist items
CREATE TABLE IF NOT EXISTS production_event_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  -- Checklist item
  item_number INTEGER NOT NULL,
  item_description VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- 'prep', 'cooking', 'plating', 'garnish', 'delivery', 'setup'
  
  -- Estimated time
  estimated_start_time TIME,  -- e.g., "14:30:00" (2:30 PM)
  estimated_duration_minutes INTEGER,
  
  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  UNIQUE(production_task_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_event_checklist_task ON production_event_checklist(production_task_id);
CREATE INDEX IF NOT EXISTS idx_event_checklist_event ON production_event_checklist(event_id);

-- =====================================================
-- PRODUCTION TASK DEPENDENCIES TABLE
-- =====================================================
-- Track which tasks must complete before others
CREATE TABLE IF NOT EXISTS production_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_task_id UUID NOT NULL,
  prerequisite_task_id UUID NOT NULL,
  
  -- Dependency type
  dependency_type VARCHAR(50) CHECK (dependency_type IN (
    'must_complete_before',  -- Prerequisite must fully complete first
    'must_start_before',     -- Prerequisite must start first
    'can_parallel',          -- Can happen in parallel
    'after_approval'         -- Must wait for prerequisite approval
  )),
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT no_self_dependency CHECK (dependent_task_id != prerequisite_task_id),
  
  FOREIGN KEY (dependent_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  
  UNIQUE(dependent_task_id, prerequisite_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_deps_dependent ON production_task_dependencies(dependent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_prerequisite ON production_task_dependencies(prerequisite_task_id);

-- =====================================================
-- PRODUCTION NOTES / UPDATES TABLE
-- =====================================================
-- Activity log for production tasks
CREATE TABLE IF NOT EXISTS production_task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL,
  event_id UUID NOT NULL,
  
  -- Update type
  update_type VARCHAR(50) CHECK (update_type IN (
    'status_change',
    'note_added',
    'assignment_changed',
    'completion_updated',
    'blocker_added',
    'blocker_resolved',
    'timeline_adjusted',
    'approval_requested',
    'approval_granted',
    'recipe_added',
    'ingredient_list_updated'
  )),
  
  -- Content
  update_message TEXT NOT NULL,
  details JSONB,
  
  -- Who made the update
  updated_by_user_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (production_task_id) REFERENCES maestro_production_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_updates_task ON production_task_updates(production_task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_updates_event ON production_task_updates(event_id, created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE production_task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE maestro_production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_prep_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_event_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_task_updates ENABLE ROW LEVEL SECURITY;

-- Org-level isolation
CREATE POLICY prod_tasks_view_policy ON maestro_production_tasks
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY prep_timeline_view_policy ON production_prep_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maestro_production_tasks
      WHERE id = production_task_id
        AND org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY event_checklist_view_policy ON production_event_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maestro_production_tasks
      WHERE id = production_task_id
        AND org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid())
    )
  );

-- =====================================================
-- HELPER FUNCTION: Create production tasks for BEO
-- =====================================================

CREATE OR REPLACE FUNCTION create_maestro_production_tasks_for_beo(
  p_event_id UUID,
  p_outlet_id UUID,
  p_org_id UUID,
  p_user_id UUID
) RETURNS TABLE (task_id UUID, task_title VARCHAR) AS $$
DECLARE
  v_dept_id UUID;
  v_task_type_id UUID;
  v_task_id UUID;
  v_event_title VARCHAR;
  v_event_start TIMESTAMP WITH TIME ZONE;
  v_event_date DATE;
  v_guest_count INTEGER;
BEGIN
  -- Get event details
  SELECT title, start_time, guest_count INTO v_event_title, v_event_start, v_guest_count
  FROM calendar_events
  WHERE id = p_event_id;
  
  v_event_date := v_event_start::DATE;
  
  -- Get all departments assigned to this outlet (BEO-only)
  FOR v_dept_id IN
    SELECT department_id
    FROM outlet_department_assignments
    WHERE outlet_id = p_outlet_id
      AND is_active = TRUE
      AND (applies_to_beo_only = TRUE OR applies_to_beo_only = FALSE)
  LOOP
    -- Get default production task type for this department
    SELECT id INTO v_task_type_id
    FROM production_task_types
    WHERE department_id = v_dept_id
      AND is_active = TRUE
    LIMIT 1;
    
    IF v_task_type_id IS NOT NULL THEN
      -- Create production task
      INSERT INTO maestro_production_tasks (
        id,
        org_id,
        event_id,
        outlet_id,
        task_type_id,
        department_id,
        title,
        description,
        event_title,
        event_date,
        event_start_time,
        guest_count,
        status,
        prep_start_date,
        prep_end_date,
        execution_date,
        plating_type,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        p_org_id,
        p_event_id,
        p_outlet_id,
        v_task_type_id,
        v_dept_id,
        v_event_title || ' - ' || (SELECT name FROM departments WHERE id = v_dept_id),
        'Production task for BEO event',
        v_event_title,
        v_event_date,
        v_event_start,
        v_guest_count,
        'pending',
        v_event_date - INTERVAL '3 days',
        v_event_date - INTERVAL '1 day',
        v_event_date,
        'plated',
        p_user_id,
        NOW(),
        NOW()
      )
      RETURNING maestro_production_tasks.id, maestro_production_tasks.title
      INTO v_task_id, v_event_title;
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_production_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prod_task_timestamp
BEFORE UPDATE ON maestro_production_tasks
FOR EACH ROW
EXECUTE FUNCTION update_production_timestamp();

COMMIT;
