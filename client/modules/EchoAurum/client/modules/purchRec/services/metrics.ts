export {
  buildVendorSpendSummary,
  calculateSnapshot,
  getOrderAging,
  groupOrdersByStatus,
} from "../../../../shared/purchasingAnalytics";
export type {
  OrderAgingRow,
  VendorSpendSummary,
} from "../../../../shared/purchasingAnalytics";
export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount);
}
