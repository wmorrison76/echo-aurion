import type {
  PlateCost,
  WasteRecord,
  CostVariance,
  CompAnalysis,
  YieldAnalysis,
  RecipeCostHistory,
  CostDistribution,
  MenuItemCosting,
  PortionControl,
} from "@/types/plate-costing";
import {
  MOCK_PLATE_COSTS,
  MOCK_COST_VARIANCES,
  MOCK_COMP_ANALYSES,
  MOCK_YIELD_ANALYSES,
  MOCK_RECIPE_COST_HISTORY,
} from "@/data/plate-costing";

// Plate cost utilities
export function getPlateCostById(id: string): PlateCost | undefined {
  return MOCK_PLATE_COSTS.find((p) => p.id === id);
}

export function getAllPlateCosts(): PlateCost[] {
  return [...MOCK_PLATE_COSTS];
}

export function getPlateCostsByRecipe(recipeId: string): PlateCost[] {
  return MOCK_PLATE_COSTS.filter((p) => p.recipeId === recipeId);
}

export function getPlateCostsByDateRange(
  startDate: number,
  endDate: number,
): PlateCost[] {
  return MOCK_PLATE_COSTS.filter(
    (p) => p.platingDate >= startDate && p.platingDate <= endDate,
  );
}

export function getAveragePlateCost(recipeId: string): number {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  if (plateCosts.length === 0) return 0;
  const total = plateCosts.reduce((sum, p) => sum + p.costPerPortion, 0);
  return total / plateCosts.length;
}

export function getHighestPlateCost(recipeId: string): number {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  return plateCosts.length > 0
    ? Math.max(...plateCosts.map((p) => p.costPerPortion))
    : 0;
}

export function getLowestPlateCost(recipeId: string): number {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  return plateCosts.length > 0
    ? Math.min(...plateCosts.map((p) => p.costPerPortion))
    : 0;
}

export function getStandardDeviationOfPlateCost(recipeId: string): number {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  if (plateCosts.length < 2) return 0;

  const avg = getAveragePlateCost(recipeId);
  const squareDiffs = plateCosts.map((p) => Math.pow(p.costPerPortion - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / plateCosts.length;
  return Math.sqrt(avgSquareDiff);
}

// Waste utilities
export function getWasteRecordsByPlateCost(plateCostId: string): WasteRecord[] {
  const plateCost = getPlateCostById(plateCostId);
  return plateCost ? [...plateCost.waste] : [];
}

export function getTotalWasteCostByRecipe(recipeId: string): number {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  return plateCosts.reduce((sum, p) => {
    const wasteSum = p.waste.reduce((wSum, w) => wSum + w.costOfWaste, 0);
    return sum + wasteSum;
  }, 0);
}

export function getWastePercentageByCategory(
  recipeId: string,
  category: string,
): number {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  if (plateCosts.length === 0) return 0;

  let totalWaste = 0;
  let totalIngredientCost = 0;

  plateCosts.forEach((p) => {
    const categoryWaste = p.waste
      .filter((w) => w.wasteCategory === category)
      .reduce((sum, w) => sum + w.costOfWaste, 0);
    totalWaste += categoryWaste;
    totalIngredientCost += p.ingredientCosts.reduce((sum, ic) => sum + ic.totalCost, 0);
  });

  return totalIngredientCost > 0 ? (totalWaste / totalIngredientCost) * 100 : 0;
}

export function getTotalWastePercentage(plateCostId: string): number {
  const plateCost = getPlateCostById(plateCostId);
  if (!plateCost) return 0;

  const totalWasteCost = plateCost.waste.reduce((sum, w) => sum + w.costOfWaste, 0);
  const totalIngredientCost = plateCost.ingredientCosts.reduce(
    (sum, ic) => sum + ic.totalCost,
    0,
  );

  return totalIngredientCost > 0 ? (totalWasteCost / totalIngredientCost) * 100 : 0;
}

// Cost variance utilities
export function getCostVarianceById(id: string): CostVariance | undefined {
  return MOCK_COST_VARIANCES.find((v) => v.id === id);
}

export function getCostVariancesByRecipe(recipeId: string): CostVariance[] {
  return MOCK_COST_VARIANCES.filter((v) => v.recipeId === recipeId);
}

export function getAverageCostVariancePercent(recipeId: string): number {
  const variances = getCostVariancesByRecipe(recipeId);
  if (variances.length === 0) return 0;
  const total = variances.reduce((sum, v) => sum + v.variancePercent, 0);
  return total / variances.length;
}

export function getVarianceByCategory(
  recipeId: string,
  category: string,
): CostVariance[] {
  return getCostVariancesByRecipe(recipeId).filter(
    (v) => v.varianceCategory === category,
  );
}

export function isRecipeOnTarget(
  recipeId: string,
  targetMargin: number,
): boolean {
  const avgCost = getAveragePlateCost(recipeId);
  const avgVariance = getAverageCostVariancePercent(recipeId);
  return Math.abs(avgVariance) <= targetMargin;
}

// Comp analysis utilities
export function getCompAnalysisById(id: string): CompAnalysis | undefined {
  return MOCK_COMP_ANALYSES.find((c) => c.id === id);
}

export function getAllCompAnalyses(): CompAnalysis[] {
  return [...MOCK_COMP_ANALYSES];
}

export function getCompAnalysesByEvent(eventId: string): CompAnalysis[] {
  return MOCK_COMP_ANALYSES.filter((c) => c.eventId === eventId);
}

export function getCompAnalysesByCustomer(customerId: string): CompAnalysis[] {
  return MOCK_COMP_ANALYSES.filter((c) => c.customerId === customerId);
}

export function getCompAnalysesByReason(
  reason: CompAnalysis["compReason"],
): CompAnalysis[] {
  return MOCK_COMP_ANALYSES.filter((c) => c.compReason === reason);
}

export function getTotalCompValue(period: {
  startDate: number;
  endDate: number;
}): number {
  return MOCK_COMP_ANALYSES.filter(
    (c) => c.timestamp >= period.startDate && c.timestamp <= period.endDate,
  ).reduce((sum, c) => sum + c.compValue, 0);
}

export function getTotalCompCost(period: {
  startDate: number;
  endDate: number;
}): number {
  return MOCK_COMP_ANALYSES.filter(
    (c) => c.timestamp >= period.startDate && c.timestamp <= period.endDate,
  ).reduce((sum, c) => sum + c.costOfComp, 0);
}

export function getTotalCompProfitLoss(period: {
  startDate: number;
  endDate: number;
}): number {
  return MOCK_COMP_ANALYSES.filter(
    (c) => c.timestamp >= period.startDate && c.timestamp <= period.endDate,
  ).reduce((sum, c) => sum + c.profitLoss, 0);
}

export function getCompApprovalRate(period: {
  startDate: number;
  endDate: number;
}): number {
  const comps = MOCK_COMP_ANALYSES.filter(
    (c) => c.timestamp >= period.startDate && c.timestamp <= period.endDate,
  );
  if (comps.length === 0) return 0;
  const approved = comps.filter((c) => c.approvedBy).length;
  return (approved / comps.length) * 100;
}

export function getCompTrendsByReason(period: {
  startDate: number;
  endDate: number;
}): Array<{ reason: string; count: number; totalValue: number }> {
  const comps = MOCK_COMP_ANALYSES.filter(
    (c) => c.timestamp >= period.startDate && c.timestamp <= period.endDate,
  );

  const reasons = new Map<
    string,
    { count: number; totalValue: number }
  >();

  comps.forEach((c) => {
    const existing = reasons.get(c.compReason) || {
      count: 0,
      totalValue: 0,
    };
    reasons.set(c.compReason, {
      count: existing.count + 1,
      totalValue: existing.totalValue + c.compValue,
    });
  });

  return Array.from(reasons.entries()).map(([reason, data]) => ({
    reason,
    count: data.count,
    totalValue: data.totalValue,
  }));
}

// Yield analysis utilities
export function getYieldAnalysisById(id: string): YieldAnalysis | undefined {
  return MOCK_YIELD_ANALYSES.find((y) => y.id === id);
}

export function getYieldAnalysisByIngredient(
  ingredientId: string,
): YieldAnalysis | undefined {
  return MOCK_YIELD_ANALYSES.find((y) => y.ingredientId === ingredientId);
}

export function getAllYieldAnalyses(): YieldAnalysis[] {
  return [...MOCK_YIELD_ANALYSES];
}

export function getYieldTrendForIngredient(
  ingredientId: string,
): Array<{ date: number; yieldPercent: number }> {
  const analysis = getYieldAnalysisByIngredient(ingredientId);
  return analysis
    ? analysis.measurements.map((m) => ({
        date: m.date,
        yieldPercent: m.yieldPercent,
      }))
    : [];
}

export function isYieldBelowExpected(ingredientId: string): boolean {
  const analysis = getYieldAnalysisByIngredient(ingredientId);
  return analysis ? analysis.yieldPercent < analysis.expectedYieldPercent : false;
}

export function getWasteCostForIngredient(ingredientId: string): number {
  const analysis = getYieldAnalysisByIngredient(ingredientId);
  return analysis ? analysis.wasteCost : 0;
}

// Recipe cost history utilities
export function getRecipeCostHistoryById(recipeId: string): RecipeCostHistory[] {
  return MOCK_RECIPE_COST_HISTORY.filter((h) => h.recipeId === recipeId).sort(
    (a, b) => b.dateRecorded - a.dateRecorded,
  );
}

export function getLatestRecipeCost(recipeId: string): RecipeCostHistory | undefined {
  const history = getRecipeCostHistoryById(recipeId);
  return history.length > 0 ? history[0] : undefined;
}

export function getRecipeCostTrend(recipeId: string): Array<{
  date: number;
  cost: number;
}> {
  return getRecipeCostHistoryById(recipeId).map((h) => ({
    date: h.dateRecorded,
    cost: h.costPerPortion,
  }));
}

export function getRecipeCostChangePercent(recipeId: string): number {
  const history = getRecipeCostHistoryById(recipeId);
  if (history.length < 2) return 0;
  const oldest = history[history.length - 1];
  const latest = history[0];
  const change = latest.costPerPortion - oldest.costPerPortion;
  return (change / oldest.costPerPortion) * 100;
}

// Cost distribution utilities
export function calculateCostDistribution(plateCostId: string): CostDistribution | null {
  const plateCost = getPlateCostById(plateCostId);
  if (!plateCost) return null;

  const ingredientsCost = plateCost.ingredientCosts.reduce(
    (sum, ic) => sum + ic.totalCost,
    0,
  );
  const wasteCost = plateCost.waste.reduce((sum, w) => sum + w.costOfWaste, 0);
  const totalCost =
    ingredientsCost + plateCost.laborCost + plateCost.overheadCost + wasteCost;

  return {
    id: `dist-${plateCostId}`,
    plateCostId,
    ingredientsCost,
    ingredientsCostPercent: totalCost > 0 ? (ingredientsCost / totalCost) * 100 : 0,
    laborCost: plateCost.laborCost,
    laborCostPercent: totalCost > 0 ? (plateCost.laborCost / totalCost) * 100 : 0,
    overheadCost: plateCost.overheadCost,
    overheadCostPercent: totalCost > 0 ? (plateCost.overheadCost / totalCost) * 100 : 0,
    wasteCost,
    wasteCostPercent: totalCost > 0 ? (wasteCost / totalCost) * 100 : 0,
    totalCost,
  };
}

// Menu item costing (aggregate analysis)
export function calculateMenuItemCosting(
  recipeId: string,
  pricePoint: number,
  targetMargin: number,
): MenuItemCosting {
  const plateCosts = getPlateCostsByRecipe(recipeId);
  const costHistory = getLatestRecipeCost(recipeId);

  if (plateCosts.length === 0) {
    return {
      id: `mic-${recipeId}`,
      recipeId,
      recipeName: "Unknown",
      averagePlateCost: 0,
      minimumPlateCost: 0,
      maximumPlateCost: 0,
      standardDeviation: 0,
      dataSamples: 0,
      samplePeriod: { startDate: 0, endDate: 0 },
      pricePoint,
      targetMargin,
      actualMargin: 0,
      status: "below-target",
      recommendations: ["No cost data available"],
    };
  }

  const avgCost = getAveragePlateCost(recipeId);
  const minCost = getLowestPlateCost(recipeId);
  const maxCost = getHighestPlateCost(recipeId);
  const stdDev = getStandardDeviationOfPlateCost(recipeId);

  const actualMargin = pricePoint > 0 ? ((pricePoint - avgCost) / pricePoint) * 100 : 0;
  const status =
    actualMargin >= targetMargin
      ? "on-target"
      : actualMargin < targetMargin - 5
        ? "below-target"
        : "above-target";

  const recommendations: string[] = [];
  if (actualMargin < targetMargin) {
    recommendations.push("Consider price increase");
  }
  if (stdDev > avgCost * 0.15) {
    recommendations.push("Cost consistency issues detected");
  }

  return {
    id: `mic-${recipeId}`,
    recipeId,
    recipeName: costHistory?.recipeName ?? "Unknown Recipe",
    averagePlateCost: avgCost,
    minimumPlateCost: minCost,
    maximumPlateCost: maxCost,
    standardDeviation: stdDev,
    dataSamples: plateCosts.length,
    samplePeriod: {
      startDate: Math.min(...plateCosts.map((p) => p.platingDate)),
      endDate: Math.max(...plateCosts.map((p) => p.platingDate)),
    },
    pricePoint,
    targetMargin,
    actualMargin,
    status,
    recommendations,
  };
}

// Portion control analysis
export function calculatePortionVariance(
  plateCostId: string,
  plannedPortionSize: number,
  plannedPortionUnit: string,
): PortionControl | null {
  const plateCost = getPlateCostById(plateCostId);
  if (!plateCost) return null;

  const actualPortionSize = plateCost.portionSize;
  const variance = actualPortionSize - plannedPortionSize;
  const variancePercent =
    plannedPortionSize > 0 ? (variance / plannedPortionSize) * 100 : 0;

  // Assume $12 per oz variance
  const costPerUnit = 12;
  const costImpact = variance * costPerUnit;

  return {
    id: `pc-${plateCostId}`,
    plateCostId,
    recipeId: plateCost.recipeId,
    plannedPortionSize,
    plannedPortionUnit,
    actualPortionSize: plateCost.portionSize,
    actualPortionUnit: plateCost.portionUnit,
    portionVariance: variance,
    variancePercent,
    costImpact,
    timestamp: plateCost.platingDate,
  };
}
