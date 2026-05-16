import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeOcrPayload } from "./_shared/adapters.ts";
import {
  enrichInvoiceLines,
  persistEnrichmentArtifacts,
} from "./_shared/enrichment.ts";
import { runAdaptiveOcr, trainVendorTemplate } from "./_shared/ocr.ts";
import { beginInvocation, completeInvocation } from "./_shared/sla.ts";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
type InvoiceRecord = {
  id: string;
  org_id: string;
  vendor: string;
  total: number;
  status: string;
  payload_json: Record<string, unknown> | null;
  raw_file_url: string | null;
};
serve(async (req) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id) {
    return new Response("Missing invoice id", { status: 400 });
  }
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, org_id, vendor, total, status, payload_json, raw_file_url")
    .eq("id", id)
    .maybeSingle();
  if (invoiceError || !invoice) {
    return new Response(
      JSON.stringify(invoiceError ?? { error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }
  const context = beginInvocation("invoices-normalize", invoice.id, 5000);
  try {
    const ocr = await runAdaptiveOcr(supabase, invoice as InvoiceRecord);
    const normalized = normalizeOcrPayload(ocr.parsed, {
      invoice,
      ocrText: ocr.text,
      engine: ocr.engine,
      template: ocr.templateMatch ?? undefined,
      confidence: ocr.confidence,
    });
    const enrichment = await enrichInvoiceLines(
      supabase,
      { id: invoice.id, org_id: invoice.org_id },
      normalized,
    );
    const trainedTemplateId = normalized.header.vendor
      ? await trainVendorTemplate(
          supabase,
          invoice.org_id,
          normalized.header.vendor,
          ocr.text,
          ocr.parsed,
          ocr.confidence,
        ).catch(() => ocr.templateMatch?.templateId ?? null)
      : (ocr.templateMatch?.templateId ?? null);
    const templateId =
      trainedTemplateId ?? ocr.templateMatch?.templateId ?? null;
    await supabase.from("invoice_ocr_runs").insert({
      invoice_id: invoice.id,
      engine: ocr.engine,
      success: true,
      confidence: ocr.confidence,
      duration_ms: ocr.durationMs,
      raw_text: ocr.text,
      glare_score: ocr.glareScore,
      noise_score: ocr.noiseScore,
      template_id: templateId,
    });
    await supabase
      .from("invoices")
      .update({
        vendor: normalized.header.vendor ?? invoice.vendor,
        total: normalized.header.total ?? invoice.total ?? 0,
        status: "normalized",
        payload_json: {
          engine: ocr.engine,
          parsed: ocr.parsed,
          raw_text: ocr.text,
          thresholds: enrichment.thresholds,
        },
        normalized_payload: normalized,
        ocr_engine: ocr.engine,
        ocr_confidence: ocr.confidence,
        ocr_processing_ms: ocr.durationMs,
        glare_score: ocr.glareScore,
        noise_score: ocr.noiseScore,
        template_id: templateId,
        variance_score: enrichment.invoiceVarianceScore,
        requires_review: enrichment.requiresReview,
        review_status: enrichment.requiresReview ? "pending" : "resolved",
      })
      .eq("id", invoice.id);
    await supabase.from("invoice_lines").delete().eq("invoice_id", invoice.id);
    let insertedLines: Array<{ id: string }> = [];
    if (enrichment.lines.length) {
      const rows = enrichment.lines.map((line) => ({
        invoice_id: invoice.id,
        item_code: line.item_code ?? null,
        description: line.description,
        qty: line.qty ?? null,
        unit_price: line.unit_price ?? null,
        gl_code: line.gl_code ?? null,
        uom: line.uom ?? null,
        normalized_qty: line.normalized_qty ?? null,
        normalized_uom: line.normalized_uom ?? null,
        canonical_item_code: line.canonical_item_code ?? null,
        confidence: line.confidence ?? null,
        lot_number: line.lot_number ?? null,
        expiration_date: line.expiration_date ?? null,
      }));
      const { data: inserted, error: insertError } = await supabase
        .from("invoice_lines")
        .insert(rows)
        .select("id");
      if (insertError) throw insertError;
      insertedLines = inserted ?? [];
    }
    if (enrichment.variances.length || enrichment.reviewReasons.length) {
      await persistEnrichmentArtifacts(
        supabase,
        { id: invoice.id, org_id: invoice.org_id },
        enrichment,
        insertedLines,
      );
    }
    await completeInvocation(supabase, context, {
      success: true,
      statusCode: 200,
    });
    return new Response(
      JSON.stringify({
        id: invoice.id,
        status: "normalized",
        template_id: templateId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    await supabase.from("invoice_ocr_runs").insert({
      invoice_id: invoice.id,
      engine: "adaptive",
      success: false,
      confidence: 0,
      duration_ms: null,
      raw_text: null,
      glare_score: null,
      noise_score: null,
      template_id: null,
      error: String(error instanceof Error ? error.message : error),
    });
    await supabase
      .from("invoices")
      .update({ status: "failed", requires_review: true })
      .eq("id", invoice.id);
    const now = new Date();
    const nextRunAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const { data: existingRetry } = await supabase
      .from("invoice_retry_queue")
      .select("attempts")
      .eq("invoice_id", invoice.id)
      .eq("function_name", "normalize")
      .maybeSingle();
    const attempts = (existingRetry?.attempts ?? 0) + 1;
    await supabase.from("invoice_retry_queue").upsert({
      invoice_id: invoice.id,
      org_id: invoice.org_id,
      function_name: "normalize",
      attempts,
      next_run_at: nextRunAt,
      last_error: error instanceof Error ? error.message : String(error),
      metadata: null,
      locked_at: null,
    });
    await completeInvocation(supabase, context, {
      success: false,
      statusCode: 500,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        error: String(error instanceof Error ? error.message : error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
