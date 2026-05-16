// Master inventory catalog - maps supplier SKUs to canonical ingredient items
// This serves as the single source of truth for ingredient costing and usage

export type SupplierCatalogLink = {
  supplierId: string;
  supplierName: string;
  sku: string;
  packSize: number;
  packUnit: string;
  pricePerPack: number;
  currency: string;
  leadTimeDays: number;
};

export type CostHistoryEntry = {
  date: number;
  supplierId: string;
  supplierName: string;
  costPerUnit: number;
  source: "order" | "quote" | "catalog";
};

export type RecipeUsage = {
  recipeId: string;
  recipeTitle: string;
  qty: number;
  unit: string;
};

export type InventoryItem = {
  id: string;
  canonicalName: string;
  description?: string;
  category: "protein" | "vegetable" | "fruit" | "dairy" | "pantry" | "spice" | "other";
  primaryUnit: string;
  
  // Supplier sources (prefer first one in list as primary)
  supplierLinks: SupplierCatalogLink[];
  
  // Cost tracking
  costHistory: CostHistoryEntry[];
  lastOrderDate?: number;
  
  // Inventory tracking (optional, can be enhanced later)
  currentStock?: number;
  reorderPoint?: number;
  
  // Usage tracking
  usedInRecipes?: RecipeUsage[];
};

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "ing-heirloom-carrot",
    canonicalName: "Heirloom carrots, peeled",
    description: "Mixed heirloom carrots, pre-peeled",
    category: "vegetable",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        sku: "SYS-PROD-1001",
        packSize: 25,
        packUnit: "lb",
        pricePerPack: 45.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        sku: "USF-PROD-2001",
        packSize: 25,
        packUnit: "lb",
        pricePerPack: 44.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-ben-e-keith",
        supplierName: "Ben E. Keith Co.",
        sku: "BEK-PROD-8001",
        packSize: 25,
        packUnit: "lb",
        pricePerPack: 42.0,
        currency: "USD",
        leadTimeDays: 1,
      },
    ],
    costHistory: [
      {
        date: Date.now() - 30 * 24 * 60 * 60 * 1000,
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        costPerUnit: 1.8,
        source: "order",
      },
      {
        date: Date.now(),
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        costPerUnit: 1.8,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-whole-blanched-almonds",
    canonicalName: "Whole blanched almonds",
    description: "Premium blanched almonds",
    category: "pantry",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        sku: "GFS-ALMD-3001",
        packSize: 5,
        packUnit: "lb",
        pricePerPack: 38.5,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-kehe",
        supplierName: "KeHE Distributors",
        sku: "KEHE-ALMD-6001",
        packSize: 5,
        packUnit: "lb",
        pricePerPack: 42.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        sku: "PFG-ALMD-4001",
        packSize: 5,
        packUnit: "lb",
        pricePerPack: 39.0,
        currency: "USD",
        leadTimeDays: 3,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        costPerUnit: 7.7,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-beef-short-rib",
    canonicalName: "Prime beef short rib, boneless",
    description: "USDA Prime boneless short ribs",
    category: "protein",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        sku: "USF-BEEF-2001",
        packSize: 40,
        packUnit: "lb",
        pricePerPack: 520.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-shamrock",
        supplierName: "Shamrock Foods",
        sku: "SHAM-BEEF-7001",
        packSize: 40,
        packUnit: "lb",
        pricePerPack: 530.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-golden-state",
        supplierName: "Golden State Foods",
        sku: "GSF-BEEF-9001",
        packSize: 40,
        packUnit: "lb",
        pricePerPack: 515.0,
        currency: "USD",
        leadTimeDays: 2,
      },
    ],
    costHistory: [
      {
        date: Date.now() - 14 * 24 * 60 * 60 * 1000,
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        costPerUnit: 12.5,
        source: "order",
      },
      {
        date: Date.now(),
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        costPerUnit: 13.0,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-beef-tallow",
    canonicalName: "Rendered beef tallow",
    description: "Pure rendered beef fat",
    category: "pantry",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        sku: "USF-BEEF-2045",
        packSize: 35,
        packUnit: "lb",
        pricePerPack: 98.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-shamrock",
        supplierName: "Shamrock Foods",
        sku: "SHAM-BEEF-7045",
        packSize: 35,
        packUnit: "lb",
        pricePerPack: 102.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        sku: "SYS-BEEF-1045",
        packSize: 35,
        packUnit: "lb",
        pricePerPack: 99.0,
        currency: "USD",
        leadTimeDays: 2,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        costPerUnit: 2.8,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-fresh-garlic-cloves",
    canonicalName: "Fresh garlic cloves, jumbo",
    description: "Freshly broken garlic cloves",
    category: "vegetable",
    primaryUnit: "oz",
    supplierLinks: [
      {
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        sku: "SYS-GARL-1042",
        packSize: 10,
        packUnit: "lb",
        pricePerPack: 28.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-ben-e-keith",
        supplierName: "Ben E. Keith Co.",
        sku: "BEK-GARL-8042",
        packSize: 10,
        packUnit: "lb",
        pricePerPack: 26.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        sku: "GFS-GARL-3042",
        packSize: 10,
        packUnit: "lb",
        pricePerPack: 27.0,
        currency: "USD",
        leadTimeDays: 1,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        costPerUnit: 0.175,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-organic-coconut-milk",
    canonicalName: "Organic coconut milk, 12x1L",
    description: "Premium organic coconut milk",
    category: "dairy",
    primaryUnit: "case",
    supplierLinks: [
      {
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        sku: "GFS-COCO-3078",
        packSize: 12,
        packUnit: "L",
        pricePerPack: 52.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-kehe",
        supplierName: "KeHE Distributors",
        sku: "KEHE-COCO-6089",
        packSize: 12,
        packUnit: "L",
        pricePerPack: 58.0,
        currency: "USD",
        leadTimeDays: 3,
      },
      {
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        sku: "PFG-COCO-4078",
        packSize: 12,
        packUnit: "L",
        pricePerPack: 51.0,
        currency: "USD",
        leadTimeDays: 2,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        costPerUnit: 4.33,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-agar-powder",
    canonicalName: "Agar powder, pastry grade",
    description: "Food-grade agar stabilizer",
    category: "pantry",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        sku: "PFG-AGAR-4001",
        packSize: 1,
        packUnit: "lb",
        pricePerPack: 85.0,
        currency: "USD",
        leadTimeDays: 3,
      },
      {
        supplierId: "sup-golden-state",
        supplierName: "Golden State Foods",
        sku: "GSF-AGAR-9001",
        packSize: 1,
        packUnit: "lb",
        pricePerPack: 82.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        sku: "GFS-AGAR-3001",
        packSize: 1,
        packUnit: "lb",
        pricePerPack: 80.0,
        currency: "USD",
        leadTimeDays: 3,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        costPerUnit: 85.0,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-vanilla-bean-paste",
    canonicalName: "Madagascar vanilla bean paste",
    description: "Premium vanilla bean paste from Madagascar",
    category: "pantry",
    primaryUnit: "oz",
    supplierLinks: [
      {
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        sku: "PFG-VANL-4032",
        packSize: 2,
        packUnit: "lb",
        pricePerPack: 298.0,
        currency: "USD",
        leadTimeDays: 4,
      },
      {
        supplierId: "sup-golden-state",
        supplierName: "Golden State Foods",
        sku: "GSF-VANL-9032",
        packSize: 2,
        packUnit: "lb",
        pricePerPack: 305.0,
        currency: "USD",
        leadTimeDays: 4,
      },
      {
        supplierId: "sup-mclane",
        supplierName: "McLane Company",
        sku: "MCL-VANL-5032",
        packSize: 2,
        packUnit: "lb",
        pricePerPack: 295.0,
        currency: "USD",
        leadTimeDays: 4,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        costPerUnit: 9.3,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-calabrian-chili",
    canonicalName: "Fermented Calabrian chili puree",
    description: "Traditional Italian fermented chili",
    category: "pantry",
    primaryUnit: "oz",
    supplierLinks: [
      {
        supplierId: "sup-mclane",
        supplierName: "McLane Company",
        sku: "MCL-CHIL-5001",
        packSize: 5,
        packUnit: "lb",
        pricePerPack: 68.0,
        currency: "USD",
        leadTimeDays: 3,
      },
      {
        supplierId: "sup-pfg",
        supplierName: "Performance Food Group",
        sku: "PFG-CHIL-4001",
        packSize: 5,
        packUnit: "lb",
        pricePerPack: 70.0,
        currency: "USD",
        leadTimeDays: 3,
      },
      {
        supplierId: "sup-kehe",
        supplierName: "KeHE Distributors",
        sku: "KEHE-CHIL-6001",
        packSize: 5,
        packUnit: "lb",
        pricePerPack: 72.0,
        currency: "USD",
        leadTimeDays: 4,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-mclane",
        supplierName: "McLane Company",
        costPerUnit: 0.85,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-wildflower-honey",
    canonicalName: "Wildflower honey, raw",
    description: "Raw unpasteurized wildflower honey",
    category: "pantry",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-mclane",
        supplierName: "McLane Company",
        sku: "MCL-HONE-5015",
        packSize: 25,
        packUnit: "lb",
        pricePerPack: 95.0,
        currency: "USD",
        leadTimeDays: 2,
      },
      {
        supplierId: "sup-kehe",
        supplierName: "KeHE Distributors",
        sku: "KEHE-HONE-6015",
        packSize: 25,
        packUnit: "lb",
        pricePerPack: 102.0,
        currency: "USD",
        leadTimeDays: 3,
      },
      {
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        sku: "GFS-HONE-3015",
        packSize: 25,
        packUnit: "lb",
        pricePerPack: 93.0,
        currency: "USD",
        leadTimeDays: 2,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-mclane",
        supplierName: "McLane Company",
        costPerUnit: 3.8,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-mirepoix-blend",
    canonicalName: "Classic mirepoix blend, diced",
    description: "Pre-diced carrot, celery, onion mix",
    category: "vegetable",
    primaryUnit: "lb",
    supplierLinks: [
      {
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        sku: "SYS-MIRE-1089",
        packSize: 20,
        packUnit: "lb",
        pricePerPack: 32.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        sku: "USF-MIRE-2089",
        packSize: 20,
        packUnit: "lb",
        pricePerPack: 31.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-gfs",
        supplierName: "Gordon Food Service",
        sku: "GFS-MIRE-3089",
        packSize: 20,
        packUnit: "lb",
        pricePerPack: 30.5,
        currency: "USD",
        leadTimeDays: 1,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        costPerUnit: 1.6,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
  {
    id: "ing-meyer-lemon",
    canonicalName: "Fresh Meyer lemons",
    description: "Sweet Meyer lemons",
    category: "fruit",
    primaryUnit: "each",
    supplierLinks: [
      {
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        sku: "SYS-LEMO-1123",
        packSize: 40,
        packUnit: "lb",
        pricePerPack: 98.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-ben-e-keith",
        supplierName: "Ben E. Keith Co.",
        sku: "BEK-LEMO-8123",
        packSize: 40,
        packUnit: "lb",
        pricePerPack: 95.0,
        currency: "USD",
        leadTimeDays: 1,
      },
      {
        supplierId: "sup-us-foods",
        supplierName: "US Foods",
        sku: "USF-LEMO-2123",
        packSize: 40,
        packUnit: "lb",
        pricePerPack: 96.0,
        currency: "USD",
        leadTimeDays: 1,
      },
    ],
    costHistory: [
      {
        date: Date.now(),
        supplierId: "sup-sysco",
        supplierName: "Sysco Corporation",
        costPerUnit: 0.24,
        source: "catalog",
      },
    ],
    usedInRecipes: [],
  },
];

// Helper: Get inventory item by ID
export function getInventoryItem(id: string): InventoryItem | undefined {
  return INVENTORY_ITEMS.find((item) => item.id === id);
}

// Helper: Get current cost per unit for an item
export function getCurrentCostPerUnit(item: InventoryItem): number | null {
  if (item.costHistory.length === 0) return null;
  const latest = item.costHistory[item.costHistory.length - 1];
  return latest.costPerUnit;
}

// Helper: Get cost variance percentage since last order
export function getCostVariance(item: InventoryItem): number | null {
  if (item.costHistory.length < 2) return null;
  const latest = item.costHistory[item.costHistory.length - 1];
  const previous = item.costHistory[item.costHistory.length - 2];
  const variance = ((latest.costPerUnit - previous.costPerUnit) / previous.costPerUnit) * 100;
  return Math.round(variance * 10) / 10;
}

// Helper: Get total cost for a given quantity
export function calculateCost(item: InventoryItem, qty: number): number | null {
  const costPerUnit = getCurrentCostPerUnit(item);
  return costPerUnit ? qty * costPerUnit : null;
}
