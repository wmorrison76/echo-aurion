import {
  inventoryVariances as baseVariances,
  purchaseOrders as baseOrders,
  receivingTimeline as baseTimeline,
  vendorSpend as baseVendorSpend,
} from "../../shared/purchasingData";
import {
  buildVendorSpendSummary,
  calculateSnapshot,
  getOrderAging,
  groupOrdersByStatus,
} from "../../shared/purchasingAnalytics";
import type {
  InventoryVariance,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  PurchasingDashboard,
  ReceivingEvent,
  VendorSpend,
} from "../../shared/purchasing";
const MS_PER_DAY = 86_400_000;
export function generatePurchasingDashboard(): PurchasingDashboard {
  const orders = buildOrders();
  const variances = buildVariances(orders);
  const timeline = buildTimeline(orders);
  const vendorSpend = buildVendorSpend();
  const snapshot = calculateSnapshot(orders, variances);
  const grouped = groupOrdersByStatus(orders);
  const aging = getOrderAging(orders);
  const vendorSummary = buildVendorSpendSummary(vendorSpend);
  return {
    snapshot,
    orders,
    grouped,
    aging,
    timeline,
    variances,
    vendorSpend,
    vendorSummary,
  };
}
function buildOrders(): PurchaseOrder[] {
  return baseOrders.map((order, index) => {
    const status = resolveStatus(order.status);
    const createdAt = dateDaysAgo(randomInt(4, 12) + index);
    const expectedAt = resolveExpectedAt(status, createdAt);
    const lines = order.lines.map((line) => transformLine(line, status));
    const total = lines.reduce(
      (sum, line) => sum + line.orderedQty * line.unitCost,
      0,
    );
    return {
      ...order,
      status,
      createdAt: createdAt.toISOString(),
      expectedAt: expectedAt.toISOString(),
      lines,
      total: Math.round(total),
    };
  });
}
function transformLine(
  line: PurchaseOrderLine,
  status: PurchaseOrderStatus,
): PurchaseOrderLine {
  const orderedQty = clamp(
    Math.round(line.orderedQty * randomFloat(0.9, 1.15)),
    1,
    9999,
  );
  let receivedQty = 0;
  if (status === "Receiving") {
    receivedQty = clamp(
      Math.round(orderedQty * randomFloat(0.6, 0.95)),
      0,
      orderedQty,
    );
  } else if (status === "Approved") {
    receivedQty = clamp(
      Math.round(orderedQty * randomFloat(0.05, 0.25)),
      0,
      orderedQty,
    );
  } else if (status === "Closed") {
    receivedQty = orderedQty;
  }
  const unitCost = roundCurrency(line.unitCost * randomFloat(0.92, 1.12));
  return { ...line, orderedQty, receivedQty, unitCost };
}
function buildVariances(orders: PurchaseOrder[]): InventoryVariance[] {
  return baseVariances.map((variance) => {
    const order = orders.find(
      (item) => item.reference === variance.poReference,
    );
    const expectedQty = clamp(
      Math.round(variance.expectedQty * randomFloat(0.9, 1.1)),
      1,
      9999,
    );
    const severity = variance.severity;
    const shortfallRange =
      severity === "critical"
        ? [0.08, 0.18]
        : severity === "warning"
          ? [0.03, 0.08]
          : [0, 0.02];
    const shortfallFraction = randomFloat(shortfallRange[0], shortfallRange[1]);
    const receivedQty =
      severity === "info"
        ? expectedQty
        : clamp(
            Math.round(expectedQty * (1 - shortfallFraction)),
            0,
            expectedQty,
          );
    const difference = expectedQty - receivedQty;
    const note = buildVarianceNote(severity, difference);
    return {
      ...variance,
      poReference: order?.reference ?? variance.poReference,
      item: variance.item,
      expectedQty,
      receivedQty,
      note,
    };
  });
}
function buildVarianceNote(
  severity: InventoryVariance["severity"],
  difference: number,
) {
  if (severity === "critical") {
    return difference > 0
      ? `Short ${difference} units; reimbursement requested and recount scheduled.`
      : "Counts match; compliance validation underway.";
  }
  if (severity === "warning") {
    return difference > 0
      ? `Minor variance of ${difference} units pending culinary review.`
      : "Variance cleared after dock reconciliation.";
  }
  return difference > 0
    ? `Info variance of ${difference} units documented for audit trail.`
    : "Counts match; audit trail updated.";
}
function buildTimeline(orders: PurchaseOrder[]): ReceivingEvent[] {
  const orderMap = new Map(orders.map((order) => [order.reference, order]));
  return baseTimeline.map((event, index) => {
    const order = orderMap.get(event.poReference);
    const offsetHours =
      event.status === "Queued" ? -randomInt(1, 4) : randomInt(1, 8) + index;
    const timestamp = new Date(Date.now() - offsetHours * 3_600_000);
    return {
      ...event,
      property: order?.property ?? event.property,
      timestamp: timestamp.toISOString(),
      summary: buildTimelineSummary(
        event.status,
        order?.vendor ?? event.poReference,
      ),
    };
  });
}
function buildTimelineSummary(status: ReceivingEvent["status"], name: string) {
  if (status === "Receiving") {
    return `Dock receiving ${randomInt(14, 28)} pallets from ${name}; temperature checks in progress.`;
  }
  if (status === "Variance") {
    return `${randomInt(12, 24)} units short flagged on ${name}; Zelda initiated recount workflow.`;
  }
  if (status === "Completed") {
    return `${name} delivery closed; audit photos synced to Argus evidence locker.`;
  }
  return `Dock slot reserved for ${name}; ETA ${randomInt(45, 130)} minutes with automated alerts configured.`;
}
function buildVendorSpend(): VendorSpend[] {
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date());
  return baseVendorSpend.map((vendor) => {
    const costCenters = vendor.costCenters.map((center) => {
      const amount = clamp(
        Math.round(center.amount * randomFloat(0.85, 1.2)),
        500,
        250_000,
      );
      return { ...center, amount };
    });
    const total = costCenters.reduce((sum, center) => sum + center.amount, 0);
    return { ...vendor, month: monthLabel, costCenters, total };
  });
}
function resolveStatus(baseStatus: PurchaseOrderStatus): PurchaseOrderStatus {
  const transitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    Pending: ["Pending", "Approved"],
    Approved: ["Approved", "Receiving"],
    Receiving: ["Receiving", "Closed"],
    Closed: ["Closed"],
  };
  const choices = transitions[baseStatus];
  return choices[randomInt(0, choices.length - 1)];
}
function resolveExpectedAt(status: PurchaseOrderStatus, createdAt: Date) {
  if (status === "Closed") {
    return new Date(createdAt.getTime() + randomInt(2, 6) * MS_PER_DAY);
  }
  return dateDaysFromNow(randomInt(1, 7));
}
function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * MS_PER_DAY);
}
function dateDaysFromNow(days: number) {
  return new Date(Date.now() + days * MS_PER_DAY);
}
function randomInt(min: number, max: number) {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
