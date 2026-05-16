/**
 * Genesis F — Procurement Calendar Output (Canonical)
 * A schedule of vendor drops (deliveries) and the purchase lines assigned to each drop.
 */

export type SourceType = "BEO" | "REO" | "GROUP" | "IFO" | "PAR_REPLENISH";

export interface ProcurementSourceRef {
  sourceType: SourceType;
  sourceId: string;
  dueAtISO: string; // When this source needs the ingredient
}

export interface ProcurementLine {
  lineId: string;
  ingredientName: string;
  unit: string;
  requiredQty: number;

  vendorId: string;
  vendorName: string;

  // Pack selection can be filled in by downstream logic (e.g., Step 17)
  packDescription?: string | null;
  packQty?: number | null;

  // Traceability: which BEOs/REOs/IFOs need this ingredient
  sources: ProcurementSourceRef[];

  // Inventory offsets (Genesis G: storeroom + banquets + pastry)
  onHandQty?: number | null;
  onOrderQty?: number | null;

  // v1 estimation hooks (true cost comes later)
  estimatedUnitCost?: number | null;
}

export interface RebateHint {
  programId: string;
  eligible: boolean; // True if drop size meets minDropDollars
  minDropDollars?: number | null;
  estimatedRebateDollars?: number | null;
}

export interface ProcurementDrop {
  dropId: string;
  vendorId: string;
  vendorName: string;

  deliverOnISO: string; // ISO datetime when this vendor delivers
  cutoffAtISO: string; // ISO datetime when order must be placed

  lines: ProcurementLine[];

  // Analytics (v1 estimation, true cost in Genesis I)
  estimatedTotalCost?: number | null;
  rebateHint?: RebateHint | null;
}

export interface ProcurementCalendarPlan {
  planId: string;
  createdAtISO: string;

  // Scope
  groupId?: string | null;
  windowStartISO: string;
  windowEndISO: string;

  // Vendor drops grouped by delivery date
  drops: ProcurementDrop[];

  // Audit transparency note (explains assignment logic)
  note: string;
}
