/**
 * Calendar Fan-out Service (A7)
 *
 * The single point that owns calendar_events writes for the prospect-to-
 * plate chain. Every other module signals via the unified event bus;
 * this service subscribes and upserts the calendar row.
 *
 *   prospect → event → BEO → recipes → POs → production sheet → layout
 *                              ↘                    ↘             ↘
 *                                  CALENDAR_EVENT_UPDATED bus signals
 *                                                      ↘
 *                                       this service writes to calendar_events
 *
 * Why centralized: before A7 each module updated calendar inconsistently
 * (or not at all). The kitchen would generate a production sheet but the
 * calendar didn't show it; layout would auto-design but the calendar
 * didn't show "layout pending approval"; the chef looking at the global
 * view missed exactly the transitions that matter most. A single
 * subscriber means there's exactly one place to read or fix calendar
 * behavior.
 *
 * Idempotency: the unique partial index on calendar_events
 * (lifecycle_event_id) WHERE NOT NULL ensures at most one calendar row
 * per lifecycle event. Repeated sync calls for the same lifecycle_event
 * UPDATE rather than INSERT.
 */

import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from "../lib/unified-event-bus";
import { getEventLifecycleStore } from "./event-lifecycle-store";
import type { EventRecord } from "./event-lifecycle-engine";

export interface SyncOptions {
  trigger?: string;
  /** Resolve the lifecycle event by id from the store before syncing. */
  fetch?: boolean;
}

export interface SyncResult {
  lifecycleEventId: string;
  calendarEventId?: string;
  action: "insert" | "update" | "noop" | "error";
  fieldsChanged: string[];
  error?: string;
}

interface ExistingCalendarRow {
  id: string;
  org_id: string;
  title: string | null;
  start_time: string | null;
  end_time: string | null;
  date: string | null;
  guest_count: number | null;
  beo_id: string | null;
  prospect_id: string | null;
  layout_id: string | null;
  production_sheet_id: string | null;
  lifecycle_stage: string | null;
  status: string | null;
}

function deriveCalendarStatusFromStage(stage: string): string {
  // Map lifecycle stage → calendar's status enum (pending/confirmed/locked/cancelled).
  if (!stage) return "pending";
  if (stage === "cancelled") return "cancelled";
  if (stage === "on_hold") return "pending";
  if (
    stage === "deposit_received" ||
    stage === "beo_approved" ||
    stage === "labor_scheduled" ||
    stage === "inventory_ordered" ||
    stage === "inventory_received" ||
    stage === "production_scheduled" ||
    stage === "prep_started" ||
    stage === "setup_started" ||
    stage === "event_in_progress"
  ) {
    return "confirmed";
  }
  if (
    stage === "event_completed" ||
    stage === "post_event_review" ||
    stage === "final_invoice_sent" ||
    stage === "payment_received" ||
    stage === "closed"
  ) {
    return "locked";
  }
  return "pending";
}

function buildCalendarPayload(event: EventRecord): Record<string, any> {
  // calendar_events.start_time / end_time are TIMESTAMPTZ; engine carries
  // event_date (DATE) + start_time/end_time (TIME). Compose to ISO.
  const date = event.eventDate;
  const start = event.startTime?.includes("T")
    ? event.startTime
    : `${date}T${event.startTime || "00:00"}`;
  const end = event.endTime?.includes("T")
    ? event.endTime
    : `${date}T${event.endTime || event.startTime || "00:00"}`;

  return {
    org_id: event.orgId,
    outlet_id: event.outletId,
    title: event.name,
    description: event.notes ?? "",
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    date,
    guest_count: event.guestCount,
    department: null,
    status: deriveCalendarStatusFromStage(event.status),
    severity: "normal",
    created_by: event.createdBy,
    notes: event.notes ?? "",
    beo_id: event.beoId ?? null,
    prospect_id: event.prospectId ?? null,
    layout_id: event.layoutId ?? null,
    production_sheet_id: null, // populated separately when production sheet emits
    lifecycle_event_id: event.id,
    lifecycle_stage: event.status,
    metadata: {
      menuSelectionsCount: Array.isArray(event.menuSelections)
        ? event.menuSelections.length
        : 0,
      paymentsCount: Array.isArray(event.payments) ? event.payments.length : 0,
      tags: event.tags ?? [],
    },
  };
}

function diffPayload(existing: ExistingCalendarRow, payload: Record<string, any>): string[] {
  const changed: string[] = [];
  const compare: Array<keyof ExistingCalendarRow> = [
    "title",
    "start_time",
    "end_time",
    "date",
    "guest_count",
    "beo_id",
    "prospect_id",
    "layout_id",
    "production_sheet_id",
    "lifecycle_stage",
    "status",
  ];
  for (const key of compare) {
    const existingVal = existing[key];
    const newVal = (payload as any)[key];
    // Compare ISO strings as Date-equiv to avoid millisecond drift.
    if (key === "start_time" || key === "end_time") {
      const a = existingVal ? new Date(existingVal as string).getTime() : null;
      const b = newVal ? new Date(newVal as string).getTime() : null;
      if (a !== b) changed.push(key as string);
      continue;
    }
    if (existingVal !== newVal) changed.push(key as string);
  }
  return changed;
}

async function loadExisting(lifecycleEventId: string): Promise<ExistingCalendarRow | null> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id, org_id, title, start_time, end_time, date, guest_count, beo_id, prospect_id, layout_id, production_sheet_id, lifecycle_stage, status",
    )
    .eq("lifecycle_event_id", lifecycleEventId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as ExistingCalendarRow;
}

async function recordEmission(row: {
  org_id: string | null;
  lifecycle_event_id: string;
  calendar_event_id: string | null;
  trigger: string;
  action: "insert" | "update" | "noop" | "error";
  fields_changed: string[];
  error_message: string | null;
}): Promise<void> {
  const { error } = await supabase.from("calendar_fanout_emissions").insert(row);
  if (error) {
    logger.warn("[CalendarFanout] audit insert failed", {
      error: error.message ?? String(error),
    });
  }
}

export async function syncCalendarFromLifecycle(
  eventOrId: EventRecord | string,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  let event: EventRecord | undefined;
  if (typeof eventOrId === "string") {
    if (opts.fetch !== false) {
      event = await getEventLifecycleStore().get(eventOrId);
    }
  } else {
    event = eventOrId;
  }

  if (!event) {
    const id = typeof eventOrId === "string" ? eventOrId : "unknown";
    logger.warn("[CalendarFanout] sync skipped — lifecycle event not found", { id });
    return {
      lifecycleEventId: id,
      action: "error",
      fieldsChanged: [],
      error: "lifecycle event not found",
    };
  }

  try {
    const existing = await loadExisting(event.id);
    const payload = buildCalendarPayload(event);

    if (!existing) {
      const insertResp = await supabase
        .from("calendar_events")
        .insert(payload)
        .select("id");
      const calendarEventId =
        Array.isArray(insertResp.data) && insertResp.data[0]?.id
          ? insertResp.data[0].id
          : undefined;
      if (insertResp.error) {
        const msg = insertResp.error.message ?? String(insertResp.error);
        await recordEmission({
          org_id: event.orgId,
          lifecycle_event_id: event.id,
          calendar_event_id: null,
          trigger: opts.trigger ?? "manual",
          action: "error",
          fields_changed: [],
          error_message: msg,
        });
        return { lifecycleEventId: event.id, action: "error", fieldsChanged: [], error: msg };
      }
      await recordEmission({
        org_id: event.orgId,
        lifecycle_event_id: event.id,
        calendar_event_id: calendarEventId ?? null,
        trigger: opts.trigger ?? "manual",
        action: "insert",
        fields_changed: Object.keys(payload),
        error_message: null,
      });
      logger.info("[CalendarFanout] inserted", { lifecycleEventId: event.id, calendarEventId });
      return {
        lifecycleEventId: event.id,
        calendarEventId,
        action: "insert",
        fieldsChanged: Object.keys(payload),
      };
    }

    const fieldsChanged = diffPayload(existing, payload);
    if (fieldsChanged.length === 0) {
      await recordEmission({
        org_id: event.orgId,
        lifecycle_event_id: event.id,
        calendar_event_id: existing.id,
        trigger: opts.trigger ?? "manual",
        action: "noop",
        fields_changed: [],
        error_message: null,
      });
      return {
        lifecycleEventId: event.id,
        calendarEventId: existing.id,
        action: "noop",
        fieldsChanged: [],
      };
    }

    const { error: updErr } = await supabase
      .from("calendar_events")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updErr) {
      const msg = updErr.message ?? String(updErr);
      await recordEmission({
        org_id: event.orgId,
        lifecycle_event_id: event.id,
        calendar_event_id: existing.id,
        trigger: opts.trigger ?? "manual",
        action: "error",
        fields_changed: [],
        error_message: msg,
      });
      return { lifecycleEventId: event.id, action: "error", fieldsChanged: [], error: msg };
    }
    await recordEmission({
      org_id: event.orgId,
      lifecycle_event_id: event.id,
      calendar_event_id: existing.id,
      trigger: opts.trigger ?? "manual",
      action: "update",
      fields_changed: fieldsChanged,
      error_message: null,
    });
    logger.info("[CalendarFanout] updated", {
      lifecycleEventId: event.id,
      calendarEventId: existing.id,
      fieldsChanged,
    });
    return {
      lifecycleEventId: event.id,
      calendarEventId: existing.id,
      action: "update",
      fieldsChanged,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[CalendarFanout] sync threw", { lifecycleEventId: event.id, error: msg });
    await recordEmission({
      org_id: event.orgId,
      lifecycle_event_id: event.id,
      calendar_event_id: null,
      trigger: opts.trigger ?? "manual",
      action: "error",
      fields_changed: [],
      error_message: msg,
    });
    return { lifecycleEventId: event.id, action: "error", fieldsChanged: [], error: msg };
  }
}

/**
 * Side-channel: production sheet generation doesn't go through the
 * lifecycle engine, so we expose a direct hook. Stamps
 * production_sheet_id on the calendar row so the global view shows
 * "production sheet ready" without needing to look anywhere else.
 */
export async function stampProductionSheetOnCalendar(args: {
  lifecycleEventId: string;
  productionSheetId: string;
  trigger?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .update({ production_sheet_id: args.productionSheetId, updated_at: new Date().toISOString() })
    .eq("lifecycle_event_id", args.lifecycleEventId);
  if (error) {
    logger.warn("[CalendarFanout] production sheet stamp failed", {
      error: error.message ?? String(error),
    });
    return;
  }
  await recordEmission({
    org_id: null,
    lifecycle_event_id: args.lifecycleEventId,
    calendar_event_id: null,
    trigger: args.trigger ?? "production_sheet",
    action: "update",
    fields_changed: ["production_sheet_id"],
    error_message: null,
  });
}

// ─── Bus subscription ────────────────────────────────────────────────────

let subscribed = false;

export function startCalendarFanoutSubscription(): void {
  if (subscribed) return;
  if ((process.env.CALENDAR_FANOUT || "").toLowerCase() === "off") {
    logger.info("[CalendarFanout] disabled by env (CALENDAR_FANOUT=off)");
    return;
  }

  // Lifecycle-engine signals that always carry an eventId.
  const lifecycleEventTypes = [
    UNIFIED_EVENT_TYPES.CALENDAR_EVENT_CREATED,
    UNIFIED_EVENT_TYPES.CALENDAR_EVENT_UPDATED,
    UNIFIED_EVENT_TYPES.CALENDAR_EVENT_DELETED,
    UNIFIED_EVENT_TYPES.BEO_CREATED,
    UNIFIED_EVENT_TYPES.BEO_APPROVED,
    UNIFIED_EVENT_TYPES.BEO_UPDATED,
  ];

  for (const t of lifecycleEventTypes) {
    unifiedEventBus.subscribe(t, async (msg: any) => {
      const lifecycleEventId =
        msg?.payload?.lifecycleEventId ??
        msg?.payload?.eventId; // BEO events often use eventId for the lifecycle id
      if (!lifecycleEventId) return;
      try {
        await syncCalendarFromLifecycle(lifecycleEventId, { trigger: t, fetch: true });
      } catch (err) {
        logger.error("[CalendarFanout] subscriber sync failed", {
          trigger: t,
          lifecycleEventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  // Side-channel: production sheets stamp via stampProductionSheetOnCalendar.
  unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.PRODUCTION_PLAN_UPDATED, async (msg: any) => {
    const payload = msg?.payload ?? {};
    if (!payload.lifecycleEventId) return;

    if (payload.sheetId) {
      await stampProductionSheetOnCalendar({
        lifecycleEventId: payload.lifecycleEventId,
        productionSheetId: payload.sheetId,
        trigger: "production_plan_updated",
      });
    }
    // Layout designs also flow through PRODUCTION_PLAN_UPDATED with stage='layout-*'.
    // Re-sync the calendar row so layout_id is current.
    if (payload.designId || payload.stage?.startsWith("layout-")) {
      try {
        await syncCalendarFromLifecycle(payload.lifecycleEventId, {
          trigger: "production_plan_updated",
          fetch: true,
        });
      } catch (err) {
        logger.warn("[CalendarFanout] layout-driven sync failed", {
          lifecycleEventId: payload.lifecycleEventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });

  subscribed = true;
  logger.info("[CalendarFanout] subscription started");
}

export function stopCalendarFanoutSubscription(): void {
  // unifiedEventBus.subscribe doesn't return an unsubscribe handle in
  // this codebase, so toggling the env at runtime is the supported path.
  subscribed = false;
}

// ─── Read accessors ──────────────────────────────────────────────────────

export async function listRecentEmissions(orgId: string | null, limit = 50): Promise<any[]> {
  let q = supabase.from("calendar_fanout_emissions").select("*");
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q.order("emitted_at", { ascending: false }).limit(Math.max(1, Math.min(200, limit)));
  if (error) return [];
  return Array.isArray(data) ? data : [];
}
