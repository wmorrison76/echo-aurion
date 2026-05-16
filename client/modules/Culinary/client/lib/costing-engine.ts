// Costing Engine - Core business intelligence for food costs
// Tracks recipe costs, variance, profitability, and trends

export interface CostEntry {
  id: string;
  timestamp: number;
  recipeId: string;
  recipeName: string;
  ingredientCosts: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
  }>;
  totalRecipeCost: number;
  portionCount: number;
  costPerPortion: number;
  sellingPrice: number;
  portionSize: string;
  notes?: string;
}

export interface RecipeCostSnapshot {
  recipeId: string;
  recipeName: string;
  baselineCost: number;
  baselinePrice: number;
  baselineMargin: number;
  lastUpdated: number;
  history: CostEntry[];
}

export interface CostVariance {
  recipeId: string;
  recipeName: string;
  currentCost: number;
  previousCost: number;
  varianceAmount: number;
  variancePercent: number;
  trend: "up" | "down" | "stable";
}

export interface ProfitabilityMetrics {
  recipeId: string;
  recipeName: string;
  totalRecipeCost: number;
  costPerPortion: number;
  sellingPricePerPortion: number;
  grossProfit: number;
  profitMargin: number;
  foodCostPercent: number;
  targetMargin: number;
  isAtRisk: boolean;
  recommendation?: string;
}

export interface DailyFoodCostReport {
  date: string;
  totalCosts: number;
  totalRevenue: number;
  foodCostPercent: number;
  recipeBreakdown: Array<{
    recipeId: string;
    recipeName: string;
    portionsSold: number;
    totalCost: number;
    totalRevenue: number;
  }>;
}

export interface CostTrendData {
  period: "daily" | "weekly" | "monthly";
  timeframe: Array<{
    date: string;
    foodCostPercent: number;
    averageCostPerPortion: number;
    totalCosts: number;
    totalRevenue: number;
  }>;
  trendDirection: "improving" | "declining" | "stable";
  averagePercent: number;
}

// Target food cost % for different service types
const TARGET_FOOD_COST_PERCENT: Record<string, number> = {
  "fine-dining": 28, // 28% food cost is typical
  "casual-dining": 32,
  "quick-service": 25,
  "cafe": 35,
  "banquet": 30,
  "default": 30,
};

/**
 * Calculate cost per portion
 * @param totalIngredientCost - Sum of all ingredient costs
 * @param portionCount - Number of portions yielded
 * @returns Cost per single portion
 */
export function calculateCostPerPortion(totalIngredientCost: number, portionCount: number): number {
  if (portionCount <= 0) return 0;
  return Math.round((totalIngredientCost / portionCount) * 100) / 100;
}

/**
 * Calculate gross profit
 * @param sellingPrice - Selling price per portion
 * @param costPerPortion - Cost per portion
 * @returns Gross profit amount
 */
export function calculateGrossProfit(sellingPrice: number, costPerPortion: number): number {
  return Math.round((sellingPrice - costPerPortion) * 100) / 100;
}

/**
 * Calculate profit margin percentage
 * @param sellingPrice - Selling price per portion
 * @param costPerPortion - Cost per portion
 * @returns Profit margin as percentage (0-100)
 */
export function calculateProfitMargin(sellingPrice: number, costPerPortion: number): number {
  if (sellingPrice <= 0) return 0;
  return Math.round(((sellingPrice - costPerPortion) / sellingPrice) * 10000) / 100;
}

/**
 * Calculate food cost percentage
 * @param costPerPortion - Cost per portion
 * @param sellingPrice - Selling price per portion
 * @returns Food cost as percentage (0-100)
 */
export function calculateFoodCostPercent(costPerPortion: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  return Math.round((costPerPortion / sellingPrice) * 10000) / 100;
}

/**
 * Calculate cost variance between two points
 * @param currentCost - Current cost per portion
 * @param previousCost - Previous cost per portion
 * @returns Variance object with amounts and percentages
 */
export function calculateVariance(currentCost: number, previousCost: number): Omit<CostVariance, "recipeId" | "recipeName"> {
  const varianceAmount = currentCost - previousCost;
  const variancePercent = previousCost > 0 ? Math.round((varianceAmount / previousCost) * 10000) / 100 : 0;

  let trend: "up" | "down" | "stable" = "stable";
  if (Math.abs(variancePercent) > 2) {
    trend = variancePercent > 0 ? "up" : "down";
  }

  return {
    currentCost,
    previousCost,
    varianceAmount,
    variancePercent,
    trend,
  };
}

/**
 * Get profitability metrics for a recipe
 * @param costPerPortion - Cost per portion
 * @param sellingPrice - Selling price per portion
 * @param targetMargin - Target profit margin (default 65%)
 * @returns Profitability metrics with risk assessment
 */
export function getProfitabilityMetrics(
  recipeId: string,
  recipeName: string,
  totalRecipeCost: number,
  costPerPortion: number,
  sellingPrice: number,
  portionCount: number,
  serviceType: string = "default",
  targetMargin: number = 65,
): ProfitabilityMetrics {
  const grossProfit = calculateGrossProfit(sellingPrice, costPerPortion);
  const profitMargin = calculateProfitMargin(sellingPrice, costPerPortion);
  const foodCostPercent = calculateFoodCostPercent(costPerPortion, sellingPrice);
  const targetFoodCost = TARGET_FOOD_COST_PERCENT[serviceType] || TARGET_FOOD_COST_PERCENT.default;

  const isAtRisk = foodCostPercent > targetFoodCost || profitMargin < targetMargin;

  let recommendation: string | undefined;
  if (foodCostPercent > targetFoodCost) {
    recommendation = `Food cost (${foodCostPercent}%) exceeds target (${targetFoodCost}%). Consider ingredient substitution or price adjustment.`;
  } else if (profitMargin < targetMargin) {
    recommendation = `Profit margin (${profitMargin}%) below target (${targetMargin}%). Review pricing strategy.`;
  }

  return {
    recipeId,
    recipeName,
    totalRecipeCost,
    costPerPortion,
    sellingPricePerPortion: sellingPrice,
    grossProfit,
    profitMargin,
    foodCostPercent,
    targetMargin,
    isAtRisk,
    recommendation,
  };
}

/**
 * Aggregate daily costs from multiple entries
 * @param entries - Array of cost entries for a day
 * @param date - Date string (YYYY-MM-DD)
 * @returns Daily food cost report
 */
export function generateDailyReport(entries: CostEntry[], date: string): DailyFoodCostReport {
  const recipeMap = new Map<string, { portionsSold: number; totalCost: number; totalRevenue: number }>();

  let totalCosts = 0;
  let totalRevenue = 0;

  entries.forEach((entry) => {
    totalCosts += entry.totalRecipeCost;
    totalRevenue += entry.sellingPrice * entry.portionCount;

    if (!recipeMap.has(entry.recipeId)) {
      recipeMap.set(entry.recipeId, {
        portionsSold: 0,
        totalCost: 0,
        totalRevenue: 0,
      });
    }

    const existing = recipeMap.get(entry.recipeId)!;
    existing.portionsSold += entry.portionCount;
    existing.totalCost += entry.totalRecipeCost;
    existing.totalRevenue += entry.sellingPrice * entry.portionCount;
  });

  const foodCostPercent = totalRevenue > 0 ? Math.round((totalCosts / totalRevenue) * 10000) / 100 : 0;

  const recipeBreakdown = Array.from(recipeMap.entries()).map(([recipeId, data]) => ({
    recipeId,
    recipeName: entries.find((e) => e.recipeId === recipeId)?.recipeName || "Unknown",
    ...data,
  }));

  return {
    date,
    totalCosts,
    totalRevenue,
    foodCostPercent,
    recipeBreakdown,
  };
}

/**
 * Generate cost trend analysis
 * @param reports - Array of daily reports
 * @param period - Time period for analysis
 * @returns Trend data with direction analysis
 */
export function generateTrendData(
  reports: DailyFoodCostReport[],
  period: "daily" | "weekly" | "monthly" = "daily",
): CostTrendData {
  const timeframe = reports.map((report) => {
    const averageCostPerPortion =
      report.recipeBreakdown.length > 0
        ? Math.round(
            (report.recipeBreakdown.reduce((sum, r) => sum + r.totalCost, 0) /
              report.recipeBreakdown.reduce((sum, r) => sum + r.portionsSold, 0)) *
              100,
          ) / 100
        : 0;

    return {
      date: report.date,
      foodCostPercent: report.foodCostPercent,
      averageCostPerPortion,
      totalCosts: report.totalCosts,
      totalRevenue: report.totalRevenue,
    };
  });

  const percentages = timeframe.map((t) => t.foodCostPercent);
  const averagePercent = Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100) / 100;

  // Determine trend direction
  let trendDirection: "improving" | "declining" | "stable" = "stable";
  if (timeframe.length >= 2) {
    const firstHalf = percentages.slice(0, Math.floor(percentages.length / 2));
    const secondHalf = percentages.slice(Math.floor(percentages.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    if (Math.abs(change) > 1) {
      trendDirection = change < 0 ? "improving" : "declining";
    }
  }

  return {
    period,
    timeframe,
    trendDirection,
    averagePercent,
  };
}

/**
 * Identify recipes at risk of profitability issues
 * @param metrics - Array of profitability metrics
 * @returns Sorted array of at-risk recipes
 */
export function identifyRiskRecipes(metrics: ProfitabilityMetrics[]): ProfitabilityMetrics[] {
  return metrics.filter((m) => m.isAtRisk).sort((a, b) => b.foodCostPercent - a.foodCostPercent);
}

/**
 * Calculate cost savings opportunity
 * @param currentFoodCostPercent - Current food cost %
 * @param targetFoodCostPercent - Target food cost %
 * @param totalDailyRevenue - Total revenue for period
 * @returns Potential savings amount
 */
export function calculateSavingsOpportunity(
  currentFoodCostPercent: number,
  targetFoodCostPercent: number,
  totalDailyRevenue: number,
): number {
  const currentCost = (currentFoodCostPercent / 100) * totalDailyRevenue;
  const targetCost = (targetFoodCostPercent / 100) * totalDailyRevenue;
  return Math.max(0, currentCost - targetCost);
}
