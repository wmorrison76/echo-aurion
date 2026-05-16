import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { exportToERP, type ERP } from "./_shared/adapters.ts";
import { beginInvocation, completeInvocation } from "./_shared/sla.ts";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
serve(async (req) => {
  let headerRecord: any = null;
  let context = null as ReturnType<typeof beginInvocation> | null;
  let retryMetadata: Record<string, unknown> | null = null;
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    const erp = segments.pop() as ERP | undefined;
    const id = segments.pop();
    if (!id || !erp) {
      return new Response("Missing invoice id or erp", { status: 400 });
    }
    retryMetadata = { erp };
    context = beginInvocation("invoices-export", id, 4000);
    const { data: header, error: headerError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();
    if (headerError || !header) {
      return new Response(
        JSON.stringify(headerError ?? { error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    headerRecord = header;
    const { data: lines } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id);
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("org_id", header.org_id)
      .eq("erp_system", erp)
      .maybeSingle();
    const secrets: Record<string, string | undefined> = {
      token: integration?.token ?? undefined,
      refresh_token: integration?.refresh_token ?? undefined,
    };
    const result = await exportToERP(erp, header, lines ?? [], secrets);
    if (result.status === "success") {
      await supabase
        .from("invoices")
        .update({ status: "exported" })
        .eq("id", id);
    }
    if (context) {
      await completeInvocation(supabase, context, {
        success: result.status === "success",
        statusCode: 200,
        error: result.status === "success" ? null : (result.message ?? null),
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (context) {
      await completeInvocation(supabase, context, {
        success: false,
        statusCode: 500,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (headerRecord) {
      const now = new Date();
      const nextRunAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      const { data: existingRetry } = await supabase
        .from("invoice_retry_queue")
        .select("attempts")
        .eq("invoice_id", headerRecord.id)
        .eq("function_name", "export")
        .maybeSingle();
      const attempts = (existingRetry?.attempts ?? 0) + 1;
      await supabase.from("invoice_retry_queue").upsert({
        invoice_id: headerRecord.id,
        org_id: headerRecord.org_id,
        function_name: "export",
        attempts,
        next_run_at: nextRunAt,
        last_error: error instanceof Error ? error.message : String(error),
        metadata: retryMetadata,
        locked_at: null,
      });
    }
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
