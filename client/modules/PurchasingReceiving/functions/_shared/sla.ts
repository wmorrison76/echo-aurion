import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
export interface InvocationContext {
  functionName: string;
  invoiceId: string | null;
  slaTargetMs: number;
  startedAt: number;
}
export function beginInvocation(
  functionName: string,
  invoiceId: string | null,
  slaTargetMs = 5000,
): InvocationContext {
  return { functionName, invoiceId, slaTargetMs, startedAt: performance.now() };
}
export async function completeInvocation(
  supabase: SupabaseClient,
  context: InvocationContext,
  result: { success: boolean; error?: string | null; statusCode?: number },
): Promise<void> {
  const duration = Math.round(performance.now() - context.startedAt);
  try {
    await supabase.from("edge_function_invocations").insert({
      function_name: context.functionName,
      invoice_id: context.invoiceId,
      sla_target_ms: context.slaTargetMs,
      duration_ms: duration,
      success: result.success,
      status_code: result.statusCode ?? null,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error("Failed to record SLA metrics", error);
  }
}
