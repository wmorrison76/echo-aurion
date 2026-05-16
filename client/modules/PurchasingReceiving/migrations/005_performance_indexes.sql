-- Performance optimization indexes for high-volume operations

-- Invoice query optimizations
create index if not exists invoices_org_created_idx on invoices (org_id, created_at desc);
create index if not exists invoices_vendor_date_idx on invoices (vendor, created_at desc);
create index if not exists invoices_status_org_idx on invoices (status, org_id);
create index if not exists invoices_document_type_idx on invoices (document_type);

-- Invoice line lookups
create index if not exists invoice_lines_invoice_item_idx on invoice_lines (invoice_id, item_id);
create index if not exists invoice_lines_item_idx on invoice_lines (item_id);
create index if not exists invoice_lines_sku_vendor_idx on invoice_lines (sku, vendor_id);

-- Purchase order optimizations
create index if not exists purchase_orders_vendor_status_idx on purchase_orders (vendor_id, status);
create index if not exists purchase_orders_org_date_idx on purchase_orders (created_at desc);
create index if not exists purchase_orders_status_idx on purchase_orders (status);

-- Inventory and lot tracking
create index if not exists inventory_lots_item_outlet_idx on inventory_lots (item_id, outlet_id);
create index if not exists inventory_lots_expiry_idx on inventory_lots (expiry_date) where expiry_date is not null;
create index if not exists inventory_lots_vendor_idx on inventory_lots (source ->> 'vendorId');

-- Stock transaction queries
create index if not exists stock_txn_ingredient_type_idx on stock_txn (ingredient_id, type);
create index if not exists stock_txn_created_idx on stock_txn (created_at desc);

-- Variance and review queries
create index if not exists invoice_variances_invoice_idx on invoice_variances (invoice_id);
create index if not exists invoice_variances_type_idx on invoice_variances (variance_type);
create index if not exists invoice_review_tasks_status_org_idx on invoice_review_tasks (status, org_id, created_at desc);

-- Vendor and item lookups
create index if not exists vendors_name_idx on vendors (name);
create index if not exists items_vendor_sku_idx on items (vendor_id, sku);
create index if not exists items_active_vendor_idx on items (active, vendor_id) where active = true;

-- GL mapping queries
create index if not exists gl_mapping_vendor_idx on gl_mapping_rules (vendor_id);
create index if not exists gl_mapping_sku_idx on gl_mapping_rules (match_sku);

-- Audit and compliance
create index if not exists audit_trail_actor_action_idx on audit_trail (actor_id, action);
create index if not exists audit_trail_subject_idx on audit_trail (subject_type, subject_id);

-- Template and OCR optimization
create index if not exists invoice_templates_org_vendor_idx on invoice_vendor_templates (org_id, vendor_name);
create index if not exists ocr_runs_invoice_idx on invoice_ocr_runs (invoice_id, created_at desc);

-- Webhook and integration logging
create index if not exists webhook_log_provider_idx on integration_webhook_log (provider, received_at desc);
create index if not exists webhook_log_status_idx on integration_webhook_log (status);

-- Retry queue optimization
create index if not exists retry_queue_next_run_idx on invoice_retry_queue (next_run_at) where locked_at is null;
create index if not exists retry_queue_invoice_idx on invoice_retry_queue (invoice_id);

-- Analytics optimization
create index if not exists invoices_org_vendor_total_idx on invoices (org_id, vendor, total desc);
create index if not exists purchase_orders_vendor_total_idx on purchase_orders (vendor_id, total desc);

-- Partial indexes for active items
create index if not exists items_active_idx on items (id) where active = true;
create index if not exists gl_codes_not_restricted_idx on gl_codes (id) where restricted = false;

-- JSONB query optimization
create index if not exists invoices_payload_vendor_idx on invoices using gin (payload_json);
create index if not exists invoices_normalized_payload_idx on invoices using gin (normalized_payload);

-- Materialized view for quick reporting
create materialized view if not exists invoice_summary as
select
  i.id,
  i.org_id,
  i.vendor,
  i.total,
  i.status,
  i.document_type,
  i.created_at,
  count(il.id) as line_count,
  count(distinct iv.id) as variance_count
from invoices i
left join invoice_lines il on i.id = il.invoice_id
left join invoice_variances iv on i.id = iv.invoice_id
group by i.id, i.org_id, i.vendor, i.total, i.status, i.document_type, i.created_at;

create index if not exists invoice_summary_org_created_idx on invoice_summary (org_id, created_at desc);
create index if not exists invoice_summary_status_idx on invoice_summary (status);

-- Purchase order summary view
create materialized view if not exists purchase_order_summary as
select
  po.id,
  po.vendor_id,
  po.status,
  po.created_at,
  count(pol.id) as line_count,
  sum(pol.qty) as total_qty,
  sum(pol.ext_cost) as total_cost,
  sum(pol.received_qty) as received_qty
from purchase_orders po
left join purchase_order_lines pol on po.id = pol.po_id
group by po.id, po.vendor_id, po.status, po.created_at;

create index if not exists po_summary_vendor_status_idx on purchase_order_summary (vendor_id, status);

-- Refresh materialized views
-- Note: In production, use a scheduled job to refresh these
-- refresh materialized view invoice_summary;
-- refresh materialized view purchase_order_summary;
