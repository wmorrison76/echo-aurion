-- Supabase PostgreSQL schema for multi-tenant scheduling
-- Base tables for organizations, outlets, departments, positions, employees, and shifts

-- Organizations (top-level tenant)
create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Outlets (locations within organization)
create table if not exists outlets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  tz text default 'America/New_York',
  created_at timestamptz default now()
);

-- Departments within outlets
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Positions within departments
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  dept_id uuid not null references departments(id) on delete cascade,
  name text not null,
  base_rate numeric(10,2) not null default 0,
  tip_eligible boolean not null default true,
  created_at timestamptz default now()
);

-- Employees (multi-outlet capable)
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  position_id uuid not null references positions(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  hourly_rate numeric(10,2) not null default 0,
  overtime_mult numeric(4,2) not null default 1.5,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Shifts (work assignments)
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  employee_id uuid not null references employees(id),
  position_id uuid not null references positions(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_min int not null default 0,
  published boolean not null default false,
  tips_declared numeric(10,2) default 0,
  created_by uuid not null,
  created_at timestamptz default now()
);

-- Publish audit trail
create table if not exists publish_audits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  week_start date not null,
  published_by uuid not null,
  published_at timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Tip pools (configuration)
create table if not exists tip_pools (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  name text not null,
  rule text not null default 'HOURS',
  hours_weight numeric(5,2) not null default 100,
  revenue_weight numeric(5,2) not null default 0,
  created_at timestamptz default now()
);

-- Tip distribution runs
create table if not exists tip_runs (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references tip_pools(id),
  business_date date not null,
  service text,
  total_tips numeric(10,2) not null,
  hours_pct numeric(5,2) default 0,
  revenue_pct numeric(5,2) default 0,
  created_by uuid not null,
  created_at timestamptz default now()
);

-- Tip run detail lines (per employee)
create table if not exists tip_run_lines (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references tip_runs(id) on delete cascade,
  employee_id uuid not null,
  hours_worked numeric(10,2) not null,
  revenue_attrib numeric(10,2) not null,
  payout numeric(10,2) not null,
  details jsonb,
  created_at timestamptz default now()
);

-- Revenue entries (by department, service period)
create table if not exists revenues (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  business_date date not null,
  service text not null,
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Budget entries (by department, week)
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  dept_id uuid not null references departments(id),
  week_start date not null,
  labor_budget numeric(10,2) not null,
  revenue_budget numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Events (banquets, conferences, etc.)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  name text not null,
  service_date date not null,
  service_time time not null,
  guest_count int not null,
  menus jsonb,
  chef_in_charge uuid,
  complexity_score numeric(5,2) default 1,
  created_at timestamptz default now()
);

-- Recipes (for production)
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  yield_time_minutes int not null,
  prep_station text not null,
  equipment jsonb,
  skills_required jsonb,
  dependencies jsonb,
  created_at timestamptz default now()
);

-- Tasks (production tasks for events)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  recipe_id uuid not null references recipes(id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  assigned_employee uuid,
  status text not null default 'PLANNED',
  labor_minutes int not null,
  created_at timestamptz default now()
);

-- Load summaries (workload per department per day)
create table if not exists load_summaries (
  id uuid primary key default gen_random_uuid(),
  dept_id uuid not null references departments(id),
  date date not null,
  total_minutes int not null,
  available_minutes int not null,
  deficit int not null,
  created_at timestamptz default now(),
  unique(dept_id, date)
);

-- Indices for performance
create index if not exists idx_shifts_outlet_dept on shifts(outlet_id, dept_id);
create index if not exists idx_shifts_employee on shifts(employee_id);
create index if not exists idx_shifts_starts_at on shifts(starts_at);
create index if not exists idx_employees_outlet on employees(outlet_id);
create index if not exists idx_revenues_dept on revenues(dept_id, business_date);
create index if not exists idx_events_dept_date on events(dept_id, service_date);
create index if not exists idx_tip_runs_pool on tip_runs(pool_id);
create index if not exists idx_load_summaries_dept_date on load_summaries(dept_id, date);

-- Publish acknowledgements (employees ack receipt of published schedules)
create table if not exists publish_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  employee_id uuid not null references employees(id),
  week_start date not null,
  acknowledged_at timestamptz not null default now(),
  created_at timestamptz default now(),
  unique(employee_id, outlet_id, dept_id, week_start)
);

create index if not exists idx_acks_dept_week on publish_acknowledgements(dept_id, week_start);
create index if not exists idx_acks_employee_week on publish_acknowledgements(employee_id, week_start);

-- Skills taxonomy
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  slug text not null unique,
  name text not null,
  category text not null,
  description text,
  tier_levels integer default 5,
  created_at timestamptz default now()
);

create index if not exists idx_skills_slug on skills(slug);

-- Employee skills (many-to-many)
create table if not exists employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  skill_slug text not null,
  level integer default 0,
  created_at timestamptz default now(),
  unique(employee_id, skill_slug)
);

create index if not exists idx_emp_skills_emp_id on employee_skills(employee_id);

-- Shift ratings (post-shift)
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  outlet_id uuid not null references outlets(id),
  shift_date date not null,
  punctuality integer,
  quality integer,
  teamwork integer,
  guest_feedback integer,
  total_score decimal,
  reviewer_id text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_ratings_emp_date on ratings(employee_id, shift_date);

-- Development plans
create table if not exists development_plans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  goal_title text not null,
  description text,
  target_date date,
  status text default 'PLANNED',
  milestones jsonb default '[]',
  ai_recommendation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_devplan_emp_id on development_plans(employee_id);

-- Training records
create table if not exists training_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  training_name text not null,
  provider text,
  start_date date,
  end_date date,
  completion_status text default 'PLANNED',
  score integer,
  certificate_url text,
  verified_by text,
  created_at timestamptz default now()
);

create index if not exists idx_training_emp_id on training_records(employee_id);

-- Interval-level demand/coverage tracking
create table if not exists interval_coverage (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  outlet_id uuid not null references outlets(id),
  dept_id uuid not null references departments(id),
  week_start date not null,
  ts timestamptz not null,
  required integer,
  provided integer,
  created_at timestamptz default now()
);

create index if not exists idx_coverage_dept_week on interval_coverage(dept_id, week_start);

-- Row-level security (RLS) policies
-- Enable RLS on shifts table
alter table shifts enable row level security;

-- Policy: Users can only see shifts from outlets they're assigned to
create policy if not exists select_own_outlet_shifts on shifts
for select using (
  exists (
    select 1 from employees e
    where e.id = shifts.employee_id
      or exists (
        select 1 from auth.users
        where auth.users.id = auth.uid()
          and auth.users.raw_user_meta_data->>'outlet_id'::text = shifts.outlet_id::text
      )
  )
);

-- RLS on ratings: employees see only own ratings, managers see dept ratings
alter table ratings enable row level security;

create policy if not exists employee_sees_own_ratings on ratings
for select using (
  employee_id::text = auth.uid()::text
  or exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
      and (auth.users.raw_user_meta_data->>'role'::text in ('DEPT_MGR', 'GM', 'ADMIN'))
  )
);

-- RLS on development_plans: employees see own, managers see dept
alter table development_plans enable row level security;

create policy if not exists employee_sees_own_devplan on development_plans
for select using (
  employee_id::text = auth.uid()::text
  or exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
      and (auth.users.raw_user_meta_data->>'role'::text in ('DEPT_MGR', 'GM', 'ADMIN'))
  )
);

-- RLS on training_records: employees see own, managers see dept
alter table training_records enable row level security;

create policy if not exists employee_sees_own_training on training_records
for select using (
  employee_id::text = auth.uid()::text
  or exists (
    select 1 from auth.users
    where auth.users.id = auth.uid()
      and (auth.users.raw_user_meta_data->>'role'::text in ('DEPT_MGR', 'GM', 'ADMIN'))
  )
);
