/**
 * Genesis Procurement Types
 * Vendor schedules, inventory offsets, and procurement planning
 */

export type VendorDeliveryDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

/**
 * Vendor schedule configuration (Genesis F signal)
 */
export interface Vendor {
  vendorId: string;
  name: string;
  contact?: string;
  leadTimeDays: number; // days before delivery to place order
  deliveryDays: VendorDeliveryDay[]; // which days vendor delivers
  cutoffTimeUTC?: string; // HH:MM format, e.g. "14:00"
  minOrderValue?: number;
  maxOrderValue?: number;
  notes?: string;
}

export interface VendorSchedule {
  scheduleId: string;
  propertyId: string;
  vendors: Vendor[];
  updatedAt: string; // ISO
}

/**
 * Inventory offset (Genesis G signal)
 * On-hand + on-order adjustments that reduce procurement need
 */
export interface InventoryOffset {
  offsetId: string;
  itemKey: string;
  itemName: string;
  locationId: string; // outlet that has the surplus
  onHandQty: number; // what we have available
  onOrderQty: number; // what's already been ordered but not yet delivered
  unit: string; // UOM
  expiresAt?: string; // ISO: when this offset expires
  notes?: string;
}

export interface InventoryOffsetsSnapshot {
  snapshotId: string;
  propertyId: string;
  offsets: InventoryOffset[];
  capturedAt: string; // ISO
}

/**
 * Consolidated procurement plan output
 * Result of running the combined orchestrator
 */
export interface ProcurementPlan {
  planId: string;
  propertyId: string;
  generatedAt: string; // ISO
  generatedBy: string; // userId or "system"

  // Summary
  totalLineCount: number;
  totalValue: number;
  vendorCount: number;

  // By vendor
  vendorDrops: VendorDrop[];

  // Warnings & audit
  warnings: ProcurementWarning[];
  auditNotes: ProcurementAuditNote[];

  // For idempotency
  idempotencyChecksum: string; // hash of inputs for dedup

  // Raw journal drafts ready to emit
  aurumDrafts?: AurumDraft[];
}

export interface VendorDrop {
  dropId: string;
  vendorId: string;
  vendorName: string;
  scheduledDeliveryDate: string; // ISO
  orderByDate: string; // ISO: cutoff + lead time
  lines: ProcurementLine[];
  estimatedCost: number;
  notes?: string;
}

export interface ProcurementLine {
  lineId: string;
  demandId: string; // ref to IFO/PAR/offset
  locationId: string; // requesting outlet
  itemKey: string;
  itemName: string;
  unit: string;
  quantity: number;
  quantityOffset?: number; // from Genesis G
  costPerUnit: number;
  totalCost: number;
  costAttributionMode: "SOURCE_PAYS" | "REQUESTING_OUTLET_PAYS" | "SPLIT";
  costAttributionPayerId?: string; // outlet that pays (if REQUESTING_OUTLET_PAYS)
  sourceType: "IFO" | "PAR" | "OFFSET" | "LEAD_TIME_TASK";
}

export interface ProcurementWarning {
  warningId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  affectedLineIds: string[];
}

export interface ProcurementAuditNote {
  noteId: string;
  lineId?: string;
  category:
    | "COST_CHANGE"
    | "RULE_APPLIED"
    | "OFFSET_APPLIED"
    | "LEAD_TIME"
    | "VENDOR_CONSOLIDATION"
    | "OTHER";
  message: string;
  timestamp: string; // ISO
}

export interface AurumDraft {
  draftId: string;
  journalDate: string; // ISO
  account: string;
  costCenter: string;
  amount: number;
  costAttributionMode: string;
  sourceLineId: string;
  notes?: string;
}
