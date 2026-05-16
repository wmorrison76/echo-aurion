import { Router } from "express";
import { getSupabaseServiceClient } from "../lib/supabase";
export const integrationsRouter = Router();
function extractInvoiceId(payload: Record<string, unknown>): string | null {
  const candidateKeys: Array<string | null | undefined> = [];
  if (typeof payload.invoice_id === "string") {
    candidateKeys.push(payload.invoice_id);
  }
  if (typeof payload.invoiceId === "string") {
    candidateKeys.push(payload.invoiceId);
  }
  const nested = (payload.data ?? {}) as Record<string, unknown>;
  if (typeof nested.invoice_id === "string") {
    candidateKeys.push(nested.invoice_id);
  }
  for (const candidate of candidateKeys) {
    if (candidate && candidate.length) {
      return candidate;
    }
  }
  return null;
}
integrationsRouter.post("/webhooks/:provider", async (req, res, next) => {
  try {
    const provider = req.params.provider;
    const eventType =
      typeof req.body?.event_type === "string"
        ? req.body.event_type
        : "unknown";
    const payload = req.body ?? {};
    const supabase = getSupabaseServiceClient();
    const invoiceId = extractInvoiceId(payload);
    let orgId: string | null = null;
    if (invoiceId) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, org_id")
        .eq("id", invoiceId)
        .maybeSingle();
      orgId = invoice?.org_id ?? null;
    }
    await supabase.from("integration_webhook_log").insert({
      org_id: orgId,
      provider,
      event_type: eventType,
      invoice_id: invoiceId,
      status: "processed",
      payload,
      processed_at: new Date().toISOString(),
    });
    if (invoiceId && orgId) {
      const statusUpdate =
        provider === "erp"
          ? { status: "exported" }
          : provider === "payment"
            ? { status: "paid" }
            : null;
      if (statusUpdate) {
        await supabase
          .from("invoices")
          .update(statusUpdate)
          .eq("id", invoiceId);
      }
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
integrationsRouter.post("/reconcile", async (_req, res, next) => {
  try {
    const thresholdMinutes = 15;
    const threshold = new Date(
      Date.now() - thresholdMinutes * 60 * 1000,
    ).toISOString();
    const supabase = getSupabaseServiceClient();
    const { data: exported } = await supabase
      .from("invoices")
      .select("id, org_id, status, created_at")
      .eq("status", "exported")
      .lte("created_at", threshold);
    const { data: paid } = await supabase
      .from("invoices")
      .select("id, org_id, status, created_at")
      .eq("status", "paid")
      .lte("created_at", threshold);
    const reconciled: Array<Record<string, unknown>> = [];
    for (const invoice of exported ?? []) {
      const { data: logs } = await supabase
        .from("integration_webhook_log")
        .select("id")
        .eq("invoice_id", invoice.id)
        .eq("provider", "erp")
        .limit(1);
      if (!logs?.length) {
        await supabase.from("invoice_retry_queue").upsert({
          invoice_id: invoice.id,
          org_id: invoice.org_id,
          function_name: "export",
          attempts: 0,
          next_run_at: new Date().toISOString(),
          last_error: "Missing ERP webhook",
          metadata: { erp: "r365" },
          locked_at: null,
        });
        reconciled.push({
          invoice_id: invoice.id,
          action: "queued_export_retry",
        });
      }
    }
    for (const invoice of paid ?? []) {
      const { data: logs } = await supabase
        .from("integration_webhook_log")
        .select("id")
        .eq("invoice_id", invoice.id)
        .eq("provider", "payment")
        .limit(1);
      if (!logs?.length) {
        await supabase.from("invoice_retry_queue").upsert({
          invoice_id: invoice.id,
          org_id: invoice.org_id,
          function_name: "pay",
          attempts: 0,
          next_run_at: new Date().toISOString(),
          last_error: "Missing payment webhook",
          metadata: { gateway: "stripe" },
          locked_at: null,
        });
        reconciled.push({
          invoice_id: invoice.id,
          action: "queued_payment_retry",
        });
      }
    }
    res.json({ reconciled });
  } catch (error) {
    next(error);
  }
});
