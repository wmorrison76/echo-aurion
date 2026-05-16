alter table if exists invoices enable row level security;
alter table if exists invoice_lines enable row level security;
alter table if exists integrations enable row level security;
alter table if exists payment_gateways enable row level security;
alter table if exists invoice_vendor_templates enable row level security;
alter table if exists invoice_ocr_runs enable row level security;
alter table if exists uom_normalizations enable row level security;
alter table if exists sku_crosswalk enable row level security;
alter table if exists invoice_variances enable row level security;
alter table if exists invoice_review_tasks enable row level security;
alter table if exists invoice_feedback_events enable row level security;
alter table if exists audit_trail enable row level security;
alter table if exists edge_function_invocations enable row level security;
alter table if exists invoice_retry_queue enable row level security;
alter table if exists integration_webhook_log enable row level security;
alter table if exists invoice_confidence_thresholds enable row level security;

create or replace function public.current_org_id() returns uuid
language sql stable
as $$
  select nullif(auth.jwt()->>'org_id','')::uuid;
$$;

create policy "invoices_select_own_org" on invoices
for select using (org_id = public.current_org_id());

create policy "invoices_insert_own_org" on invoices
for insert with check (org_id = public.current_org_id() and created_by = auth.uid());

create policy "invoices_update_own_org" on invoices
for update using (org_id = public.current_org_id());

create policy "invoice_lines_select_via_invoice_org" on invoice_lines
for select using (
  exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.org_id = public.current_org_id()
  )
);

create policy "invoice_lines_ins_upd_own_org" on invoice_lines
for all using (
  exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.org_id = public.current_org_id()
  )
) with check (
  exists (
    select 1 from invoices i
    where i.id = invoice_lines.invoice_id
      and i.org_id = public.current_org_id()
  )
);

create policy "integrations_select_own_org" on integrations
for select using (org_id = public.current_org_id());

create policy "integrations_ins_upd_own_org" on integrations
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "payment_gateways_select_own_org" on payment_gateways
for select using (org_id = public.current_org_id());

create policy "payment_gateways_ins_upd_own_org" on payment_gateways
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "invoice_vendor_templates_access" on invoice_vendor_templates
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "invoice_ocr_runs_access" on invoice_ocr_runs
for all using (
  exists (
    select 1 from invoices i
    where i.id = invoice_ocr_runs.invoice_id
      and i.org_id = public.current_org_id()
  )
);

create policy "uom_normalizations_access" on uom_normalizations
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "sku_crosswalk_access" on sku_crosswalk
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "invoice_variances_access" on invoice_variances
for all using (
  exists (
    select 1 from invoices i
    where i.id = invoice_variances.invoice_id
      and i.org_id = public.current_org_id()
  )
);

create policy "invoice_review_tasks_access" on invoice_review_tasks
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "invoice_feedback_events_access" on invoice_feedback_events
for all using (
  exists (
    select 1 from invoices i
    where i.id = invoice_feedback_events.invoice_id
      and i.org_id = public.current_org_id()
  )
);

create policy "invoice_confidence_thresholds_access" on invoice_confidence_thresholds
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "audit_trail_access" on audit_trail
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "edge_function_invocations_access" on edge_function_invocations
for select using (org_id = public.current_org_id());

create policy "invoice_retry_queue_access" on invoice_retry_queue
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());

create policy "integration_webhook_log_access" on integration_webhook_log
for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id());
