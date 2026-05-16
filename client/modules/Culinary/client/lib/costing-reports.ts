// Advanced costing and variance reporting

export type CostingReport = {
  id: string;
  title: string;
  organizationId: string;
  period: { startDate: number; endDate: number };
  recipes: RecipeCosting[];
  summary: {
    totalRecipes: number;
    averageCost: number;
    averageMargin: number;
    recipesOnTarget: number;
    recipesAboveTarget: number;
    recipesBelowTarget: number;
  };
  trends: {
    avgCostChange: number;
    costVariance: number;
    marginVariance: number;
  };
  recommendations: string[];
  generatedAt: number;
};

export type RecipeCosting = {
  recipeId: string;
  recipeName: string;
  plateCosts: PlateCostData[];
  avgCost: number;
  minCost: number;
  maxCost: number;
  variance: number;
  costTrend: "increasing" | "stable" | "decreasing";
  pricePoint: number;
  targetMargin: number;
  actualMargin: number;
  status: "on-target" | "above-target" | "below-target";
  wasteMetrics: {
    totalWaste: number;
    wastePercent: number;
    topWasteCategory: string;
  };
};

export type PlateCostData = {
  date: number;
  cost: number;
  wastePercent: number;
  yieldPercent: number;
  laborCost: number;
  overhead: number;
};

export type VarianceAnalysis = {
  id: string;
  period: { startDate: number; endDate: number };
  recipes: {
    recipeId: string;
    recipeName: string;
    variance: number;
    category: "price-increase" | "yield-loss" | "portion-size" | "labor";
    impact: number;
    daysAffected: number;
  }[];
  totalVariance: number;
  largestVariance: { recipe: string; amount: number };
  recommendations: string[];
};

export type MenuProfitAnalysis = {
  period: { startDate: number; endDate: number };
  recipes: {
    recipeId: string;
    recipeName: string;
    unitsSold: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    priceElasticity: number;
  }[];
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  topPerformers: Array<{ recipe: string; profit: number }>;
  underperformers: Array<{ recipe: string; profit: number }>;
};

export type SupplierCostAnalysis = {
  period: { startDate: number; endDate: number };
  suppliers: {
    supplierId: string;
    supplierName: string;
    totalSpent: number;
    orderCount: number;
    avgOrderSize: number;
    reliability: number;
    qualityScore: number;
    priceIndex: number; // vs average
    topProducts: Array<{ name: string; quantity: number; cost: number }>;
  }[];
  costsByCategory: Record<string, number>;
  recommendations: string[];
};

/**
 * Generate comprehensive costing report
 */
export async function generateCostingReport(
  organizationId: string,
  startDate: number,
  endDate: number,
): Promise<CostingReport> {
  // In real implementation, fetch from Supabase
  const recipes = await fetchRecipeCosting(organizationId, startDate, endDate);

  const summary = calculateCostingSummary(recipes);
  const trends = calculateCostTrends(recipes);
  const recommendations = generateCostingRecommendations(recipes, trends);

  return {
    id: `report-${Date.now()}`,
    title: `Costing Report ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
    organizationId,
    period: { startDate, endDate },
    recipes,
    summary,
    trends,
    recommendations,
    generatedAt: Date.now(),
  };
}

/**
 * Analyze cost variance
 */
export async function analyzeVariance(
  organizationId: string,
  startDate: number,
  endDate: number,
): Promise<VarianceAnalysis> {
  const recipes = await fetchRecipeCosting(organizationId, startDate, endDate);

  const variances = recipes
    .map((recipe) => ({
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      variance: recipe.variance,
      category: determineVarianceCategory(recipe),
      impact: recipe.avgCost * recipe.variance,
      daysAffected: recipe.plateCosts.length,
    }))
    .filter((v) => Math.abs(v.variance) > 5) // Only significant variances
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  const totalVariance = variances.reduce((sum, v) => sum + v.variance, 0);
  const largestVariance = variances[0];

  const recommendations = generateVarianceRecommendations(variances);

  return {
    id: `variance-${Date.now()}`,
    period: { startDate, endDate },
    recipes: variances,
    totalVariance,
    largestVariance: {
      recipe: largestVariance ? largestVariance.recipeName : "N/A",
      amount: largestVariance ? largestVariance.impact : 0,
    },
    recommendations,
  };
}

/**
 * Analyze menu profitability
 */
export async function analyzeMenuProfit(
  organizationId: string,
  startDate: number,
  endDate: number,
): Promise<MenuProfitAnalysis> {
  const recipes = await fetchRecipeCosting(organizationId, startDate, endDate);
  const sales = await fetchSalesData(organizationId, startDate, endDate);

  const recipeAnalysis = recipes.map((recipe) => {
    const saleLine = sales.find((s) => s.recipeId === recipe.recipeId) || {
      unitsSold: 0,
      totalRevenue: 0,
    };

    const totalCost = recipe.avgCost * saleLine.unitsSold;
    const totalProfit = saleLine.totalRevenue - totalCost;
    const profitMargin =
      saleLine.totalRevenue > 0
        ? (totalProfit / saleLine.totalRevenue) * 100
        : 0;

    return {
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      unitsSold: saleLine.unitsSold,
      totalRevenue: saleLine.totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      priceElasticity: 1.0, // Would be calculated from sales data
    };
  });

  const totalRevenue = recipeAnalysis.reduce(
    (sum, r) => sum + r.totalRevenue,
    0,
  );
  const totalCost = recipeAnalysis.reduce((sum, r) => sum + r.totalCost, 0);
  const totalProfit = totalRevenue - totalCost;

  const sorted = [...recipeAnalysis].sort(
    (a, b) => b.totalProfit - a.totalProfit,
  );

  return {
    period: { startDate, endDate },
    recipes: recipeAnalysis,
    totalRevenue,
    totalCost,
    totalProfit,
    averageMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    topPerformers: sorted
      .slice(0, 5)
      .map((r) => ({ recipe: r.recipeName, profit: r.totalProfit })),
    underperformers: sorted
      .slice(-5)
      .map((r) => ({ recipe: r.recipeName, profit: r.totalProfit })),
  };
}

/**
 * Analyze supplier costs
 */
export async function analyzeSupplierCosts(
  organizationId: string,
  startDate: number,
  endDate: number,
): Promise<SupplierCostAnalysis> {
  const suppliers = await fetchSupplierData(organizationId, startDate, endDate);

  const costsByCategory: Record<string, number> = {};
  suppliers.forEach((supplier) => {
    supplier.topProducts.forEach((product) => {
      const category = product.category || "other";
      costsByCategory[category] =
        (costsByCategory[category] || 0) + product.cost;
    });
  });

  const recommendations = generateSupplierRecommendations(suppliers);

  return {
    period: { startDate, endDate },
    suppliers,
    costsByCategory,
    recommendations,
  };
}

// Helper functions
function calculateCostingSummary(recipes: RecipeCosting[]) {
  const onTarget = recipes.filter((r) => r.status === "on-target").length;
  const above = recipes.filter((r) => r.status === "above-target").length;
  const below = recipes.filter((r) => r.status === "below-target").length;

  return {
    totalRecipes: recipes.length,
    averageCost:
      recipes.reduce((sum, r) => sum + r.avgCost, 0) / recipes.length,
    averageMargin:
      recipes.reduce((sum, r) => sum + r.actualMargin, 0) / recipes.length,
    recipesOnTarget: onTarget,
    recipesAboveTarget: above,
    recipesBelowTarget: below,
  };
}

function calculateCostTrends(recipes: RecipeCosting[]) {
  const costChanges = recipes.map((r) => {
    if (r.plateCosts.length < 2) return 0;
    const first = r.plateCosts[0].cost;
    const last = r.plateCosts[r.plateCosts.length - 1].cost;
    return ((last - first) / first) * 100;
  });

  return {
    avgCostChange: costChanges.reduce((a, b) => a + b, 0) / costChanges.length,
    costVariance: Math.sqrt(
      costChanges.reduce((sum, x) => sum + Math.pow(x, 2), 0) /
        costChanges.length,
    ),
    marginVariance:
      recipes.reduce(
        (sum, r) => sum + Math.abs(r.actualMargin - r.targetMargin),
        0,
      ) / recipes.length,
  };
}

function generateCostingRecommendations(
  recipes: RecipeCosting[],
  trends: any,
): string[] {
  const recommendations: string[] = [];

  // Below-target recipes
  const belowTarget = recipes.filter((r) => r.status === "below-target");
  if (belowTarget.length > 0) {
    recommendations.push(
      `${belowTarget.length} recipes below target margin. Consider price increases or cost reduction.`,
    );
  }

  // High waste
  const highWaste = recipes.filter((r) => r.wasteMetrics.wastePercent > 10);
  if (highWaste.length > 0) {
    recommendations.push(
      `${highWaste.length} recipes with high waste (>10%). Review prep procedures and training.`,
    );
  }

  // Increasing costs
  const increasing = recipes.filter((r) => r.costTrend === "increasing");
  if (increasing.length > 0) {
    recommendations.push(
      `${increasing.length} recipes with increasing costs. Review supplier pricing and negotiate volume discounts.`,
    );
  }

  return recommendations;
}

function determineVarianceCategory(
  recipe: RecipeCosting,
): "yield-loss" | "portion-size" | "labor" | "price-increase" {
  if (recipe.wasteMetrics.wastePercent > 8) return "yield-loss";
  if (
    Math.abs(
      recipe.avgCost - recipe.pricePoint * ((100 - recipe.targetMargin) / 100),
    ) > 5
  )
    return "price-increase";
  return "labor";
}

function generateVarianceRecommendations(variances: any[]): string[] {
  return variances
    .slice(0, 3)
    .map(
      (v) =>
        `Review ${v.recipeName}: ${v.variance > 0 ? "costs increasing" : "costs decreasing"} by ${Math.abs(v.variance).toFixed(1)}%`,
    );
}

function generateSupplierRecommendations(suppliers: any[]): string[] {
  const recommendations: string[] = [];

  // Highest cost suppliers
  const highestCost = suppliers.sort((a, b) => b.totalSpent - a.totalSpent)[0];
  if (highestCost) {
    recommendations.push(
      `Negotiate volume discount with ${highestCost.supplierName} (highest spend)`,
    );
  }

  // Low reliability
  const lowReliable = suppliers.filter((s) => s.reliability < 0.9);
  if (lowReliable.length > 0) {
    recommendations.push(
      `Review suppliers with <90% on-time delivery: ${lowReliable.map((s) => s.supplierName).join(", ")}`,
    );
  }

  return recommendations;
}

// Placeholder data fetching (would be Supabase calls in real implementation)
async function fetchRecipeCosting(
  organizationId: string,
  startDate: number,
  endDate: number,
): Promise<RecipeCosting[]> {
  return [];
}

async function fetchSalesData(
  organizationId: string,
  startDate: number,
  endDate: number,
) {
  return [];
}

async function fetchSupplierData(
  organizationId: string,
  startDate: number,
  endDate: number,
) {
  return [];
}
