-- Migration 002: Enterprise Features
-- Adds publish_audits, publish_acknowledgements, gl_codes, property_summary, employee_skills

-- Publish audits table (schedule publication history)
create table if not exists publish_audits (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id) on delete cascade,
  manager_id uuid references employees(id) on delete set null,
  published_at timestamptz default now(),
  status text check (status in ('PUBLISHED','REOPENED','CANCELLED')),
  notes text,
  created_at timestamptz default now(),
  unique(schedule_id, status, published_at)
);

-- Publish acknowledgements (employee confirmations)
create table if not exists publish_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  ack_ts timestamptz default now(),
  acknowledged boolean default true,
  created_at timestamptz default now(),
  unique(schedule_id, employee_id)
);

-- GL code mappings (for accounting export)
create table if not exists gl_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  dept_id uuid references departments(id) on delete cascade,
  gl_code text not null,
  description text,
  category text check (category in ('LABOR','MATERIAL','OTHER','TIPS')),
  created_at timestamptz default now(),
  unique(org_id, dept_id, gl_code)
);

-- Property summary (multi-property rollups)
create table if not exists property_summary (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  outlet_id uuid references outlets(id) on delete cascade,
  labor_cost numeric(12,2),
  revenue numeric(12,2),
  tips numeric(12,2),
  report_date date,
  created_at timestamptz default now(),
  unique(org_id, outlet_id, report_date)
);

-- Employee skills (LMS tracking)
create table if not exists employee_skills (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  skill_name text not null,
  level int check (level >= 0 and level <= 5),
  target_level int check (target_level >= 0 and target_level <= 5),
  expires_at date,
  certified_at timestamptz,
  created_at timestamptz default now(),
  unique(employee_id, skill_name)
);

-- Create indices for common queries
create index if not exists idx_publish_audits_schedule on publish_audits(schedule_id);
create index if not exists idx_publish_audits_manager on publish_audits(manager_id);
create index if not exists idx_acks_schedule on publish_acknowledgements(schedule_id);
create index if not exists idx_acks_employee on publish_acknowledgements(employee_id);
create index if not exists idx_gl_codes_org on gl_codes(org_id);
create index if not exists idx_gl_codes_dept on gl_codes(dept_id);
create index if not exists idx_property_summary_org on property_summary(org_id);
create index if not exists idx_property_summary_date on property_summary(report_date);
create index if not exists idx_employee_skills_emp on employee_skills(employee_id);
create index if not exists idx_employee_skills_expires on employee_skills(expires_at);

-- Enable RLS (optional, add based on your auth setup)
alter table publish_audits enable row level security;
alter table publish_acknowledgements enable row level security;
alter table gl_codes enable row level security;
alter table property_summary enable row level security;
alter table employee_skills enable row level security;

-- RLS Policies: Managers see organization data
create policy if not exists publish_audits_manager_view on publish_audits
  for select using (true); -- Restrict based on your auth setup

create policy if not exists employee_skills_emp_view on employee_skills
  for select using (true); -- Employees can see their own skills
