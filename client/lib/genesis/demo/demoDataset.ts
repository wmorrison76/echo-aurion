/**
 * Genesis Demo Dataset Generator (Patch F)
 * Provides sample data for interactive walkthrough and testing
 */

export interface DemoOutlet {
  id: string;
  name: string;
  type: "OUTLET" | "COMMISSARY";
}

export interface DemoVendor {
  id: string;
  name: string;
  deliveryDays: string[];
  leadDays: number;
}

export interface DemoItem {
  sku: string;
  name: string;
  unit: string;
  cost: number;
}

export interface DemoDemand {
  demandId: string;
  itemSku: string;
  outletId: string;
  quantity: number;
  dueDate: string;
}

export interface DemoDataset {
  property: string;
  outlets: DemoOutlet[];
  vendors: DemoVendor[];
  items: DemoItem[];
  demands: DemoDemand[];
  generatedAt: string;
}

/**
 * Generate a sample dataset for demo and testing
 */
export function generateDemoData(): DemoDataset {
  const outlets: DemoOutlet[] = [
    { id: "outlet_restaurant", name: "Main Restaurant", type: "OUTLET" },
    { id: "outlet_banquet", name: "Banquet Hall", type: "OUTLET" },
    { id: "outlet_pastry", name: "Pastry Outlet", type: "OUTLET" },
    { id: "commissary_kitchen", name: "Central Kitchen", type: "COMMISSARY" },
  ];

  const vendors: DemoVendor[] = [
    {
      id: "vendor_sysco",
      name: "Sysco",
      deliveryDays: ["MON", "WED", "FRI"],
      leadDays: 1,
    },
    {
      id: "vendor_usfoods",
      name: "US Foods",
      deliveryDays: ["TUE", "THU", "SAT"],
      leadDays: 1,
    },
    {
      id: "vendor_produce",
      name: "Local Produce",
      deliveryDays: ["MON", "WED", "FRI"],
      leadDays: 0,
    },
  ];

  const items: DemoItem[] = [
    { sku: "SKU001", name: "All-Purpose Flour", unit: "lbs", cost: 0.85 },
    { sku: "SKU002", name: "Unsalted Butter", unit: "lbs", cost: 5.5 },
    { sku: "SKU003", name: "Eggs", unit: "dozen", cost: 3.25 },
    { sku: "SKU004", name: "Tomatoes", unit: "lbs", cost: 1.2 },
    { sku: "SKU005", name: "Lettuce", unit: "head", cost: 0.75 },
    { sku: "SKU006", name: "Chicken Breast", unit: "lbs", cost: 6.5 },
    { sku: "SKU007", name: "Olive Oil", unit: "L", cost: 12.0 },
    { sku: "SKU008", name: "Pasta", unit: "lbs", cost: 1.25 },
  ];

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const demands: DemoDemand[] = [
    {
      demandId: "dem001",
      itemSku: "SKU001",
      outletId: "outlet_restaurant",
      quantity: 50,
      dueDate: tomorrow.toISOString().split("T")[0],
    },
    {
      demandId: "dem002",
      itemSku: "SKU002",
      outletId: "outlet_pastry",
      quantity: 25,
      dueDate: tomorrow.toISOString().split("T")[0],
    },
    {
      demandId: "dem003",
      itemSku: "SKU006",
      outletId: "outlet_restaurant",
      quantity: 40,
      dueDate: tomorrow.toISOString().split("T")[0],
    },
    {
      demandId: "dem004",
      itemSku: "SKU004",
      outletId: "outlet_banquet",
      quantity: 15,
      dueDate: tomorrow.toISOString().split("T")[0],
    },
  ];

  return {
    property: "Demo Resort",
    outlets,
    vendors,
    items,
    demands,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get demo dataset with caching
 */
let cachedDataset: DemoDataset | null = null;

export function getDemoDataset(): DemoDataset {
  if (!cachedDataset) {
    cachedDataset = generateDemoData();
  }
  return cachedDataset;
}

/**
 * Reset demo dataset cache
 */
export function resetDemoDataset(): void {
  cachedDataset = null;
}
