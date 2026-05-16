/**
 * Production Sheet Service (A5)
 *
 * Generates and persists the kitchen's production sheet — the document
 * cooks actually work from on event day. One active sheet per BEO. The
 * sheet is a snapshot frozen at generation time, so a chef tweak to a
 * recipe at 10pm doesn't shift the kitchen card under cooks who are
 * already prepping.
 *
 * Two entry points:
 *   - generateProductionSheet(beoId, opts)  — explicit, one BEO.
 *   - runProductionSheetTick()              — scheduler pass: walks every
 *     event whose date falls roughly 24h from now and generates a sheet
 *     for any BEO that doesn't already have an active one.
 *
 * The scheduler is wired at server boot (server/index.ts via
 * startProductionSheetScheduler) on a 10-minute interval. Each tick is
 * idempotent — a partial unique index on production_sheets(beo_id) WHERE
 * status='active' guarantees at most one active sheet per BEO, and the
 * tick records its result in production_sheet_scheduler_runs for
 * operator visibility.
 *
 * Distributed-deploy note: setInterval is in-process. Multi-instance
 * deploys need a distributed lock (Postgres advisory lock or a leader
 * election) before this is safe. Tracked as an A5 follow-up; for the
 * single-process demo deploy this is fine.
 */

import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from "../lib/unified-event-bus";
import { isStrict, StrictModeError } from "../lib/strict-mode";

// Default cadence for the scheduler. Operators can override with
// PRODUCTION_SHEET_TICK_MS — e.g. 60_000 for one-minute polling in
// staging where event_date might be tomorrow.
const DEFAULT_TICK_MS = 10 * 60 * 1000; // 10 minutes
// Window of "approximately 24h from now" the tick scans for events.
// Generous enough that a 10-minute cadence guarantees every event is
// caught at least once.
const WINDOW_BEFORE_HOURS = 25;
const WINDOW_AFTER_HOURS = 23;

export interface GenerateInput {
  beoId: string;
  trigger?: "manual" | "scheduled" | "beo_approved" | "regenerate";
  generatedBy?: string;
  /** When true, produce a sheet even when scaled_ingredients is empty
   *  (otherwise strict mode rejects the run). Per-call escape hatch. */
  allowSoftFail?: boolean;
}

export interface GenerateResult {
  sheetId: string;
  beoId: string;
  status: "active";
  generatedAt: string;
  ingredientCount: number;
  taskCount: number;
  warnings: string[];
}

export interface SchedulerTickResult {
  windowStart: string;
  windowEnd: string;
  beosExamined: number;
  sheetsCreated: number;
  sheetsSkipped: number;
  errors: Array<{ beoId: string; error: string }>;
  durationMs: number;
}

interface BEORow {
  id: string;
  org_id: string;
  status: string;
  event_id: string;
  lifecycle_event_id?: string | null;
  content_data?: Record<string, any> | null;
}

interface ScaledIngredientRow {
  id: string;
  ingredient_name: string;
  scaled_quantity: number | null;
  scaled_unit: string | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  recipe_id?: string | null;
  supplier_name?: string | null;
}

interface MaestroTaskRow {
  id: string;
  title: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  assigned_to?: string | null;
}

interface LifecycleEventRow {
  id: string;
  event_date: string;
  start_time: string;
  guest_count: number;
}

// ─── Loaders ─────────────────────────────────────────────────────────────

async function loadBEO(beoId: string): Promise<BEORow | null> {
  const { data, error } = await supabase
    .from("beo_banquet_orders")
    .select("id, org_id, status, event_id, lifecycle_event_id, content_data")
    .eq("id", beoId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as BEORow;
}

async function loadLifecycleEvent(id: string | null | undefined): Promise<LifecycleEventRow | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from("lifecycle_events")
    .select("id, event_date, start_time, guest_count")
    .eq("id", id)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as LifecycleEventRow;
}

async function loadScaledIngredients(beoId: string): Promise<ScaledIngredientRow[]> {
  const { data, error } = await supabase
    .from("scaled_ingredients")
    .select("id, ingredient_name, scaled_quantity, scaled_unit, unit_cost, total_cost, recipe_id, supplier_name")
    .eq("beo_id", beoId);
  if (error) {
    logger.warn("[ProductionSheet] scaled_ingredients load failed", {
      beoId, error: error.message ?? String(error),
    });
    return [];
  }
  return Array.isArray(data) ? (data as ScaledIngredientRow[]) : [];
}

async function loadMaestroTasks(beoId: string, eventId: string): Promise<MaestroTaskRow[]> {
  const { data, error } = await supabase
    .from("maestro_production_tasks")
    .select("id, title, description, start_time, end_time, status, assigned_to, beo_id, event_id")
    .or(`beo_id.eq.${beoId},event_id.eq.${eventId}`);
  if (error) {
    logger.warn("[ProductionSheet] maestro_production_tasks load failed", {
      beoId, error: error.message ?? String(error),
    });
    return [];
  }
  return Array.isArray(data) ? (data as MaestroTaskRow[]) : [];
}

// ─── Single-BEO generator ────────────────────────────────────────────────

export async function generateProductionSheet(input: GenerateInput): Promise<GenerateResult> {
  const beo = await loadBEO(input.beoId);
  if (!beo) {
    throw new Error(`BEO ${input.beoId} not found`);
  }

  const lifecycle = await loadLifecycleEvent(beo.lifecycle_event_id ?? undefined);
  const eventDate = lifecycle?.event_date ?? (beo.content_data?.eventDate as string | undefined);
  if (!eventDate) {
    throw new Error(`BEO ${input.beoId} has no resolvable event_date`);
  }
  const guestCount = Number(lifecycle?.guest_count ?? beo.content_data?.guestCount ?? 0) || 0;
  const startTime = lifecycle?.start_time ?? (beo.content_data?.startTime as string | undefined);
  const fires_at = startTime
    ? new Date(`${eventDate}T${startTime}`).toISOString()
    : new Date(eventDate).toISOString();

  const ingredients = await loadScaledIngredients(input.beoId);
  const tasks = await loadMaestroTasks(input.beoId, beo.event_id);
  const warnings: string[] = [];

  if (ingredients.length === 0) {
    const msg = `no scaled_ingredients on BEO ${input.beoId} — run /scale-recipes first`;
    if (isStrict({ area: "recipe-scale", allowSoftFail: input.allowSoftFail })) {
      throw new StrictModeError("recipe-scale", msg, { beoId: input.beoId });
    }
    warnings.push(msg + " (set RECIPE_CHAIN_STRICT=true to fail loudly)");
  }

  // Supersede any prior active sheet so the partial unique index allows
  // the new insert. Done in two steps because Supabase doesn't expose
  // CTEs through the generic client.
  await supabase
    .from("production_sheets")
    .update({ status: "superseded" })
    .eq("beo_id", input.beoId)
    .eq("status", "active");

  // Build snapshot
  const totalCost = ingredients.reduce(
    (s, i) => s + (typeof i.total_cost === "number" ? i.total_cost : 0),
    0,
  );

  // Sort tasks by start_time so the timeline reads top-to-bottom in
  // service order. Falsy start_times go to the end.
  const timeline = [...tasks]
    .sort((a, b) => {
      const at = a.start_time ?? "";
      const bt = b.start_time ?? "";
      if (!at && !bt) return 0;
      if (!at) return 1;
      if (!bt) return -1;
      return at < bt ? -1 : 1;
    })
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      description: t.description ?? null,
      startTime: t.start_time ?? null,
      endTime: t.end_time ?? null,
      status: t.status ?? "pending",
      assignedTo: t.assigned_to ?? null,
    }));

  const insertResp = await supabase
    .from("production_sheets")
    .insert({
      org_id: beo.org_id,
      beo_id: input.beoId,
      lifecycle_event_id: beo.lifecycle_event_id ?? null,
      status: "active",
      generated_by: input.generatedBy ?? "scheduler",
      trigger: input.trigger ?? "scheduled",
      fires_at,
      event_date: eventDate,
      guest_count: guestCount,
      ingredients,
      tasks,
      timeline,
      warnings,
      totals: {
        ingredientCount: ingredients.length,
        taskCount: tasks.length,
        totalCost: Number(totalCost.toFixed(2)),
        guestCount,
      },
    })
    .select("id, generated_at");

  if (insertResp.error || !Array.isArray(insertResp.data) || !insertResp.data[0]?.id) {
    const msg = insertResp.error?.message ?? "unknown error";
    throw new Error(`Failed to insert production sheet for BEO ${input.beoId}: ${msg}`);
  }
  const sheetId = insertResp.data[0].id;
  const generatedAt = insertResp.data[0].generated_at ?? new Date().toISOString();

  await unifiedEventBus.publish(
    UNIFIED_EVENT_TYPES.PRODUCTION_PLAN_UPDATED,
    {
      orgId: beo.org_id,
      beoId: input.beoId,
      lifecycleEventId: beo.lifecycle_event_id,
      sheetId,
      eventDate,
      firesAt: fires_at,
      ingredientCount: ingredients.length,
      taskCount: tasks.length,
      totalCost: Number(totalCost.toFixed(2)),
      trigger: input.trigger ?? "scheduled",
    },
    { source: { bus: "unified", module: "production_sheet" }, tenantId: beo.org_id },
  );

  logger.info("[ProductionSheet] generated", {
    beoId: input.beoId,
    sheetId,
    eventDate,
    ingredientCount: ingredients.length,
    taskCount: tasks.length,
    trigger: input.trigger ?? "scheduled",
  });

  return {
    sheetId,
    beoId: input.beoId,
    status: "active",
    generatedAt,
    ingredientCount: ingredients.length,
    taskCount: tasks.length,
    warnings,
  };
}

// ─── Scheduler tick ──────────────────────────────────────────────────────

/**
 * One scheduler pass. Walks every lifecycle_event whose event_date is
 * roughly 24h away (window: now+23h … now+25h) and generates a sheet for
 * each linked BEO that doesn't already have an active one.
 */
export async function runProductionSheetTick(): Promise<SchedulerTickResult> {
  const startedAt = Date.now();
  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_AFTER_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + WINDOW_BEFORE_HOURS * 60 * 60 * 1000);

  // event_date is DATE not TIMESTAMPTZ, so range it by date string.
  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  const { data: events, error: evErr } = await supabase
    .from("lifecycle_events")
    .select("id, org_id, event_date, beo_id")
    .gte("event_date", ymd(windowStart))
    .lte("event_date", ymd(windowEnd));

  if (evErr) {
    logger.error("[ProductionSheet] scheduler tick: lifecycle_events fetch failed", {
      error: evErr.message ?? String(evErr),
    });
    await recordRun({
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      beos_examined: 0,
      sheets_created: 0,
      sheets_skipped: 0,
      errors: [{ beoId: "all", error: evErr.message ?? String(evErr) }],
      duration_ms: Date.now() - startedAt,
    });
    return {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      beosExamined: 0,
      sheetsCreated: 0,
      sheetsSkipped: 0,
      errors: [{ beoId: "all", error: evErr.message ?? String(evErr) }],
      durationMs: Date.now() - startedAt,
    };
  }

  const candidateBeoIds: { beoId: string; orgId: string }[] = [];
  for (const ev of (events ?? []) as { beo_id?: string | null; org_id: string }[]) {
    if (ev.beo_id) candidateBeoIds.push({ beoId: ev.beo_id, orgId: ev.org_id });
  }

  // Dedupe — multiple events can point at the same BEO (rare but cheap to handle).
  const seen = new Set<string>();
  const unique = candidateBeoIds.filter((c) => {
    if (seen.has(c.beoId)) return false;
    seen.add(c.beoId);
    return true;
  });

  // Skip BEOs that already have an active sheet.
  const beoIds = unique.map((c) => c.beoId);
  let alreadyHaveSheet = new Set<string>();
  if (beoIds.length > 0) {
    const { data: existing } = await supabase
      .from("production_sheets")
      .select("beo_id")
      .in("beo_id", beoIds)
      .eq("status", "active");
    if (Array.isArray(existing)) {
      for (const r of existing as { beo_id: string }[]) alreadyHaveSheet.add(r.beo_id);
    }
  }

  let sheetsCreated = 0;
  let sheetsSkipped = 0;
  const errors: { beoId: string; error: string }[] = [];

  for (const { beoId } of unique) {
    if (alreadyHaveSheet.has(beoId)) {
      sheetsSkipped += 1;
      continue;
    }
    try {
      await generateProductionSheet({
        beoId,
        trigger: "scheduled",
        generatedBy: "scheduler",
        // Scheduler is permissive — a missing recipes catalog shouldn't
        // crash the tick for the whole org. Per-BEO warnings still surface.
        allowSoftFail: true,
      });
      sheetsCreated += 1;
    } catch (err) {
      errors.push({
        beoId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await recordRun({
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    beos_examined: unique.length,
    sheets_created: sheetsCreated,
    sheets_skipped: sheetsSkipped,
    errors,
    duration_ms: Date.now() - startedAt,
  });

  logger.info("[ProductionSheet] scheduler tick", {
    examined: unique.length,
    created: sheetsCreated,
    skipped: sheetsSkipped,
    errors: errors.length,
    durationMs: Date.now() - startedAt,
  });

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    beosExamined: unique.length,
    sheetsCreated,
    sheetsSkipped,
    errors,
    durationMs: Date.now() - startedAt,
  };
}

async function recordRun(row: Record<string, any>): Promise<void> {
  const { error } = await supabase.from("production_sheet_scheduler_runs").insert(row);
  if (error) {
    logger.warn("[ProductionSheet] scheduler audit row insert failed", {
      error: error.message ?? String(error),
    });
  }
}

// ─── Scheduler lifecycle ─────────────────────────────────────────────────

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the scheduler. Idempotent — calling twice is a no-op. Reads
 * tick cadence from PRODUCTION_SHEET_TICK_MS (default 10 minutes).
 * Set PRODUCTION_SHEET_SCHEDULER=off to disable entirely (useful in
 * test runners and CI).
 */
export function startProductionSheetScheduler(): void {
  if (schedulerTimer) return;
  if ((process.env.PRODUCTION_SHEET_SCHEDULER || "").toLowerCase() === "off") {
    logger.info("[ProductionSheet] scheduler disabled by env (PRODUCTION_SHEET_SCHEDULER=off)");
    return;
  }
  const tickMs = Number(process.env.PRODUCTION_SHEET_TICK_MS) || DEFAULT_TICK_MS;
  // Fire one tick immediately so a freshly-booted server doesn't wait
  // tickMs minutes before generating today's sheets.
  void runProductionSheetTick().catch((err) => {
    logger.error("[ProductionSheet] initial tick failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
  schedulerTimer = setInterval(() => {
    void runProductionSheetTick().catch((err) => {
      logger.error("[ProductionSheet] scheduled tick failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, tickMs);
  logger.info("[ProductionSheet] scheduler started", { tickMs });
}

/** Stop the scheduler. Mainly for tests. */
export function stopProductionSheetScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

// ─── Read accessor ───────────────────────────────────────────────────────

export async function getActiveProductionSheet(beoId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("production_sheets")
    .select("*")
    .eq("beo_id", beoId)
    .eq("status", "active")
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

export async function listRecentSchedulerRuns(limit = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from("production_sheet_scheduler_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, limit)));
  if (error) return [];
  return Array.isArray(data) ? data : [];
}
