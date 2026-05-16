import type { GroupBooking } from "@/../shared/types/group";
import type { CalendarEvent } from "@/../shared/types/calendar";
import type {
  GroupIntelligenceSnapshot,
  GroupEventRef,
  GroupDayKey,
  GroupPurchaseLine,
  GroupLaborLine,
} from "@/../shared/types/group-intelligence";

import { listGroups } from "@/lib/group-store";
import { listBeosByEvent } from "@/lib/beo-store";
import { getProductionSheetsForBeo } from "@/lib/production-store";
import { rollupIngredients } from "@/lib/ingredient-rollup";
import { computePurchaseDeltas } from "@/lib/purchase-delta";
import { optimizePurchasePlan } from "@/lib/purchase-optimizer";
import { estimateLabor } from "@/lib/labor-estimator";

/**
 * Convert ISO timestamp to YYYY-MM-DD
 */
function toDayKey(isoString: string): GroupDayKey {
  return isoString.split("T")[0];
}

/**
 * Generate consolidated intelligence snapshot for a group
 * Aggregates all events, BEOs, production, purchasing, and labor across the entire stay/booking
 *
 * Returns null if group not found
 */
export function generateGroupIntelligence(
  groupId: string,
  events: CalendarEvent[],
): GroupIntelligenceSnapshot | null {
  const group = listGroups().find((g) => g.groupId === groupId);
  if (!group) return null;

  // Filter events to only those in this group
  const groupEvents = events.filter((e) => e.groupId === groupId);
  if (groupEvents.length === 0) {
    return {
      groupId: group.groupId,
      groupName: group.groupName,
      generatedAt: new Date().toISOString(),
      events: [],
      purchasePlan: { totalCost: 0, lines: [] },
      laborPlan: { totalHours: 0, totalStaff: 0, lines: [] },
    };
  }

  // Build event references and collect production sheets
  const eventRefs: GroupEventRef[] = [];
  const allSheets: any[] = [];

  for (const event of groupEvents) {
    // Get latest BEO for this event
    const beos = listBeosByEvent(event.id);
    const latestBeo = beos.length > 0 ? beos[0] : null;

    const eventRef: GroupEventRef = {
      eventId: event.id,
      title: event.title,
      date: toDayKey(event.start_time),
      outletName: event.outlet_name ?? null,
      room: event.location_room ?? null,
      beoId: latestBeo?.beoId ?? null,
      revision: latestBeo?.revisionNumber ?? null,
      counts: {
        exp: event.expected ?? 0,
        gtd: event.guaranteed ?? 0,
        set: event.set ?? 0,
      },
    };

    eventRefs.push(eventRef);

    // Gather production sheets for this BEO
    if (latestBeo) {
      const sheets = getProductionSheetsForBeo(latestBeo.beoId);
      sheets.forEach((sheet) => {
        allSheets.push({
          ...sheet,
          __day: eventRef.date,
          __eventId: event.id,
        });
      });
    }
  }

  // ============================================
  // 1. PURCHASING ROLLUP (recipe-aware)
  // ============================================

  const ingredientReqs = rollupIngredients(allSheets);

  // v1: empty inventory
  const deltas = computePurchaseDeltas(ingredientReqs, {}, {});
  const optimized = optimizePurchasePlan(deltas);

  const purchaseLines: GroupPurchaseLine[] = deltas.map((delta) => {
    const opt = optimized.find((o) => o.ingredientId === delta.ingredientId);

    return {
      ingredientId: delta.ingredientId,
      ingredientName: delta.ingredientName,
      unit: delta.unit,
      requiredQuantity: delta.requiredQuantity,
      toOrderQuantity: delta.toOrder,
      optimized: opt
        ? {
            vendorName: opt.vendorName || "Unknown",
            packsToOrder: opt.packsToOrder || 0,
            packSize: opt.packSize || 0,
            packUnit: opt.packUnit || opt.unit || "",
            totalQuantity: opt.totalQuantity || 0,
            totalCost: opt.totalCost || 0,
          }
        : null,
      sources:
        (delta.sources as any[])?.map((s) => ({
          beoId: s.beoId,
          station: s.station,
          day: s.day ?? "unknown",
        })) ?? [],
    };
  });

  const totalPurchaseCost = purchaseLines.reduce(
    (sum, line) => sum + (line.optimized?.totalCost ?? 0),
    0,
  );

  // ============================================
  // 2. LABOR ROLLUP (by station/day)
  // ============================================

  const laborReqs = estimateLabor(allSheets);

  // Group labor by station + day
  const laborByKey = new Map<string, GroupLaborLine>();

  for (const req of laborReqs) {
    const sheet = allSheets.find(
      (s) => s.productionId === req.derivedFrom?.productionId,
    );
    const day = sheet?.__day ?? "unknown";
    const key = `${req.station}:${day}`;

    if (!laborByKey.has(key)) {
      laborByKey.set(key, {
        station: req.station,
        day,
        requiredStaff: req.requiredStaff,
        requiredHours: req.estimatedHours,
        deltaStaff: req.requiredStaff, // v1: scheduled = 0
        deltaHours: req.estimatedHours,
        sources: [],
      });
    } else {
      const existing = laborByKey.get(key)!;
      // Aggregate requirements (take max for staff per day, sum hours)
      existing.requiredStaff = Math.max(
        existing.requiredStaff,
        req.requiredStaff,
      );
      existing.requiredHours += req.estimatedHours;
      existing.deltaStaff = existing.requiredStaff;
      existing.deltaHours = existing.requiredHours;
    }

    // Track sources
    if (req.derivedFrom) {
      const beoId = req.derivedFrom.beoId;
      const line = laborByKey.get(key)!;
      if (!line.sources.find((s) => s.beoId === beoId && s.day === day)) {
        line.sources.push({ beoId, day });
      }
    }
  }

  const laborLines = Array.from(laborByKey.values());
  const totalLaborHours = laborLines.reduce(
    (sum, l) => sum + l.requiredHours,
    0,
  );
  const peakStaff = Math.max(0, ...laborLines.map((l) => l.requiredStaff));

  return {
    groupId: group.groupId,
    groupName: group.groupName,
    generatedAt: new Date().toISOString(),
    events: eventRefs,
    purchasePlan: {
      totalCost: totalPurchaseCost,
      lines: purchaseLines,
    },
    laborPlan: {
      totalHours: totalLaborHours,
      totalStaff: peakStaff,
      lines: laborLines,
    },
  };
}
