/**
 * Genesis C — Procurement Canon
 * Canonical types for multi-event procurement planning.
 */

export type DemandSourceType =
  | "BEO"
  | "REO"
  | "PAR_REPLENISH"
  | "SPECIAL"
  | "TRANSFER";

export type DemandSourceRef = {
  type: DemandSourceType;
  id: string;
  name: string;
  dueAtISO: string;
  locationId: string;
};

export type IngredientNeed = {
  ingredientId: string;
  ingredientName: string;
  requiredQty: number;
  unit: string;

  sources: DemandSourceRef[];
};

export type InventorySnapshotLine = {
  ingredientId: string;
  onHandQty: number;
  unit: string;
  locationId: string;
  asOfISO: string;
};

export type VendorDeliveryDay =
  | "MON"
  | "TUE"
  | "WED"
  | "THU"
  | "FRI"
  | "SAT"
  | "SUN";

export type VendorDeliveryCalendar = {
  vendorId: string;
  vendorName: string;

  deliversOn: VendorDeliveryDay[];
  cutoffHoursBeforeDelivery: number;

  minDropCost?: number | null;
  rebateTierNotes?: string | null;
};

export type ProcurementOrderLine = {
  ingredientId: string;
  ingredientName: string;

  toOrderQty: number;
  unit: string;

  vendorId: string;
  vendorName: string;

  packName?: string;
  packCount?: number;
  packUnitCost?: number;
  lineCost?: number;

  sources: DemandSourceRef[];
};

export type ProcurementOrder = {
  orderId: string;
  vendorId: string;
  vendorName: string;

  deliveryDateISO: string;
  cutoffAtISO: string;

  totalCost: number;
  lineCount: number;

  rebateHint?: string | null;
  lines: ProcurementOrderLine[];
};

export type ProcurementPlan = {
  planId: string;
  createdAtISO: string;

  windowStartISO: string;
  windowEndISO: string;

  groupId?: string | null;

  needs: IngredientNeed[];
  inventoryUsed: InventorySnapshotLine[];

  orders: ProcurementOrder[];

  warnings: Array<{
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
};
