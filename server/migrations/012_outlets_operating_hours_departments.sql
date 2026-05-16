-- Migration: Outlets Operating Hours and Department Mappings
-- Purpose: Define outlets with operating hours, departments, and BEO/REO configuration
-- Date: 2025-01-01
-- Features: Operating hours per outlet, department mappings, BEO/REO rule configuration

-- =====================================================
-- DEPARTMENTS TABLE
-- =====================================================
-- Core departments that can be assigned to outlets
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- Department info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- 'banquet', 'pastry', 'kitchen', 'av', 'setup', 'engineering'
  description TEXT,
  
  -- Department type
  department_type VARCHAR(50) NOT NULL CHECK (department_type IN (
    'restaurant',      -- Restaurant/outlet operations
    'banquet',         -- Banquet operations
    'pastry',          -- Pastry/bakery
    'kitchen',         -- Kitchen
    'audio_visual',    -- AV team
    'setup',           -- Banquet setup
    'engineering',     -- Engineering/facilities
    'beverage',        -- Beverage/bar
    'other'
  )),
  
  -- Department hierarchy
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Contact info
  manager_user_id UUID,
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_departments_type ON departments(department_type);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);

-- =====================================================
-- OUTLETS TABLE (EXTENDED)
-- =====================================================
-- Update existing calendar_outlets table with outlet type
ALTER TABLE calendar_outlets ADD COLUMN IF NOT EXISTS outlet_type VARCHAR(50) DEFAULT 'restaurant' CHECK (outlet_type IN (
  'restaurant',    -- Full-service restaurant
  'banquet_space', -- Banquet-only space
  'kitchen',       -- Kitchen only
  'bar',           -- Bar only
  'hybrid'         -- Multiple types
));

ALTER TABLE calendar_outlets ADD COLUMN IF NOT EXISTS primary_department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- =====================================================
-- OUTLET OPERATING HOURS TABLE
-- =====================================================
-- Operating hours for each outlet, per day of week
CREATE TABLE IF NOT EXISTS outlet_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Day of week (0=Sunday, 6=Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Hours (NULL = closed all day)
  opens_at TIME,      -- e.g., '09:00:00'
  closes_at TIME,     -- e.g., '22:00:00'
  
  -- For restaurants with multiple service periods
  lunch_open TIME,
  lunch_close TIME,
  dinner_open TIME,
  dinner_close TIME,
  
  -- Status
  is_closed BOOLEAN DEFAULT FALSE, -- Explicitly closed (e.g., maintenance)
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_hours CHECK (
    (opens_at IS NULL AND closes_at IS NULL) OR
    (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
  ),
  
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(outlet_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_outlet_hours_outlet ON outlet_operating_hours(outlet_id);
CREATE INDEX IF NOT EXISTS idx_outlet_hours_day ON outlet_operating_hours(outlet_id, day_of_week);

-- =====================================================
-- OUTLET CLOSURE DATES TABLE
-- =====================================================
-- Specific dates when outlet is closed (holidays, renovations, etc.)
CREATE TABLE IF NOT EXISTS outlet_closure_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  closure_date DATE NOT NULL,
  closure_name VARCHAR(255),      -- e.g., 'Christmas Day', 'Renovation'
  reason VARCHAR(50),              -- 'holiday', 'maintenance', 'event', 'other'
  notes TEXT,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(outlet_id, closure_date)
);

CREATE INDEX IF NOT EXISTS idx_closure_outlet ON outlet_closure_dates(outlet_id, closure_date);

-- =====================================================
-- OUTLET DEPARTMENT ASSIGNMENTS TABLE
-- =====================================================
-- Links outlets to departments (e.g., Main Restaurant → Kitchen, Banquet → Pastry)
CREATE TABLE IF NOT EXISTS outlet_department_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  department_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Assignment type
  assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN (
    'primary',       -- Primary responsible department
    'support',       -- Supporting/assisting department
    'required',      -- Always required for events in this outlet
    'optional'       -- Can be assigned if needed
  )),
  
  -- Configuration per assignment
  lead_user_id UUID,  -- Primary contact for this assignment
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Event filtering
  applies_to_beo_only BOOLEAN DEFAULT FALSE,
  applies_to_reo_only BOOLEAN DEFAULT FALSE,
  min_guest_count INTEGER,  -- Only applies if event >= min guests
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(outlet_id, department_id, assignment_type)
);

CREATE INDEX IF NOT EXISTS idx_outlet_dept_outlet ON outlet_department_assignments(outlet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_outlet_dept_dept ON outlet_department_assignments(department_id);

-- =====================================================
-- BEO/REO CLASSIFICATION RULES TABLE
-- =====================================================
-- Rules for automatically classifying events as BEO or REO
CREATE TABLE IF NOT EXISTS beo_reo_classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Rule condition
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
    'closed_day',        -- Outlet closed on that day = BEO
    'after_hours',       -- Event outside operating hours = BEO
    'buyout',            -- Full buyout of space = BEO
    'guest_count',       -- Guest count > threshold = BEO
    'event_type',        -- Specific event type = BEO
    'time_of_day',       -- Morning/afternoon/evening = REO/BEO
    'custom'             -- Custom condition
  )),
  
  -- Rule configuration
  condition_json JSONB NOT NULL, -- e.g., {"closes_at": "15:00:00", "event_after": true} for "after 3pm = BEO"
  
  -- Resulting classification
  results_in_classification VARCHAR(10) NOT NULL CHECK (results_in_classification IN ('BEO', 'REO')),
  
  -- Rule priority and status
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  can_override BOOLEAN DEFAULT TRUE, -- Manager can manually override this rule
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_beo_reo_outlet ON beo_reo_classification_rules(outlet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_beo_reo_type ON beo_reo_classification_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_beo_reo_priority ON beo_reo_classification_rules(outlet_id, priority DESC, is_active);

-- =====================================================
-- EVENT BEO/REO TYPE TABLE
-- =====================================================
-- Links events to their BEO/REO classification
CREATE TABLE IF NOT EXISTS event_beo_reo_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Classification
  classification VARCHAR(10) NOT NULL CHECK (classification IN ('BEO', 'REO')),
  
  -- Why was it classified this way
  classification_reason VARCHAR(255),  -- e.g., 'closed_day', 'after_hours', 'buyout'
  rule_id UUID REFERENCES beo_reo_classification_rules(id) ON DELETE SET NULL,
  
  -- Can it be overridden?
  is_overridden BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  overridden_by UUID,
  overridden_at TIMESTAMP WITH TIME ZONE,
  
  -- Event details cached for quick access
  event_title VARCHAR(255),
  event_start_time TIMESTAMP WITH TIME ZONE,
  event_end_time TIMESTAMP WITH TIME ZONE,
  guest_count INTEGER,
  
  -- Related to production
  prepared_for_production BOOLEAN DEFAULT FALSE,
  production_sent_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_override CHECK (
    (is_overridden = FALSE AND overridden_by IS NULL AND overridden_at IS NULL) OR
    (is_overridden = TRUE AND overridden_by IS NOT NULL AND overridden_at IS NOT NULL)
  ),
  
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  
  UNIQUE(event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_class_event ON event_beo_reo_classification(event_id);
CREATE INDEX IF NOT EXISTS idx_event_class_outlet ON event_beo_reo_classification(outlet_id, classification);
CREATE INDEX IF NOT EXISTS idx_event_class_time ON event_beo_reo_classification(event_start_time DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_closure_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_department_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE beo_reo_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_beo_reo_classification ENABLE ROW LEVEL SECURITY;

-- Org-level isolation
CREATE POLICY departments_view_policy ON departments
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY outlet_hours_view_policy ON outlet_operating_hours
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY closure_dates_view_policy ON outlet_closure_dates
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY outlet_dept_view_policy ON outlet_department_assignments
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY beo_reo_rules_view_policy ON beo_reo_classification_rules
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY event_class_view_policy ON event_beo_reo_classification
  FOR SELECT USING (org_id = (SELECT org_id FROM auth.users WHERE id = auth.uid()));

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if outlet is open at a given time
CREATE OR REPLACE FUNCTION is_outlet_open_at(
  p_outlet_id UUID,
  p_datetime TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_time TIME;
  v_is_closed BOOLEAN;
  v_opens_at TIME;
  v_closes_at TIME;
BEGIN
  -- Extract day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_datetime)::INTEGER;
  v_time := p_datetime::TIME;
  
  -- Check closure dates first
  SELECT EXISTS(
    SELECT 1 FROM outlet_closure_dates
    WHERE outlet_id = p_outlet_id
      AND closure_date = p_datetime::DATE
  ) INTO v_is_closed;
  
  IF v_is_closed THEN
    RETURN FALSE;
  END IF;
  
  -- Check operating hours
  SELECT opens_at, closes_at INTO v_opens_at, v_closes_at
  FROM outlet_operating_hours
  WHERE outlet_id = p_outlet_id
    AND day_of_week = v_day_of_week;
  
  IF v_opens_at IS NULL THEN
    RETURN FALSE; -- Closed all day
  END IF;
  
  RETURN v_time >= v_opens_at AND v_time < v_closes_at;
END;
$$ LANGUAGE plpgsql;

-- Classify event as BEO or REO based on rules
CREATE OR REPLACE FUNCTION classify_event_as_beo_or_reo(
  p_event_id UUID,
  p_outlet_id UUID,
  p_event_start TIMESTAMP WITH TIME ZONE,
  p_event_end TIMESTAMP WITH TIME ZONE,
  p_guest_count INTEGER DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
  v_rule_id UUID;
  v_classification VARCHAR;
  v_reason VARCHAR;
BEGIN
  -- Check rules in priority order
  SELECT
    r.id,
    r.results_in_classification,
    r.rule_type
  INTO v_rule_id, v_classification, v_reason
  FROM beo_reo_classification_rules r
  WHERE r.outlet_id = p_outlet_id
    AND r.is_active = TRUE
  ORDER BY r.priority DESC, r.created_at DESC
  LIMIT 1;
  
  -- If event extends outside operating hours = BEO
  IF v_classification IS NULL THEN
    IF NOT is_outlet_open_at(p_outlet_id, p_event_start) OR
       NOT is_outlet_open_at(p_outlet_id, p_event_end - INTERVAL '1 minute') THEN
      RETURN 'BEO';
    ELSE
      RETURN 'REO';
    END IF;
  END IF;
  
  RETURN v_classification;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_classification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_classification_timestamp
BEFORE UPDATE ON event_beo_reo_classification
FOR EACH ROW
EXECUTE FUNCTION update_classification_timestamp();

COMMIT;
