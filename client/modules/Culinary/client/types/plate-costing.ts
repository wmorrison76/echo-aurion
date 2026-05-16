// Types for tracking plate costs, waste, and comp analysis

export type PlateCostingMethod = "actual" | "standard" | "target";

export type WasteCategory = "prep-waste" | "cooking-loss" | "plate-waste" | "disposal" | "spoilage";

export type CompType = "menu-item" | "course" | "percentage" | "fixed-amount";

// Plate costing breakdown
export type PlateCost = {
  id: string;
  recipeId: string;
  recipeName: string;
  platingDate: number;
  methodType: PlateCostingMethod;
  ingredientCosts: IngredientCostLine[];
  laborCost: number; // Prep and plating labor
  overheadCost: number; // Utilities, equipment depreciation
  totalCost: number;
  costPerPortion: number;
  portionSize: number;
  portionUnit: string;
  yieldPercent: number; // After waste
  waste: WasteRecord[];
  notes?: string;
  createdBy?: string;
  timestamp: number;
};

// Individual ingredient cost in a plate
export type IngredientCostLine = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplierId: string;
  supplierSku: string;
  costMethod: "actual" | "standard" | "estimated";
  costDate: number;
};

// Waste tracking for a plate
export type WasteRecord = {
  id: string;
  plateCostId: string;
  ingredientId: string;
  ingredientName: string;
  wasteCategory: WasteCategory;
  quantityWasted: number;
  unit: string;
  costOfWaste: number;
  percentage: number; // % of original quantity
  reason: string; // e.g., "Trim", "Overcooking", "Customer plate waste"
  preventionNotes?: string;
  timestamp: number;
};

// Actual vs standard cost comparison
export type CostVariance = {
  id: string;
  plateCostId: string;
  recipeId: string;
  standardCost: number;
  actualCost: number;
  varianceAmount: number;
  variancePercent: number;
  costPerPortionStandard: number;
  costPerPortionActual: number;
  varianceCategory: "ingredient-price" | "yield-loss" | "portion-size" | "labor";
  analysisDate: number;
  notes?: string;
};

// Comp analysis record
export type CompAnalysis = {
  id: string;
  eventId: string;
  customerId?: string;
  compType: CompType;
  compReason: "service-recovery" | "vip" | "promotional" | "operational-issue" | "other";
  itemRecipeId?: string; // For menu-item comps
  courseNumber?: number; // For course comps
  compValue: number;
  costOfComp: number; // COGS value
  profitLoss: number; // Value - Cost
  justificationText: string;
  approvedBy?: string;
  approvalTime?: number;
  timestamp: number;
};

// Comp trends analysis
export type CompTrends = {
  period: { startDate: number; endDate: number };
  totalComps: number;
  totalCompValue: number;
  totalCompCost: number;
  compAsPercentOfRevenue: number;
  compReasons: { reason: string; count: number; totalValue: number }[];
  topCommodItems: { recipeId: string; count: number; totalValue: number }[];
  customerComps: { customerId: string; count: number; totalValue: number }[];
  approvalRate: number; // % that required approval
};

// Plate cost distribution by component
export type CostDistribution = {
  id: string;
  plateCostId: string;
  ingredientsCost: number;
  ingredientsCostPercent: number;
  laborCost: number;
  laborCostPercent: number;
  overheadCost: number;
  overheadCostPercent: number;
  wasteCost: number;
  wasteCostPercent: number;
  totalCost: number;
};

// Menu engineering - combining multiple plates/courses
export type MenuItemCosting = {
  id: string;
  recipeId: string;
  recipeName: string;
  averagePlateCost: number;
  minimumPlateCost: number;
  maximumPlateCost: number;
  standardDeviation: number;
  dataSamples: number; // Number of plates costed
  samplePeriod: { startDate: number; endDate: number };
  pricePoint: number;
  targetMargin: number;
  actualMargin: number;
  status: "on-target" | "below-target" | "above-target";
  recommendations?: string[];
};

// Portion control tracking
export type PortionControl = {
  id: string;
  plateCostId: string;
  recipeId: string;
  plannedPortionSize: number;
  plannedPortionUnit: string;
  actualPortionSize: number;
  actualPortionUnit: string;
  portionVariance: number;
  variancePercent: number;
  costImpact: number; // Cost difference due to portion variance
  timestamp: number;
};

// Yield analysis - understanding prep loss percentage
export type YieldAnalysis = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  period: { startDate: number; endDate: number };
  
  // Quantities
  totalQuantityPurchased: number;
  totalQuantityUsable: number;
  yieldPercent: number;
  expectedYieldPercent: number;
  variancePercent: number;
  
  // Cost impact
  purchasedAmount: number;
  wasteAmount: number;
  wasteCost: number;
  
  // Data points
  measurements: { date: number; purchased: number; usable: number; yieldPercent: number }[];
  
  notes?: string;
};

// Recipe cost history - track price changes over time
export type RecipeCostHistory = {
  id: string;
  recipeId: string;
  recipeName: string;
  dateRecorded: number;
  costPerPortion: number;
  totalIngredientCost: number;
  methodology: PlateCostingMethod;
  dataPoints: number; // How many plates costed
  approvedBy?: string;
  notes?: string;
};

// Comparative analysis across recipes
export type RecipeCostComparison = {
  baseRecipeId: string;
  baseRecipeName: string;
  comparisonRecipeId: string;
  comparisonRecipeName: string;
  baseCostPerPortion: number;
  comparisonCostPerPortion: number;
  costDifference: number;
  costDifferencePercent: number;
  basePrice: number;
  comparisonPrice: number;
  baseMargin: number;
  comparisonMargin: number;
  marginDifference: number;
  analysisDate: number;
};
