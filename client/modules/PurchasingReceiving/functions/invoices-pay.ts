import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { payWithGateway, type Gateway } from "./_shared/adapters.ts";
import { beginInvocation, completeInvocation } from "./_shared/sla.ts";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
serve(async (req) => {
  let context = null as ReturnType<typeof beginInvocation> | null;
  let invoiceRecord: any = null;
  let gatewayValue: Gateway = "stripe";
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) {
      return new Response("Missing invoice id", { status: 400 });
    }
    context = beginInvocation("invoices-pay", id, 4000);
    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const gateway = (body.gateway ?? "stripe") as Gateway;
    gatewayValue = gateway;
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();
    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify(invoiceError ?? { error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    invoiceRecord = invoice;
    const amount = Number(body.amount_override ?? invoice.total ?? 0);
    const { data: gatewayRow } = await supabase
      .from("payment_gateways")
      .select("*")
      .eq("org_id", invoice.org_id)
      .maybeSingle();
    const secrets: Record<string, string | undefined> = {
      secret: gatewayRow?.secret ?? undefined,
    };
    const result = await payWithGateway(gateway, amount, secrets);
    if (
      result.payment_status === "authorized" ||
      result.payment_status === "captured"
    ) {
      await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
    }
    if (context) {
      await completeInvocation(supabase, context, {
        success: result.payment_status !== "failed",
        statusCode: 200,
        error:
          result.payment_status === "failed" ? (result.message ?? null) : null,
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
    if (invoiceRecord) {
      const now = new Date();
      const nextRunAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      const { data: existingRetry } = await supabase
        .from("invoice_retry_queue")
        .select("attempts")
        .eq("invoice_id", invoiceRecord.id)
        .eq("function_name", "pay")
        .maybeSingle();
      const attempts = (existingRetry?.attempts ?? 0) + 1;
      await supabase.from("invoice_retry_queue").upsert({
        invoice_id: invoiceRecord.id,
        org_id: invoiceRecord.org_id,
        function_name: "pay",
        attempts,
        next_run_at: nextRunAt,
        last_error: error instanceof Error ? error.message : String(error),
        metadata: { gateway: gatewayValue },
        locked_at: null,
      });
    }
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
