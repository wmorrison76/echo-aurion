import type {
  InventoryVariance,
  OrderAgingRow,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchasingSnapshot,
  VendorSpend,
  VendorSpendSummary,
} from "./purchasing";
export type { OrderAgingRow, VendorSpendSummary } from "./purchasing";
function isOpenStatus(status: PurchaseOrderStatus) {
  return (
    status === "Pending" || status === "Approved" || status === "Receiving"
  );
}
export function calculateSnapshot(
  orders: PurchaseOrder[],
  variances: InventoryVariance[],
): PurchasingSnapshot {
  const openOrders = orders.filter((order) =>
    isOpenStatus(order.status),
  ).length;
  const awaitingReceiving = orders.filter(
    (order) => order.status === "Approved",
  ).length;
  const ordersWithVariance = new Set(
    variances.map((variance) => variance.poReference),
  );
  const varianceRate =
    orders.length === 0 ? 0 : ordersWithVariance.size / orders.length;
  const monthlySpend = orders
    .filter((order) => isOpenStatus(order.status))
    .reduce((sum, order) => sum + order.total, 0);
  return { openOrders, awaitingReceiving, varianceRate, monthlySpend };
}
export function groupOrdersByStatus(orders: PurchaseOrder[]) {
  return orders.reduce<Record<PurchaseOrderStatus, PurchaseOrder[]>>(
    (acc, order) => {
      acc[order.status] = [...acc[order.status], order];
      return acc;
    },
    { Pending: [], Approved: [], Receiving: [], Closed: [] },
  );
}
export function getOrderAging(orders: PurchaseOrder[]): OrderAgingRow[] {
  return orders.map((order) => {
    const created = new Date(order.createdAt).getTime();
    const expected = new Date(order.expectedAt).getTime();
    const now = Date.now();
    const elapsedDays = Math.max(
      0,
      Math.round((now - created) / (1000 * 60 * 60 * 24)),
    );
    const daysUntilDue = Math.round((expected - now) / (1000 * 60 * 60 * 24));
    return {
      id: order.id,
      reference: order.reference,
      status: order.status,
      elapsedDays,
      daysUntilDue,
    };
  });
}
export function buildVendorSpendSummary(
  vendors: VendorSpend[],
): VendorSpendSummary {
  const totalSpend = vendors.reduce((sum, vendor) => sum + vendor.total, 0);
  const topVendors = [...vendors]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((vendor) => ({
      name: vendor.vendor,
      total: vendor.total,
      currency: vendor.currency,
    }));
  return { totalSpend, topVendors };
}
