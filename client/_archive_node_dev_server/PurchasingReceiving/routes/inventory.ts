import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  InventoryReviewFlag,
  InventoryReviewFlagRequest,
  PhysicalInventoryInsightsResponse,
  StandardCostInsight,
  VoiceInventoryInsight,
} from "@shared/inventory";
import { getSupabaseServiceClient } from "../lib/supabase";
interface VoiceItemRow {
  id: string;
  product_name: string;
  quantity: number | null;
  unit: string | null;
  bin: string | null;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  log: {
    id: string;
    outlet_id: string | null;
    captured_at: string | null;
  } | null;
}
interface StandardCostRow {
  id: string;
  standard_product_id: string;
  standard_product_name: string;
  base_unit: string;
  outlet_id: string | null;
  outlet_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  captured_on: string | null;
  purchase_quantity: number | null;
  purchase_unit: string | null;
  total_cost: number | null;
  total_standard_units: number | null;
  cost_per_standard_unit: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}
interface VoiceAccumulator extends VoiceInventoryInsight {
  sum: number;
  sumSquares: number;
}
const REVIEW_STORAGE_PATH = path.join(
  process.cwd(),
  "server",
  "data",
  "inventory-review.json",
);
async function ensureReviewStorage() {
  await fs.mkdir(path.dirname(REVIEW_STORAGE_PATH), { recursive: true });
}
async function readReviewFlags(): Promise<InventoryReviewFlag[]> {
  try {
    const payload = await fs.readFile(REVIEW_STORAGE_PATH, "utf-8");
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => sanitizeReviewFlag(entry))
      .filter((entry): entry is InventoryReviewFlag => !!entry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
async function writeReviewFlags(flags: InventoryReviewFlag[]) {
  await ensureReviewStorage();
  const payload = JSON.stringify(flags, null, 2);
  await fs.writeFile(REVIEW_STORAGE_PATH, payload, "utf-8");
}
function sanitizeReviewFlag(entry: unknown): InventoryReviewFlag | null {
  if (!entry || typeof entry !== "object") return null;
  const raw = entry as Partial<InventoryReviewFlag> & Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id ? raw.id : randomUUID();
  const itemName = typeof raw.itemName === "string" ? raw.itemName : null;
  if (!itemName) return null;
  const outletId =
    typeof raw.outletId === "string" && raw.outletId.length
      ? raw.outletId
      : null;
  const itemId =
    typeof raw.itemId === "string" && raw.itemId.length ? raw.itemId : null;
  const flaggedBy =
    typeof raw.flaggedBy === "string" && raw.flaggedBy.length
      ? raw.flaggedBy
      : null;
  const flaggedAt =
    typeof raw.flaggedAt === "string" && raw.flaggedAt.length
      ? raw.flaggedAt
      : new Date().toISOString();
  const reviewed = typeof raw.reviewed === "boolean" ? raw.reviewed : true;
  const reviewedAt =
    typeof raw.reviewedAt === "string" && raw.reviewedAt.length
      ? raw.reviewedAt
      : reviewed
        ? flaggedAt
        : null;
  const notes =
    typeof raw.notes === "string" && raw.notes.length ? raw.notes : null;
  return {
    id,
    itemName,
    outletId,
    itemId,
    flaggedBy,
    flaggedAt,
    reviewed,
    reviewedAt,
    notes,
  };
}
function normalizeRequestBody(
  body: unknown,
): InventoryReviewFlagRequest | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const itemName =
    typeof raw.itemName === "string" && raw.itemName.trim().length
      ? raw.itemName.trim()
      : null;
  if (!itemName) return null;
  const outletId =
    typeof raw.outletId === "string" && raw.outletId.trim().length
      ? raw.outletId.trim()
      : null;
  const itemId =
    typeof raw.itemId === "string" && raw.itemId.trim().length
      ? raw.itemId.trim()
      : null;
  const flaggedBy =
    typeof raw.flaggedBy === "string" && raw.flaggedBy.trim().length
      ? raw.flaggedBy.trim()
      : null;
  const reviewed = typeof raw.reviewed === "boolean" ? raw.reviewed : true;
  const notes =
    typeof raw.notes === "string" && raw.notes.trim().length
      ? raw.notes.trim()
      : null;
  return { itemName, outletId, itemId, flaggedBy, reviewed, notes };
}
function parsePackSize(rawPayload: Record<string, unknown> | null): {
  packSize: number | null;
  packLabel: string | null;
  metadata: Record<string, unknown> | null;
} {
  if (!rawPayload) {
    return { packSize: null, packLabel: null, metadata: null };
  }
  let payload: Record<string, unknown> | null = null;
  if (typeof rawPayload === "string") {
    try {
      const parsed = JSON.parse(rawPayload);
      payload =
        parsed && typeof parsed === "object"
          ? (parsed as Record<string, unknown>)
          : null;
    } catch {
      payload = null;
    }
  } else {
    payload = rawPayload;
  }
  if (!payload) {
    return { packSize: null, packLabel: null, metadata: null };
  }
  const packLabel = typeof payload.pack === "string" ? payload.pack : null;
  let packSize: number | null = null;
  if (packLabel) {
    const numericMatch = packLabel.match(
      /(\d+(?:\.\d+)?)\s*(?:x|\/)?\s*(\d+(?:\.\d+)?)/i,
    );
    if (numericMatch) {
      const first = Number.parseFloat(numericMatch[1]);
      const second = numericMatch[2] ? Number.parseFloat(numericMatch[2]) : 1;
      if (Number.isFinite(first) && Number.isFinite(second)) {
        packSize = first * second;
      }
    } else {
      const singleMatch = packLabel.match(/(\d+(?:\.\d+)?)/);
      if (singleMatch) {
        const value = Number.parseFloat(singleMatch[1]);
        if (Number.isFinite(value)) {
          packSize = value;
        }
      }
    }
  }
  return { packSize, packLabel, metadata: payload };
}
function calculateStats(entries: VoiceItemRow[]): VoiceInventoryInsight[] {
  const byKey = new Map<string, VoiceAccumulator>();
  for (const row of entries) {
    const productName = row.product_name?.trim();
    if (!productName) continue;
    const outletId = row.log?.outlet_id ?? null;
    const key = `${productName.toLowerCase()}::${outletId ?? "__global__"}`;
    let existing = byKey.get(key);
    if (!existing) {
      existing = {
        productName,
        outletId,
        sampleCount: 0,
        lastCapturedAt: null,
        lastQuantity: null,
        lastUnit: null,
        lastBin: null,
        lastConfidence: null,
        averageQuantity: null,
        stdDeviation: null,
        anomalyThreshold: null,
        recommendedRange: null,
        sum: 0,
        sumSquares: 0,
      };
      byKey.set(key, existing);
    }
    existing.sampleCount += 1;
    const capturedAt = row.log?.captured_at ?? null;
    const quantityValue =
      typeof row.quantity === "number"
        ? row.quantity
        : Number(row.quantity ?? NaN);
    if (Number.isFinite(quantityValue)) {
      existing.sum += quantityValue;
      existing.sumSquares += quantityValue * quantityValue;
    }
    if (
      !existing.lastCapturedAt ||
      (capturedAt && existing.lastCapturedAt < capturedAt)
    ) {
      existing.lastCapturedAt = capturedAt;
      existing.lastQuantity = Number.isFinite(quantityValue)
        ? quantityValue
        : existing.lastQuantity;
      existing.lastUnit = row.unit ?? existing.lastUnit;
      existing.lastBin = row.bin ?? existing.lastBin;
      existing.lastConfidence = row.confidence ?? existing.lastConfidence;
    }
  }
  const insights: VoiceInventoryInsight[] = [];
  for (const accumulator of byKey.values()) {
    if (accumulator.sampleCount > 0) {
      const mean = accumulator.sum / accumulator.sampleCount;
      const variance = Math.max(
        accumulator.sumSquares / accumulator.sampleCount - mean * mean,
        0,
      );
      const stdDeviation = Math.sqrt(variance);
      accumulator.averageQuantity = mean;
      accumulator.stdDeviation = stdDeviation;
      const threshold = mean + stdDeviation * 2;
      accumulator.anomalyThreshold = Number.isFinite(threshold)
        ? threshold
        : null;
      const rangeMargin = stdDeviation * 1.5;
      const minRange = Math.max(mean - rangeMargin, 0);
      const maxRange = mean + rangeMargin;
      accumulator.recommendedRange = {
        min: Number.isFinite(minRange) ? minRange : null,
        max: Number.isFinite(maxRange) ? maxRange : null,
      };
    }
    const { sum, sumSquares, ...insight } = accumulator;
    insights.push(insight);
  }
  return insights;
}
async function fetchSupabaseInsights(
  outletId?: string | null,
  since?: string,
): Promise<{
  status: PhysicalInventoryInsightsResponse["status"];
  message?: string;
  standardCosts: StandardCostInsight[];
  voiceInsights: VoiceInventoryInsight[];
}> {
  let client;
  try {
    client = getSupabaseServiceClient();
  } catch (error) {
    return {
      status: "degraded",
      message: (error as Error).message ?? "Supabase client unavailable",
      standardCosts: [],
      voiceInsights: [],
    };
  }
  try {
    let costQueryBuilder = client
      .from("standard_product_latest_costs")
      .select("*")
      .order("standard_product_name", { ascending: true })
      .limit(500);
    let voiceQueryBuilder = client
      .from("voice_inventory_items")
      .select(
        `id, product_name, quantity, unit, bin, confidence, metadata, log:voice_inventory_logs!inner(id, outlet_id, captured_at)`,
      )
      .order("captured_at", {
        referencedTable: "voice_inventory_logs",
        ascending: false,
      })
      .limit(2000);
    if (outletId && outletId !== "all") {
      if (outletId === "__unassigned__") {
        costQueryBuilder = costQueryBuilder.is("outlet_id", null);
        voiceQueryBuilder = voiceQueryBuilder.is(
          "voice_inventory_logs.outlet_id",
          null,
        );
      } else {
        costQueryBuilder = costQueryBuilder.eq("outlet_id", outletId);
        voiceQueryBuilder = voiceQueryBuilder.eq(
          "voice_inventory_logs.outlet_id",
          outletId,
        );
      }
    }
    if (since) {
      voiceQueryBuilder = voiceQueryBuilder.gte(
        "voice_inventory_logs.captured_at",
        since,
      );
    }
    const [
      { data: rawCostRows, error: costError },
      { data: rawVoiceRows, error: voiceError },
    ] = await Promise.all([costQueryBuilder, voiceQueryBuilder]);
    if (costError) throw costError;
    if (voiceError) throw voiceError;
    const costRows = (rawCostRows ?? []) as StandardCostRow[];
    const voiceRows = (rawVoiceRows ?? []) as VoiceItemRow[];
    const standardCosts: StandardCostInsight[] = costRows.map((row) => {
      const { packSize, packLabel, metadata } = parsePackSize(row.raw_payload);
      return {
        id: row.id,
        standardProductId: row.standard_product_id,
        productName: row.standard_product_name,
        baseUnit: row.base_unit,
        outletId: row.outlet_id,
        outletName: row.outlet_name,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        capturedOn: row.captured_on,
        purchaseQuantity: row.purchase_quantity,
        purchaseUnit: row.purchase_unit,
        totalCost: row.total_cost,
        totalStandardUnits: row.total_standard_units,
        costPerStandardUnit: row.cost_per_standard_unit,
        packSize,
        packLabel,
        metadata,
      };
    });
    const voiceInsights = calculateStats(voiceRows);
    return { status: "ok", standardCosts, voiceInsights };
  } catch (error) {
    return {
      status: "degraded",
      message: (error as Error).message ?? "Failed to query Supabase",
      standardCosts: [],
      voiceInsights: [],
    };
  }
}
const inventoryRouter = Router();
inventoryRouter.get("/physical-insights", async (req, res) => {
  const outletId =
    typeof req.query.outlet === "string" ? req.query.outlet : undefined;
  const daysParam =
    typeof req.query.days === "string"
      ? Number.parseInt(req.query.days, 10)
      : null;
  const sinceDays =
    Number.isFinite(daysParam) && daysParam ? Math.max(daysParam, 1) : 30;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const sinceIso = sinceDate.toISOString();
  const { status, message, standardCosts, voiceInsights } =
    await fetchSupabaseInsights(outletId, sinceIso);
  const response: PhysicalInventoryInsightsResponse = {
    generatedAt: new Date().toISOString(),
    status,
    outletId: outletId ?? null,
    message,
    standardCosts,
    voiceInsights,
  };
  res.json(response);
});
inventoryRouter.get("/review-flags", async (_req, res) => {
  try {
    const flags = await readReviewFlags();
    res.json({ flags });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? "Failed to read review flags",
    });
  }
});
inventoryRouter.post("/review-flags", async (req, res) => {
  try {
    const payload = normalizeRequestBody(req.body);
    if (!payload) {
      res.status(400).json({ error: "Invalid review flag payload" });
      return;
    }
    const current = await readReviewFlags();
    const now = new Date().toISOString();
    const key = (flag: InventoryReviewFlag) =>
      `${flag.itemName.toLowerCase()}::${flag.outletId ?? "__global__"}`;
    const existingIndex = current.findIndex(
      (flag) =>
        key(flag) ===
        `${payload.itemName.toLowerCase()}::${payload.outletId ?? "__global__"}`,
    );
    const nextFlag: InventoryReviewFlag =
      existingIndex >= 0
        ? current[existingIndex]
        : {
            id: randomUUID(),
            itemName: payload.itemName,
            outletId: payload.outletId ?? null,
            itemId: payload.itemId ?? null,
            flaggedBy: payload.flaggedBy ?? null,
            flaggedAt: now,
            reviewed: payload.reviewed ?? true,
            reviewedAt: (payload.reviewed ?? true) ? now : null,
            notes: payload.notes ?? null,
          };
    if (existingIndex >= 0) {
      nextFlag.reviewed = payload.reviewed ?? true;
      nextFlag.reviewedAt = (payload.reviewed ?? true) ? now : null;
      nextFlag.notes = payload.notes ?? nextFlag.notes ?? null;
      nextFlag.flaggedBy = payload.flaggedBy ?? nextFlag.flaggedBy ?? null;
    }
    if (existingIndex >= 0) {
      current[existingIndex] = nextFlag;
    } else {
      current.push(nextFlag);
    }
    const trimmed = current.slice(-500);
    await writeReviewFlags(trimmed);
    res.json({ flag: nextFlag });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? "Failed to persist review flag",
    });
  }
});
inventoryRouter.delete("/review-flags", async (req, res) => {
  try {
    const payload = normalizeRequestBody(req.body);
    if (!payload) {
      res.status(400).json({ error: "Invalid review flag payload" });
      return;
    }
    const current = await readReviewFlags();
    const keyTarget = `${payload.itemName.toLowerCase()}::${payload.outletId ?? "__global__"}`;
    const next = current.filter(
      (flag) =>
        `${flag.itemName.toLowerCase()}::${flag.outletId ?? "__global__"}` !==
        keyTarget,
    );
    await writeReviewFlags(next);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? "Failed to remove review flag",
    });
  }
});
export { inventoryRouter };
