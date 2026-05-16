/**
 * Genesis C — Procurement Planner (v1)
 * - Subtracts unified inventory snapshot from ingredient needs
 * - Uses existing vendor pack optimizer to assign vendor/packs/cost
 * - Groups resulting lines into vendor orders by next valid delivery day
 */

import type {
  IngredientNeed,
  ProcurementOrder,
  ProcurementOrderLine,
  ProcurementPlan,
  VendorDeliveryCalendar,
} from "@/../shared/types/procurement";

import type { IngredientRequirement } from "@/../shared/types/purchasing";

import { getUnifiedInventorySnapshot } from "@/lib/inventory-snapshot";
import { getVendorCalendars } from "@/lib/vendor-calendar-store";
import { computePurchaseDeltas } from "@/lib/purchase-delta";
import { optimizePurchasePlan } from "@/lib/purchase-optimizer";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3600_000);
}

function isoDateOnly(iso: string) {
  return iso.slice(0, 10);
}

function nextValidDeliveryDate(
  deliversOn: string[],
  start: Date,
  horizonDays = 14,
) {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const key = days[d.getDay()];
    if (deliversOn.includes(key)) return d;
  }

  return start;
}

export function generateProcurementPlan(args: {
  windowStartISO: string;
  windowEndISO: string;
  ingredientNeeds: IngredientNeed[];
  groupId?: string | null;
}): ProcurementPlan {
  const planId = uid("proc_plan");
  const createdAtISO = new Date().toISOString();

  const inventoryUsed = getUnifiedInventorySnapshot();
  const calendars = getVendorCalendars();

  // Sum inventory across locations by ingredientId (v1).
  const onHandMap: Record<string, number> = {};
  for (const line of inventoryUsed) {
    onHandMap[line.ingredientId] =
      (onHandMap[line.ingredientId] ?? 0) + Number(line.onHandQty || 0);
  }

  // Map needs -> purchasing requirement format so we can reuse computePurchaseDeltas.
  const requirements: IngredientRequirement[] = args.ingredientNeeds.map(
    (n) => ({
      ingredientId: n.ingredientId,
      ingredientName: n.ingredientName,
      requiredQuantity: Number(n.requiredQty || 0),
      unit: n.unit,
      source: {
        beoId: n.sources?.[0]?.id ?? "GENESIS_C",
        productionId: "genesis_c",
        station: "procurement",
      },
    }),
  );

  const deltas = computePurchaseDeltas(requirements, onHandMap, {});
  const deltasToOrder = deltas.filter((d) => d.toOrder > 0);

  const optimized = optimizePurchasePlan(deltasToOrder);

  const sourcesByIngredient = new Map(
    args.ingredientNeeds.map((n) => [n.ingredientId, n.sources] as const),
  );

  // Group lines into orders by vendor + delivery date.
  const ordersByKey = new Map<string, ProcurementOrder>();

  for (const o of optimized) {
    const cal: VendorDeliveryCalendar | undefined = calendars.find(
      (c) => c.vendorId === o.vendorId,
    );

    const deliveryDate = cal
      ? nextValidDeliveryDate(cal.deliversOn, new Date(args.windowStartISO))
      : new Date(args.windowStartISO);

    const cutoffAt = addHours(
      deliveryDate,
      -(cal?.cutoffHoursBeforeDelivery ?? 18),
    );

    const key = `${o.vendorId}:${isoDateOnly(deliveryDate.toISOString())}`;

    if (!ordersByKey.has(key)) {
      ordersByKey.set(key, {
        orderId: uid("order"),
        vendorId: o.vendorId,
        vendorName: o.vendorName,
        deliveryDateISO: deliveryDate.toISOString(),
        cutoffAtISO: cutoffAt.toISOString(),
        totalCost: 0,
        lineCount: 0,
        rebateHint: cal?.rebateTierNotes ?? null,
        lines: [],
      });
    }

    const line: ProcurementOrderLine = {
      ingredientId: o.ingredientId,
      ingredientName: o.ingredientName,

      toOrderQty: o.totalQuantity,
      unit: o.packUnit,

      vendorId: o.vendorId,
      vendorName: o.vendorName,

      packName: `${o.packSize} ${o.packUnit}`,
      packCount: o.packsToOrder,
      packUnitCost: o.packsToOrder > 0 ? o.totalCost / o.packsToOrder : 0,
      lineCost: o.totalCost,

      sources: sourcesByIngredient.get(o.ingredientId) ?? [],
    };

    const order = ordersByKey.get(key)!;
    order.lines.push(line);
    order.lineCount += 1;
    order.totalCost += Number(line.lineCost ?? 0);
  }

  const orders = Array.from(ordersByKey.values());

  const warnings: ProcurementPlan["warnings"] = [];

  for (const order of orders) {
    const cal = calendars.find((c) => c.vendorId === order.vendorId);
    if (
      cal?.minDropCost &&
      order.totalCost > 0 &&
      order.totalCost < cal.minDropCost
    ) {
      warnings.push({
        severity: "info",
        message: `${order.vendorName}: Drop is below suggested consolidation target ($${cal.minDropCost}). Consider merging more event needs into this window.`,
      });
    }
  }

  if (orders.length === 0) {
    warnings.push({
      severity: "info",
      message:
        "No procurement orders needed (inventory covers all requirements, or no deltas > 0).",
    });
  }

  return {
    planId,
    createdAtISO,
    windowStartISO: args.windowStartISO,
    windowEndISO: args.windowEndISO,
    groupId: args.groupId ?? null,
    needs: args.ingredientNeeds,
    inventoryUsed,
    orders,
    warnings,
  };
}
