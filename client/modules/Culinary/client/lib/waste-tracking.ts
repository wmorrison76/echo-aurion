// Waste Tracking Module
// Tracks food waste, calculates cost impact, and identifies reduction opportunities

export type WasteCategory = "spoilage" | "prep-loss" | "plate-waste" | "overproduction" | "other";

export interface WasteEntry {
  id: string;
  timestamp: number;
  date: string;
  category: WasteCategory;
  ingredientName: string;
  ingredientId?: string;
  quantityWasted: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  reason?: string;
  preventionNotes?: string;
}

export interface DailyWasteSummary {
  date: string;
  totalWasteCost: number;
  totalWasteQuantity: number;
  wastePercent: number;
  byCategory: Record<WasteCategory, {
    count: number;
    quantity: number;
    totalCost: number;
  }>;
  entries: WasteEntry[];
}

export interface WasteTrendData {
  period: "daily" | "weekly" | "monthly";
  dataPoints: Array<{
    date: string;
    totalCost: number;
    wastePercent: number;
    itemCount: number;
  }>;
  averageWasteCost: number;
  averageWastePercent: number;
  trendDirection: "improving" | "worsening" | "stable";
}

export interface WasteAnalysis {
  topWastedItems: Array<{
    ingredientName: string;
    quantityWasted: number;
    totalCost: number;
    occurrences: number;
  }>;
  topWasteCategories: Array<{
    category: WasteCategory;
    totalCost: number;
    percentage: number;
  }>;
  costSavingsOpportunities: Array<{
    item: string;
    estimatedMonthlySavings: number;
    recommendation: string;
  }>;
}

// Waste cost impact on daily operations
export interface WasteCostImpact {
  date: string;
  totalDailyCost: number;
  totalDailyRevenue: number;
  wasteCost: number;
  wasteAsPercentOfFood: number;
  wasteAsPercentOfRevenue: number;
  potentialSavings: number;
}

/**
 * Create waste entry
 * @param category - Type of waste
 * @param ingredientName - Name of wasted ingredient
 * @param quantity - Amount wasted
 * @param unit - Unit of measurement
 * @param costPerUnit - Cost per unit
 * @returns Waste entry object
 */
export function createWasteEntry(
  category: WasteCategory,
  ingredientName: string,
  quantity: number,
  unit: string,
  costPerUnit: number,
  reason?: string,
  preventionNotes?: string,
): WasteEntry {
  const totalCost = quantity * costPerUnit;
  const now = new Date();
  const date = now.toISOString().split("T")[0];

  return {
    id: `waste-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: now.getTime(),
    date,
    category,
    ingredientName,
    quantityWasted: quantity,
    unit,
    costPerUnit,
    totalCost,
    reason,
    preventionNotes,
  };
}

/**
 * Generate daily waste summary
 * @param entries - Waste entries for the day
 * @param dailyRevenue - Total revenue for the day
 * @returns Daily summary with breakdown
 */
export function generateDailyWasteSummary(
  entries: WasteEntry[],
  dailyRevenue: number = 0,
): DailyWasteSummary {
  if (entries.length === 0) {
    return {
      date: new Date().toISOString().split("T")[0],
      totalWasteCost: 0,
      totalWasteQuantity: 0,
      wastePercent: 0,
      byCategory: {
        spoilage: { count: 0, quantity: 0, totalCost: 0 },
        "prep-loss": { count: 0, quantity: 0, totalCost: 0 },
        "plate-waste": { count: 0, quantity: 0, totalCost: 0 },
        overproduction: { count: 0, quantity: 0, totalCost: 0 },
        other: { count: 0, quantity: 0, totalCost: 0 },
      },
      entries: [],
    };
  }

  const totalWasteCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
  const totalWasteQuantity = entries.reduce((sum, e) => sum + e.quantityWasted, 0);
  const wastePercent = dailyRevenue > 0 ? Math.round((totalWasteCost / dailyRevenue) * 10000) / 100 : 0;

  const byCategory: Record<WasteCategory, { count: number; quantity: number; totalCost: number }> = {
    spoilage: { count: 0, quantity: 0, totalCost: 0 },
    "prep-loss": { count: 0, quantity: 0, totalCost: 0 },
    "plate-waste": { count: 0, quantity: 0, totalCost: 0 },
    overproduction: { count: 0, quantity: 0, totalCost: 0 },
    other: { count: 0, quantity: 0, totalCost: 0 },
  };

  entries.forEach((entry) => {
    const cat = byCategory[entry.category];
    cat.count++;
    cat.quantity += entry.quantityWasted;
    cat.totalCost += entry.totalCost;
  });

  return {
    date: entries[0].date,
    totalWasteCost,
    totalWasteQuantity,
    wastePercent,
    byCategory,
    entries,
  };
}

/**
 * Calculate waste cost impact on daily operations
 * @param wasteCost - Total waste cost for the day
 * @param dailyCost - Total food cost for the day
 * @param dailyRevenue - Total revenue for the day
 * @returns Impact analysis
 */
export function calculateWasteCostImpact(
  date: string,
  wasteCost: number,
  dailyCost: number,
  dailyRevenue: number,
): WasteCostImpact {
  const wasteAsPercentOfFood = dailyCost > 0 ? Math.round((wasteCost / dailyCost) * 10000) / 100 : 0;
  const wasteAsPercentOfRevenue = dailyRevenue > 0 ? Math.round((wasteCost / dailyRevenue) * 10000) / 100 : 0;

  // Potential savings if waste was reduced by 50%
  const potentialSavings = wasteCost / 2;

  return {
    date,
    totalDailyCost: dailyCost,
    totalDailyRevenue: dailyRevenue,
    wasteCost,
    wasteAsPercentOfFood,
    wasteAsPercentOfRevenue,
    potentialSavings,
  };
}

/**
 * Generate waste trend data
 * @param summaries - Array of daily waste summaries
 * @returns Trend analysis with direction
 */
export function generateWasteTrendData(
  summaries: DailyWasteSummary[],
  period: "daily" | "weekly" | "monthly" = "daily",
): WasteTrendData {
  const dataPoints = summaries.map((summary) => ({
    date: summary.date,
    totalCost: summary.totalWasteCost,
    wastePercent: summary.wastePercent,
    itemCount: summary.entries.length,
  }));

  const totalWasteCost = dataPoints.reduce((sum, dp) => sum + dp.totalCost, 0);
  const averageWasteCost = dataPoints.length > 0 ? totalWasteCost / dataPoints.length : 0;

  const wastePercents = dataPoints.map((dp) => dp.wastePercent);
  const averageWastePercent = wastePercents.length > 0 ? wastePercents.reduce((a, b) => a + b, 0) / wastePercents.length : 0;

  // Trend direction
  let trendDirection: "improving" | "worsening" | "stable" = "stable";
  if (dataPoints.length >= 2) {
    const firstHalf = wastePercents.slice(0, Math.floor(wastePercents.length / 2));
    const secondHalf = wastePercents.slice(Math.floor(wastePercents.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (Math.abs(secondAvg - firstAvg) > 0.5) {
      trendDirection = secondAvg < firstAvg ? "improving" : "worsening";
    }
  }

  return {
    period,
    dataPoints,
    averageWasteCost: Math.round(averageWasteCost * 100) / 100,
    averageWastePercent: Math.round(averageWastePercent * 100) / 100,
    trendDirection,
  };
}

/**
 * Analyze waste patterns and identify top wasted items
 * @param entries - Array of all waste entries
 * @returns Waste analysis with recommendations
 */
export function analyzeWastePatterns(entries: WasteEntry[]): WasteAnalysis {
  // Top wasted items
  const itemMap = new Map<string, { quantity: number; cost: number; occurrences: number }>();

  entries.forEach((entry) => {
    const existing = itemMap.get(entry.ingredientName) || {
      quantity: 0,
      cost: 0,
      occurrences: 0,
    };
    existing.quantity += entry.quantityWasted;
    existing.cost += entry.totalCost;
    existing.occurrences++;
    itemMap.set(entry.ingredientName, existing);
  });

  const topWastedItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({
      ingredientName: name,
      quantityWasted: data.quantity,
      totalCost: data.cost,
      occurrences: data.occurrences,
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5);

  // Top waste categories
  const categoryMap = new Map<WasteCategory, number>();
  entries.forEach((entry) => {
    categoryMap.set(entry.category, (categoryMap.get(entry.category) || 0) + entry.totalCost);
  });

  const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0);

  const topWasteCategories = Array.from(categoryMap.entries())
    .map(([category, cost]) => ({
      category,
      totalCost: cost,
      percentage: totalCost > 0 ? Math.round((cost / totalCost) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // Cost savings opportunities
  const costSavingsOpportunities = topWastedItems.map((item) => ({
    item: item.ingredientName,
    estimatedMonthlySavings: item.totalCost * 30,
    recommendation: getWasteRecommendation(item.ingredientName, item.occurrences),
  }));

  return {
    topWastedItems,
    topWasteCategories,
    costSavingsOpportunities,
  };
}

/**
 * Get waste reduction recommendation based on item and frequency
 * @param ingredientName - Name of wasted ingredient
 * @param occurrences - Number of times wasted
 * @returns Recommendation text
 */
function getWasteRecommendation(ingredientName: string, occurrences: number): string {
  if (occurrences >= 5) {
    return `${ingredientName} is frequently wasted. Consider: better storage, ordering adjustments, or menu placement.`;
  } else if (occurrences >= 3) {
    return `${ingredientName} shows pattern of waste. Review prep procedures and storage conditions.`;
  } else {
    return `${ingredientName} waste is occasional. Monitor and document causes.`;
  }
}

/**
 * Calculate monthly waste report
 * @param entries - All waste entries for the month
 * @param monthlyRevenue - Total monthly revenue
 * @returns Monthly waste report
 */
export function generateMonthlyWasteReport(
  entries: WasteEntry[],
  monthlyRevenue: number,
): {
  totalWasteCost: number;
  wasteAsPercentOfRevenue: number;
  averageDailyWaste: number;
  topItem: string;
  recommendation: string;
} {
  const totalWasteCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
  const wastePercent = monthlyRevenue > 0 ? (totalWasteCost / monthlyRevenue) * 100 : 0;

  // Group by date
  const dateGroups = new Map<string, WasteEntry[]>();
  entries.forEach((entry) => {
    if (!dateGroups.has(entry.date)) {
      dateGroups.set(entry.date, []);
    }
    dateGroups.get(entry.date)!.push(entry);
  });

  const averageDailyWaste = dateGroups.size > 0 ? totalWasteCost / dateGroups.size : 0;

  // Find top item
  const itemCosts = new Map<string, number>();
  entries.forEach((entry) => {
    itemCosts.set(entry.ingredientName, (itemCosts.get(entry.ingredientName) || 0) + entry.totalCost);
  });

  const topItem = Array.from(itemCosts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  let recommendation = "Good waste management practices in place.";
  if (wastePercent > 5) {
    recommendation = `Waste is ${wastePercent.toFixed(1)}% of revenue. Focus on reducing ${topItem} waste.`;
  } else if (wastePercent > 3) {
    recommendation = `Moderate waste levels. Continue monitoring and improve ${topItem} handling.`;
  }

  return {
    totalWasteCost,
    wasteAsPercentOfRevenue: Math.round(wastePercent * 100) / 100,
    averageDailyWaste: Math.round(averageDailyWaste * 100) / 100,
    topItem,
    recommendation,
  };
}
