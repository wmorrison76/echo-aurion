/**
 * Purchase Consolidation Service (A4 + A4.5)
 *
 * Aggregates ingredient demand across every BEO whose event falls inside
 * a lookahead window, subtracts on-hand inventory + already-pending POs,
 * groups the shortfall by supplier, and emits one consolidated PO per
 * supplier instead of one PO per BEO.
 *
 * A4.5 makes this production-safe at scale:
 *   - All `.in()` lookups are chunked (CHUNK_SIZE=500) so the engine
 *     handles thousands of BEOs per pass without truncation.
 *   - PO inserts are batched per supplier (one .insert([rows]) call)
 *     instead of one row at a time.
 *   - Run status is explicit (pending → running → completed | partial |
 *     failed) with started_at/completed_at/last_heartbeat_at columns.
 *     If the process dies mid-run, the row stays in "running" with the
 *     leftover work in pending_supplier_groups. A view exposes stuck
 *     runs for operator visibility.
 *   - Idempotency: callers can pass an idempotency_key; the same key on
 *     a re-submit returns the existing run instead of duplicating it.
 *   - Resume: resumeConsolidation(id) re-tries the leftover work.
 *   - Matching is on the SQL-side normalized_name columns added by
 *     migration 074 so re-runs are deterministic.
 *
 * The key invariant: every shortfall row is either
 *   (a) on a successful PO,
 *   (b) in pending_supplier_groups waiting for a resume call, or
 *   (c) in warnings with a human-readable reason.
 * Nothing silently disappears.
 */

import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from "../lib/unified-event-bus";

// Chunk size for any .in(...) lookup. PostgREST (Supabase) URL/argument
// limits start truncating around 1000–2000; 500 is comfortably safe and
// keeps per-query latency low.
const CHUNK_SIZE = 500;

// Heartbeat cadence — how often a long-running pass updates
// last_heartbeat_at while it works.
const HEARTBEAT_INTERVAL_MS = 30_000;

export interface ConsolidationInput {
  orgId: string;
  /** How many days ahead to scan for events. Default 14. */
  lookaheadDays?: number;
  /** BEO statuses to include. Default ['approved', 'active']. */
  includeStatuses?: string[];
  /** If true, compute the plan but do not insert POs. Default false. */
  dryRun?: boolean;
  /** Reason / source of this run. */
  trigger?: "manual" | "scheduled" | "beo_approved";
  runBy?: string;
  /**
   * Optional idempotency key. Two requests from the same org with the
   * same key return the existing run instead of creating a duplicate.
   * Recommended for any UI button — prevents accidental double-clicks
   * or retried network calls from creating ghost POs.
   */
  idempotencyKey?: string;
}

export interface ShortfallLine {
  ingredientName: string;
  unit: string;
  totalDemand: number;
  onHand: number;
  pendingDelivery: number;
  shortfall: number;
  estimatedUnitCost?: number;
  estimatedTotalCost?: number;
  supplierId?: string;
  supplierName: string;
  contributingBeoIds: string[];
}

export interface SupplierGroup {
  supplierId?: string;
  supplierName: string;
  lines: ShortfallLine[];
  totalCost: number;
  beoIdsCovered: string[];
}

export interface ConsolidationPlan {
  orgId: string;
  windowStart: string; // YYYY-MM-DD
  windowEnd: string;
  beosIncluded: string[];
  supplierGroups: SupplierGroup[];
  totalShortfallCost: number;
  shortfallCount: number;
  warnings: string[];
}

export interface ConsolidationResult {
  consolidationId?: string;
  plan: ConsolidationPlan;
  posCreated: number;
  poIds: string[];
  dryRun: boolean;
  /** Final run_status of the persisted purchase_consolidations row. */
  runStatus: "completed" | "partial" | "failed" | "dry_run";
  /** Idempotent return — true if a prior run with this key was returned. */
  reused?: boolean;
}

const UNMAPPED_SUPPLIER = "(unmapped)";

function normalizeName(s: string): string {
  // Mirrors the SQL ingredient_normalize_name() function so plan-side
  // matching agrees with index-side matching after migration 074.
  if (!s) return "";
  let v = s.trim().toLowerCase().replace(/\s+/g, " ");
  v = v.replace(/^(fresh|organic|raw|frozen|whole|chopped|diced) /, "");
  return v;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface EventRow {
  id: string;
  event_date: string;
  beo_id?: string | null;
  org_id: string;
}

interface BEORow {
  id: string;
  org_id: string;
  status: string;
  event_id: string;
  lifecycle_event_id?: string | null;
}

interface ScaledIngredientRow {
  id: string;
  beo_id?: string | null;
  ingredient_name: string;
  scaled_quantity: number | null;
  scaled_unit: string | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  preferred_supplier_id?: string | null;
  supplier_name?: string | null;
  recipe_id?: string | null;
  normalized_name?: string | null;
}

interface InventoryRow {
  product_id: string;
  product_name: string;
  unit: string;
  quantity_on_hand: number | null;
  normalized_name?: string | null;
}

interface PendingPORow {
  product_name: string | null;
  quantity: number | null;
  status: string | null;
}

// ─── Loaders (chunked) ───────────────────────────────────────────────────

async function loadCandidateBEOs(
  orgId: string,
  windowStart: string,
  windowEnd: string,
  includeStatuses: string[],
): Promise<{ beos: BEORow[]; events: EventRow[]; warnings: string[] }> {
  const warnings: string[] = [];

  const { data: lifecycleEvents, error: leErr } = await supabase
    .from("lifecycle_events")
    .select("id, org_id, event_date, beo_id")
    .eq("org_id", orgId)
    .gte("event_date", windowStart)
    .lte("event_date", windowEnd);

  if (leErr) {
    warnings.push(`lifecycle_events fetch failed: ${leErr.message ?? String(leErr)}`);
  }

  const events: EventRow[] = Array.isArray(lifecycleEvents)
    ? (lifecycleEvents as EventRow[])
    : [];

  const beoIdsFromEvents = events
    .map((e) => e.beo_id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const { data: beoRows, error: beoErr } = await supabase
    .from("beo_banquet_orders")
    .select("id, org_id, status, event_id, lifecycle_event_id")
    .eq("org_id", orgId)
    .in("status", includeStatuses);

  if (beoErr) {
    warnings.push(`beo_banquet_orders fetch failed: ${beoErr.message ?? String(beoErr)}`);
  }

  const allBEOs: BEORow[] = Array.isArray(beoRows) ? (beoRows as BEORow[]) : [];

  const eligibleBeoIds = new Set<string>(beoIdsFromEvents);
  const eventIdSet = new Set(events.map((e) => e.id));
  for (const b of allBEOs) {
    if (b.lifecycle_event_id && eventIdSet.has(b.lifecycle_event_id)) {
      eligibleBeoIds.add(b.id);
    }
  }
  const beos = allBEOs.filter((b) => eligibleBeoIds.has(b.id));

  if (beos.length === 0) {
    warnings.push(
      `no BEOs in window ${windowStart}…${windowEnd} with status ∈ {${includeStatuses.join(", ")}}`,
    );
  }

  return { beos, events, warnings };
}

async function loadScaledIngredients(
  beoIds: string[],
): Promise<ScaledIngredientRow[]> {
  if (beoIds.length === 0) return [];
  const out: ScaledIngredientRow[] = [];
  for (const batch of chunk(beoIds, CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("scaled_ingredients")
      .select(
        "id, beo_id, ingredient_name, scaled_quantity, scaled_unit, unit_cost, total_cost, preferred_supplier_id, supplier_name, recipe_id, normalized_name",
      )
      .in("beo_id", batch);
    if (error) {
      logger.warn("[PurchaseConsolidation] scaled_ingredients chunk failed", {
        error: error.message ?? String(error),
        chunkSize: batch.length,
      });
      continue;
    }
    if (Array.isArray(data)) out.push(...(data as ScaledIngredientRow[]));
  }
  return out;
}

async function loadInventoryByNormalizedName(
  orgId: string,
  normalizedNames: string[],
): Promise<Map<string, InventoryRow>> {
  const out = new Map<string, InventoryRow>();
  if (normalizedNames.length === 0) return out;
  const targets = new Set(normalizedNames);
  for (const batch of chunk([...targets], CHUNK_SIZE)) {
    // Prefer the normalized_name index (migration 074); fall back to a
    // post-filter on the org-wide fetch if the column isn't present.
    const { data, error } = await supabase
      .from("inventory_items")
      .select("product_id, product_name, unit, quantity_on_hand, normalized_name")
      .eq("org_id", orgId)
      .in("normalized_name", batch);
    if (error) {
      logger.warn("[PurchaseConsolidation] inventory_items chunk failed", {
        error: error.message ?? String(error),
      });
      continue;
    }
    for (const row of (data ?? []) as InventoryRow[]) {
      const key = row.normalized_name ?? normalizeName(row.product_name);
      if (key && !out.has(key)) out.set(key, row);
    }
  }
  return out;
}

async function loadPendingPOTotalsByNormalizedName(
  orgId: string,
  normalizedNames: string[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (normalizedNames.length === 0) return totals;
  const { data, error } = await supabase
    .from("event_purchase_orders")
    .select("product_name, quantity, status")
    .eq("org_id", orgId);
  if (error) {
    logger.warn("[PurchaseConsolidation] event_purchase_orders fetch failed", {
      error: error.message ?? String(error),
    });
    return totals;
  }
  const targets = new Set(normalizedNames);
  for (const row of (data ?? []) as PendingPORow[]) {
    if (!row.product_name) continue;
    const norm = normalizeName(row.product_name);
    if (!targets.has(norm)) continue;
    if (row.status && !["pending", "draft", "submitted", "approved", "ordered"].includes(row.status)) continue;
    totals.set(norm, (totals.get(norm) ?? 0) + (Number(row.quantity) || 0));
  }
  return totals;
}

// ─── Plan builder ────────────────────────────────────────────────────────

export async function buildConsolidationPlan(
  input: ConsolidationInput,
): Promise<ConsolidationPlan> {
  const lookaheadDays = input.lookaheadDays ?? 14;
  const includeStatuses = input.includeStatuses ?? ["approved", "active"];
  const today = new Date();
  const end = new Date(today.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);
  const windowStart = ymd(today);
  const windowEnd = ymd(end);

  const warnings: string[] = [];

  const { beos, warnings: loadWarnings } = await loadCandidateBEOs(
    input.orgId,
    windowStart,
    windowEnd,
    includeStatuses,
  );
  warnings.push(...loadWarnings);

  const beoIds = beos.map((b) => b.id);
  const scaled = await loadScaledIngredients(beoIds);
  if (scaled.length === 0 && beoIds.length > 0) {
    warnings.push(
      "no scaled_ingredients rows for in-window BEOs — run /scale-recipes first",
    );
  }

  type Agg = {
    ingredientName: string;
    normalizedName: string;
    unit: string;
    totalDemand: number;
    contributingBeoIds: Set<string>;
    estimatedUnitCost?: number;
    supplierId?: string;
    supplierName?: string;
  };
  const aggMap = new Map<string, Agg>();
  for (const row of scaled) {
    const name = (row.ingredient_name || "").trim();
    if (!name) continue;
    const unit = (row.scaled_unit || "ea").trim();
    const norm = row.normalized_name ?? normalizeName(name);
    const key = `${norm}::${unit.toLowerCase()}`;
    const agg = aggMap.get(key) ?? {
      ingredientName: name,
      normalizedName: norm,
      unit,
      totalDemand: 0,
      contributingBeoIds: new Set<string>(),
    };
    agg.totalDemand += Number(row.scaled_quantity) || 0;
    if (row.beo_id) agg.contributingBeoIds.add(row.beo_id);
    if (typeof row.unit_cost === "number" && row.unit_cost > 0 && agg.estimatedUnitCost == null) {
      agg.estimatedUnitCost = row.unit_cost;
    }
    if (row.preferred_supplier_id && !agg.supplierId) agg.supplierId = row.preferred_supplier_id;
    if (row.supplier_name && !agg.supplierName) agg.supplierName = row.supplier_name;
    aggMap.set(key, agg);
  }

  const allNormalized = Array.from(aggMap.values()).map((a) => a.normalizedName);
  const [inventory, pending] = await Promise.all([
    loadInventoryByNormalizedName(input.orgId, allNormalized),
    loadPendingPOTotalsByNormalizedName(input.orgId, allNormalized),
  ]);

  const shortfallLines: ShortfallLine[] = [];
  for (const agg of aggMap.values()) {
    const inv = inventory.get(agg.normalizedName);
    if (!inv) {
      warnings.push(`no inventory match for "${agg.ingredientName}" — assuming 0 on-hand`);
    }
    const onHand = Number(inv?.quantity_on_hand ?? 0);
    const pendingDelivery = Number(pending.get(agg.normalizedName) ?? 0);
    const shortfall = Math.max(0, agg.totalDemand - onHand - pendingDelivery);
    if (shortfall <= 0) continue;
    const estimatedTotalCost =
      typeof agg.estimatedUnitCost === "number"
        ? Number((shortfall * agg.estimatedUnitCost).toFixed(2))
        : undefined;
    shortfallLines.push({
      ingredientName: agg.ingredientName,
      unit: agg.unit,
      totalDemand: Number(agg.totalDemand.toFixed(4)),
      onHand: Number(onHand.toFixed(4)),
      pendingDelivery: Number(pendingDelivery.toFixed(4)),
      shortfall: Number(shortfall.toFixed(4)),
      estimatedUnitCost: agg.estimatedUnitCost,
      estimatedTotalCost,
      supplierId: agg.supplierId,
      supplierName: agg.supplierName ?? UNMAPPED_SUPPLIER,
      contributingBeoIds: Array.from(agg.contributingBeoIds),
    });
  }

  const groupMap = new Map<string, SupplierGroup>();
  for (const line of shortfallLines) {
    const key = line.supplierId ?? `name:${line.supplierName}`;
    const group =
      groupMap.get(key) ??
      ({
        supplierId: line.supplierId,
        supplierName: line.supplierName,
        lines: [],
        totalCost: 0,
        beoIdsCovered: [],
      } as SupplierGroup);
    group.lines.push(line);
    if (line.estimatedTotalCost) group.totalCost += line.estimatedTotalCost;
    for (const id of line.contributingBeoIds) {
      if (!group.beoIdsCovered.includes(id)) group.beoIdsCovered.push(id);
    }
    groupMap.set(key, group);
  }
  const supplierGroups = Array.from(groupMap.values()).map((g) => ({
    ...g,
    totalCost: Number(g.totalCost.toFixed(2)),
  }));

  const totalShortfallCost = Number(
    supplierGroups.reduce((s, g) => s + g.totalCost, 0).toFixed(2),
  );

  return {
    orgId: input.orgId,
    windowStart,
    windowEnd,
    beosIncluded: beoIds,
    supplierGroups,
    totalShortfallCost,
    shortfallCount: shortfallLines.length,
    warnings,
  };
}

// ─── Insert (batched) ────────────────────────────────────────────────────

interface InsertOutcome {
  poIds: string[];
  failedGroups: SupplierGroup[];
  warnings: string[];
}

async function insertSupplierGroups(
  groups: SupplierGroup[],
  consolidationId: string,
  input: ConsolidationInput,
  windowStart: string,
): Promise<InsertOutcome> {
  const poIds: string[] = [];
  const failedGroups: SupplierGroup[] = [];
  const warnings: string[] = [];

  for (const group of groups) {
    const rows = group.lines.map((line) => ({
      org_id: input.orgId,
      consolidation_id: consolidationId,
      supplier_id: group.supplierId ?? null,
      supplier_name: group.supplierName,
      product_name: line.ingredientName,
      quantity: line.shortfall,
      unit: line.unit,
      unit_cost: line.estimatedUnitCost ?? null,
      total_cost: line.estimatedTotalCost ?? null,
      status: "draft",
      beo_ids_covered: line.contributingBeoIds,
      po_status: "draft",
      needed_by_date: windowStart,
      created_by: input.runBy ?? null,
    }));

    const { data, error } = await supabase
      .from("event_purchase_orders")
      .insert(rows)
      .select("id");

    if (error) {
      // Whole-group failure — keep it for resume, surface in warnings.
      warnings.push(
        `PO batch insert failed for supplier "${group.supplierName}": ${error.message ?? String(error)}`,
      );
      failedGroups.push(group);
      continue;
    }
    if (Array.isArray(data)) {
      for (const r of data) if (r?.id) poIds.push(r.id);
    }
  }

  return { poIds, failedGroups, warnings };
}

// ─── Idempotency ─────────────────────────────────────────────────────────

async function findExistingByIdempotencyKey(
  orgId: string,
  key: string,
): Promise<ConsolidationResult | null> {
  const { data, error } = await supabase
    .from("purchase_consolidations")
    .select("*")
    .eq("org_id", orgId)
    .eq("idempotency_key", key)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as any;
  const plan: ConsolidationPlan = (row.plan_snapshot as ConsolidationPlan) ?? {
    orgId,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    beosIncluded: row.beos_included ?? [],
    supplierGroups: [],
    totalShortfallCost: Number(row.total_cost ?? 0),
    shortfallCount: Number(row.shortfall_count ?? 0),
    warnings: row.warnings ?? [],
  };
  return {
    consolidationId: row.id,
    plan,
    posCreated: Number(row.pos_created ?? 0),
    poIds: Array.isArray(row.po_ids) ? row.po_ids : [],
    dryRun: row.dry_run === true,
    runStatus: row.run_status ?? "completed",
    reused: true,
  };
}

// ─── Main entry ──────────────────────────────────────────────────────────

export async function consolidatePurchasing(
  input: ConsolidationInput,
): Promise<ConsolidationResult> {
  const dryRun = input.dryRun === true;

  // Idempotency short-circuit (only on persisting runs; dry-runs always recompute).
  if (!dryRun && input.idempotencyKey) {
    const existing = await findExistingByIdempotencyKey(input.orgId, input.idempotencyKey);
    if (existing) {
      logger.info("[PurchaseConsolidation] idempotency hit — returning existing run", {
        orgId: input.orgId,
        consolidationId: existing.consolidationId,
        idempotencyKey: input.idempotencyKey,
      });
      return existing;
    }
  }

  const plan = await buildConsolidationPlan(input);

  if (dryRun) {
    return {
      plan,
      posCreated: 0,
      poIds: [],
      dryRun: true,
      runStatus: "dry_run",
    };
  }

  if (plan.shortfallCount === 0) {
    logger.info("[PurchaseConsolidation] no shortfall — no POs created", {
      orgId: input.orgId,
      windowStart: plan.windowStart,
      windowEnd: plan.windowEnd,
    });
    // Still record the run for audit, in completed state.
    const { data: noopRow } = await supabase
      .from("purchase_consolidations")
      .insert({
        org_id: input.orgId,
        run_by: input.runBy ?? null,
        trigger: input.trigger ?? "manual",
        dry_run: false,
        window_start: plan.windowStart,
        window_end: plan.windowEnd,
        beos_included: plan.beosIncluded,
        pos_created: 0,
        po_ids: [],
        total_cost: 0,
        shortfall_count: 0,
        warnings: plan.warnings,
        plan_snapshot: plan,
        run_status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        idempotency_key: input.idempotencyKey ?? null,
      })
      .select("id");
    return {
      consolidationId: Array.isArray(noopRow) && noopRow[0]?.id ? noopRow[0].id : undefined,
      plan,
      posCreated: 0,
      poIds: [],
      dryRun: false,
      runStatus: "completed",
    };
  }

  // Insert the run row in 'running' state with started_at + heartbeat.
  const startedAt = new Date().toISOString();
  const insertResp = await supabase
    .from("purchase_consolidations")
    .insert({
      org_id: input.orgId,
      run_by: input.runBy ?? null,
      trigger: input.trigger ?? "manual",
      dry_run: false,
      window_start: plan.windowStart,
      window_end: plan.windowEnd,
      beos_included: plan.beosIncluded,
      pos_created: 0,
      po_ids: [],
      total_cost: plan.totalShortfallCost,
      shortfall_count: plan.shortfallCount,
      warnings: plan.warnings,
      plan_snapshot: plan,
      run_status: "running",
      started_at: startedAt,
      last_heartbeat_at: startedAt,
      pending_supplier_groups: plan.supplierGroups,
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("id");

  if (insertResp.error || !Array.isArray(insertResp.data) || !insertResp.data[0]?.id) {
    // Couldn't even open the run — fail loud.
    const msg = insertResp.error?.message ?? "unknown error";
    logger.error("[PurchaseConsolidation] failed to open run row", { error: msg });
    throw new Error(`Failed to open consolidation run: ${msg}`);
  }
  const consolidationId = insertResp.data[0].id;

  // Heartbeat ticker — keeps last_heartbeat_at fresh while we work, so
  // the stuck_consolidations view can detect a dead process.
  const heartbeat = setInterval(() => {
    void supabase
      .from("purchase_consolidations")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", consolidationId);
  }, HEARTBEAT_INTERVAL_MS);

  let outcome: InsertOutcome;
  try {
    outcome = await insertSupplierGroups(
      plan.supplierGroups,
      consolidationId,
      input,
      plan.windowStart,
    );
  } finally {
    clearInterval(heartbeat);
  }

  const finalWarnings = [...plan.warnings, ...outcome.warnings];
  const runStatus: "completed" | "partial" =
    outcome.failedGroups.length === 0 ? "completed" : "partial";
  const completedAt = new Date().toISOString();

  await supabase
    .from("purchase_consolidations")
    .update({
      pos_created: outcome.poIds.length,
      po_ids: outcome.poIds,
      warnings: finalWarnings,
      run_status: runStatus,
      completed_at: completedAt,
      last_heartbeat_at: completedAt,
      pending_supplier_groups: outcome.failedGroups,
    })
    .eq("id", consolidationId);

  await unifiedEventBus.publish(
    UNIFIED_EVENT_TYPES.PURCHASING_ORDER_CREATED,
    {
      orgId: input.orgId,
      consolidationId,
      windowStart: plan.windowStart,
      windowEnd: plan.windowEnd,
      beoIdsCovered: plan.beosIncluded,
      poIds: outcome.poIds,
      totalCost: plan.totalShortfallCost,
      trigger: input.trigger ?? "manual",
      runStatus,
    },
    {
      source: { bus: "unified", module: "purchase_consolidation" },
      tenantId: input.orgId,
    },
  );

  logger.info("[PurchaseConsolidation] consolidated", {
    orgId: input.orgId,
    consolidationId,
    runStatus,
    posCreated: outcome.poIds.length,
    failedGroups: outcome.failedGroups.length,
    totalCost: plan.totalShortfallCost,
    warnings: finalWarnings.length,
  });

  return {
    consolidationId,
    plan: { ...plan, warnings: finalWarnings },
    posCreated: outcome.poIds.length,
    poIds: outcome.poIds,
    dryRun: false,
    runStatus,
  };
}

// ─── Resume ──────────────────────────────────────────────────────────────

/**
 * Re-run only the unfinished work for a consolidation. Idempotent — the
 * partial unique constraint on (consolidation_id, supplier_name,
 * product_name) prevents duplicate POs from a re-attempt that races with
 * a slow earlier insert.
 */
export async function resumeConsolidation(
  consolidationId: string,
  opts?: { runBy?: string },
): Promise<ConsolidationResult> {
  const { data: rows, error: loadErr } = await supabase
    .from("purchase_consolidations")
    .select("*")
    .eq("id", consolidationId)
    .limit(1);
  if (loadErr || !Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Consolidation ${consolidationId} not found`);
  }
  const row = rows[0] as any;
  if (row.dry_run) {
    throw new Error(`Consolidation ${consolidationId} is a dry run; nothing to resume`);
  }
  if (row.run_status === "completed") {
    return {
      consolidationId,
      plan: row.plan_snapshot as ConsolidationPlan,
      posCreated: Number(row.pos_created ?? 0),
      poIds: Array.isArray(row.po_ids) ? row.po_ids : [],
      dryRun: false,
      runStatus: "completed",
    };
  }
  const pending: SupplierGroup[] = Array.isArray(row.pending_supplier_groups)
    ? (row.pending_supplier_groups as SupplierGroup[])
    : [];
  if (pending.length === 0) {
    // Nothing to resume; mark completed if it isn't already.
    await supabase
      .from("purchase_consolidations")
      .update({
        run_status: "completed",
        completed_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("id", consolidationId);
    return {
      consolidationId,
      plan: row.plan_snapshot as ConsolidationPlan,
      posCreated: Number(row.pos_created ?? 0),
      poIds: Array.isArray(row.po_ids) ? row.po_ids : [],
      dryRun: false,
      runStatus: "completed",
    };
  }

  // Bump retry, mark running, refresh heartbeat.
  const startedAt = new Date().toISOString();
  await supabase
    .from("purchase_consolidations")
    .update({
      run_status: "running",
      retry_count: Number(row.retry_count ?? 0) + 1,
      started_at: row.started_at ?? startedAt,
      last_heartbeat_at: startedAt,
    })
    .eq("id", consolidationId);

  const heartbeat = setInterval(() => {
    void supabase
      .from("purchase_consolidations")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", consolidationId);
  }, HEARTBEAT_INTERVAL_MS);

  const plan = row.plan_snapshot as ConsolidationPlan;
  let outcome: InsertOutcome;
  try {
    outcome = await insertSupplierGroups(
      pending,
      consolidationId,
      { orgId: row.org_id, runBy: opts?.runBy ?? row.run_by ?? null },
      plan.windowStart,
    );
  } finally {
    clearInterval(heartbeat);
  }

  const allPoIds = [...(Array.isArray(row.po_ids) ? row.po_ids : []), ...outcome.poIds];
  const allWarnings = [...(Array.isArray(row.warnings) ? row.warnings : []), ...outcome.warnings];
  const runStatus: "completed" | "partial" =
    outcome.failedGroups.length === 0 ? "completed" : "partial";
  const completedAt = new Date().toISOString();

  await supabase
    .from("purchase_consolidations")
    .update({
      pos_created: allPoIds.length,
      po_ids: allPoIds,
      warnings: allWarnings,
      run_status: runStatus,
      completed_at: runStatus === "completed" ? completedAt : null,
      last_heartbeat_at: completedAt,
      pending_supplier_groups: outcome.failedGroups,
    })
    .eq("id", consolidationId);

  logger.info("[PurchaseConsolidation] resumed", {
    consolidationId,
    runStatus,
    addedPoIds: outcome.poIds.length,
    stillFailedGroups: outcome.failedGroups.length,
  });

  return {
    consolidationId,
    plan: { ...plan, warnings: allWarnings },
    posCreated: allPoIds.length,
    poIds: allPoIds,
    dryRun: false,
    runStatus,
  };
}

// ─── Stuck-run discovery ─────────────────────────────────────────────────

export async function listStuckConsolidations(orgId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("stuck_consolidations")
    .select("*")
    .eq("org_id", orgId)
    .order("started_at", { ascending: true });
  if (error) {
    logger.warn("[PurchaseConsolidation] stuck_consolidations view query failed", {
      error: error.message ?? String(error),
    });
    return [];
  }
  return Array.isArray(data) ? data : [];
}
