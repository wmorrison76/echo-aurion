/**
 * Plate Costing API Routes
 *
 * Endpoints for:
 * - Getting recipe costs
 * - Cost trending
 * - Meal plan cost calculations
 * - Cost health metrics
 */

import { RequestHandler } from "express";

/**
 * GET /api/plate-costing/recipes
 * Get list of recipes with cost data
 */
export const getRecipes: RequestHandler = (req, res) => {
  try {
    const recipes = [
      {
        id: "1",
        name: "Grilled Salmon",
        category: "Entree",
        sellingPrice: 28.99,
        cost: 9.45,
        margin: 67.4,
      },
      {
        id: "2",
        name: "Ribeye Steak",
        category: "Entree",
        sellingPrice: 35.99,
        cost: 12.45,
        margin: 65.4,
      },
      {
        id: "3",
        name: "Vegetable Pasta",
        category: "Entree",
        sellingPrice: 18.99,
        cost: 5.25,
        margin: 72.4,
      },
      {
        id: "4",
        name: "Caesar Salad",
        category: "Salad",
        sellingPrice: 14.99,
        cost: 3.45,
        margin: 77.0,
      },
      {
        id: "5",
        name: "Chocolate Cake",
        category: "Dessert",
        sellingPrice: 8.99,
        cost: 2.15,
        margin: 76.1,
      },
    ];

    res.json({ success: true, recipes, total: recipes.length });
  } catch (error) {
    console.error("[plate-costing] Error getting recipes:", error);
    res.status(500).json({ success: false, error: "Failed to get recipes" });
  }
};

/**
 * GET /api/plate-costing/recipes/:id/cost
 * Get detailed cost breakdown for a recipe
 */
export const getRecipeCost: RequestHandler = (req, res) => {
  const { id } = req.params;

  try {
    const costBreakdown = {
      recipeId: id,
      recipeName: "Grilled Salmon",
      ingredients: [
        {
          name: "Atlantic Salmon Fillet",
          quantity: 6,
          unit: "oz",
          unitCost: 2.5,
          wastePercentage: 8,
          ingredientCost: 15.0,
          costWithWaste: 16.2,
          percentOfTotal: 54.2,
        },
        {
          name: "Fresh Lemon",
          quantity: 0.5,
          unit: "ea",
          unitCost: 0.75,
          wastePercentage: 15,
          ingredientCost: 0.375,
          costWithWaste: 0.43,
          percentOfTotal: 1.4,
        },
        {
          name: "Butter",
          quantity: 1,
          unit: "oz",
          unitCost: 0.45,
          wastePercentage: 0,
          ingredientCost: 0.45,
          costWithWaste: 0.45,
          percentOfTotal: 1.5,
        },
        {
          name: "Seasonal Vegetables",
          quantity: 8,
          unit: "oz",
          unitCost: 0.85,
          wastePercentage: 12,
          ingredientCost: 6.8,
          costWithWaste: 7.62,
          percentOfTotal: 25.4,
        },
        {
          name: "Fresh Herbs",
          quantity: 0.25,
          unit: "oz",
          unitCost: 1.2,
          wastePercentage: 20,
          ingredientCost: 0.3,
          costWithWaste: 0.36,
          percentOfTotal: 1.2,
        },
      ],
      totalIngredientCost: 23.05,
      totalCostWithWaste: 25.08,
      sellingPrice: 28.99,
      grossProfit: 3.91,
      marginPercentage: 13.49,
      breakEvenPrice: 32.6,
    };

    res.json({ success: true, costBreakdown });
  } catch (error) {
    console.error("[plate-costing] Error getting recipe cost:", error);
    res.status(500).json({ success: false, error: "Failed to get recipe cost" });
  }
};

/**
 * GET /api/plate-costing/trends/:recipeId
 * Get historical cost trends
 */
export const getCostTrends: RequestHandler = (req, res) => {
  const { recipeId } = req.params;
  const { dateRange = "30" } = req.query;

  try {
    const days = parseInt(dateRange as string) || 30;
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      trends.push({
        date: date.toISOString().split("T")[0],
        cost: 8.5 + Math.random() * 1.5,
        margin: 65 + Math.random() * 5,
        sellingPrice: 28.99,
      });
    }

    res.json({ success: true, trends, dateRange: `${days}d` });
  } catch (error) {
    console.error("[plate-costing] Error getting trends:", error);
    res.status(500).json({ success: false, error: "Failed to get trends" });
  }
};

/**
 * GET /api/plate-costing/metrics
 * Get aggregate metrics
 */
export const getMetrics: RequestHandler = (req, res) => {
  const { department } = req.query;

  try {
    const metrics = {
      averageCost: 8.45,
      averageMargin: 70.2,
      totalRecipes: 5,
      recipesBelowTarget: 2,
      costVariance: 1.23,
      trend: "stable",
      lastUpdated: new Date().toISOString(),
    };

    res.json({ success: true, metrics });
  } catch (error) {
    console.error("[plate-costing] Error getting metrics:", error);
    res.status(500).json({ success: false, error: "Failed to get metrics" });
  }
};

/**
 * GET /api/plate-costing/health
 * Get cost health summary
 */
export const getCostHealth: RequestHandler = (req, res) => {
  try {
    const health = {
      grade: "B+",
      score: 82,
      revenue: 4283,
      cogs_percentage: 32,
      labor_percentage: 28.5,
      net_margin: 12,
      trend: "improving",
      last_updated: new Date().toISOString(),
      risks: [
        {
          id: "risk-1",
          title: "High food cost",
          message: "Two recipes above 35% food cost target",
          severity: "warning",
        },
      ],
    };

    res.json({ success: true, ...health });
  } catch (error) {
    console.error("[plate-costing] Error getting health:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get cost health" });
  }
};

/**
 * POST /api/plate-costing/scenarios
 * Save a what-if scenario
 */
export const saveScenario: RequestHandler = (req, res) => {
  try {
    const { name, description, changes } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "Scenario name required" });
    }

    const scenario = {
      id: Date.now().toString(),
      name,
      description: description || "",
      changes: changes || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save to database
    console.log("[plate-costing] Scenario saved:", scenario);

    res.json({ success: true, scenario });
  } catch (error) {
    console.error("[plate-costing] Error saving scenario:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to save scenario" });
  }
};

/**
 * GET /api/plate-costing/scenarios
 * Get saved scenarios
 */
export const getScenarios: RequestHandler = (req, res) => {
  try {
    const scenarios = [
      {
        id: "1",
        name: "Reduce waste 5%",
        description: "Improve ingredient handling",
        changes: [
          { ingredient: "Salmon", type: "waste", from: 8, to: 3 },
        ],
        projectedSavings: 0.45,
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Optimize sourcing",
        description: "Bulk purchasing strategy",
        changes: [
          { ingredient: "Vegetables", type: "price", from: 0.85, to: 0.65 },
        ],
        projectedSavings: 0.16,
        createdAt: new Date().toISOString(),
      },
    ];

    res.json({ success: true, scenarios, total: scenarios.length });
  } catch (error) {
    console.error("[plate-costing] Error getting scenarios:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get scenarios" });
  }
};

/**
 * POST /api/plate-costing/recipes/:id/apply-scenario
 * Apply a scenario to a recipe
 */
export const applyScenario: RequestHandler = (req, res) => {
  const { id } = req.params;
  const { scenarioId } = req.body;

  try {
    // TODO: Apply scenario to recipe and save
    const result = {
      success: true,
      recipeId: id,
      scenarioId,
      newCost: 8.15,
      newMargin: 71.9,
      costSavings: 0.3,
    };

    res.json(result);
  } catch (error) {
    console.error("[plate-costing] Error applying scenario:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to apply scenario" });
  }
};

/**
 * Export plate costing routes
 */
export default {
  getRecipes,
  getRecipeCost,
  getCostTrends,
  getMetrics,
  getCostHealth,
  saveScenario,
  getScenarios,
  applyScenario,
};
