/**
 * Beverage Intelligence API Routes
 * Enterprise endpoints for wine and mixology AI services
 */

import { Router, type Request, type Response } from "express";
import { wineIntelligenceService } from "../../shared/echo/beverage-intelligence/wine-intelligence";
import { mixologyIntelligenceService } from "../../shared/echo/beverage-intelligence/mixology-intelligence";
import { inventoryAwareRecommendationsService } from "../../shared/echo/beverage-intelligence/inventory-aware-recommendations";
import { crossModuleIntelligenceService } from "../../shared/echo/beverage-intelligence/cross-module-intelligence";
import { conversationalAISommelierService } from "../../shared/echo/beverage-intelligence/conversational-ai";
import { realTimeLearningService } from "../../shared/echo/beverage-intelligence/real-time-learning";
import { captureException } from "../sentry-init";

const router = Router();

// ============================================================================
// WINE INTELLIGENCE ENDPOINTS
// ============================================================================

/**
 * POST /api/beverage/wine/recommendations
 * Get wine recommendations with inventory-aware priority
 */
router.post("/wine/recommendations", async (req: Request, res: Response) => {
  try {
    const { context, inventoryStatuses } = req.body;

    if (!context) {
      return res.status(400).json({
        success: false,
        error: "Context is required",
      });
    }

    const recommendations = await inventoryAwareRecommendationsService.getWineRecommendations(
      context,
      inventoryStatuses || []
    );

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Wine recommendations error:", error);
    captureException(error as Error, { context: "beverage-intelligence.wine-recommendations" });

    res.status(500).json({
      success: false,
      error: "Failed to get wine recommendations",
    });
  }
});

/**
 * POST /api/beverage/wine/analyze
 * Analyze wine taste profile
 */
router.post("/wine/analyze", async (req: Request, res: Response) => {
  try {
    const { wine } = req.body;

    if (!wine) {
      return res.status(400).json({
        success: false,
        error: "Wine data is required",
      });
    }

    const profile = await wineIntelligenceService.analyzeTasteProfile(wine);

    res.json({
      success: true,
      profile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Wine analysis error:", error);
    captureException(error as Error, { context: "beverage-intelligence.wine-analyze" });

    res.status(500).json({
      success: false,
      error: "Failed to analyze wine",
    });
  }
});

/**
 * POST /api/beverage/wine/similar
 * Find similar wines
 */
router.post("/wine/similar", async (req: Request, res: Response) => {
  try {
    const { wineId, limit } = req.body;

    if (!wineId) {
      return res.status(400).json({
        success: false,
        error: "Wine ID is required",
      });
    }

    // Would fetch wine from database
    // const wine = await getWine(wineId);
    // const similar = await wineIntelligenceService.findSimilarWines(wine, limit || 5);

    res.json({
      success: true,
      similar: [], // Placeholder
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Similar wines error:", error);
    captureException(error as Error, { context: "beverage-intelligence.wine-similar" });

    res.status(500).json({
      success: false,
      error: "Failed to find similar wines",
    });
  }
});

// ============================================================================
// MIXOLOGY INTELLIGENCE ENDPOINTS
// ============================================================================

/**
 * POST /api/beverage/cocktail/generate
 * Generate cocktail recipe from flavor mappings
 */
router.post("/cocktail/generate", async (req: Request, res: Response) => {
  try {
    const { request, inventoryStatuses } = req.body;

    if (!request || !request.availableIngredients) {
      return res.status(400).json({
        success: false,
        error: "Recipe generation request with availableIngredients is required",
      });
    }

    const recommendation = await mixologyIntelligenceService.generateFromFlavors(request);

    // Enrich with inventory if provided
    const enriched = inventoryStatuses
      ? await inventoryAwareRecommendationsService.getCocktailRecommendations(request, inventoryStatuses)
      : [{
          recommendation,
          priority: {
            level: "medium" as const,
            reason: "Generated recipe",
            confidence: recommendation.confidence,
            visualIndicator: {
              badge: "✓" as const,
              color: "#34C759",
              label: "Available",
              tooltip: "Recipe generated",
            },
          },
          inventoryStatus: null,
          actionable: true,
          estimatedAvailability: null,
        }];

    res.json({
      success: true,
      recommendation: enriched[0],
      alternatives: enriched.slice(1),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Cocktail generation error:", error);
    captureException(error as Error, { context: "beverage-intelligence.cocktail-generate" });

    res.status(500).json({
      success: false,
      error: "Failed to generate cocktail recipe",
    });
  }
});

// ============================================================================
// CROSS-MODULE INTELLIGENCE ENDPOINTS
// ============================================================================

/**
 * POST /api/beverage/unified/recommendations
 * Get unified recommendations across wine, cocktails, and food
 */
router.post("/unified/recommendations", async (req: Request, res: Response) => {
  try {
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        success: false,
        error: "Context is required",
      });
    }

    const unified = await crossModuleIntelligenceService.getUnifiedRecommendations(context);

    res.json({
      success: true,
      ...unified,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Unified recommendations error:", error);
    captureException(error as Error, { context: "beverage-intelligence.unified-recommendations" });

    res.status(500).json({
      success: false,
      error: "Failed to get unified recommendations",
    });
  }
});

// ============================================================================
// CONVERSATIONAL AI ENDPOINTS
// ============================================================================

/**
 * POST /api/beverage/chat
 * Conversational AI sommelier
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { conversationId, message, context } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: "conversationId and message are required",
      });
    }

    const response = await conversationalAISommelierService.processMessage(
      conversationId,
      message,
      context || {}
    );

    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Chat error:", error);
    captureException(error as Error, { context: "beverage-intelligence.chat" });

    res.status(500).json({
      success: false,
      error: "Failed to process chat message",
    });
  }
});

// ============================================================================
// LEARNING ENDPOINTS
// ============================================================================

/**
 * POST /api/beverage/learning/interaction
 * Record interaction for learning
 */
router.post("/learning/interaction", async (req: Request, res: Response) => {
  try {
    const { interaction } = req.body;

    if (!interaction) {
      return res.status(400).json({
        success: false,
        error: "Interaction data is required",
      });
    }

    await realTimeLearningService.recordInteraction(interaction);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Learning interaction error:", error);
    captureException(error as Error, { context: "beverage-intelligence.learning-interaction" });

    res.status(500).json({
      success: false,
      error: "Failed to record interaction",
    });
  }
});

/**
 * GET /api/beverage/learning/metrics
 * Get learning metrics
 */
router.get("/learning/metrics", async (req: Request, res: Response) => {
  try {
    const metrics = await realTimeLearningService.getMetrics();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Learning metrics error:", error);
    captureException(error as Error, { context: "beverage-intelligence.learning-metrics" });

    res.status(500).json({
      success: false,
      error: "Failed to get learning metrics",
    });
  }
});

/**
 * POST /api/beverage/learning/retrain
 * Trigger batch retraining
 */
router.post("/learning/retrain", async (req: Request, res: Response) => {
  try {
    await realTimeLearningService.batchRetrain();

    res.json({
      success: true,
      message: "Batch retraining initiated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[BeverageIntelligence] Retrain error:", error);
    captureException(error as Error, { context: "beverage-intelligence.retrain" });

    res.status(500).json({
      success: false,
      error: "Failed to initiate retraining",
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/beverage/health
 * Health check
 */
router.get("/health", async (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "beverage-intelligence",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
