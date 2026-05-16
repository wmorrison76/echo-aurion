export type UUID = string;
export type VendorOrderingMode = "direct" | "punchout" | "email" | "portal";
export interface VendorOutletCode {
  id: UUID;
  outletId: UUID | null;
  outletName?: string | null;
  code: string;
  label?: string | null;
  keywords?: string[] | null;
  priority?: number | null;
}
export interface Vendor {
  id: UUID;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  portalUrl?: string | null;
  accountNumber?: string | null;
  orderingModes?: VendorOrderingMode[] | null;
  defaultOutletId?: UUID | null;
  notes?: string | null;
  codes?: VendorOutletCode[] | null;
}
export interface Outlet {
  id: UUID;
  name: string;
  shortCode?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  tags?: string[] | null;
  defaultGlGroupId?: UUID | null;
  isCommissary?: boolean | null;
}
export interface GLCode {
  id: UUID;
  code: string;
  name: string;
  parentId?: UUID | null;
}
export interface POItem {
  id: UUID;
  itemId?: UUID | null;
  sku?: string | null;
  productName: string;
  qty: number;
  unit: string;
  expectedDate?: string | null;
  glCodeId?: UUID | null;
  vendorId?: UUID | null;
  unitPrice?: number | null;
  receivedQty?: number | null;
}
export type POStatus =
  | "created"
  | "sent"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "closed"
  | "void";
export interface PurchaseOrder {
  id: UUID;
  number: string;
  vendorId: UUID;
  outletId: UUID;
  status: POStatus;
  createdAt: string;
  eta?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  items: POItem[];
}
export interface ReceiptLine {
  id: UUID;
  productName: string;
  qty: number;
  unit: string;
  totalCost: number;
  poItemId?: UUID | null;
  glCodeId?: UUID | null;
}
export interface Receipt {
  id: UUID;
  poId?: UUID | null;
  vendorId?: UUID | null;
  invoiceNumber?: string | null;
  date: string;
  lines: ReceiptLine[];
  shortages: ShortageNotice[];
}
export interface ShortageNotice {
  id: UUID;
  poItemId: UUID;
  expectedQty: number;
  receivedQty: number;
  productName: string;
  createdAt: string;
}
export interface PurchaseOrderVariance {
  poId: UUID;
  poItemId?: UUID | null;
  productName: string;
  expectedQty: number;
  receivedQty: number;
  unit: string;
  unitPriceExpected?: number | null;
  unitPriceReceived?: number | null;
  message: string;
}
export interface HACCPLog {
  id: UUID;
  outletId: UUID;
  type: "Receiving" | "Storage";
  item: string;
  tempF: number;
  action?: string | null;
  user?: string | null;
  timestamp: string;
}
