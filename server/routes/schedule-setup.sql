-- ==========================================
-- LUCCCA Schedule Management Schema
-- Single Outlet with BOH/Stewards/FOH Roles
-- ==========================================

-- Create outlets table
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('BOH', 'Stewards', 'FOH')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  hourly_rate DECIMAL(8,2),
  hire_date DATE,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_start TIMETZ NOT NULL,
  shift_end TIMETZ NOT NULL,
  break_duration_min INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shift_statuses table for real-time tracking
CREATE TABLE IF NOT EXISTS shift_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'checked_in', 'on_break', 'checked_out', 'no_show')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_outlet ON departments(outlet_id);
CREATE INDEX IF NOT EXISTS idx_employees_outlet ON employees(outlet_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_outlet_date ON schedules(outlet_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_statuses_employee ON shift_statuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_statuses_timestamp ON shift_statuses(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies (allow public read for now, can be restricted later)
CREATE POLICY "Allow public read on outlets" ON outlets FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read on departments" ON departments FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read on employees" ON employees FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read on schedules" ON schedules FOR SELECT USING (TRUE);
CREATE POLICY "Allow public read on shift_statuses" ON shift_statuses FOR SELECT USING (TRUE);

-- Insert sample outlet
INSERT INTO outlets (name, address, phone) VALUES (
  'Main Restaurant',
  '123 Main Street, City, State 12345',
  '+1-555-123-4567'
) ON CONFLICT DO NOTHING;

-- Insert sample departments
INSERT INTO departments (outlet_id, name, category, description) 
SELECT id, 'Kitchen', 'BOH', 'Back of House - Kitchen Staff' FROM outlets WHERE name = 'Main Restaurant' ON CONFLICT DO NOTHING;

INSERT INTO departments (outlet_id, name, category, description) 
SELECT id, 'Stewards', 'Stewards', 'Dishwashing and Steward Staff' FROM outlets WHERE name = 'Main Restaurant' ON CONFLICT DO NOTHING;

INSERT INTO departments (outlet_id, name, category, description) 
SELECT id, 'Dining Room', 'FOH', 'Front of House - Servers and Hosts' FROM outlets WHERE name = 'Main Restaurant' ON CONFLICT DO NOTHING;
