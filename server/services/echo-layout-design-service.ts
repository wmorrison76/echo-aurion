/**
 * EchoLayout Design Service (A6)
 *
 * Reads a BEO + its lifecycle event + assigned room and produces a draft
 * layout via the deterministic algorithm in echo-layout/algorithm.ts.
 * The draft enters human approval flow (status = pending_approval). The
 * chef approves or rejects via the route surface; on approve, the
 * lifecycle_events.layout_id back-pointer is written so the rest of the
 * platform can find the official layout for the BEO.
 *
 * Auto-design from BEO is wired into EventLifecycleEngine's BEO_APPROVED
 * hook with soft-fail: a layout failure should never block the rest of
 * the chain (recipes scaling, PO consolidation). The chef can re-run via
 * POST /api/echolayout/design-from-beo at any time.
 */

import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from "../lib/unified-event-bus";
import { isStrict, StrictModeError } from "../lib/strict-mode";
import { designLayout, type LayoutStyle, type RoomSpec, type LayoutConstraints, type LayoutResult } from "./echo-layout/algorithm";

export interface DesignFromBEOInput {
  beoId: string;
  /** Override BEO-stored style. Defaults to BEO content_data.layoutStyle, then 'banquet'. */
  style?: LayoutStyle;
  /** Override BEO-assigned room. Defaults to BEO content_data.roomId. */
  roomId?: string;
  /** Override BEO-stored guest count. */
  guestCountOverride?: number;
  constraints?: LayoutConstraints;
  generatedBy?: string;
  /** Per-call escape hatch for strict mode. */
  allowSoftFail?: boolean;
}

export interface DesignResult {
  designId: string;
  beoId: string;
  status: "pending_approval";
  style: LayoutStyle;
  totals: LayoutResult["totals"];
  warnings: string[];
}

interface BEORow {
  id: string;
  org_id: string;
  status: string;
  event_id: string;
  lifecycle_event_id?: string | null;
  content_data?: Record<string, any> | null;
}

interface RoomRow {
  id: string;
  name: string;
  capacity: number;
  features?: any;
  width_ft?: number | null;
  length_ft?: number | null;
}

async function loadBEO(beoId: string): Promise<BEORow | null> {
  const { data, error } = await supabase
    .from("beo_banquet_orders")
    .select("id, org_id, status, event_id, lifecycle_event_id, content_data")
    .eq("id", beoId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as BEORow;
}

async function loadRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, capacity, features, width_ft, length_ft")
    .eq("id", roomId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as RoomRow;
}

function inferRoomSpec(room: RoomRow | null, beo: BEORow): RoomSpec {
  // Real room dimensions if we have them, otherwise a sensible default
  // sized to the capacity. 12 sq ft per guest is the industry baseline
  // for banquet seated.
  if (room && room.length_ft && room.width_ft) {
    return {
      length: Number(room.length_ft),
      width: Number(room.width_ft),
      units: "ft",
      capacity: room.capacity,
      hasStage: !!room.features?.stage,
      hasBar: !!room.features?.bar,
      hasDanceFloor: !!room.features?.dance_floor,
    };
  }
  const capacity = room?.capacity ?? Number(beo.content_data?.guestCount) ?? 100;
  // Default footprint: square-ish, 12 sq ft per guest seated.
  const totalArea = capacity * 12;
  const sideLength = Math.ceil(Math.sqrt(totalArea));
  return {
    length: sideLength,
    width: Math.ceil(sideLength * 1.2),
    units: "ft",
    capacity,
    hasStage: false,
    hasBar: false,
    hasDanceFloor: false,
  };
}

function resolveStyle(input: DesignFromBEOInput, beo: BEORow): LayoutStyle {
  if (input.style) return input.style;
  const fromBEO = beo.content_data?.layoutStyle;
  if (typeof fromBEO === "string") {
    const norm = fromBEO.toLowerCase().replace(/[^a-z]/g, "_");
    if (["banquet", "theatre", "classroom", "cocktail", "u_shape"].includes(norm)) {
      return norm as LayoutStyle;
    }
  }
  return "banquet";
}

function resolveGuestCount(input: DesignFromBEOInput, beo: BEORow): number {
  if (input.guestCountOverride && input.guestCountOverride > 0) return input.guestCountOverride;
  return Number(beo.content_data?.guestCount) || 0;
}

export async function designLayoutFromBEO(input: DesignFromBEOInput): Promise<DesignResult> {
  const beo = await loadBEO(input.beoId);
  if (!beo) throw new Error(`BEO ${input.beoId} not found`);

  const guestCount = resolveGuestCount(input, beo);
  if (guestCount === 0) {
    const msg = `BEO ${input.beoId} has no guest count`;
    if (isStrict({ area: "general", allowSoftFail: input.allowSoftFail })) {
      throw new StrictModeError("general", msg, { beoId: input.beoId });
    }
    logger.warn(`[EchoLayout] ${msg} — design proceeds with empty seating`);
  }

  const style = resolveStyle(input, beo);
  const roomId = input.roomId ?? (beo.content_data?.roomId as string | undefined);
  const room = roomId ? await loadRoom(roomId) : null;
  const roomSpec = inferRoomSpec(room, beo);

  const layout = designLayout({
    guestCount,
    style,
    room: roomSpec,
    constraints: input.constraints,
  });

  // Supersede prior live design before insert (partial unique index
  // prevents two live rows per BEO).
  await supabase
    .from("layout_designs")
    .update({ status: "superseded" })
    .eq("beo_id", input.beoId)
    .in("status", ["pending_approval", "approved"]);

  const insertResp = await supabase
    .from("layout_designs")
    .insert({
      org_id: beo.org_id,
      beo_id: input.beoId,
      lifecycle_event_id: beo.lifecycle_event_id ?? null,
      room_id: roomId ?? null,
      style,
      status: "pending_approval",
      guest_count: guestCount,
      room_spec: roomSpec,
      constraints: input.constraints ?? {},
      tables: layout.tables,
      fixtures: layout.fixtures,
      aisles: layout.aisles,
      totals: layout.totals,
      warnings: layout.warnings,
      generated_by: input.generatedBy ?? "echolayout",
    })
    .select("id");

  if (insertResp.error || !Array.isArray(insertResp.data) || !insertResp.data[0]?.id) {
    const msg = insertResp.error?.message ?? "unknown error";
    throw new Error(`Failed to persist layout design for BEO ${input.beoId}: ${msg}`);
  }
  const designId = insertResp.data[0].id;

  await unifiedEventBus.publish(
    UNIFIED_EVENT_TYPES.PRODUCTION_PLAN_UPDATED,
    {
      orgId: beo.org_id,
      beoId: input.beoId,
      lifecycleEventId: beo.lifecycle_event_id,
      designId,
      style,
      stage: "layout-pending-approval",
      guestCount,
      tableCount: layout.totals.tableCount,
    },
    { source: { bus: "unified", module: "echo_layout" }, tenantId: beo.org_id },
  );

  logger.info("[EchoLayout] design generated", {
    beoId: input.beoId,
    designId,
    style,
    guestCount,
    tableCount: layout.totals.tableCount,
    warnings: layout.warnings.length,
  });

  return {
    designId,
    beoId: input.beoId,
    status: "pending_approval",
    style,
    totals: layout.totals,
    warnings: layout.warnings,
  };
}

export async function approveLayoutDesign(
  designId: string,
  opts: { approvedBy?: string; edited?: boolean; tables?: any; fixtures?: any; aisles?: any },
): Promise<{ designId: string; status: "approved"; layoutId: string }> {
  const { data: rows, error: loadErr } = await supabase
    .from("layout_designs")
    .select("*")
    .eq("id", designId)
    .limit(1);
  if (loadErr || !Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Layout design ${designId} not found`);
  }
  const design = rows[0] as any;
  if (design.status === "approved") {
    return { designId, status: "approved", layoutId: design.id };
  }
  if (design.status !== "pending_approval") {
    throw new Error(`Design ${designId} cannot be approved from status '${design.status}'`);
  }

  const updatePayload: Record<string, any> = {
    status: "approved",
    approved_by: opts.approvedBy ?? null,
    approved_at: new Date().toISOString(),
  };
  if (opts.edited === true || opts.tables || opts.fixtures || opts.aisles) {
    updatePayload.edited = true;
    if (opts.tables) updatePayload.tables = opts.tables;
    if (opts.fixtures) updatePayload.fixtures = opts.fixtures;
    if (opts.aisles) updatePayload.aisles = opts.aisles;
  }

  const { error: updErr } = await supabase
    .from("layout_designs")
    .update(updatePayload)
    .eq("id", designId);
  if (updErr) throw new Error(`Failed to approve design ${designId}: ${updErr.message ?? String(updErr)}`);

  // Write the layout id back to the lifecycle_event so other modules
  // can read the official layout for this BEO.
  if (design.lifecycle_event_id) {
    await supabase
      .from("lifecycle_events")
      .update({ layout_id: designId })
      .eq("id", design.lifecycle_event_id);
  }

  await unifiedEventBus.publish(
    UNIFIED_EVENT_TYPES.PRODUCTION_PLAN_UPDATED,
    {
      orgId: design.org_id,
      beoId: design.beo_id,
      lifecycleEventId: design.lifecycle_event_id,
      designId,
      stage: "layout-approved",
      style: design.style,
    },
    { source: { bus: "unified", module: "echo_layout" }, tenantId: design.org_id },
  );

  logger.info("[EchoLayout] design approved", { designId, beoId: design.beo_id });
  return { designId, status: "approved", layoutId: designId };
}

export async function rejectLayoutDesign(
  designId: string,
  opts: { rejectedBy?: string; reason?: string },
): Promise<{ designId: string; status: "rejected" }> {
  const { error } = await supabase
    .from("layout_designs")
    .update({
      status: "rejected",
      rejected_by: opts.rejectedBy ?? null,
      rejected_at: new Date().toISOString(),
      rejected_reason: opts.reason ?? null,
    })
    .eq("id", designId)
    .in("status", ["pending_approval"]);
  if (error) throw new Error(`Failed to reject design ${designId}: ${error.message ?? String(error)}`);
  logger.info("[EchoLayout] design rejected", { designId, reason: opts.reason });
  return { designId, status: "rejected" };
}

export async function getActiveDesignForBEO(beoId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("layout_designs")
    .select("*")
    .eq("beo_id", beoId)
    .in("status", ["pending_approval", "approved"])
    .order("generated_at", { ascending: false })
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

export async function getDesignById(designId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("layout_designs")
    .select("*")
    .eq("id", designId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0];
}
