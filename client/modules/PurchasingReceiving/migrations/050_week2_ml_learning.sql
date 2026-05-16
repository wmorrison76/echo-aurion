-- Week 2: ML Classifiers & Vendor Learning Infrastructure

-- ML Classifier models
create table if not exists ml_classifiers (
  id uuid primary key default gen_random_uuid(),
  model_version text unique not null,
  model_data jsonb not null,
  metrics jsonb,
  accuracy numeric(5,2),
  training_samples integer,
  created_at timestamptz default now()
);

-- Vendor learning profiles
create table if not exists vendor_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_name text unique not null,
  profile_data jsonb not null,
  learning_stage text default 'early' check (learning_stage in ('early', 'intermediate', 'advanced', 'expert')),
  samples_since_update integer default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Processing error tracking
create table if not exists processing_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid,
  item_id uuid,
  vendor_name text,
  error_type text not null,
  error_message text,
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Progressive improvement cycle tracking
create table if not exists improvement_cycles (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid,
  report jsonb not null,
  improvements_applied integer default 0,
  system_accuracy numeric(5,2),
  created_at timestamptz default now()
);

-- Indexes for efficient queries
create index if not exists idx_ml_classifiers_version on ml_classifiers(model_version);
create index if not exists idx_vendor_profiles_vendor on vendor_learning_profiles(vendor_name);
create index if not exists idx_processing_errors_vendor on processing_errors(vendor_name);
create index if not exists idx_processing_errors_severity on processing_errors(severity);
create index if not exists idx_improvement_cycles_batch on improvement_cycles(batch_id);
create index if not exists idx_improvement_cycles_date on improvement_cycles(created_at);
