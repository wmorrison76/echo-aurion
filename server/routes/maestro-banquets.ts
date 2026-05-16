/**
 * Maestro Banquets API Routes
 * Backend integration for banquet operations, recipe scaling, prep lists, and order generation
 */

import { Router, Request, Response } from "express";
import { logger } from "../lib/logger";
import { recipeAIAnalyzer } from "../services/recipe-ai-analyzer";
import { maestroBeOSync } from "../services/maestro-beo-sync";

const router = Router();

// =====================================================
// BEO ANALYSIS & RECIPE SCALING
// =====================================================

/**
 * POST /api/banquets/beo/:beoId/analyze
 * Analyze BEO and discover recipes from menu items
 */
router.post("/beo/:beoId/analyze", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { menuItems, guestCount, eventDate } = req.body;

    if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "menuItems array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";
    const userId = req.user?.id || "system";

    // Discover recipes for each menu item using vector search
    const recipeDiscoveries = await Promise.all(
      menuItems.map(async (menuItem: any) => {
        try {
          // TODO: Replace with actual vector search in EchoRecipePro
          // This would search the recipe knowledge base for matching recipes
          const discoveredRecipes = await discoverRecipesForMenuItem(
            menuItem.name,
            menuItem.category,
            orgId
          );

          return {
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            recipes: discoveredRecipes,
          };
        } catch (error) {
          logger.error(`[MaestroBanquets] Error discovering recipes for ${menuItem.name}:`, error);
          return {
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            recipes: [],
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        beoId,
        guestCount,
        eventDate,
        recipeDiscoveries,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error analyzing BEO:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze BEO",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/banquets/beo/:beoId/scale-recipes
 * Scale recipes for BEO guest count
 */
router.post("/beo/:beoId/scale-recipes", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { recipes, guestCount } = req.body;

    if (!recipes || !Array.isArray(recipes)) {
      return res.status(400).json({
        success: false,
        error: "recipes array is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!guestCount || guestCount <= 0) {
      return res.status(400).json({
        success: false,
        error: "guestCount must be greater than 0",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Scale each recipe
    const scaledRecipes = await Promise.all(
      recipes.map(async (recipe: any) => {
        try {
          const scaled = await recipeAIAnalyzer.scaleRecipe(
            {
              recipeName: recipe.name,
              originalYield: recipe.originalYield || recipe.yield || 1,
              originalYieldUnit: recipe.yieldUnit || "servings",
              targetYield: guestCount,
              targetYieldUnit: "servings",
              scalingFactor: guestCount / (recipe.originalYield || recipe.yield || 1),
              ingredients: recipe.ingredients || [],
              prepSteps: recipe.prepSteps || [],
            },
            guestCount
          );

          return {
            recipeId: recipe.id,
            recipeName: recipe.name,
            scaled,
          };
        } catch (error) {
          logger.error(`[MaestroBanquets] Error scaling recipe ${recipe.name}:`, error);
          return {
            recipeId: recipe.id,
            recipeName: recipe.name,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        beoId,
        guestCount,
        scaledRecipes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error scaling recipes:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to scale recipes",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/banquets/beo/:beoId/calculate-prep-time
 * Calculate prep time needed for all recipes
 */
router.post("/api/banquets/beo/:beoId/calculate-prep-time", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { scaledRecipes, eventDate } = req.body;

    if (!scaledRecipes || !Array.isArray(scaledRecipes)) {
      return res.status(400).json({
        success: false,
        error: "scaledRecipes array is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate prep time for each recipe
    const prepTimeCalculations = scaledRecipes.map((recipe: any) => {
      const complexity = recipe.complexity || 1; // 1-5 scale
      const basePrepTime = recipe.basePrepTime || 30; // minutes
      const guestCount = recipe.scaled?.targetYield || 1;
      
      // Prep time increases with complexity and guest count (with diminishing returns)
      const complexityMultiplier = 1 + (complexity - 1) * 0.3;
      const quantityMultiplier = 1 + Math.log10(guestCount / 10) * 0.5;
      const totalPrepTime = basePrepTime * complexityMultiplier * quantityMultiplier;

      return {
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        prepTimeMinutes: Math.round(totalPrepTime),
        prepTimeHours: Math.round(totalPrepTime / 60 * 10) / 10,
        complexity,
        guestCount,
      };
    });

    // Calculate total prep time
    const totalPrepTimeMinutes = prepTimeCalculations.reduce(
      (sum, calc) => sum + calc.prepTimeMinutes,
      0
    );

    // Calculate prep start time (24 hours before event, or earlier if needed)
    const eventDateObj = new Date(eventDate);
    const prepStartTime = new Date(eventDateObj.getTime() - 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      data: {
        beoId,
        prepTimeCalculations,
        totalPrepTimeMinutes,
        totalPrepTimeHours: Math.round(totalPrepTimeMinutes / 60 * 10) / 10,
        prepStartTime: prepStartTime.toISOString(),
        eventDate: eventDateObj.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error calculating prep time:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate prep time",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// MULTI-EVENT COORDINATION
// =====================================================

/**
 * POST /api/banquets/events/coordinate
 * Coordinate multiple events and detect conflicts
 */
router.post("/events/coordinate", async (req: Request, res: Response) => {
  try {
    const { eventIds, dateRange } = req.body;

    if (!eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({
        success: false,
        error: "eventIds array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Get all events
    const events = await Promise.all(
      eventIds.map(async (eventId: string) => {
        // TODO: Replace with actual event fetch
        return {
          id: eventId,
          name: `Event ${eventId}`,
          date: new Date().toISOString(),
          guestCount: 100,
          prepStartTime: new Date().toISOString(),
        };
      })
    );

    // Detect conflicts
    const conflicts = detectPrepTimeConflicts(events);

    // Calculate combined prep requirements
    const combinedPrepRequirements = calculateCombinedPrepRequirements(events);

    res.json({
      success: true,
      data: {
        events,
        conflicts,
        combinedPrepRequirements,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error coordinating events:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to coordinate events",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// INVENTORY CHECKING & ORDER GENERATION
// =====================================================

/**
 * POST /api/banquets/beo/:beoId/check-inventory
 * Check inventory levels for scaled recipes
 */
router.post("/beo/:beoId/check-inventory", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { scaledRecipes, outletId } = req.body;

    if (!scaledRecipes || !Array.isArray(scaledRecipes)) {
      return res.status(400).json({
        success: false,
        error: "scaledRecipes array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Extract all ingredients from scaled recipes
    const allIngredients = scaledRecipes.flatMap((recipe: any) =>
      (recipe.scaled?.ingredients || []).map((ing: any) => ({
        name: ing.name,
        quantity: ing.scaledQuantity || ing.quantity,
        unit: ing.scaledUnit || ing.unit,
        recipeName: recipe.recipeName,
      }))
    );

    // Check inventory for each ingredient
    // TODO: Replace with actual inventory check
    const inventoryChecks = await Promise.all(
      allIngredients.map(async (ingredient: any) => {
        // Mock inventory check
        const available = Math.random() > 0.3; // 70% chance available
        const onHand = available ? ingredient.quantity * 1.5 : ingredient.quantity * 0.5;
        const needed = ingredient.quantity;
        const shortfall = Math.max(0, needed - onHand);

        return {
          ingredient: ingredient.name,
          needed,
          unit: ingredient.unit,
          onHand,
          available,
          shortfall,
          recipeName: ingredient.recipeName,
        };
      })
    );

    // Identify shortages
    const shortages = inventoryChecks.filter((check) => check.shortfall > 0);

    res.json({
      success: true,
      data: {
        beoId,
        outletId,
        inventoryChecks,
        shortages,
        totalShortages: shortages.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error checking inventory:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to check inventory",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/banquets/orders/generate
 * Generate combined order from multiple events
 */
router.post("/api/banquets/orders/generate", async (req: Request, res: Response) => {
  try {
    const { eventIds, deliveryDate, outletId } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "eventIds array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Get all ingredients from all events
    const allIngredients: Record<string, any> = {};

    // TODO: Replace with actual event data fetch
    for (const eventId of eventIds) {
      // Mock: Get scaled recipes for event
      const eventIngredients = [
        { name: "Flour", quantity: 50, unit: "lbs", cost: 25 },
        { name: "Sugar", quantity: 30, unit: "lbs", cost: 15 },
      ];

      eventIngredients.forEach((ing) => {
        if (allIngredients[ing.name]) {
          allIngredients[ing.name].quantity += ing.quantity;
          allIngredients[ing.name].cost += ing.cost;
          allIngredients[ing.name].events.push(eventId);
        } else {
          allIngredients[ing.name] = {
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            cost: ing.cost,
            events: [eventId],
          };
        }
      });
    }

    // Combine into order items
    const orderItems = Object.values(allIngredients).map((ing: any) => ({
      ingredient: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      cost: ing.cost,
      events: ing.events,
      source: "vendor", // or "commissary"
    }));

    const totalCost = orderItems.reduce((sum, item) => sum + item.cost, 0);

    // Generate AI assumptions
    const aiAssumptions = [
      `Combined orders from ${eventIds.length} events for efficiency`,
      `Delivery scheduled 24 hours before prep start`,
      `Vendor pricing based on volume discount`,
    ];

    res.json({
      success: true,
      data: {
        orderId: `order-${Date.now()}`,
        deliveryDate,
        events: eventIds,
        items: orderItems,
        totalCost,
        aiAssumptions,
        status: "draft",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error generating order:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate order",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// PREP LIST GENERATION
// =====================================================

/**
 * POST /api/banquets/beo/:beoId/generate-prep-lists
 * Generate department-based prep lists
 */
router.post("/beo/:beoId/generate-prep-lists", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { scaledRecipes, departments } = req.body;

    if (!scaledRecipes || !Array.isArray(scaledRecipes)) {
      return res.status(400).json({
        success: false,
        error: "scaledRecipes array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Default departments if not provided
    const defaultDepartments = ["Saucier", "Butcher", "Garde Manger", "Hot Prep"];
    const activeDepartments = departments || defaultDepartments;

    // Categorize recipes by department
    const prepLists = activeDepartments.map((dept: string) => {
      const deptRecipes = scaledRecipes.filter((recipe: any) => {
        // TODO: Replace with actual department assignment logic
        // This would use recipe metadata or AI classification
        return assignRecipeToDepartment(recipe, dept);
      });

      const items = deptRecipes.flatMap((recipe: any) =>
        (recipe.scaled?.ingredients || []).map((ing: any) => ({
          recipeName: recipe.recipeName,
          ingredient: ing.name,
          quantity: ing.scaledQuantity || ing.quantity,
          unit: ing.scaledUnit || ing.unit,
          estimatedTime: calculatePrepTime(recipe, ing),
          priority: determinePriority(recipe, ing),
        }))
      );

      const totalTime = items.reduce((sum, item) => sum + item.estimatedTime, 0);

      return {
        department: dept,
        items,
        totalTime,
        itemCount: items.length,
      };
    });

    res.json({
      success: true,
      data: {
        beoId,
        prepLists,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error generating prep lists:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate prep lists",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// STAFF SCHEDULING
// =====================================================

/**
 * POST /api/banquets/beo/:beoId/suggest-staff
 * Suggest staff based on performance and skills
 */
router.post("/beo/:beoId/suggest-staff", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { prepLists, eventDate, requiredRoles } = req.body;

    if (!prepLists || !Array.isArray(prepLists)) {
      return res.status(400).json({
        success: false,
        error: "prepLists array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Calculate total hours needed
    const totalHoursNeeded = prepLists.reduce(
      (sum, list) => sum + (list.totalTime || 0) / 60,
      0
    );

    // Get available staff with performance data
    // TODO: Replace with actual staff fetch and performance assessment
    const availableStaff = await getAvailableStaffWithPerformance(
      orgId,
      eventDate,
      requiredRoles
    );

    // Score and rank staff
    const suggestions = availableStaff
      .map((staff: any) => {
        const skillScore = (staff.skillLevel / 5) * 40;
        const performanceScore = (staff.performanceScore / 5) * 40;
        const consistencyScore = staff.consistency * 20;
        const totalScore = skillScore + performanceScore + consistencyScore;

        return {
          employeeId: staff.id,
          employeeName: staff.name,
          role: staff.role,
          skillLevel: staff.skillLevel,
          performanceScore: staff.performanceScore,
          consistency: staff.consistency,
          totalScore,
          estimatedHours: Math.min(totalHoursNeeded, staff.availableHours),
          costEstimate: Math.min(totalHoursNeeded, staff.availableHours) * staff.hourlyRate,
          reasoning: `${staff.skillLevel}-star skill, ${staff.performanceScore.toFixed(1)}/5 performance, ${(staff.consistency * 100).toFixed(0)}% consistency`,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10); // Top 10 suggestions

    res.json({
      success: true,
      data: {
        beoId,
        totalHoursNeeded,
        suggestions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MaestroBanquets] Error suggesting staff:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to suggest staff",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function discoverRecipesForMenuItem(
  menuItemName: string,
  category: string,
  orgId: string
): Promise<any[]> {
  // TODO: Implement vector search in EchoRecipePro knowledge base
  // This would search for recipes matching the menu item
  return [
    {
      id: `recipe-${Date.now()}`,
      name: `${menuItemName} Recipe`,
      originalYield: 10,
      yieldUnit: "servings",
      ingredients: [],
      prepSteps: [],
    },
  ];
}

function detectPrepTimeConflicts(events: any[]): any[] {
  const conflicts: any[] = [];
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];
      
      const prep1Start = new Date(event1.prepStartTime);
      const prep1End = new Date(prep1Start.getTime() + 8 * 60 * 60 * 1000); // 8 hours
      const prep2Start = new Date(event2.prepStartTime);
      const prep2End = new Date(prep2Start.getTime() + 8 * 60 * 60 * 1000);
      
      if (
        (prep1Start <= prep2End && prep1End >= prep2Start) ||
        (prep2Start <= prep1End && prep2End >= prep1Start)
      ) {
        conflicts.push({
          type: "prep_time",
          events: [event1.name, event2.name],
          message: "Prep times overlap",
        });
      }
    }
  }
  
  return conflicts;
}

function calculateCombinedPrepRequirements(events: any[]): any {
  return {
    totalPrepTime: events.length * 8, // hours
    totalStaffNeeded: events.length * 4,
    combinedIngredients: {},
  };
}

function assignRecipeToDepartment(recipe: any, department: string): boolean {
  // TODO: Implement actual department assignment logic
  // This could use recipe metadata, ingredient types, or AI classification
  const recipeName = (recipe.recipeName || "").toLowerCase();
  
  if (department === "Saucier") {
    return recipeName.includes("sauce") || recipeName.includes("stock");
  }
  if (department === "Butcher") {
    return recipeName.includes("meat") || recipeName.includes("protein");
  }
  if (department === "Garde Manger") {
    return recipeName.includes("salad") || recipeName.includes("cold");
  }
  if (department === "Hot Prep") {
    return recipeName.includes("hot") || recipeName.includes("cooked");
  }
  
  return false;
}

function calculatePrepTime(recipe: any, ingredient: any): number {
  // TODO: Implement actual prep time calculation
  return 30; // minutes
}

function determinePriority(recipe: any, ingredient: any): "high" | "normal" | "low" {
  // TODO: Implement actual priority determination
  return "normal";
}

async function getAvailableStaffWithPerformance(
  orgId: string,
  eventDate: string,
  requiredRoles: string[]
): Promise<any[]> {
  // TODO: Replace with actual staff fetch from database
  return [
    {
      id: "staff-1",
      name: "Chef Smith",
      role: "Saucier",
      skillLevel: 5,
      performanceScore: 4.8,
      consistency: 0.95,
      hourlyRate: 40,
      availableHours: 8,
    },
  ];
}

export default router;
