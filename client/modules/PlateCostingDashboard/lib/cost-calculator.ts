/**
 * Plate Costing - Cost Calculator
 *
 * Core calculation engine for:
 * - Ingredient costs
 * - Plate margins
 * - Batch scaling
 * - Historical trends
 */

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wastePercentage?: number;
}

export interface PlateRecipe {
  id: string;
  name: string;
  sellingPrice: number;
  ingredients: RecipeIngredient[];
  yield?: number;
  category?: string;
  notes?: string;
}

export interface PlateCostBreakdown {
  recipeId: string;
  recipeName: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    wastePercentage: number;
    ingredientCost: number;
    costWithWaste: number;
    percentOfTotal: number;
  }>;
  totalIngredientCost: number;
  totalCostWithWaste: number;
  sellingPrice: number;
  grossProfit: number;
  margin: number;
  marginPercentage: number;
  breakEvenPrice: number;
}

export interface PlateCostTrend {
  date: string;
  cost: number;
  margin: number;
  sellingPrice: number;
}

/**
 * Calculate cost breakdown for a single plate
 */
export function calculatePlateCost(recipe: PlateRecipe): PlateCostBreakdown {
  let totalIngredientCost = 0;
  let totalCostWithWaste = 0;

  const ingredientDetails = recipe.ingredients.map((ing) => {
    const wastePercentage = ing.wastePercentage || 0;
    const ingredientCost = ing.quantity * ing.unitCost;
    const wasteAmount = ingredientCost * (wastePercentage / 100);
    const costWithWaste = ingredientCost + wasteAmount;

    totalIngredientCost += ingredientCost;
    totalCostWithWaste += costWithWaste;

    return {
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      unitCost: ing.unitCost,
      wastePercentage,
      ingredientCost,
      costWithWaste,
      percentOfTotal: 0, // Will calculate below
    };
  });

  // Calculate percentages
  ingredientDetails.forEach((detail) => {
    detail.percentOfTotal =
      totalCostWithWaste > 0 ? (detail.costWithWaste / totalCostWithWaste) * 100 : 0;
  });

  const grossProfit = recipe.sellingPrice - totalCostWithWaste;
  const marginPercentage =
    recipe.sellingPrice > 0
      ? (grossProfit / recipe.sellingPrice) * 100
      : 0;
  const breakEvenPrice = totalCostWithWaste > 0 ? totalCostWithWaste * 1.3 : 0; // Assume 30% margin target

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    ingredients: ingredientDetails,
    totalIngredientCost,
    totalCostWithWaste,
    sellingPrice: recipe.sellingPrice,
    grossProfit,
    margin: grossProfit,
    marginPercentage,
    breakEvenPrice,
  };
}

/**
 * Calculate profit margin for a plate
 */
export function calculateProfitMargin(
  plateCost: number,
  sellingPrice: number
): {
  margin: number;
  marginPercentage: number;
  recommendation: string;
} {
  if (sellingPrice <= 0) {
    return {
      margin: 0,
      marginPercentage: 0,
      recommendation: "Invalid selling price",
    };
  }

  const margin = sellingPrice - plateCost;
  const marginPercentage = (margin / sellingPrice) * 100;

  let recommendation = "";
  if (marginPercentage < 20) {
    recommendation = "Low margin - consider adjusting price or ingredients";
  } else if (marginPercentage < 30) {
    recommendation = "Below target margin - monitor closely";
  } else if (marginPercentage >= 30 && marginPercentage < 35) {
    recommendation = "Within acceptable range";
  } else {
    recommendation = "Healthy margin";
  }

  return { margin, marginPercentage, recommendation };
}

/**
 * Calculate costs for batch quantities
 */
export function calculateBatchCosts(
  recipe: PlateRecipe,
  quantity: number
): PlateCostBreakdown {
  const scaledRecipe: PlateRecipe = {
    ...recipe,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity * quantity,
    })),
  };

  return calculatePlateCost(scaledRecipe);
}

/**
 * Get historical costs for a recipe
 */
export function getHistoricalCosts(
  costs: PlateCostTrend[],
  dateRange?: { from: Date; to: Date }
): PlateCostTrend[] {
  let filtered = costs;

  if (dateRange) {
    const fromTime = dateRange.from.getTime();
    const toTime = dateRange.to.getTime();

    filtered = costs.filter((c) => {
      const time = new Date(c.date).getTime();
      return time >= fromTime && time <= toTime;
    });
  }

  return filtered.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Calculate variance from target margin
 */
export function calculateVariance(
  actualMargin: number,
  targetMargin: number
): {
  variance: number;
  variancePercentage: number;
  status: "over" | "under" | "target";
} {
  const variance = actualMargin - targetMargin;
  const variancePercentage =
    targetMargin > 0 ? (variance / targetMargin) * 100 : 0;

  let status: "over" | "under" | "target" = "target";
  if (Math.abs(variance) > 0.5) {
    status = variance > 0 ? "over" : "under";
  }

  return { variance, variancePercentage, status };
}

/**
 * Compare two plates
 */
export function comparePlates(
  cost1: PlateCostBreakdown,
  cost2: PlateCostBreakdown
): {
  costDifference: number;
  marginDifference: number;
  cheaper: string;
  betterMargin: string;
} {
  const costDifference = cost2.totalCostWithWaste - cost1.totalCostWithWaste;
  const marginDifference = cost2.marginPercentage - cost1.marginPercentage;

  return {
    costDifference,
    marginDifference,
    cheaper: costDifference < 0 ? cost2.recipeName : cost1.recipeName,
    betterMargin: marginDifference > 0 ? cost2.recipeName : cost1.recipeName,
  };
}

/**
 * Find most expensive ingredients
 */
export function findExpensiveIngredients(
  breakdown: PlateCostBreakdown,
  limit: number = 5
): PlateCostBreakdown["ingredients"] {
  return breakdown.ingredients
    .slice()
    .sort((a, b) => b.costWithWaste - a.costWithWaste)
    .slice(0, limit);
}

/**
 * Find cost optimization opportunities
 */
export function findOptimizations(
  recipe: PlateRecipe,
  targetMarginPercentage: number = 30
): Array<{
  opportunity: string;
  savings: number;
  ingredient?: string;
  suggestion: string;
}> {
  const cost = calculatePlateCost(recipe);
  const opportunities: Array<{
    opportunity: string;
    savings: number;
    ingredient?: string;
    suggestion: string;
  }> = [];

  // Check ingredients with high waste percentage
  cost.ingredients.forEach((ing) => {
    if (ing.wastePercentage > 10) {
      const potentialSavings = ing.costWithWaste * 0.1; // 10% reduction
      opportunities.push({
        opportunity: "Reduce waste",
        savings: potentialSavings,
        ingredient: ing.name,
        suggestion: `Reduce ${ing.name} waste from ${ing.wastePercentage}% to ${Math.max(0, ing.wastePercentage - 5)}%`,
      });
    }
  });

  // Check if margin is below target
  if (cost.marginPercentage < targetMarginPercentage) {
    const requiredPrice = cost.totalCostWithWaste / (1 - targetMarginPercentage / 100);
    const priceIncrease = requiredPrice - cost.sellingPrice;
    opportunities.push({
      opportunity: "Price adjustment",
      savings: priceIncrease,
      suggestion: `Increase price from $${cost.sellingPrice.toFixed(2)} to $${requiredPrice.toFixed(2)} to achieve ${targetMarginPercentage}% margin`,
    });
  }

  return opportunities.sort((a, b) => b.savings - a.savings);
}
