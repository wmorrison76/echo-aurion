-- Support for credit memos, debit memos, and vendor returns
-- Extends invoice schema to support multiple document types

alter table invoices
  add column if not exists document_type text not null default 'invoice' check (document_type in ('invoice', 'credit_memo', 'debit_memo')),
  add column if not exists reference_invoice_id uuid references invoices(id),
  add column if not exists reason text,
  add column if not exists is_fully_processed boolean default false;

create table if not exists invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  adjustment_type text not null check (adjustment_type in ('credit', 'debit', 'discount', 'surcharge')),
  reference_invoice_id uuid references invoices(id),
  amount numeric(14,4) not null,
  currency text default 'USD',
  reason text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists credit_memo_items (
  id uuid primary key default gen_random_uuid(),
  credit_memo_id uuid not null references invoices(id) on delete cascade,
  original_line_id uuid references invoice_lines(id),
  original_invoice_id uuid references invoices(id),
  product_name text,
  quantity numeric(14,4),
  uom text,
  original_unit_price numeric(12,4),
  credit_amount numeric(14,4) not null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists return_authorizations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  rma_number text unique not null,
  vendor_id uuid references vendors(id),
  credit_memo_id uuid references invoices(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'received', 'processed', 'rejected')),
  requested_at timestamptz default now(),
  approved_at timestamptz,
  received_at timestamptz,
  notes text,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists return_items (
  id uuid primary key default gen_random_uuid(),
  rma_id uuid not null references return_authorizations(id) on delete cascade,
  line_item_id uuid references invoice_lines(id),
  quantity numeric(14,4) not null,
  condition text check (condition in ('unopened', 'opened', 'damaged', 'expired')),
  reason text not null,
  received_quantity numeric(14,4),
  lot_code text,
  created_at timestamptz default now()
);

create index if not exists invoices_document_type_idx on invoices (document_type);
create index if not exists invoices_reference_invoice_idx on invoices (reference_invoice_id);
create index if not exists invoice_adjustments_org_idx on invoice_adjustments (org_id, created_at desc);
create index if not exists invoice_adjustments_invoice_idx on invoice_adjustments (invoice_id);
create index if not exists credit_memo_items_credit_memo_idx on credit_memo_items (credit_memo_id);
create index if not exists credit_memo_items_original_invoice_idx on credit_memo_items (original_invoice_id);
create index if not exists return_authorizations_org_status_idx on return_authorizations (org_id, status);
create index if not exists return_authorizations_rma_number_idx on return_authorizations (rma_number);
create index if not exists return_items_rma_idx on return_items (rma_id);
