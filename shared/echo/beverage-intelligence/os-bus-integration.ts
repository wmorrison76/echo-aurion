/**
 * OS Bus Integration for Beverage Intelligence
 * Connects AI services to LUCCCA OS Bus for real-time event handling
 */

import { osBus } from "../../../client/lib/os-bus";
import { wineIntelligenceService } from "./wine-intelligence";
import { mixologyIntelligenceService } from "./mixology-intelligence";
import { inventoryAwareRecommendationsService } from "./inventory-aware-recommendations";
import { crossModuleIntelligenceService } from "./cross-module-intelligence";
import { realTimeLearningService } from "./real-time-learning";
import type { OSBusEventMap } from "../../../client/lib/os-bus";

// ============================================================================
// OS BUS EVENT HANDLERS
// ============================================================================

/**
 * Initialize OS Bus event handlers for beverage intelligence
 */
export function initializeBeverageIntelligenceOSBus() {
  console.log("[BeverageIntelligence] Initializing OS Bus integration...");

  // Listen for menu dish orders - trigger wine/cocktail recommendations
  osBus.on("menu:dish_ordered", async (event) => {
    try {
      const { dishId, dishName, customerId, venueId } = event as any;

      // Get unified recommendations
      const recommendations = await crossModuleIntelligenceService.getUnifiedRecommendations({
        customerId,
        venueId,
        dish: {
          dishId,
          dishName,
        },
      });

      // Emit pairing suggestions
      osBus.emit("beverage:pairing_suggestions", {
        dishId,
        dishName,
        recommendations: {
          wines: recommendations.recommendations.wines.slice(0, 3),
          cocktails: recommendations.recommendations.cocktails.slice(0, 3),
        },
        confidence: recommendations.confidence,
        timestamp: new Date().toISOString(),
      });

      // Record interaction for learning
      await realTimeLearningService.recordInteraction({
        id: `interaction-${Date.now()}`,
        type: "recommendation_shown",
        userId: customerId,
        timestamp: new Date(),
        context: {
          recommendationType: "pairing",
          itemId: dishId,
          itemType: "dish",
        },
        outcome: {
          accepted: false, // Will be updated when user accepts
        },
      });
    } catch (error) {
      console.error("[BeverageIntelligence] Error handling menu:dish_ordered:", error);
    }
  });

  // Listen for inventory updates - refresh recommendations
  osBus.on("inventory:updated", async (event) => {
    try {
      const { item, locationId } = event;

      // Check if this is a wine or cocktail ingredient
      // If so, invalidate recommendation cache and refresh
      console.log(`[BeverageIntelligence] Inventory updated for ${item.name} at ${locationId}`);

      // Emit inventory-aware recommendation refresh event
      osBus.emit("beverage:inventory_updated", {
        itemId: item.id || "",
        itemName: item.name || "",
        locationId,
        newQuantity: (item as any).onHand || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[BeverageIntelligence] Error handling inventory:updated:", error);
    }
  });

  // Listen for BEO creation - generate beverage plan
  osBus.on("beo:created", async (event) => {
    try {
      const { beoId, eventId } = event;

      // Generate beverage recommendations for event
      // This would fetch event details and generate recommendations
      console.log(`[BeverageIntelligence] BEO created: ${beoId} for event: ${eventId}`);

      // Emit beverage plan generated event
      osBus.emit("beverage:plan_generated", {
        beoId,
        eventId,
        recommendations: {
          wines: [],
          cocktails: [],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[BeverageIntelligence] Error handling beo:created:", error);
    }
  });

  // Listen for POS sales - learn from successful recommendations
  osBus.on("pos:sale_completed", async (event) => {
    try {
      const { itemId, itemType, customerId, venueId } = event as any;

      if (itemType === "wine" || itemType === "cocktail") {
        // Record successful sale for learning
        await realTimeLearningService.recordInteraction({
          id: `interaction-${Date.now()}`,
          type: "order_placed",
          userId: customerId,
          timestamp: new Date(),
          context: {
            recommendationType: itemType === "wine" ? "wine" : "cocktail",
            itemId,
            itemType: itemType as "wine" | "cocktail",
          },
          outcome: {
            accepted: true,
            ordered: true,
          },
        });
      }
    } catch (error) {
      console.error("[BeverageIntelligence] Error handling pos:sale_completed:", error);
    }
  });

  // Listen for inventory cost updates - recalculate recipe costs
  osBus.on("inventory:cost_updated", async (event) => {
    try {
      const { itemId, newCost, venueId } = event as any;

      console.log(`[BeverageIntelligence] Cost updated for item ${itemId}: $${newCost}`);

      // Trigger recipe cost recalculation for cocktails using this ingredient
      osBus.emit("beverage:cost_recalculated", {
        itemId,
        newCost,
        affectedRecipes: [], // Would be populated by mixology service
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[BeverageIntelligence] Error handling inventory:cost_updated:", error);
    }
  });

  console.log("[BeverageIntelligence] OS Bus integration initialized");
}

// ============================================================================
// EVENT EMITTERS
// ============================================================================

/**
 * Emit wine recommendation event
 */
export function emitWineRecommendation(
  recommendation: any,
  context: { customerId?: string; dishId?: string }
) {
  osBus.emit("beverage:wine_recommended", {
    recommendationId: recommendation.id || "",
    wineId: recommendation.wine?.id || "",
    wineName: recommendation.wine?.name || "",
    score: recommendation.score || 0,
    priority: recommendation.priority?.level || "medium",
    customerId: context.customerId,
    dishId: context.dishId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit cocktail recommendation event
 */
export function emitCocktailRecommendation(
  recommendation: any,
  context: { customerId?: string; dishId?: string }
) {
  osBus.emit("beverage:cocktail_recommended", {
    recommendationId: recommendation.recipe?.id || "",
    cocktailName: recommendation.recipe?.name || "",
    confidence: recommendation.confidence || 0,
    customerId: context.customerId,
    dishId: context.dishId,
    timestamp: new Date().toISOString(),
  });
}

// Extend OS Bus event map with beverage events
declare module "../../../client/lib/os-bus" {
  interface OSBusEventMap {
    "beverage:pairing_suggestions": {
      dishId: string;
      dishName: string;
      recommendations: {
        wines: any[];
        cocktails: any[];
      };
      confidence: number;
      timestamp: string;
    };
    "beverage:inventory_updated": {
      itemId: string;
      itemName: string;
      locationId: string;
      newQuantity: number;
      timestamp: string;
    };
    "beverage:plan_generated": {
      beoId: string;
      eventId: string;
      recommendations: {
        wines: any[];
        cocktails: any[];
      };
      timestamp: string;
    };
    "beverage:cost_recalculated": {
      itemId: string;
      newCost: number;
      affectedRecipes: string[];
      timestamp: string;
    };
    "beverage:wine_recommended": {
      recommendationId: string;
      wineId: string;
      wineName: string;
      score: number;
      priority: "low" | "medium" | "high";
      customerId?: string;
      dishId?: string;
      timestamp: string;
    };
    "beverage:cocktail_recommended": {
      recommendationId: string;
      cocktailName: string;
      confidence: number;
      customerId?: string;
      dishId?: string;
      timestamp: string;
    };
  }
}
