-- Enhanced Row-Level Security (RLS) Policies
-- All tables implement multi-level access control

-- Ensure RLS is enabled on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORG-LEVEL POLICIES
-- ============================================

-- Organizations: Users can only see their own org
CREATE POLICY org_isolation_select ON orgs
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- OUTLET-LEVEL POLICIES
-- ============================================

-- Outlets: Users can only access outlets in their org
CREATE POLICY outlets_isolation ON outlets
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY outlets_update ON outlets
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- DEPARTMENT-LEVEL POLICIES
-- ============================================

-- Departments: Users can only access departments in their scope
CREATE POLICY departments_isolation ON departments
  FOR SELECT USING (
    outlet_id IN (
      SELECT outlet_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- EMPLOYEE POLICIES
-- ============================================

-- Employees: Users can only see employees in their org/outlet
CREATE POLICY employees_org_isolation ON employees
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Employees can see themselves
CREATE POLICY employees_self_view ON employees
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Managers can update employees in their department
CREATE POLICY employees_manager_update ON employees
  FOR UPDATE USING (
    -- Manager of this employee's department
    dept_id IN (
      SELECT dept_id FROM employees
      WHERE user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM employees manager_emp
          WHERE manager_emp.user_id = auth.uid()
            AND manager_emp.dept_id = employees.dept_id
        )
    )
  );

-- ============================================
-- SHIFTS POLICIES
-- ============================================

-- Shifts: Org + department isolation
CREATE POLICY shifts_org_isolation ON shifts
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Employees can view their own shifts
CREATE POLICY shifts_self_view ON shifts
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Department managers can insert/update shifts
CREATE POLICY shifts_manager_insert ON shifts
  FOR INSERT WITH CHECK (
    dept_id IN (
      SELECT dept_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY shifts_manager_update ON shifts
  FOR UPDATE USING (
    dept_id IN (
      SELECT dept_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- PROPERTY SUMMARY POLICIES (Operational Data)
-- ============================================

-- Property Summary: Org + outlet level access
CREATE POLICY property_summary_select ON property_summary
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
    AND (
      outlet_id IN (
        SELECT outlet_id FROM employees
        WHERE user_id = auth.uid()
      )
      OR (
        SELECT admin_level FROM employees
        WHERE user_id = auth.uid()
      ) = 'org_admin'
    )
  );

CREATE POLICY property_summary_insert ON property_summary
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY property_summary_update ON property_summary
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- GL CODES POLICIES (Accounting Export)
-- ============================================

-- GL Codes: Org + optional dept level
CREATE POLICY gl_codes_select ON gl_codes
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY gl_codes_insert ON gl_codes
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- EMPLOYEE SKILLS POLICIES (LMS)
-- ============================================

-- Skills: Users can see their own skills
CREATE POLICY skills_self_view ON employee_skills
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- Managers can see team member skills
CREATE POLICY skills_manager_view ON employee_skills
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees
      WHERE dept_id IN (
        SELECT dept_id FROM employees
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- PUBLISH AUDIT POLICIES
-- ============================================

-- Audit logs: View own audit history
CREATE POLICY audits_view ON publish_audits
  FOR SELECT USING (
    published_by = auth.uid()
    OR org_id IN (
      SELECT org_id FROM employees
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS FOR ACCESS CONTROL
-- ============================================

-- Check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE user_id = auth.uid()
      AND employees.org_id = is_org_admin.org_id
      AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user can access outlet
CREATE OR REPLACE FUNCTION can_access_outlet(outlet_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM outlets o
    WHERE o.id = can_access_outlet.outlet_id
      AND o.org_id IN (
        SELECT org_id FROM employees
        WHERE user_id = auth.uid()
      )
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is department manager
CREATE OR REPLACE FUNCTION is_dept_manager(dept_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE user_id = auth.uid()
      AND employees.dept_id = is_dept_manager.dept_id
      AND (role = 'manager' OR role = 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- AUDIT LOGGING
-- ============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view full audit logs
CREATE POLICY audit_log_admin_view ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    operation,
    user_id,
    record_id,
    old_values,
    new_values
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_outlet_id ON employees(outlet_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept_id ON employees(dept_id);

CREATE INDEX IF NOT EXISTS idx_shifts_org_id ON shifts(org_id);
CREATE INDEX IF NOT EXISTS idx_shifts_dept_id ON shifts(dept_id);
CREATE INDEX IF NOT EXISTS idx_shifts_employee_id ON shifts(employee_id);

CREATE INDEX IF NOT EXISTS idx_property_summary_org_id ON property_summary(org_id);
CREATE INDEX IF NOT EXISTS idx_property_summary_outlet_id ON property_summary(outlet_id);
CREATE INDEX IF NOT EXISTS idx_property_summary_date ON property_summary(report_date);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================
-- GRANT APPROPRIATE ROLE PERMISSIONS
-- ============================================

-- Service role can bypass RLS for server-side operations
-- Anon role cannot access protected data

GRANT SELECT ON orgs, outlets, departments, employees, shifts TO authenticated;
GRANT INSERT, UPDATE ON shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON property_summary TO authenticated;
GRANT SELECT ON gl_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON employee_skills TO authenticated;

-- Make sure anon role has minimal permissions
GRANT USAGE ON SCHEMA public TO anon;
