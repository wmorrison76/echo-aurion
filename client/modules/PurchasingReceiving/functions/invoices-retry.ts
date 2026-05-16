import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const baseUrl = Deno.env.get("EDGE_BASE_URL");
const maxAttempts = Number(Deno.env.get("INVOICE_RETRY_MAX_ATTEMPTS") ?? "5");
const retryDelayMs = Number(Deno.env.get("INVOICE_RETRY_DELAY_MS") ?? "600000");
function buildEndpoint(task: any): { url: string; init: RequestInit } | null {
  if (!baseUrl) return null;
  const invoiceId = task.invoice_id as string;
  const metadata = (task.metadata ?? {}) as Record<string, unknown>;
  switch (task.function_name) {
    case "normalize":
      return {
        url: `${baseUrl}/invoices-normalize/${invoiceId}`,
        init: { method: "GET" },
      };
    case "export": {
      const erp = typeof metadata.erp === "string" ? metadata.erp : "r365";
      return {
        url: `${baseUrl}/invoices-export/${invoiceId}/${erp}`,
        init: { method: "GET" },
      };
    }
    case "pay": {
      const gateway =
        typeof metadata.gateway === "string" ? metadata.gateway : "stripe";
      return {
        url: `${baseUrl}/invoices-pay/${invoiceId}`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gateway }),
        },
      };
    }
    default:
      return null;
  }
}
serve(async () => {
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: "Missing EDGE_BASE_URL" }), {
      status: 500,
    });
  }
  const now = new Date();
  const { data: tasks, error } = await supabase
    .from("invoice_retry_queue")
    .select("*")
    .lte("next_run_at", now.toISOString())
    .is("locked_at", null)
    .order("next_run_at")
    .limit(10);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  const results: Array<Record<string, unknown>> = [];
  for (const task of tasks ?? []) {
    const lockTime = new Date().toISOString();
    const { data: lockResult, error: lockError } = await supabase
      .from("invoice_retry_queue")
      .update({ locked_at: lockTime })
      .eq("id", task.id)
      .is("locked_at", null)
      .select("id")
      .maybeSingle();
    if (lockError || !lockResult) {
      results.push({ id: task.id, status: "skipped", reason: "lock_failed" });
      continue;
    }
    const endpoint = buildEndpoint(task);
    if (!endpoint) {
      await supabase
        .from("invoice_retry_queue")
        .update({
          locked_at: null,
          attempts: (task.attempts ?? 0) + 1,
          last_error: `Unknown function ${task.function_name}`,
          next_run_at: new Date(Date.now() + retryDelayMs).toISOString(),
        })
        .eq("id", task.id);
      results.push({
        id: task.id,
        status: "skipped",
        reason: "unknown_function",
      });
      continue;
    }
    let success = false;
    let statusCode = 0;
    let errorMessage: string | null = null;
    try {
      const response = await fetch(endpoint.url, endpoint.init);
      statusCode = response.status;
      if (response.ok) {
        success = true;
      } else {
        const payload = await response.text();
        errorMessage = payload;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    if (success) {
      await supabase.from("invoice_retry_queue").delete().eq("id", task.id);
      results.push({ id: task.id, status: "completed", statusCode });
    } else {
      const attempts = (task.attempts ?? 0) + 1;
      const retryAt = new Date(Date.now() + retryDelayMs).toISOString();
      if (attempts >= maxAttempts) {
        await supabase.from("invoice_retry_queue").delete().eq("id", task.id);
        results.push({
          id: task.id,
          status: "failed",
          attempts,
          error: errorMessage,
        });
      } else {
        await supabase
          .from("invoice_retry_queue")
          .update({
            attempts,
            last_error: errorMessage,
            next_run_at: retryAt,
            locked_at: null,
          })
          .eq("id", task.id);
        results.push({
          id: task.id,
          status: "retry_scheduled",
          attempts,
          error: errorMessage,
        });
      }
    }
  }
  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
