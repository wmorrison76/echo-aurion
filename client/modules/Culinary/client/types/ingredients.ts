export type IngredientRowType = "ingredient" | "divider";

import type { IngredientYieldSource } from "@/lib/yield-calculations";

export type IngredientRow = {
  type: IngredientRowType;
  qty: string;
  unit: string;
  item: string;
  prep: string;
  yield: string;
  cost: string;
  subId: string;
  costPerUnit: number | null;
  supplierId: string | null;
  supplierName: string | null;
  supplierSku: string | null;

  // NEW: Inventory linking
  inventoryId?: string | null;        // Link to InventoryItem
  inventoryName?: string | null;      // Cached display name
  mappingConfidence?: number;         // 0-1, confidence of automatic mapping

  // NEW: Cost tracking
  totalCost?: number | null;          // qty * costPerUnit
  costVariance?: number | null;       // % change from baseline
  costPerServing?: number | null;     // for portion-based costing
  lastUpdatedAt?: number;             // timestamp of last cost update
};

export type IngredientYieldInsight = {
  basePercent: number | null;
  baseReason: string | null;
  baseRuleId: string | null;
  chefPercent: number | null;
  chefMethod?: string;
  chefNote?: string;
  chefRecordId?: string;
  combinedPercent: number | null;
  source: IngredientYieldSource;
};

let ingredientRowCounter = 0;

export const generateIngredientRowId = () => {
  ingredientRowCounter = (ingredientRowCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `ing-${Date.now().toString(36)}-${ingredientRowCounter.toString(36)}`;
};

export const createIngredientRow = (
  overrides: Partial<Omit<IngredientRow, "subId">> & { subId?: string } = {},
): IngredientRow => ({
  type: overrides.type ?? "ingredient",
  qty: overrides.qty ?? "",
  unit: overrides.unit ?? "",
  item: overrides.item ?? "",
  prep: overrides.prep ?? "",
  yield: overrides.yield ?? "",
  cost: overrides.cost ?? "",
  subId: overrides.subId ?? generateIngredientRowId(),
  costPerUnit: overrides.costPerUnit ?? null,
  supplierId: overrides.supplierId ?? null,
  supplierName: overrides.supplierName ?? null,
  supplierSku: overrides.supplierSku ?? null,
  inventoryId: overrides.inventoryId ?? null,
  inventoryName: overrides.inventoryName ?? null,
  mappingConfidence: overrides.mappingConfidence ?? undefined,
  totalCost: overrides.totalCost ?? null,
  costVariance: overrides.costVariance ?? null,
  costPerServing: overrides.costPerServing ?? null,
  lastUpdatedAt: overrides.lastUpdatedAt ?? undefined,
});

export const createDividerRow = (label = "Step Break"): IngredientRow =>
  createIngredientRow({
    type: "divider",
    qty: "",
    unit: "",
    item: label,
    prep: "",
    yield: "",
    cost: "",
    costPerUnit: null,
    supplierId: null,
    supplierName: null,
    supplierSku: null,
  });
