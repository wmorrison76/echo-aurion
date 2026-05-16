-- Week 1: Confidence Calibration & Anomaly Detection Infrastructure

-- Track confidence adjustments over time
create table if not exists calibration_events (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  document_type text not null,
  old_threshold numeric(5,2) not null,
  new_threshold numeric(5,2) not null,
  reason text,
  metrics jsonb,
  applied_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Track user corrections for feedback loops
create table if not exists correction_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  was_auto_processed boolean not null default false,
  correction_type text not null check (correction_type in ('vendor', 'document_type', 'orientation', 'other')),
  vendor_name text,
  document_type text,
  confidence_at_time numeric(5,2),
  corrected_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Anomaly detection records
create table if not exists anomaly_detections (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  vendor_name text not null,
  has_anomalies boolean not null default false,
  risk_score numeric(5,2),
  flag_for_review boolean not null default false,
  anomalies jsonb default '[]'::jsonb,
  detected_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Processing quality metrics per vendor
create table if not exists vendor_quality_metrics (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  document_type text not null,
  total_processed integer default 0,
  successfully_processed integer default 0,
  manual_reviews integer default 0,
  errors integer default 0,
  avg_confidence numeric(5,2),
  precision numeric(5,2),
  recall numeric(5,2),
  f1_score numeric(5,2),
  last_updated timestamptz default now(),
  created_at timestamptz default now(),
  unique(vendor_name, document_type)
);

-- Indexes for fast lookups
create index if not exists idx_calibration_vendor on calibration_events(vendor_name, document_type);
create index if not exists idx_calibration_date on calibration_events(applied_at);
create index if not exists idx_corrections_vendor on correction_events(vendor_name, document_type);
create index if not exists idx_anomalies_vendor on anomaly_detections(vendor_name);
create index if not exists idx_anomalies_risk on anomaly_detections(risk_score);
create index if not exists idx_anomalies_reviewed on anomaly_detections(flag_for_review);
