/**
 * Pastry Banquets API Routes
 * Backend integration for pastry/bakery BEO operations
 * Extends Maestro Banquets workflow for pastry-specific needs
 */

import { Router, Request, Response } from "express";
import { logger } from "../lib/logger";
import { recipeAIAnalyzer } from "../services/recipe-ai-analyzer";

const router = Router();

// =====================================================
// PASTRY BEO ANALYSIS
// =====================================================

/**
 * POST /api/pastry/beo/:beoId/analyze
 * Analyze BEO for bakery and pastry needs
 */
router.post("/api/pastry/beo/:beoId/analyze", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { menuItems, guestCount, eventDate, bakeryNeeds, pastryNeeds } = req.body;

    if (!menuItems || !Array.isArray(menuItems)) {
      return res.status(400).json({
        success: false,
        error: "menuItems array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Combine menu items with explicit bakery/pastry needs
    const allItems = [
      ...menuItems,
      ...(bakeryNeeds || []).map((item: any) => ({ ...item, type: "bakery" })),
      ...(pastryNeeds || []).map((item: any) => ({ ...item, type: "pastry" })),
    ];

    // Discover pastry/bakery recipes
    const recipeDiscoveries = await Promise.all(
      allItems.map(async (item: any) => {
        try {
          const discoveredRecipes = await discoverPastryRecipes(
            item.name,
            item.type || "pastry",
            orgId
          );

          return {
            menuItemId: item.id,
            menuItemName: item.name,
            type: item.type || "pastry",
            recipes: discoveredRecipes,
          };
        } catch (error) {
          logger.error(`[PastryBanquets] Error discovering recipes for ${item.name}:`, error);
          return {
            menuItemId: item.id,
            menuItemName: item.name,
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
        bakeryItems: allItems.filter((item: any) => item.type === "bakery"),
        pastryItems: allItems.filter((item: any) => item.type === "pastry"),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PastryBanquets] Error analyzing BEO:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze BEO",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/pastry/beo/:beoId/scale-recipes
 * Scale pastry/bakery recipes for BEO
 */
router.post("/api/pastry/beo/:beoId/scale-recipes", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { recipes, guestCount, recipeType } = req.body; // recipeType: "bakery" | "pastry"

    if (!recipes || !Array.isArray(recipes)) {
      return res.status(400).json({
        success: false,
        error: "recipes array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Scale recipes with pastry-specific considerations
    const scaledRecipes = await Promise.all(
      recipes.map(async (recipe: any) => {
        try {
          // Pastry recipes may need different scaling logic (e.g., by weight, by pieces)
          const scaled = await scalePastryRecipe(recipe, guestCount, recipeType);

          return {
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeType: recipeType || "pastry",
            scaled,
          };
        } catch (error) {
          logger.error(`[PastryBanquets] Error scaling recipe ${recipe.name}:`, error);
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
        recipeType,
        scaledRecipes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PastryBanquets] Error scaling recipes:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to scale recipes",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/pastry/beo/:beoId/generate-production-list
 * Generate pastry production list with bakery and pastry needs
 */
router.post("/api/pastry/beo/:beoId/generate-production-list", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { scaledRecipes, bakeryNeeds, pastryNeeds, eventDate } = req.body;

    if (!scaledRecipes || !Array.isArray(scaledRecipes)) {
      return res.status(400).json({
        success: false,
        error: "scaledRecipes array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Separate bakery and pastry items
    const bakeryRecipes = scaledRecipes.filter((r: any) => r.recipeType === "bakery");
    const pastryRecipes = scaledRecipes.filter((r: any) => r.recipeType === "pastry");

    // Generate production lists
    const bakeryProductionList = generateBakeryProductionList(bakeryRecipes, bakeryNeeds);
    const pastryProductionList = generatePastryProductionList(pastryRecipes, pastryNeeds);

    // Combine into master production list
    const masterProductionList = {
      beoId,
      eventDate,
      bakery: bakeryProductionList,
      pastry: pastryProductionList,
      totalItems: bakeryProductionList.items.length + pastryProductionList.items.length,
      totalPrepTime: bakeryProductionList.totalPrepTime + pastryProductionList.totalPrepTime,
    };

    res.json({
      success: true,
      data: masterProductionList,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PastryBanquets] Error generating production list:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate production list",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// PASTRY PURCHASING/RECEIVING INTEGRATION
// =====================================================

/**
 * POST /api/pastry/purchasing/check-inventory
 * Check inventory for pastry ingredients (integrated with PurchasingReceiving)
 */
router.post("/api/pastry/purchasing/check-inventory", async (req: Request, res: Response) => {
  try {
    const { ingredients, outletId } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: "ingredients array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";

    // Check inventory using PurchasingReceiving integration
    // TODO: Replace with actual PurchasingReceiving API call
    const inventoryChecks = await Promise.all(
      ingredients.map(async (ingredient: any) => {
        // This would call PurchasingReceiving inventory API
        const inventoryData = await checkInventoryInPurchasingReceiving(
          orgId,
          outletId,
          ingredient.name
        );

        return {
          ingredient: ingredient.name,
          needed: ingredient.quantity,
          unit: ingredient.unit,
          onHand: inventoryData.onHand || 0,
          available: (inventoryData.onHand || 0) >= ingredient.quantity,
          shortfall: Math.max(0, ingredient.quantity - (inventoryData.onHand || 0)),
          location: inventoryData.location || "commissary",
        };
      })
    );

    const shortages = inventoryChecks.filter((check) => check.shortfall > 0);

    res.json({
      success: true,
      data: {
        outletId,
        inventoryChecks,
        shortages,
        totalShortages: shortages.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PastryBanquets] Error checking inventory:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to check inventory",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/pastry/purchasing/create-order
 * Create purchase order for pastry ingredients (via PurchasingReceiving)
 */
router.post("/api/pastry/purchasing/create-order", async (req: Request, res: Response) => {
  try {
    const { beoId, ingredients, outletId, deliveryDate, vendorId } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: "ingredients array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";
    const userId = req.user?.id || "system";

    // Create purchase order via PurchasingReceiving API
    // TODO: Replace with actual PurchasingReceiving API call
    const purchaseOrder = await createPurchaseOrderInPurchasingReceiving({
      orgId,
      outletId,
      vendorId,
      deliveryDate,
      lineItems: ingredients.map((ing: any) => ({
        product_name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_cost: ing.costPerUnit || 0,
        total_cost: ing.totalCost || 0,
      })),
      beoId,
      userId,
    });

    res.json({
      success: true,
      data: {
        purchaseOrderId: purchaseOrder.id,
        beoId,
        status: purchaseOrder.status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PastryBanquets] Error creating purchase order:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create purchase order",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/pastry/receiving/process-delivery
 * Process delivery receipt for pastry ingredients (via PurchasingReceiving)
 */
router.post("/api/pastry/receiving/process-delivery", async (req: Request, res: Response) => {
  try {
    const { purchaseOrderId, receivedItems, outletId } = req.body;

    if (!receivedItems || !Array.isArray(receivedItems)) {
      return res.status(400).json({
        success: false,
        error: "receivedItems array is required",
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = req.user?.org_id || "default";
    const userId = req.user?.id || "system";

    // Process delivery via PurchasingReceiving API
    // TODO: Replace with actual PurchasingReceiving API call
    const receipt = await processDeliveryInPurchasingReceiving({
      orgId,
      outletId,
      purchaseOrderId,
      receivedItems,
      userId,
    });

    // Update inventory in Pastry module
    await updatePastryInventory(orgId, outletId, receivedItems);

    res.json({
      success: true,
      data: {
        receiptId: receipt.id,
        purchaseOrderId,
        itemsReceived: receivedItems.length,
        inventoryUpdated: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PastryBanquets] Error processing delivery:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process delivery",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function discoverPastryRecipes(
  itemName: string,
  type: string,
  orgId: string
): Promise<any[]> {
  // TODO: Implement vector search in Pastry EchoRecipePro knowledge base
  return [
    {
      id: `recipe-${Date.now()}`,
      name: `${itemName} Recipe`,
      type,
      originalYield: type === "bakery" ? 1 : 10, // Bakery might be by weight, pastry by servings
      yieldUnit: type === "bakery" ? "loaves" : "servings",
      ingredients: [],
      prepSteps: [],
    },
  ];
}

async function scalePastryRecipe(
  recipe: any,
  guestCount: number,
  recipeType: string
): Promise<any> {
  // Pastry recipes may scale differently than regular recipes
  // Bakery items might scale by weight, pastry by servings
  
  if (recipeType === "bakery") {
    // Bakery scaling (e.g., bread loaves)
    const loavesNeeded = Math.ceil(guestCount / 8); // 8 servings per loaf
    return {
      ...recipe,
      targetYield: loavesNeeded,
      scalingFactor: loavesNeeded / (recipe.originalYield || 1),
    };
  } else {
    // Pastry scaling (e.g., desserts)
    return recipeAIAnalyzer.scaleRecipe(
      {
        recipeName: recipe.name,
        originalYield: recipe.originalYield || 10,
        originalYieldUnit: recipe.yieldUnit || "servings",
        targetYield: guestCount,
        targetYieldUnit: "servings",
        scalingFactor: guestCount / (recipe.originalYield || 10),
        ingredients: recipe.ingredients || [],
        prepSteps: recipe.prepSteps || [],
      },
      guestCount
    );
  }
}

function generateBakeryProductionList(recipes: any[], bakeryNeeds: any[]): any {
  const items = recipes.flatMap((recipe: any) =>
    (recipe.scaled?.ingredients || []).map((ing: any) => ({
      recipeName: recipe.recipeName,
      ingredient: ing.name,
      quantity: ing.scaledQuantity || ing.quantity,
      unit: ing.scaledUnit || ing.unit,
      type: "bakery",
      estimatedTime: 60, // Bakery items typically take longer
      priority: "high",
    }))
  );

  // Add explicit bakery needs
  if (bakeryNeeds) {
    bakeryNeeds.forEach((need: any) => {
      items.push({
        recipeName: need.name,
        ingredient: need.name,
        quantity: need.quantity,
        unit: need.unit,
        type: "bakery",
        estimatedTime: need.estimatedTime || 60,
        priority: need.priority || "normal",
      });
    });
  }

  return {
    items,
    totalPrepTime: items.reduce((sum, item) => sum + item.estimatedTime, 0),
    itemCount: items.length,
  };
}

function generatePastryProductionList(recipes: any[], pastryNeeds: any[]): any {
  const items = recipes.flatMap((recipe: any) =>
    (recipe.scaled?.ingredients || []).map((ing: any) => ({
      recipeName: recipe.recipeName,
      ingredient: ing.name,
      quantity: ing.scaledQuantity || ing.quantity,
      unit: ing.scaledUnit || ing.unit,
      type: "pastry",
      estimatedTime: 45, // Pastry items
      priority: "normal",
    }))
  );

  // Add explicit pastry needs
  if (pastryNeeds) {
    pastryNeeds.forEach((need: any) => {
      items.push({
        recipeName: need.name,
        ingredient: need.name,
        quantity: need.quantity,
        unit: need.unit,
        type: "pastry",
        estimatedTime: need.estimatedTime || 45,
        priority: need.priority || "normal",
      });
    });
  }

  return {
    items,
    totalPrepTime: items.reduce((sum, item) => sum + item.estimatedTime, 0),
    itemCount: items.length,
  };
}

async function checkInventoryInPurchasingReceiving(
  orgId: string,
  outletId: string,
  ingredientName: string
): Promise<any> {
  // TODO: Replace with actual PurchasingReceiving API call
  // This would call: GET /api/purchasing-receiving/inventory/check
  return {
    onHand: Math.random() * 100,
    location: "commissary",
    lastUpdated: new Date().toISOString(),
  };
}

async function createPurchaseOrderInPurchasingReceiving(data: any): Promise<any> {
  // TODO: Replace with actual PurchasingReceiving API call
  // This would call: POST /api/purchasing-receiving/purchase-orders
  return {
    id: `po-${Date.now()}`,
    status: "draft",
    ...data,
  };
}

async function processDeliveryInPurchasingReceiving(data: any): Promise<any> {
  // TODO: Replace with actual PurchasingReceiving API call
  // This would call: POST /api/purchasing-receiving/receiving/process
  return {
    id: `receipt-${Date.now()}`,
    ...data,
  };
}

async function updatePastryInventory(
  orgId: string,
  outletId: string,
  receivedItems: any[]
): Promise<void> {
  // TODO: Update Pastry module's inventory tracking
  // This would update the pastry-specific inventory tables
  logger.info("[PastryBanquets] Updating pastry inventory", {
    orgId,
    outletId,
    itemCount: receivedItems.length,
  });
}

export default router;
