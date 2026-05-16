create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists invoice_vendor_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  vendor_name text not null,
  anchor_keywords text[] not null default array[]::text[],
  field_schema jsonb not null default '{}'::jsonb,
  sample_count integer not null default 0,
  avg_confidence numeric(5,2),
  last_trained_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (org_id, vendor_name)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  created_by uuid not null,
  vendor text not null,
  total numeric not null,
  status text not null default 'queued' check (status in ('queued','ocr','normalized','exported','paid','failed')),
  payload_json jsonb,
  raw_file_url text,
  ocr_engine text,
  ocr_confidence numeric(5,2),
  ocr_processing_ms integer,
  glare_score numeric(5,2),
  noise_score numeric(5,2),
  template_id uuid references invoice_vendor_templates(id),
  normalized_payload jsonb,
  variance_score numeric(5,2),
  requires_review boolean default false,
  review_status text default 'pending' check (review_status in ('pending','in_progress','resolved','dismissed')),
  last_reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  item_code text,
  description text,
  qty numeric,
  unit_price numeric,
  gl_code text,
  uom text,
  normalized_qty numeric,
  normalized_uom text,
  canonical_item_code text,
  confidence numeric(5,2),
  lot_number text,
  expiration_date date
);

create table if not exists invoice_ocr_runs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  engine text not null,
  success boolean not null,
  confidence numeric(5,2),
  duration_ms integer,
  raw_text text,
  glare_score numeric(5,2),
  noise_score numeric(5,2),
  template_id uuid references invoice_vendor_templates(id),
  error text,
  created_at timestamptz default now()
);

create table if not exists uom_normalizations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  source_uom text not null,
  normalized_uom text not null,
  factor numeric(12,6) not null,
  confidence numeric(5,2) default 1.0,
  last_updated_at timestamptz default now(),
  unique (org_id, source_uom)
);

create table if not exists sku_crosswalk (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  vendor_name text,
  vendor_sku text not null,
  canonical_item_code text not null,
  normalized_uom text,
  confidence numeric(5,2) default 0.5,
  last_seen_at timestamptz default now(),
  unique (org_id, vendor_name, vendor_sku)
);

create table if not exists invoice_variances (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  invoice_line_id uuid references invoice_lines(id) on delete cascade,
  variance_type text not null,
  expected_value numeric(14,4),
  actual_value numeric(14,4),
  variance_pct numeric(5,2),
  confidence numeric(5,2),
  requires_review boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists invoice_review_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  reason text not null,
  confidence numeric(5,2),
  status text not null default 'pending' check (status in ('pending','in_progress','resolved','dismissed')),
  reviewer_id uuid,
  resolved_at timestamptz,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists invoice_feedback_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  actor_id uuid,
  created_at timestamptz default now()
);

create table if not exists audit_trail (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  actor_id uuid,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  diff_json jsonb,
  created_at timestamptz default now()
);

create table if not exists edge_function_invocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  invoice_id uuid,
  function_name text not null,
  status_code int,
  duration_ms integer,
  sla_target_ms integer,
  success boolean default true,
  error text,
  created_at timestamptz default now()
);

create table if not exists invoice_retry_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  function_name text not null,
  attempts integer default 0,
  next_run_at timestamptz not null default now(),
  last_error text,
  metadata jsonb,
  locked_at timestamptz,
  created_at timestamptz default now(),
  unique (invoice_id, function_name)
);

create table if not exists integration_webhook_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  provider text not null,
  event_type text not null,
  invoice_id uuid,
  status text not null default 'received',
  payload jsonb not null,
  received_at timestamptz default now(),
  processed_at timestamptz,
  error text
);

create table if not exists invoice_confidence_thresholds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  line_variance_pct numeric(5,2) not null default 10,
  invoice_variance_pct numeric(5,2) not null default 8,
  min_confidence numeric(5,2) not null default 0.6,
  auto_halt boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (org_id)
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  erp_system text not null check (erp_system in ('r365','simphony','netsuite')),
  auth_type text not null default 'oauth',
  token text,
  refresh_token text,
  expiry timestamptz,
  created_at timestamptz default now()
);

create table if not exists payment_gateways (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  gateway text not null check (gateway in ('stripe','square','adyen')),
  secret text,
  created_at timestamptz default now()
);

create index if not exists invoice_vendor_templates_org_vendor_idx on invoice_vendor_templates (org_id, vendor_name);
create index if not exists invoices_org_status_idx on invoices (org_id, status);
create index if not exists invoice_lines_invoice_idx on invoice_lines (invoice_id);
create index if not exists invoice_ocr_runs_invoice_idx on invoice_ocr_runs (invoice_id, created_at desc);
create index if not exists uom_normalizations_org_source_idx on uom_normalizations (org_id, source_uom);
create index if not exists sku_crosswalk_org_vendor_idx on sku_crosswalk (org_id, vendor_name, vendor_sku);
create index if not exists invoice_variances_invoice_idx on invoice_variances (invoice_id, created_at desc);
create index if not exists invoice_review_tasks_org_status_idx on invoice_review_tasks (org_id, status);
create index if not exists invoice_feedback_events_invoice_idx on invoice_feedback_events (invoice_id, created_at desc);
create index if not exists audit_trail_subject_idx on audit_trail (org_id, subject_type, subject_id);
create index if not exists edge_function_invocations_name_idx on edge_function_invocations (function_name, created_at desc);
create index if not exists invoice_retry_queue_due_idx on invoice_retry_queue (next_run_at) where locked_at is null;
create index if not exists integration_webhook_log_invoice_idx on integration_webhook_log (invoice_id, received_at desc);
create index if not exists invoice_confidence_thresholds_org_idx on invoice_confidence_thresholds (org_id);
