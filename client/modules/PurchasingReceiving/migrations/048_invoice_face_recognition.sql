-- Invoice Face Recognition: Color, Orientation, Document Type Detection
-- Extends invoice_vendor_templates to support distinctive "facial" recognition

alter table invoice_vendor_templates
  add column if not exists document_type text default 'invoice' check (document_type in ('invoice', 'credit_memo', 'debit_memo', 'statement')),
  add column if not exists primary_color_hsv jsonb,
  add column if not exists color_palette text[] default array[]::text[],
  add column if not exists orientation text default 'portrait' check (orientation in ('portrait', 'landscape', 'mixed')),
  add column if not exists color_confidence numeric(5,2) default 0,
  add column if not exists orientation_confidence numeric(5,2) default 0,
  add column if not exists face_fingerprint text unique,
  add column if not exists training_samples integer default 0,
  add column if not exists last_face_detected_at timestamptz;

-- Create fingerprint index for fast matching
create index if not exists idx_invoice_templates_face_fingerprint 
  on invoice_vendor_templates(org_id, face_fingerprint);

create index if not exists idx_invoice_templates_doc_type 
  on invoice_vendor_templates(org_id, vendor_name, document_type);

-- Tracking table for bulk migration batches
create table if not exists bulk_invoice_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  batch_name text not null,
  total_invoices integer not null default 0,
  processed_invoices integer not null default 0,
  successful_invoices integer not null default 0,
  failed_invoices integer not null default 0,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'paused')),
  confidence_threshold numeric(5,2) default 0.85,
  auto_process boolean default false,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary jsonb,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tracking individual invoices in batch
create table if not exists bulk_invoice_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references bulk_invoice_batches(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  file_name text not null,
  detected_vendor text,
  detected_document_type text,
  detected_orientation text,
  color_fingerprint text,
  matching_template_id uuid references invoice_vendor_templates(id),
  match_confidence numeric(5,2),
  processing_status text default 'pending' check (processing_status in ('pending', 'processing', 'auto_processed', 'manual_review', 'error', 'skipped')),
  extraction_result jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_bulk_items_batch on bulk_invoice_items(batch_id);
create index if not exists idx_bulk_items_status on bulk_invoice_items(batch_id, processing_status);
create index if not exists idx_bulk_items_vendor on bulk_invoice_items(batch_id, detected_vendor);
