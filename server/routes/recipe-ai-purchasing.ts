import { Router, Request, Response } from "express";
import { recipeAIAnalyzer } from "../services/recipe-ai-analyzer";
import { eventPurchasingBridge } from "../services/event-purchasing-bridge";
import { maestroBeOSync } from "../services/maestro-beo-sync";
import { logger } from "../lib/logger";

const router = Router();

// =====================================================
// RECIPE ANALYSIS ENDPOINTS
// =====================================================

/**
 * POST /api/recipes/analyze
 * Analyze recipe text and extract ingredients using AI
 */
router.post("/recipes/analyze", async (req: Request, res: Response) => {
  try {
    const { recipeText } = req.body;

    if (!recipeText) {
      return res.status(400).json({
        success: false,
        error: "recipeText is required",
        timestamp: new Date().toISOString(),
      });
    }

    const recipe = await recipeAIAnalyzer.analyzeRecipe(recipeText);

    res.json({
      success: true,
      data: recipe,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RecipeAIPurchasing] Error analyzing recipe:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to analyze recipe",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// RECIPE ASSIGNMENT & SCALING
// =====================================================

/**
 * POST /api/production-tasks/:taskId/assign-recipe
 * Assign a recipe to a production task and scale it
 */
router.post(
  "/production-tasks/:taskId/assign-recipe",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const { recipeName, originalYield, originalYieldUnit, guestCount } =
        req.body;

      if (!recipeName || !originalYield || !originalYieldUnit || !guestCount) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: recipeName, originalYield, originalYieldUnit, guestCount",
          timestamp: new Date().toISOString(),
        });
      }

      const orgId = req.user?.org_id || "default";
      const userId = req.user?.id || "anonymous";

      const recipeId = await recipeAIAnalyzer.assignRecipeToTask(
        taskId,
        orgId,
        recipeName,
        originalYield,
        originalYieldUnit,
        guestCount,
        userId,
      );

      res.status(201).json({
        success: true,
        data: {
          recipeId,
          recipeName,
          scalingFactor: guestCount / originalYield,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RecipeAIPurchasing] Error assigning recipe:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to assign recipe",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/production-tasks/:taskId/scale-recipe
 * Scale recipe and add ingredients
 */
router.post(
  "/production-tasks/:taskId/scale-recipe",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const { recipe } = req.body;

      if (!recipe) {
        return res.status(400).json({
          success: false,
          error: "recipe object is required",
          timestamp: new Date().toISOString(),
        });
      }

      // Get event from production task
      const taskResult = await maestroBeOSync.getEventProductionTasks(taskId);
      if (taskResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Production task not found",
          timestamp: new Date().toISOString(),
        });
      }

      const task = taskResult[0];
      const orgId = req.user?.org_id || "default";

      // Add scaled ingredients
      const ingredientIds = await recipeAIAnalyzer.addScaledIngredients(
        taskId,
        task.eventId,
        orgId,
        recipe.ingredients,
      );

      // Generate prep list
      const prepItemCount = await recipeAIAnalyzer.generatePrepList(
        taskId,
        task.eventId,
      );

      res.status(201).json({
        success: true,
        data: {
          ingredientCount: ingredientIds.length,
          prepItemCount,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RecipeAIPurchasing] Error scaling recipe:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to scale recipe",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// INGREDIENT ENDPOINTS
// =====================================================

/**
 * GET /api/production-tasks/:taskId/ingredients
 * Get scaled ingredients for a production task
 */
router.get(
  "/production-tasks/:taskId/ingredients",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;

      const ingredients = await recipeAIAnalyzer.getTaskIngredients(taskId);

      res.json({
        success: true,
        data: ingredients,
        count: ingredients.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RecipeAIPurchasing] Error fetching ingredients:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch ingredients",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/production-tasks/:taskId/ingredient-costs
 * Get total ingredient costs for a task
 */
router.get(
  "/production-tasks/:taskId/ingredient-costs",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;

      const totalCost =
        await recipeAIAnalyzer.calculateEventIngredientCost(taskId);

      res.json({
        success: true,
        data: { taskId, totalCost },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[RecipeAIPurchasing] Error calculating ingredient costs:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to calculate costs",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// PURCHASE ORDER GENERATION
// =====================================================

/**
 * POST /api/production-tasks/:taskId/generate-purchase-order
 * Generate a purchase order from ingredient list
 */
router.post(
  "/production-tasks/:taskId/generate-purchase-order",
  async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const { eventId, outletId } = req.body;

      if (!eventId || !outletId) {
        return res.status(400).json({
          success: false,
          error: "eventId and outletId are required",
          timestamp: new Date().toISOString(),
        });
      }

      const orgId = req.user?.org_id || "default";
      const userId = req.user?.id || "anonymous";

      const poId = await eventPurchasingBridge.generatePurchaseOrder(
        taskId,
        eventId,
        outletId,
        orgId,
        userId,
      );

      res.status(201).json({
        success: true,
        data: { poId, status: "draft" },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[RecipeAIPurchasing] Error generating purchase order:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate purchase order",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/purchase-orders/:poId
 * Get purchase order details
 */
router.get("/purchase-orders/:poId", async (req: Request, res: Response) => {
  try {
    const { poId } = req.params;

    const po = await eventPurchasingBridge.getPurchaseOrder(poId);

    if (!po) {
      return res.status(404).json({
        success: false,
        error: "Purchase order not found",
        timestamp: new Date().toISOString(),
      });
    }

    const lineItems = await eventPurchasingBridge.getPOLineItems(poId);

    res.json({
      success: true,
      data: {
        ...po,
        lineItems,
        lineItemCount: lineItems.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[RecipeAIPurchasing] Error fetching PO:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch purchase order",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/events/:eventId/purchase-orders
 * Get all purchase orders for an event
 */
router.get(
  "/events/:eventId/purchase-orders",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const pos = await eventPurchasingBridge.getEventPurchaseOrders(eventId);

      res.json({
        success: true,
        data: pos,
        count: pos.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RecipeAIPurchasing] Error fetching event POs:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch purchase orders",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * PATCH /api/purchase-orders/:poId/status
 * Update purchase order status
 */
router.patch(
  "/purchase-orders/:poId/status",
  async (req: Request, res: Response) => {
    try {
      const { poId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: "status is required",
          timestamp: new Date().toISOString(),
        });
      }

      const success = await eventPurchasingBridge.updatePOStatus(poId, status);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Purchase order not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { poId, status },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RecipeAIPurchasing] Error updating PO status:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update purchase order status",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/purchase-orders/:poId/mark-received
 * Mark purchase order as received
 */
router.post(
  "/purchase-orders/:poId/mark-received",
  async (req: Request, res: Response) => {
    try {
      const { poId } = req.params;

      const success = await eventPurchasingBridge.markPOAsReceived(poId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Purchase order not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { poId, received: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[RecipeAIPurchasing] Error marking PO as received:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark purchase order as received",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/events/:eventId/procurement-summary
 * Get procurement summary for an event
 */
router.get(
  "/events/:eventId/procurement-summary",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;

      const summary =
        await eventPurchasingBridge.getEventProcurementSummary(eventId);

      if (!summary) {
        return res.json({
          success: true,
          data: {
            poCount: 0,
            ingredientCount: 0,
            totalCost: 0,
            receivedCount: 0,
            specialOrderCount: 0,
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[RecipeAIPurchasing] Error fetching procurement summary:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch procurement summary",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
