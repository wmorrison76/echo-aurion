import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import type { NormalizedPayload, NormalizedLine } from "./adapters.ts";
export interface EnrichedLine extends NormalizedLine {
  normalized_qty?: number | null;
  normalized_uom?: string | null;
  canonical_item_code?: string | null;
  confidence?: number | null;
  expected_unit_price?: number | null;
  vendor_sku: string | null;
}
export interface ReviewReason {
  type: "line" | "invoice";
  index?: number;
  reason: string;
  confidence: number;
  metadata: Record<string, unknown>;
}
export interface VarianceDraft {
  index: number;
  type: string;
  expectedValue: number | null;
  actualValue: number | null;
  variancePct: number | null;
  confidence: number;
  requiresReview: boolean;
  metadata: Record<string, unknown>;
}
export interface EnrichmentDraft {
  lines: EnrichedLine[];
  variances: VarianceDraft[];
  reviewReasons: ReviewReason[];
  invoiceVarianceScore: number;
  requiresReview: boolean;
  thresholds: {
    lineVariancePct: number;
    invoiceVariancePct: number;
    minConfidence: number;
    autoHalt: boolean;
  };
}
interface UomMapping {
  normalized_uom: string;
  factor: number;
  confidence: number;
}
interface CrosswalkMapping {
  canonical_item_code: string;
  normalized_uom: string | null;
  confidence: number;
}
interface InvoiceVarianceInsert {
  invoice_id: string;
  invoice_line_id: string;
  variance_type: string;
  expected_value: number | null;
  actual_value: number | null;
  variance_pct: number | null;
  confidence: number;
  requires_review: boolean;
  metadata: Record<string, unknown>;
}
const DEFAULT_THRESHOLDS = {
  lineVariancePct: 10,
  invoiceVariancePct: 8,
  minConfidence: 0.6,
  autoHalt: true,
};
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
function normalizeSku(line: NormalizedLine, index: number): string | null {
  if (line.item_code) {
    const trimmed = line.item_code.trim();
    if (trimmed.length >= 2) return trimmed;
  }
  if (line.description) {
    return `DSC-${slugify(line.description)}-${index}`;
  }
  return null;
}
async function loadThresholds(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{
  lineVariancePct: number;
  invoiceVariancePct: number;
  minConfidence: number;
  autoHalt: boolean;
}> {
  const { data } = await supabase
    .from("invoice_confidence_thresholds")
    .select(
      "line_variance_pct, invoice_variance_pct, min_confidence, auto_halt",
    )
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return DEFAULT_THRESHOLDS;
  return {
    lineVariancePct: Number(
      data.line_variance_pct ?? DEFAULT_THRESHOLDS.lineVariancePct,
    ),
    invoiceVariancePct: Number(
      data.invoice_variance_pct ?? DEFAULT_THRESHOLDS.invoiceVariancePct,
    ),
    minConfidence: Number(
      data.min_confidence ?? DEFAULT_THRESHOLDS.minConfidence,
    ),
    autoHalt: Boolean(data.auto_halt ?? DEFAULT_THRESHOLDS.autoHalt),
  };
}
async function loadUomMappings(
  supabase: SupabaseClient,
  orgId: string,
): Promise<Map<string, UomMapping>> {
  const map = new Map<string, UomMapping>();
  const { data } = await supabase
    .from("uom_normalizations")
    .select("source_uom, normalized_uom, factor, confidence")
    .eq("org_id", orgId);
  for (const row of data ?? []) {
    if (!row?.source_uom) continue;
    map.set(String(row.source_uom).toLowerCase(), {
      normalized_uom: String(row.normalized_uom ?? row.source_uom),
      factor: Number(row.factor ?? 1),
      confidence: Number(row.confidence ?? 0.7),
    });
  }
  return map;
}
async function loadCrosswalks(
  supabase: SupabaseClient,
  orgId: string,
  vendorName: string | null,
): Promise<Map<string, CrosswalkMapping>> {
  const map = new Map<string, CrosswalkMapping>();
  const builder = supabase
    .from("sku_crosswalk")
    .select("vendor_sku, canonical_item_code, normalized_uom, confidence")
    .eq("org_id", orgId);
  if (vendorName) {
    builder.eq("vendor_name", vendorName);
  } else {
    builder.is("vendor_name", null);
  }
  const { data } = await builder;
  for (const row of data ?? []) {
    if (!row?.vendor_sku) continue;
    map.set(String(row.vendor_sku).toLowerCase(), {
      canonical_item_code: String(row.canonical_item_code ?? row.vendor_sku),
      normalized_uom: row.normalized_uom ? String(row.normalized_uom) : null,
      confidence: Number(row.confidence ?? 0.6),
    });
  }
  return map;
}
async function ensureUomMapping(
  supabase: SupabaseClient,
  map: Map<string, UomMapping>,
  orgId: string,
  source: string | null,
  inferredUom: string | null,
): Promise<UomMapping | null> {
  if (!source)
    return inferredUom
      ? { normalized_uom: inferredUom, factor: 1, confidence: 0.5 }
      : null;
  const key = source.toLowerCase();
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const normalizedValue = inferredUom ?? source;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("uom_normalizations")
    .upsert({
      org_id: orgId,
      source_uom: source,
      normalized_uom: normalizedValue,
      factor: 1,
      confidence: 0.55,
      last_updated_at: now,
    })
    .select("normalized_uom, factor, confidence")
    .single();
  if (error) throw error;
  const mapping: UomMapping = {
    normalized_uom: String(data?.normalized_uom ?? normalizedValue),
    factor: Number(data?.factor ?? 1),
    confidence: Number(data?.confidence ?? 0.55),
  };
  map.set(key, mapping);
  return mapping;
}
async function ensureCrosswalk(
  supabase: SupabaseClient,
  map: Map<string, CrosswalkMapping>,
  orgId: string,
  vendorName: string | null,
  vendorSku: string | null,
  description: string,
  normalizedUom: string | null,
): Promise<CrosswalkMapping | null> {
  if (!vendorSku) return null;
  const key = vendorSku.toLowerCase();
  const existing = map.get(key);
  if (existing) {
    const updatedConfidence = Math.min(1, existing.confidence * 0.8 + 0.2);
    const { error } = await supabase.from("sku_crosswalk").upsert({
      org_id: orgId,
      vendor_name: vendorName,
      vendor_sku: vendorSku,
      canonical_item_code: existing.canonical_item_code,
      normalized_uom: normalizedUom ?? existing.normalized_uom,
      confidence: updatedConfidence,
      last_seen_at: new Date().toISOString(),
    });
    if (error) throw error;
    const updated: CrosswalkMapping = {
      canonical_item_code: existing.canonical_item_code,
      normalized_uom: normalizedUom ?? existing.normalized_uom,
      confidence: updatedConfidence,
    };
    map.set(key, updated);
    return updated;
  }
  const canonical_item_code = description
    ? `SKU-${slugify(description)}`
    : vendorSku;
  const { error } = await supabase.from("sku_crosswalk").upsert({
    org_id: orgId,
    vendor_name: vendorName,
    vendor_sku: vendorSku,
    canonical_item_code,
    normalized_uom: normalizedUom,
    confidence: 0.6,
    last_seen_at: new Date().toISOString(),
  });
  if (error) throw error;
  const mapping: CrosswalkMapping = {
    canonical_item_code,
    normalized_uom: normalizedUom,
    confidence: 0.6,
  };
  map.set(key, mapping);
  return mapping;
}
async function fetchHistoricalPrice(
  supabase: SupabaseClient,
  orgId: string,
  invoiceId: string,
  canonicalCode: string | null,
  vendorSku: string | null,
  description: string,
): Promise<{ expected: number | null; sampleCount: number }> {
  let query = supabase
    .from("invoice_lines")
    .select(
      "unit_price, qty, invoice_id, description, canonical_item_code, item_code, invoices!inner(org_id)",
    )
    .eq("invoices.org_id", orgId)
    .neq("invoice_id", invoiceId)
    .limit(40);
  if (canonicalCode) {
    query = query.eq("canonical_item_code", canonicalCode);
  } else if (vendorSku) {
    query = query.eq("item_code", vendorSku);
  } else {
    query = query.ilike("description", `${description.slice(0, 24)}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).filter((row) => row?.unit_price != null);
  if (!rows.length) {
    return { expected: null, sampleCount: 0 };
  }
  let weightedSum = 0;
  let weight = 0;
  for (const row of rows) {
    const price = Number(row.unit_price ?? 0);
    if (!Number.isFinite(price)) continue;
    const qty = Number(row.qty ?? 1);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    weightedSum += price * safeQty;
    weight += safeQty;
  }
  if (!weight) {
    const average =
      rows.reduce((sum, row) => sum + Number(row.unit_price ?? 0), 0) /
      rows.length;
    return { expected: Number(average.toFixed(4)), sampleCount: rows.length };
  }
  return {
    expected: Number((weightedSum / weight).toFixed(4)),
    sampleCount: rows.length,
  };
}
function computeLineConfidence(
  ocrConfidence: number,
  mappingConfidence: number | null,
  crosswalkConfidence: number | null,
  sampleConfidence: number,
): number {
  const components = [
    ocrConfidence,
    mappingConfidence ?? ocrConfidence,
    crosswalkConfidence ?? ocrConfidence,
    sampleConfidence,
  ];
  const bounded = components.map((value) => Math.max(0, Math.min(1, value)));
  const average =
    bounded.reduce((sum, value) => sum + value, 0) / bounded.length;
  return Number(average.toFixed(3));
}
export async function enrichInvoiceLines(
  supabase: SupabaseClient,
  invoice: { id: string; org_id: string },
  normalized: NormalizedPayload,
): Promise<EnrichmentDraft> {
  const vendorName = normalized.header.vendor ?? null;
  const thresholds = await loadThresholds(supabase, invoice.org_id);
  const uomMappings = await loadUomMappings(supabase, invoice.org_id);
  const crosswalks = await loadCrosswalks(supabase, invoice.org_id, vendorName);
  const historyCache = new Map<
    string,
    { expected: number | null; sampleCount: number }
  >();
  const ocrConfidenceRatio =
    normalized.header.confidence != null
      ? Math.max(0, Math.min(1, normalized.header.confidence / 100))
      : 0.75;
  const enrichedLines: EnrichedLine[] = [];
  const variances: VarianceDraft[] = [];
  const reviewReasons: ReviewReason[] = [];
  let varianceAccumulator = 0;
  let varianceWeight = 0;
  for (let index = 0; index < normalized.lines.length; index++) {
    const line = normalized.lines[index];
    const vendorSku = normalizeSku(line, index);
    const uomMapping = await ensureUomMapping(
      supabase,
      uomMappings,
      invoice.org_id,
      line.uom ?? null,
      line.uom ?? null,
    );
    const normalizedQty =
      line.qty != null && uomMapping
        ? Number((line.qty * uomMapping.factor).toFixed(4))
        : (line.qty ?? null);
    const normalizedUom = uomMapping?.normalized_uom ?? line.uom ?? null;
    const crosswalk = await ensureCrosswalk(
      supabase,
      crosswalks,
      invoice.org_id,
      vendorName,
      vendorSku,
      line.description,
      normalizedUom,
    );
    const canonicalCode = crosswalk?.canonical_item_code ?? vendorSku ?? null;
    const historyKey = canonicalCode
      ? `canonical:${canonicalCode}`
      : vendorSku
        ? `sku:${vendorSku}`
        : `desc:${slugify(line.description).slice(0, 16)}`;
    let history = historyCache.get(historyKey);
    if (!history) {
      history = await fetchHistoricalPrice(
        supabase,
        invoice.org_id,
        invoice.id,
        canonicalCode,
        vendorSku,
        line.description,
      );
      historyCache.set(historyKey, history);
    }
    const sampleConfidence = history.sampleCount
      ? Math.min(1, Math.log2(history.sampleCount + 1) / 5)
      : 0.35;
    const lineConfidence = computeLineConfidence(
      ocrConfidenceRatio,
      uomMapping?.confidence ?? null,
      crosswalk?.confidence ?? null,
      sampleConfidence,
    );
    const enriched: EnrichedLine = {
      ...line,
      normalized_qty: normalizedQty,
      normalized_uom: normalizedUom,
      canonical_item_code: canonicalCode,
      confidence: Number(lineConfidence.toFixed(3)),
      expected_unit_price: history.expected,
      vendor_sku: vendorSku,
    };
    enrichedLines.push(enriched);
    const actualUnitPrice = line.unit_price ?? null;
    if (
      history.expected != null &&
      actualUnitPrice != null &&
      history.expected > 0
    ) {
      const variancePct = Number(
        (
          ((actualUnitPrice - history.expected) / history.expected) *
          100
        ).toFixed(2),
      );
      const requiresReview =
        Math.abs(variancePct) >= thresholds.lineVariancePct &&
        lineConfidence >= thresholds.minConfidence;
      variances.push({
        index,
        type: "unit_price",
        expectedValue: history.expected,
        actualValue: actualUnitPrice,
        variancePct,
        confidence: Number(lineConfidence.toFixed(3)),
        requiresReview,
        metadata: {
          vendorSku,
          canonicalCode,
          sampleCount: history.sampleCount,
        },
      });
      varianceAccumulator += Math.abs(variancePct) * lineConfidence;
      varianceWeight += lineConfidence;
      if (requiresReview) {
        reviewReasons.push({
          type: "line",
          index,
          reason: `Variance ${variancePct}% exceeds threshold`,
          confidence: Number(lineConfidence.toFixed(3)),
          metadata: {
            expected: history.expected,
            actual: actualUnitPrice,
            sampleCount: history.sampleCount,
            vendorSku,
          },
        });
      }
    }
    if (lineConfidence < thresholds.minConfidence) {
      reviewReasons.push({
        type: "line",
        index,
        reason: "Low confidence OCR/normalization",
        confidence: Number(lineConfidence.toFixed(3)),
        metadata: { vendorSku, canonicalCode, normalizedUom },
      });
    }
  }
  const invoiceVarianceScore = varianceWeight
    ? Number((varianceAccumulator / varianceWeight).toFixed(2))
    : 0;
  if (
    invoiceVarianceScore >= thresholds.invoiceVariancePct &&
    variances.length
  ) {
    reviewReasons.push({
      type: "invoice",
      reason: `Invoice variance score ${invoiceVarianceScore}% exceeds threshold`,
      confidence: Math.min(1, ocrConfidenceRatio + 0.1),
      metadata: {
        varianceScore: invoiceVarianceScore,
        lineCount: variances.length,
      },
    });
  }
  const requiresReview = reviewReasons.length > 0;
  return {
    lines: enrichedLines,
    variances,
    reviewReasons,
    invoiceVarianceScore,
    requiresReview,
    thresholds,
  };
}
export async function persistEnrichmentArtifacts(
  supabase: SupabaseClient,
  invoice: { id: string; org_id: string },
  draft: EnrichmentDraft,
  insertedLines: Array<{ id: string }>,
): Promise<void> {
  if (draft.variances.length) {
    const varianceRows: InvoiceVarianceInsert[] = [];
    draft.variances.forEach((variance) => {
      const line = insertedLines[variance.index];
      if (!line?.id) return;
      varianceRows.push({
        invoice_id: invoice.id,
        invoice_line_id: line.id,
        variance_type: variance.type,
        expected_value: variance.expectedValue,
        actual_value: variance.actualValue,
        variance_pct: variance.variancePct,
        confidence: variance.confidence,
        requires_review: variance.requiresReview,
        metadata: variance.metadata,
      });
    });
    if (varianceRows.length) {
      const { error } = await supabase
        .from("invoice_variances")
        .insert(varianceRows);
      if (error) throw error;
    }
  }
  if (draft.reviewReasons.length) {
    const now = new Date().toISOString();
    const reviewRows = draft.reviewReasons.map((reason) => {
      const lineId =
        reason.type === "line" && reason.index != null
          ? (insertedLines[reason.index]?.id ?? null)
          : null;
      return {
        org_id: invoice.org_id,
        invoice_id: invoice.id,
        reason: reason.reason,
        confidence: Number(reason.confidence.toFixed(2)),
        status: "pending",
        payload: {
          ...reason.metadata,
          invoice_line_id: lineId,
          type: reason.type,
          index: reason.index ?? null,
        },
        created_at: now,
      };
    });
    const { error } = await supabase
      .from("invoice_review_tasks")
      .insert(reviewRows);
    if (error) throw error;
  }
}
