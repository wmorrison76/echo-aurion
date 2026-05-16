LUCCCA Invoice Importer — FULL EDGE PACKAGE

Includes:
- OpenAPI spec
- Supabase schema + RLS + RPC
- Edge Function templates (Upload, Normalize, Export, Pay)
- Builder panel (Upload) skeleton
- Integration docs + ERP field mapping

Quick Install (Supabase CLI):
1) Apply schema & policies
   supabase db push --file sql/invoice_schema.sql
   supabase db push --file sql/invoice_policies.sql
   supabase db push --file sql/rpc_get_invoice_full.sql

2) Deploy Edge Functions (Deno)
   supabase functions deploy invoices-upload
   supabase functions deploy invoices-normalize
   supabase functions deploy invoices-export
   supabase functions deploy invoices-pay

3) Storage
   Create a bucket named 'invoices' (public = false).

4) Env (required on Edge)
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY

5) Builder usage
   Use /client/panels/UploadPanel.tsx as a drop-in.
   Call normalize/export/pay similarly or chain them in your workflow.

Security notes:
- Store ERP tokens in `integrations`, gateway secrets in `payment_gateways`.
- RLS scopes by org_id; ensure your JWT includes an "org_id" claim.
