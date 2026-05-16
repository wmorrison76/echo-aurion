import { z } from "zod";
export const Ingredient = z.object({
  id: z.string(),
  name: z.string(),
  spec: z.string().optional(),
  baseUom: z.enum([
    "each",
    "g",
    "kg",
    "oz",
    "lb",
    "ml",
    "l",
    "case",
    "pack",
    "tray",
  ]),
  yieldPct: z.number().min(0).max(1).default(1),
  currentCostPerBaseUom: z.number().nonnegative().default(0),
  preferredVendorItemId: z.string().nullable().default(null),
});
export const VendorItem = z.object({
  id: z.string(),
  vendorId: z.string(),
  ingredientId: z.string(),
  sku: z.string(),
  description: z.string().optional(),
  packSizeQty: z.number().positive(),
  packSizeUom: z.string(),
  pricePerPack: z.number().nonnegative(),
  convToBase: z.number().positive(),
  leadTimeDays: z.number().int().min(0).default(2),
  active: z.boolean().default(true),
});
export const RecipeComponent = z.object({
  ingredientId: z.string(),
  qty: z.number().positive(),
  uom: z.string(),
  wastePct: z.number().min(0).max(1).default(0),
});
export const Recipe = z.object({
  id: z.string(),
  name: z.string(),
  components: z.array(RecipeComponent),
  yieldQty: z.number().positive(),
  yieldUom: z.string(),
});
export const MenuItem = z.object({
  id: z.string(),
  name: z.string(),
  recipeId: z.string(),
  active: z.boolean().default(true),
});
export const PurchaseOrderLine = z.object({
  id: z.string(),
  vendorItemId: z.string(),
  ingredientId: z.string(),
  qty: z.number().nonnegative(),
  uom: z.string(),
  unitCost: z.number().nonnegative(),
  extCost: z.number().nonnegative(),
  receivedQty: z.number().nonnegative().default(0),
  receivedQtyBase: z.number().nonnegative().default(0),
});
export const PurchaseOrder = z.object({
  id: z.string(),
  vendorId: z.string(),
  status: z
    .enum(["DRAFT", "SUBMITTED", "PARTIAL", "RECEIVED", "CLOSED"])
    .default("DRAFT"),
  lines: z.array(PurchaseOrderLine),
  notes: z.string().optional(),
  createdAt: z.string(),
  submittedAt: z.string().optional(),
  receivedAt: z.string().optional(),
  requestedDeliveryDate: z.string().optional(),
  requestedDeliveryTime: z.string().optional(),
  deliveryLocation: z.string().optional(),
  deliveryMethod: z
    .enum(["truck", "ltl", "parcel", "pickup", "other"])
    .optional(),
  specialInstructions: z.string().optional(),
});
export const InventoryLot = z.object({
  id: z.string(),
  ingredientId: z.string(),
  qtyOnHandBase: z.number().nonnegative(),
  unitCostPerBase: z.number().nonnegative(),
  expDate: z.string().optional(),
  source: z.object({
    poId: z.string(),
    poLineId: z.string(),
    vendorId: z.string(),
  }),
  createdAt: z.string(),
});
export const StockTxn = z.object({
  id: z.string(),
  ingredientId: z.string(),
  type: z.enum(["RECEIVE", "ISSUE", "ADJUST"]),
  qtyBase: z.number(),
  unitCostPerBase: z.number().nonnegative(),
  ref: z.object({
    poId: z.string().optional(),
    recipeId: z.string().optional(),
    note: z.string().optional(),
  }),
  createdAt: z.string(),
});
export type Ingredient = z.infer<typeof Ingredient>;
export type VendorItem = z.infer<typeof VendorItem>;
export type RecipeComponent = z.infer<typeof RecipeComponent>;
export type Recipe = z.infer<typeof Recipe>;
export type MenuItem = z.infer<typeof MenuItem>;
export type PurchaseOrderLine = z.infer<typeof PurchaseOrderLine>;
export type PurchaseOrder = z.infer<typeof PurchaseOrder>;
export type InventoryLot = z.infer<typeof InventoryLot>;
export type StockTxn = z.infer<typeof StockTxn>;
