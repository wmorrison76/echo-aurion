/**
 * Vendor & Pack Optimization Types
 * Maps ingredients to vendor options and pack economics
 * Used for cost-optimized purchasing decisions
 */

export type VendorPack = {
  vendorId: string;
  vendorName: string;

  ingredientId: string;
  ingredientName: string;

  packSize: number; // e.g. 10, 5, 2.5
  packUnit: string; // e.g. "lb", "oz", "each", "case"
  pricePerPack: number; // total pack cost

  effectiveUnitCost: number; // computed (price / packSize)
};

export type VendorOption = {
  ingredientId: string;
  options: VendorPack[];
};
