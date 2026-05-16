export type PurchaseOrderStatus =
  | "Pending"
  | "Approved"
  | "Receiving"
  | "Closed";
export interface PurchaseOrderLine {
  sku: string;
  description: string;
  category: string;
  orderedQty: number;
  unit: string;
  unitCost: number;
  receivedQty: number;
}
export interface PurchaseOrder {
  id: string;
  reference: string;
  property: string;
  vendor: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  expectedAt: string;
  total: number;
  currency: string;
  approver: string;
  buyer: string;
  lines: PurchaseOrderLine[];
}
export interface ReceivingEvent {
  id: string;
  timestamp: string;
  property: string;
  poReference: string;
  status: "Queued" | "Receiving" | "Completed" | "Variance";
  summary: string;
  dock: string;
}
export interface InventoryVariance {
  id: string;
  poReference: string;
  item: string;
  expectedQty: number;
  receivedQty: number;
  unit: string;
  severity: "info" | "warning" | "critical";
  note: string;
}
export interface VendorSpend {
  vendor: string;
  month: string;
  total: number;
  currency: string;
  costCenters: { label: string; amount: number }[];
}
export interface PurchasingSnapshot {
  openOrders: number;
  awaitingReceiving: number;
  varianceRate: number;
  monthlySpend: number;
}
export interface OrderAgingRow {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  elapsedDays: number;
  daysUntilDue: number;
}
export interface VendorSpendSummary {
  totalSpend: number;
  topVendors: { name: string; total: number; currency: string }[];
}
export interface PurchasingDashboard {
  snapshot: PurchasingSnapshot;
  orders: PurchaseOrder[];
  grouped: Record<PurchaseOrderStatus, PurchaseOrder[]>;
  aging: OrderAgingRow[];
  timeline: ReceivingEvent[];
  variances: InventoryVariance[];
  vendorSpend: VendorSpend[];
  vendorSummary: VendorSpendSummary;
}
