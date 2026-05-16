/**
 * PHASE 0: ENTERPRISE FOUNDATION - Day 2
 * Enterprise Database Schema for 10M+ Employee Scale
 * 
 * Features:
 * - BTREE indexes for fast queries on large tables
 * - Composite indexes for multi-column filtering
 * - Table partitioning for shifts and time_tracking (monthly)
 * - Row-Level Security (RLS) for multi-tenant isolation
 * - Materialized views for KPI calculations
 * 
 * Prerequisites:
 * - PostgreSQL 12+ (for partitioning support)
 * - RLS enabled on public schema
 * 
 * Run this migration on a fresh or staging database first
 * Estimated execution time: 30-60 seconds
 */

-- Enable extensions needed for enterprise features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- Organizations table (base multi-tenant entity)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard', 'enterprise', 'premium'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table (restaurants, outlets per organization)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  timezone VARCHAR(50) DEFAULT 'UTC',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Employees table (10M+ scale expected)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  hourly_rate DECIMAL(10, 2),
  role VARCHAR(50), -- 'cook', 'server', 'bartender', 'manager', etc.
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Enable RLS on employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY employees_org_isolation ON employees
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Indexes for employees table (critical for performance)
-- Index 1: org_id + outlet_id (for listing employees by location)
CREATE INDEX IF NOT EXISTS idx_employees_org_id_outlet_id 
  ON employees(org_id, location_id);

-- Index 2: org_id + created_at (for recent hires)
CREATE INDEX IF NOT EXISTS idx_employees_org_id_created_at 
  ON employees(org_id, created_at DESC);

-- Index 3: org_id + active (for active staff only)
CREATE INDEX IF NOT EXISTS idx_employees_org_id_active 
  ON employees(org_id, active DESC);

-- Index 4: email for lookups
CREATE INDEX IF NOT EXISTS idx_employees_email 
  ON employees(email);

-- Shifts table (will be partitioned by month)
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID,
  employee_id UUID,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  position VARCHAR(50), -- 'cook', 'server', 'bartender', etc.
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'clocked', 'completed', 'no-show'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) PARTITION BY RANGE (DATE_TRUNC('month', start_time));

-- Enable RLS on shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY shifts_org_isolation ON shifts
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Create partitions for shifts (24 months of data)
-- Partition for each month from 12 months ago to 12 months in future
DO $$ 
DECLARE 
  partition_date DATE;
  partition_name VARCHAR(100);
  partition_start DATE;
  partition_end DATE;
BEGIN
  FOR i IN -12..12 LOOP
    partition_date := DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL)::DATE;
    partition_name := 'shifts_' || TO_CHAR(partition_date, 'YYYY_MM');
    partition_start := partition_date;
    partition_end := partition_start + INTERVAL '1 month';
    
    -- Create partition if it doesn't exist
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || partition_name || ' PARTITION OF shifts'
            || ' FOR VALUES FROM (''' || partition_start || ''') TO (''' || partition_end || ''')';
  END LOOP;
END $$;

-- Indexes for shifts table (composites for efficient multi-column filtering)
-- Index 1: org_id + start_time (for shifts in date range)
CREATE INDEX IF NOT EXISTS idx_shifts_org_id_start_time 
  ON shifts(org_id, start_time DESC, employee_id);

-- Index 2: org_id + employee_id (for employee's shifts)
CREATE INDEX IF NOT EXISTS idx_shifts_org_id_employee_id 
  ON shifts(org_id, employee_id, start_time DESC);

-- Index 3: location + start_time (for coverage by location)
CREATE INDEX IF NOT EXISTS idx_shifts_location_id_start_time 
  ON shifts(location_id, start_time DESC);

-- Time tracking table (clocking in/out, will be partitioned by month)
CREATE TABLE IF NOT EXISTS time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID,
  employee_id UUID NOT NULL,
  shift_id UUID,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
) PARTITION BY RANGE (DATE_TRUNC('month', clock_in_time));

-- Enable RLS on time_tracking
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY time_tracking_org_isolation ON time_tracking
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Create partitions for time_tracking (24 months)
DO $$ 
DECLARE 
  partition_date DATE;
  partition_name VARCHAR(100);
  partition_start DATE;
  partition_end DATE;
BEGIN
  FOR i IN -12..12 LOOP
    partition_date := DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL)::DATE;
    partition_name := 'time_tracking_' || TO_CHAR(partition_date, 'YYYY_MM');
    partition_start := partition_date;
    partition_end := partition_start + INTERVAL '1 month';
    
    EXECUTE 'CREATE TABLE IF NOT EXISTS ' || partition_name || ' PARTITION OF time_tracking'
            || ' FOR VALUES FROM (''' || partition_start || ''') TO (''' || partition_end || ''')';
  END LOOP;
END $$;

-- Indexes for time_tracking table
-- Index 1: org_id + employee_id + clock_in (for employee's hours)
CREATE INDEX IF NOT EXISTS idx_time_tracking_org_id_employee_id 
  ON time_tracking(org_id, employee_id, clock_in_time DESC);

-- Index 2: Partial index for active clocks (clock_out IS NULL)
CREATE INDEX IF NOT EXISTS idx_time_tracking_clock_out_null 
  ON time_tracking(org_id, employee_id) WHERE clock_out_time IS NULL;

-- Index 3: shift_id for querying by shift
CREATE INDEX IF NOT EXISTS idx_time_tracking_shift_id 
  ON time_tracking(shift_id);

-- POS data table (revenue, covers from Toast, Square, etc.)
CREATE TABLE IF NOT EXISTS pos_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID,
  recorded_time TIMESTAMPTZ NOT NULL,
  revenue DECIMAL(12, 2), -- sales in dollars
  covers INT, -- number of customers
  tips DECIMAL(12, 2),
  data_source VARCHAR(50), -- 'toast', 'square', 'manual'
  raw_data JSONB, -- original POS data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Enable RLS on pos_data
ALTER TABLE pos_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY pos_data_org_isolation ON pos_data
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Indexes for pos_data
CREATE INDEX IF NOT EXISTS idx_pos_data_org_id_recorded_time 
  ON pos_data(org_id, recorded_time DESC);

-- Materialized view: employee hours by week
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employee_hours_weekly AS
SELECT 
  org_id,
  employee_id,
  DATE_TRUNC('week', clock_in_time)::DATE as week_start,
  SUM(EXTRACT(EPOCH FROM (COALESCE(clock_out_time, NOW()) - clock_in_time)) / 3600) as total_hours,
  COUNT(*) as shift_count,
  MAX(updated_at) as last_updated
FROM time_tracking
WHERE clock_out_time IS NOT NULL OR (clock_in_time > NOW() - INTERVAL '24 hours')
GROUP BY org_id, employee_id, DATE_TRUNC('week', clock_in_time);

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_employee_hours_weekly_org_employee 
  ON mv_employee_hours_weekly(org_id, employee_id);

-- Materialized view: daily location KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_location_kpis_daily AS
SELECT 
  org_id,
  location_id,
  DATE_TRUNC('day', recorded_time)::DATE as kpi_date,
  SUM(revenue) as total_sales,
  SUM(CASE WHEN shift_id IS NOT NULL THEN 
    EXTRACT(EPOCH FROM (COALESCE(clock_out_time, NOW()) - clock_in_time)) / 3600 
    ELSE 0 END) as labor_hours,
  COUNT(DISTINCT employee_id) as unique_staff,
  SUM(covers) as total_covers,
  created_at
FROM (
  SELECT 
    p.org_id, p.location_id, p.recorded_time, p.revenue, p.covers,
    NULL::UUID as shift_id, NULL::TIMESTAMPTZ as clock_in_time, NULL::TIMESTAMPTZ as clock_out_time,
    NULL::UUID as employee_id, p.created_at
  FROM pos_data p
  UNION ALL
  SELECT 
    t.org_id, t.location_id, t.clock_in_time, NULL::DECIMAL, NULL::INT,
    t.shift_id, t.clock_in_time, t.clock_out_time, t.employee_id, t.created_at
  FROM time_tracking t
) combined
GROUP BY org_id, location_id, DATE_TRUNC('day', recorded_time);

-- Index on daily KPIs view
CREATE INDEX IF NOT EXISTS idx_mv_location_kpis_daily_org_date 
  ON mv_location_kpis_daily(org_id, kpi_date DESC);

-- Materialized view: shift coverage status
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_shift_coverage_status AS
SELECT 
  org_id,
  location_id,
  DATE_TRUNC('day', start_time)::DATE as shift_date,
  EXTRACT(HOUR FROM start_time)::INT as hour,
  COUNT(*) as scheduled_staff,
  COUNT(CASE WHEN status = 'clocked' THEN 1 END) as clocked_staff,
  COUNT(CASE WHEN status = 'no-show' THEN 1 END) as no_shows,
  COUNT(DISTINCT position) as positions_needed
FROM shifts
WHERE start_time > NOW() - INTERVAL '90 days'
GROUP BY org_id, location_id, DATE_TRUNC('day', start_time), EXTRACT(HOUR FROM start_time);

CREATE INDEX IF NOT EXISTS idx_mv_shift_coverage_status_org_date 
  ON mv_shift_coverage_status(org_id, shift_date DESC);

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  entity VARCHAR(50) NOT NULL, -- 'employee', 'shift', 'payroll'
  entity_id UUID NOT NULL,
  changes JSONB NOT NULL, -- what changed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_org_isolation ON audit_logs
  FOR ALL USING (org_id = current_setting('app.current_org_id')::UUID);

-- Indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id_created_at 
  ON audit_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id 
  ON audit_logs(entity_id);

-- Verify creation
SELECT 
  'Organizations table' as table_name, COUNT(*) as row_count 
FROM organizations
UNION ALL
SELECT 'Locations', COUNT(*) FROM locations
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Shifts', COUNT(*) FROM shifts
UNION ALL
SELECT 'Time Tracking', COUNT(*) FROM time_tracking
UNION ALL
SELECT 'POS Data', COUNT(*) FROM pos_data
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs;
