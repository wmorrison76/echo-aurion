/** * Recipe Type Definitions * TypeScript types for cocktail recipe system */ export interface CocktailRecipe {
  id: string;
  name: string;
  version: string; // Semantic versioning: 2.3.0 status:"draft" |"testing" |"active" |"archived"; // Ingredients ingredients: RecipeIngredient[]; // Instructions instructions: RecipeStep[]; // Costing costing: RecipeCosting; // Metadata category:"classic" |"signature" |"seasonal" |"r&d"; tags: string[]; photos: string[]; notes: string; // Version control parentVersion?: string; // Previous version ID changes: VersionChange[]; // Performance performance: RecipePerformance; // Timestamps createdAt: Date; updatedAt: Date; createdBy: string;
}
export interface RecipeIngredient {
  id: string;
  ingredientId: string; // Link to inventory name: string; quantity: number; unit:"oz" |"ml" |"dash" |"slice" |"unit"; cost: number; // Current cost from inventory notes?: string;
}
export interface RecipeStep {
  id: string;
  order: number;
  instruction: string;
  duration?: number; // seconds temperature?: number; // fahrenheit notes?: string;
}
export interface RecipeCosting {
  totalCost: number;
  costPerOz: number;
  sellingPrice: number;
  margin: number;
  marginPercent: number;
  targetMargin?: number;
  lastUpdated: Date;
}
export interface VersionChange {
  version: string;
  changes: string[];
  changedBy: string;
  timestamp: Date;
}
export interface RecipePerformance {
  salesCount: number;
  revenue: number;
  profit: number;
  averageRating: number;
  reviewCount: number;
  last30Days: PerformancePeriod;
  last90Days: PerformancePeriod;
}
export interface PerformancePeriod {
  sales: number;
  revenue: number;
  profit: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}
