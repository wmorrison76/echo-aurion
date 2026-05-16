import { computeMetrics } from "./metrics";
import {
  CartPlan,
  CartTemplate,
  CommitteeContext,
  CommitteeInputs,
  CommitteeNote,
  CommitteePurchaseOrder,
  CommitteePurchaseOrderLine,
  CommitteeProposal,
  DemandItem,
  DemandPlanItem,
  InventorySnapshotItem,
  PlannerAgentResult,
  SupplierOption,
} from "./types";
import { clamp, isoNow, sumBy, uniqueId } from "./utils";
export async function plannerAgent(
  inputs: CommitteeInputs,
  context: CommitteeContext,
): Promise<PlannerAgentResult> {
  const catalogByItem = groupCatalogByItem(inputs.catalog);
  const inventoryByItem = new Map(
    inputs.inventory.map((entry) => [entry.itemId, entry]),
  );
  const demandPlans: DemandPlanItem[] = inputs.demand.map((item) =>
    buildDemandPlan(
      item,
      catalogByItem.get(item.id) ?? [],
      inventoryByItem.get(item.id),
      context,
    ),
  );
  const purchaseOrders = buildPurchaseOrders(
    demandPlans,
    catalogByItem,
    context,
    inputs.nowISO,
  );
  const prepTasks = buildPrepTasks(demandPlans, inputs, context);
  const carts = buildCartPlans(demandPlans, inputs);
  const quality = buildQualityGates(carts, demandPlans, context);
  const proposal: CommitteeProposal = {
    generatedAt: isoNow(),
    generatedBy: "planner",
    demand: demandPlans,
    purchaseOrders,
    prepTasks,
    carts,
    quality,
    notes: buildPlannerNotes(demandPlans, purchaseOrders),
  };
  const metrics = computeMetrics(proposal, context);
  return { proposal, diagnostics: { metrics, durationMs: 0 } };
}
function buildDemandPlan(
  item: DemandItem,
  catalog: SupplierOption[],
  inventory: InventorySnapshotItem | undefined,
  context: CommitteeContext,
): DemandPlanItem {
  const buffer = context.policy.constraints.overOrderBuffer;
  const onHand = inventory?.onHandQty ?? item.onHandQty ?? 0;
  const requiredQty = item.requiredQty;
  const supplier = pickBestSupplier(catalog);
  const unitCost =
    supplier?.unitCost ?? inventory?.unitCost ?? item.wasteCostPerUnit ?? 0;
  const shelfLifeHours = Math.min(
    item.shelfLifeHours ?? Number.POSITIVE_INFINITY,
    supplier?.shelfLifeHours ?? Number.POSITIVE_INFINITY,
    inventory?.shelfLifeHours ?? Number.POSITIVE_INFINITY,
  );
  const targetQty = Math.max(requiredQty * (1 + buffer), requiredQty);
  const shortfall = Math.max(targetQty - onHand, 0);
  let plannedPurchaseQty = 0;
  if (shortfall > 0 && supplier) {
    const packSize = supplier.packSize > 0 ? supplier.packSize : 1;
    const packs = Math.ceil(shortfall / packSize);
    plannedPurchaseQty = packs * packSize;
    if (supplier.minimumOrderQty) {
      plannedPurchaseQty = Math.max(
        plannedPurchaseQty,
        supplier.minimumOrderQty,
      );
    }
  }
  const recommendedQty = onHand + plannedPurchaseQty;
  const overageQty = Math.max(recommendedQty - requiredQty, 0);
  const projectedWasteQty = Math.max(overageQty, 0);
  const projectedWasteCost = projectedWasteQty * unitCost;
  const riskBaseline = clamp(item.underOrderRisk ?? 0.08, 0, 1);
  const adjustedRisk =
    shortfall <= 0
      ? 0
      : clamp(riskBaseline + shortfall / (requiredQty + 1), 0, 1);
  return {
    ...item,
    recommendedQty,
    plannedPurchaseQty,
    overageQty,
    projectedWasteQty,
    projectedWasteCost,
    adjustedRisk,
    vendorId: supplier?.supplierId,
    shelfLifeHours: Number.isFinite(shelfLifeHours)
      ? shelfLifeHours
      : undefined,
    wasteCostPerUnit: unitCost,
  };
}
function buildPurchaseOrders(
  demand: DemandPlanItem[],
  catalogByItem: Map<string, SupplierOption[]>,
  context: CommitteeContext,
  nowISO?: string,
): CommitteePurchaseOrder[] {
  const orders = new Map<string, CommitteePurchaseOrder>();
  const createdAt = nowISO ?? isoNow();
  for (const item of demand) {
    if (item.plannedPurchaseQty <= 0) continue;
    const supplierOptions = catalogByItem.get(item.id) ?? [];
    const supplier =
      supplierOptions.find((option) => option.supplierId === item.vendorId) ??
      supplierOptions[0];
    if (!supplier) continue;
    const line: CommitteePurchaseOrderLine = {
      id: uniqueId(`pol-${item.id}`),
      itemId: item.id,
      qty: item.plannedPurchaseQty,
      unit: supplier.orderUnit,
      unitCost: supplier.unitCost,
      currency: supplier.currency,
      leadTimeDays: supplier.leadTimeDays,
      allergens: supplier.allergens,
      shelfLifeHours: supplier.shelfLifeHours,
      minimumOrderQty: supplier.minimumOrderQty,
    };
    const expectedDate = computeExpectedDate(createdAt, supplier.leadTimeDays);
    const key = supplier.supplierId;
    const existing = orders.get(key);
    if (existing) {
      existing.lines.push(line);
      existing.expectedDate = pickLater(existing.expectedDate, expectedDate);
      continue;
    }
    orders.set(key, {
      id: uniqueId(`po-${key}`),
      supplierId: key,
      status: "draft",
      expectedDate,
      createdAt,
      lines: [line],
    });
  }
  return Array.from(orders.values()).map((order) => ({
    ...order,
    lines: order.lines.sort((a, b) => a.itemId.localeCompare(b.itemId)),
  }));
}
function buildPrepTasks(
  demand: DemandPlanItem[],
  inputs: CommitteeInputs,
  context: CommitteeContext,
) {
  const now = new Date(inputs.nowISO ?? isoNow());
  const serviceDate = context.serviceDate
    ? new Date(context.serviceDate)
    : null;
  return demand.map((item) => {
    const prepMinutes = item.prepMinutesPerUnit ?? 12;
    const laborHours = (prepMinutes * item.recommendedQty || 0) / 60;
    const start = new Date(serviceDate ? serviceDate.getTime() : now.getTime());
    start.setHours(start.getHours() - 6);
    const end = new Date(start.getTime());
    end.setHours(end.getHours() + Math.max(1, Math.ceil(laborHours)));
    const overtimeRisk = clamp(laborHours > 4 ? (laborHours - 4) / 4 : 0, 0, 1);
    return {
      id: uniqueId(`prep-${item.id}`),
      demandId: item.id,
      stationId: pickStation(inputs, item),
      title: `${item.name} prep`,
      qty: item.recommendedQty,
      unit: item.unit,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      laborHours,
      overtimeRisk,
    };
  });
}
function buildCartPlans(
  demand: DemandPlanItem[],
  inputs: CommitteeInputs,
): CartPlan[] {
  const cartsByTemplate = new Map<string, CartPlan>();
  const templates = inputs.carts ?? buildDefaultCartTemplates(demand);
  for (const item of demand) {
    const template = pickCartTemplate(templates, item);
    const entry = cartsByTemplate.get(template.id);
    if (entry) {
      entry.demandIds.push(item.id);
      entry.labels.push(`${item.name} • ${item.recommendedQty}${item.unit}`);
    } else {
      cartsByTemplate.set(template.id, {
        id: uniqueId(`cart-${template.id}`),
        cartTemplateId: template.id,
        demandIds: [item.id],
        labels: [`${item.name} • ${item.recommendedQty}${item.unit}`],
        status: "draft",
      });
    }
  }
  return Array.from(cartsByTemplate.values());
}
function buildQualityGates(
  carts: CartPlan[],
  demand: DemandPlanItem[],
  context: CommitteeContext,
) {
  const horizon = context.horizonHours;
  return carts.flatMap((cart) => {
    const risk = clamp(
      demand
        .filter((item) => cart.demandIds.includes(item.id))
        .reduce((max, item) => Math.max(max, item.adjustedRisk), 0),
      0,
      1,
    );
    const stages: Array<{
      gate: "prep" | "holding" | "dispatch" | "service";
      offsetHours: number;
    }> = [
      { gate: "prep", offsetHours: -horizon },
      { gate: "holding", offsetHours: -2 },
      { gate: "dispatch", offsetHours: -1 },
      { gate: "service", offsetHours: 0 },
    ];
    return stages.map((stage) => ({
      id: uniqueId(`qc-${cart.id}-${stage.gate}`),
      cartPlanId: cart.id,
      gate: stage.gate,
      dueAt: computeDueAt(context, stage.offsetHours),
      riskScore: clamp(risk + (stage.gate === "dispatch" ? 0.1 : 0), 0, 1),
    }));
  });
}
function buildPlannerNotes(
  demand: DemandPlanItem[],
  purchaseOrders: CommitteePurchaseOrder[],
): CommitteeNote[] {
  const totalSpend = sumBy(purchaseOrders, (order) =>
    sumBy(order.lines, (line) => (line.unitCost ?? 0) * line.qty),
  );
  const highRisk = demand.filter((item) => item.adjustedRisk > 0.25);
  return [
    {
      id: uniqueId("note"),
      agent: "planner",
      createdAt: isoNow(),
      message: `Generated ${purchaseOrders.length} purchase orders (${highRisk.length} high risk items). Estimated spend ${formatCurrency(totalSpend)}.`,
      severity: highRisk.length ? "warning" : "info",
    },
  ];
}
function groupCatalogByItem(
  catalog: SupplierOption[],
): Map<string, SupplierOption[]> {
  const map = new Map<string, SupplierOption[]>();
  for (const option of catalog) {
    const list = map.get(option.itemId);
    if (list) list.push(option);
    else map.set(option.itemId, [option]);
  }
  for (const options of map.values()) {
    options.sort((a, b) => a.unitCost - b.unitCost);
  }
  return map;
}
function pickBestSupplier(
  options: SupplierOption[],
): SupplierOption | undefined {
  if (!options.length) return undefined;
  return options.reduce((best, option) => {
    if (!best) return option;
    if (option.unitCost < best.unitCost) return option;
    if (
      option.unitCost === best.unitCost &&
      option.leadTimeDays < best.leadTimeDays
    )
      return option;
    return best;
  });
}
function computeExpectedDate(createdAt: string, leadTimeDays: number): string {
  const base = new Date(createdAt);
  base.setDate(base.getDate() + Math.max(leadTimeDays, 0));
  return base.toISOString();
}
function pickLater(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}
function pickStation(
  inputs: CommitteeInputs,
  item: DemandPlanItem,
): string | undefined {
  if (!inputs.prepStations?.length) return undefined;
  const outletStations = inputs.prepStations.filter((station) =>
    item.outletId ? station.id.includes(item.outletId) : true,
  );
  const candidates = outletStations.length
    ? outletStations
    : inputs.prepStations;
  return candidates.reduce((best, station) =>
    !best || station.maxConcurrentTasks > best.maxConcurrentTasks
      ? station
      : best,
  )?.id;
}
function pickCartTemplate(
  templates: CartTemplate[],
  item: DemandPlanItem,
): CartTemplate {
  const match = templates.find(
    (template) => template.outletId === item.outletId,
  );
  return match ?? templates[0];
}
function buildDefaultCartTemplates(demand: DemandPlanItem[]): CartTemplate[] {
  const uniqueOutlets = Array.from(
    new Set(demand.map((item) => item.outletId ?? "default")),
  );
  return uniqueOutlets.map((outlet) => ({
    id: `cart-template-${outlet}`,
    name: `${outlet} cart`,
    capacity: 12,
    outletId: outlet === "default" ? undefined : outlet,
  }));
}
function computeDueAt(context: CommitteeContext, offsetHours: number): string {
  const base = context.serviceDate
    ? new Date(context.serviceDate)
    : new Date(context.startedAt);
  base.setHours(base.getHours() + offsetHours);
  return base.toISOString();
}
function formatCurrency(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
