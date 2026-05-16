export interface WasteRecord {
  id: string;
  wasteCategory: string;
  ingredientName: string;
  quantityWasted: number;
  unit: string;
  costOfWaste: number;
  reason?: string;
}

export interface PlateCost {
  id: string;
  recipeName: string;
  platingDate: string;
  waste: WasteRecord[];
  ingredientCosts: { totalCost: number }[];
}
