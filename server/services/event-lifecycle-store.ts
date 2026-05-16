/**
 * Event Lifecycle Store (A1)
 *
 * Durable persistence for EventRecord. Replaces the in-process Map that
 * lived in event-lifecycle-engine.ts and lost every event on server restart.
 *
 * Uses the same Supabase wrapper the rest of the routes use
 * (server/lib/supabase.ts), which transparently falls back to an in-memory
 * shim when Supabase credentials are not configured. So this store is real
 * in production (Postgres via Supabase) and real in dev (in-memory shim
 * with the same query API), without conditional code in callers.
 *
 * The store handles row ⇄ EventRecord serialization. Row column shape
 * matches migration 070_lifecycle_events.sql exactly.
 */

import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";
import type { EventRecord, EventLifecycleStage } from "./event-lifecycle-engine";

const TABLE = "lifecycle_events";

type Row = Record<string, any>;

function toRow(event: EventRecord): Row {
  return {
    id: event.id,
    org_id: event.orgId,
    outlet_id: event.outletId,
    name: event.name,
    event_type: event.type,
    status: event.status,
    client_id: event.clientId,
    client_name: event.clientName,
    client_email: event.clientEmail,
    client_phone: event.clientPhone ?? null,
    client_company: event.clientCompany ?? null,
    event_date: event.eventDate,
    start_time: event.startTime,
    end_time: event.endTime,
    guest_count: event.guestCount,
    guaranteed_count: event.guaranteedCount ?? null,
    space_ids: event.spaceIds ?? [],
    layout_id: event.layoutId ?? null,
    beo_id: event.beoId ?? null,
    prospect_id: event.prospectId ?? null,
    menu_selections: event.menuSelections ?? [],
    pricing: event.pricing ?? {},
    payments: event.payments ?? [],
    cost_tracking: event.costTracking ?? {},
    labor_allocation: event.laborAllocation ?? {},
    timeline: event.timeline ?? [],
    documents: event.documents ?? [],
    assigned_to: event.assignedTo ?? [],
    tags: event.tags ?? [],
    notes: event.notes ?? "",
    created_at: event.createdAt,
    updated_at: event.updatedAt,
    created_by: event.createdBy,
  };
}

function fromRow(row: Row): EventRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    outletId: row.outlet_id,
    name: row.name,
    type: row.event_type,
    status: row.status as EventLifecycleStage,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone ?? undefined,
    clientCompany: row.client_company ?? undefined,
    eventDate: typeof row.event_date === "string" ? row.event_date : new Date(row.event_date).toISOString().slice(0, 10),
    startTime: row.start_time,
    endTime: row.end_time,
    guestCount: Number(row.guest_count) || 0,
    guaranteedCount: row.guaranteed_count == null ? undefined : Number(row.guaranteed_count),
    spaceIds: Array.isArray(row.space_ids) ? row.space_ids : [],
    layoutId: row.layout_id ?? undefined,
    beoId: row.beo_id ?? undefined,
    prospectId: row.prospect_id ?? undefined,
    menuSelections: Array.isArray(row.menu_selections) ? row.menu_selections : [],
    pricing: row.pricing ?? {},
    payments: Array.isArray(row.payments) ? row.payments : [],
    costTracking: row.cost_tracking ?? {},
    laborAllocation: row.labor_allocation ?? {},
    timeline: Array.isArray(row.timeline) ? row.timeline : [],
    documents: Array.isArray(row.documents) ? row.documents : [],
    assignedTo: Array.isArray(row.assigned_to) ? row.assigned_to : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export class EventLifecycleStore {
  /** Upsert (insert or update) by id. */
  async save(event: EventRecord): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      logger.warn("[EventLifecycleStore] Supabase unavailable; event not persisted", { id: event.id });
      return;
    }
    const { error } = await supabase
      .from(TABLE)
      .upsert(toRow(event), { onConflict: "id" });
    if (error) {
      logger.error("[EventLifecycleStore] save failed", { id: event.id, error: error.message ?? String(error) });
    }
  }

  /** Return one event by id, or undefined if not found. */
  async get(id: string): Promise<EventRecord | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .limit(1);
    if (error) {
      logger.error("[EventLifecycleStore] get failed", { id, error: error.message ?? String(error) });
      return undefined;
    }
    if (!Array.isArray(data) || data.length === 0) return undefined;
    return fromRow(data[0]);
  }

  /** Return all events for an org. Used to hydrate the engine's cache on boot. */
  async listByOrg(orgId: string): Promise<EventRecord[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(TABLE).select("*").eq("org_id", orgId);
    if (error) {
      logger.error("[EventLifecycleStore] listByOrg failed", { orgId, error: error.message ?? String(error) });
      return [];
    }
    return Array.isArray(data) ? data.map(fromRow) : [];
  }

  /** Hydrate the engine cache: returns ALL events across orgs. */
  async listAll(): Promise<EventRecord[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from(TABLE).select("*");
    if (error) {
      logger.error("[EventLifecycleStore] listAll failed", { error: error.message ?? String(error) });
      return [];
    }
    return Array.isArray(data) ? data.map(fromRow) : [];
  }

  /** Delete by id. (Lifecycle currently never deletes — kept for completeness.) */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      logger.error("[EventLifecycleStore] delete failed", { id, error: error.message ?? String(error) });
    }
  }
}

let _instance: EventLifecycleStore | null = null;
export function getEventLifecycleStore(): EventLifecycleStore {
  if (!_instance) _instance = new EventLifecycleStore();
  return _instance;
}
