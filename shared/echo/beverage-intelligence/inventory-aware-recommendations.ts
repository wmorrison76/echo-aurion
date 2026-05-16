/**
 * Inventory-Aware Recommendations Service
 * Enterprise service that provides recommendations with Low/Med/High priority
 * based on actual inventory status
 */

import { wineIntelligenceService, type WineRecommendation, type RecommendationContext, type InventoryStatus } from "./wine-intelligence";
import { mixologyIntelligenceService, type GeneratedRecipe, type RecipeGenerationRequest } from "./mixology-intelligence";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface InventoryAwareRecommendation<T> {
  recommendation: T;
  priority: RecommendationPriority;
  inventoryStatus: InventoryStatus | null;
  actionable: boolean; // Can be served immediately
  estimatedAvailability: Date | null; // When item will be available if ordered
  orderSuggestion?: OrderSuggestion;
}

export interface RecommendationPriority {
  level: "low" | "medium" | "high";
  reason: string;
  confidence: number;
  visualIndicator: PriorityVisualIndicator;
}

export interface PriorityVisualIndicator {
  badge: "✓" | "⚠" | "💡";
  color: string;
  label: string;
  tooltip: string;
}

export interface OrderSuggestion {
  itemId: string;
  itemName: string;
  suggestedQuantity: number;
  estimatedCost: number;
  leadTimeDays: number;
  urgency: "low" | "medium" | "high";
  reasoning: string;
}

export interface InventoryCheckResult {
  itemId: string;
  currentQuantity: number;
  reorderPoint: number;
  parLevel: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  stockRatio: number; // currentQuantity / parLevel
  daysUntilReorder: number;
  leadTimeDays: number;
}

// ============================================================================
// INVENTORY-AWARE RECOMMENDATIONS SERVICE
// ============================================================================

export class InventoryAwareRecommendationsService {
  /**
   * Get wine recommendations with inventory-aware priority
   */
  async getWineRecommendations(
    context: RecommendationContext,
    inventoryStatuses: InventoryStatus[]
  ): Promise<InventoryAwareRecommendation<WineRecommendation>[]> {
    // 1. Get base recommendations (without inventory check)
    const baseRecommendations = await wineIntelligenceService.getRecommendations(context);

    // 2. Enrich each with inventory status and priority
    const enrichedRecommendations = await Promise.all(
      baseRecommendations.map(rec => this.enrichWineRecommendation(rec, inventoryStatuses))
    );

    // 3. Sort by priority (high first) then by score
    return enrichedRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority.level] - priorityOrder[a.priority.level];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.recommendation.score || 0) - (a.recommendation.score || 0);
    });
  }

  /**
   * Get cocktail recipe recommendations with inventory-aware priority
   */
  async getCocktailRecommendations(
    request: RecipeGenerationRequest,
    inventoryStatuses: InventoryStatus[]
  ): Promise<InventoryAwareRecommendation<GeneratedRecipe>[]> {
    // 1. Generate base recipes
    const baseRecipe = await mixologyIntelligenceService.generateFromFlavors(request);

    // 2. Enrich with inventory status
    const enriched = await this.enrichCocktailRecommendation(baseRecipe, inventoryStatuses);

    // 3. Check alternatives
    const alternativeEnrichments = await Promise.all(
      baseRecipe.alternatives.map(alt => this.enrichCocktailRecommendation({
        ...baseRecipe,
        recipe: alt,
      }, inventoryStatuses))
    );

    return [enriched, ...alternativeEnrichments];
  }

  /**
   * Enrich wine recommendation with inventory status
   */
  private async enrichWineRecommendation(
    recommendation: WineRecommendation,
    inventoryStatuses: InventoryStatus[]
  ): Promise<InventoryAwareRecommendation<WineRecommendation>> {
    if (!recommendation.wine.inventoryItemId) {
      return this.createLowPriorityRecommendation(recommendation, null);
    }

    const inventoryStatus = inventoryStatuses.find(inv => inv.itemId === recommendation.wine.inventoryItemId);
    
    if (!inventoryStatus) {
      return this.createLowPriorityRecommendation(recommendation, null);
    }

    // Calculate priority based on stock level
    const priority = this.calculatePriorityFromInventory(inventoryStatus);
    const checkResult = this.checkInventoryStatus(inventoryStatus);

    // Generate order suggestion if needed
    const orderSuggestion = priority.level === "low" || priority.level === "medium"
      ? this.generateOrderSuggestion(inventoryStatus, recommendation.wine.name)
      : undefined;

    return {
      recommendation,
      priority,
      inventoryStatus,
      actionable: checkResult.status === "in_stock" && checkResult.stockRatio >= 0.5,
      estimatedAvailability: orderSuggestion
        ? new Date(Date.now() + orderSuggestion.leadTimeDays * 24 * 60 * 60 * 1000)
        : null,
      orderSuggestion,
    };
  }

  /**
   * Enrich cocktail recommendation with inventory status
   */
  private async enrichCocktailRecommendation(
    recipe: GeneratedRecipe,
    inventoryStatuses: InventoryStatus[]
  ): Promise<InventoryAwareRecommendation<GeneratedRecipe>> {
    // Check all ingredients in recipe
    const ingredientChecks = await Promise.all(
      recipe.recipe.ingredients.map(ing => {
        if (!ing.ingredientId) return null;
        const invStatus = inventoryStatuses.find(inv => inv.itemId === ing.ingredientId);
        return invStatus ? this.checkInventoryStatus(invStatus) : null;
      })
    );

    // Determine overall priority (worst case)
    const priorities = ingredientChecks
      .filter((check): check is InventoryCheckResult => check !== null)
      .map(check => this.calculatePriorityFromCheckResult(check));

    const overallPriority = this.getOverallPriority(priorities);

    // Find worst inventory status
    const worstStatus = ingredientChecks
      .filter((check): check is InventoryCheckResult => check !== null)
      .sort((a, b) => {
        const statusOrder = { out_of_stock: 3, low_stock: 2, in_stock: 1 };
        return statusOrder[b.status] - statusOrder[a.status];
      })[0];

    const worstInventory = worstStatus
      ? inventoryStatuses.find(inv => inv.itemId === recipe.recipe.ingredients.find(ing => {
          const check = ingredientChecks.find(c => c?.itemId === inv.itemId);
          return check?.status === worstStatus.status;
        })?.ingredientId)
      : null;

    // Generate order suggestions for missing ingredients
    const orderSuggestions = ingredientChecks
      .map((check, index) => {
        if (!check || check.status === "in_stock") return null;
        const ingredient = recipe.recipe.ingredients[index];
        const invStatus = inventoryStatuses.find(inv => inv.itemId === ingredient.ingredientId);
        if (!invStatus) return null;
        return this.generateOrderSuggestion(invStatus, ingredient.name);
      })
      .filter((suggestion): suggestion is OrderSuggestion => suggestion !== null);

    return {
      recommendation: recipe,
      priority: overallPriority,
      inventoryStatus: worstInventory || null,
      actionable: priorities.every(p => p.level === "high"),
      estimatedAvailability: orderSuggestions.length > 0
        ? new Date(Date.now() + Math.max(...orderSuggestions.map(s => s.leadTimeDays)) * 24 * 60 * 60 * 1000)
        : null,
      orderSuggestion: orderSuggestions.length > 0 ? orderSuggestions[0] : undefined,
    };
  }

  /**
   * Calculate priority from inventory status
   */
  private calculatePriorityFromInventory(inventory: InventoryStatus): RecommendationPriority {
    const stockRatio = inventory.currentQuantity / inventory.parLevel;
    const daysUntilReorder = this.calculateDaysUntilReorder(inventory);

    // HIGH PRIORITY: In stock with sufficient quantity
    if (inventory.status === "in_stock" && stockRatio >= 0.5 && inventory.currentQuantity > inventory.reorderPoint) {
      return {
        level: "high",
        reason: `Available in inventory (${inventory.currentQuantity} units) - ready to serve immediately`,
        confidence: 0.95,
        visualIndicator: {
          badge: "✓",
          color: "#34C759", // Green
          label: "In Stock",
          tooltip: "This item is available in inventory and ready to serve",
        },
      };
    }

    // MEDIUM PRIORITY: Low stock - order soon
    if (inventory.status === "low_stock" || (inventory.currentQuantity <= inventory.reorderPoint && inventory.currentQuantity > 0)) {
      return {
        level: "medium",
        reason: `Low stock (${inventory.currentQuantity} units remaining, reorder at ${inventory.reorderPoint}) - order soon to maintain availability. Estimated delivery: ${inventory.leadTimeDays} days`,
        confidence: 0.85,
        visualIndicator: {
          badge: "⚠",
          color: "#FF9500", // Orange
          label: "Low Stock",
          tooltip: `Order soon. ${inventory.currentQuantity} units remaining. Reorder point: ${inventory.reorderPoint}`,
        },
      };
    }

    // LOW PRIORITY: Out of stock - high value suggestion
    if (inventory.status === "out_of_stock" || inventory.currentQuantity === 0) {
      return {
        level: "low",
        reason: `High value suggestion - requires ordering (not currently in inventory). Estimated delivery: ${inventory.leadTimeDays} days`,
        confidence: 0.75,
        visualIndicator: {
          badge: "💡",
          color: "#8E8E93", // Gray
          label: "Order Required",
          tooltip: "This is a high-value recommendation but requires ordering. Not currently in inventory.",
        },
      };
    }

    // Default fallback
    return {
      level: "medium",
      reason: "Available with ordering",
      confidence: 0.8,
      visualIndicator: {
        badge: "⚠",
        color: "#FF9500",
        label: "Check Availability",
        tooltip: "Verify inventory status before serving",
      },
    };
  }

  /**
   * Check inventory status and return detailed result
   */
  private checkInventoryStatus(inventory: InventoryStatus): InventoryCheckResult {
    const stockRatio = inventory.currentQuantity / inventory.parLevel;
    const daysUntilReorder = this.calculateDaysUntilReorder(inventory);

    let status: "in_stock" | "low_stock" | "out_of_stock";
    if (inventory.currentQuantity === 0) {
      status = "out_of_stock";
    } else if (inventory.currentQuantity <= inventory.reorderPoint) {
      status = "low_stock";
    } else {
      status = "in_stock";
    }

    return {
      itemId: inventory.itemId,
      currentQuantity: inventory.currentQuantity,
      reorderPoint: inventory.reorderPoint,
      parLevel: inventory.parLevel,
      status,
      stockRatio,
      daysUntilReorder,
      leadTimeDays: inventory.leadTimeDays,
    };
  }

  /**
   * Calculate priority from check result
   */
  private calculatePriorityFromCheckResult(check: InventoryCheckResult): RecommendationPriority {
    if (check.status === "in_stock" && check.stockRatio >= 0.5) {
      return {
        level: "high",
        reason: "In stock",
        confidence: 0.95,
        visualIndicator: {
          badge: "✓",
          color: "#34C759",
          label: "In Stock",
          tooltip: "Available",
        },
      };
    }

    if (check.status === "low_stock") {
      return {
        level: "medium",
        reason: "Low stock",
        confidence: 0.85,
        visualIndicator: {
          badge: "⚠",
          color: "#FF9500",
          label: "Low Stock",
          tooltip: "Order soon",
        },
      };
    }

    return {
      level: "low",
      reason: "Out of stock",
      confidence: 0.75,
      visualIndicator: {
        badge: "💡",
        color: "#8E8E93",
        label: "Order Required",
        tooltip: "Requires ordering",
      },
    };
  }

  /**
   * Get overall priority from multiple ingredient priorities
   */
  private getOverallPriority(priorities: RecommendationPriority[]): RecommendationPriority {
    if (priorities.length === 0) {
      return {
        level: "medium",
        reason: "Unable to determine inventory status",
        confidence: 0.5,
        visualIndicator: {
          badge: "⚠",
          color: "#FF9500",
          label: "Unknown",
          tooltip: "Inventory status unknown",
        },
      };
    }

    // Worst case priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const worst = priorities.reduce((worst, current) => {
      return priorityOrder[current.level] < priorityOrder[worst.level] ? current : worst;
    });

    return worst;
  }

  /**
   * Generate order suggestion
   */
  private generateOrderSuggestion(
    inventory: InventoryStatus,
    itemName: string
  ): OrderSuggestion {
    const suggestedQuantity = inventory.parLevel - inventory.currentQuantity;
    const urgency = inventory.status === "out_of_stock" ? "high" :
                   inventory.currentQuantity <= inventory.reorderPoint ? "medium" : "low";

    return {
      itemId: inventory.itemId,
      itemName,
      suggestedQuantity: Math.max(suggestedQuantity, inventory.reorderPoint),
      estimatedCost: 0, // Would need item cost data
      leadTimeDays: inventory.leadTimeDays,
      urgency,
      reasoning: urgency === "high"
        ? "Item is out of stock - urgent reorder needed"
        : `Current stock (${inventory.currentQuantity}) is below reorder point (${inventory.reorderPoint})`,
    };
  }

  /**
   * Create low priority recommendation (no inventory link)
   */
  private createLowPriorityRecommendation<T>(
    recommendation: T,
    inventoryStatus: InventoryStatus | null
  ): InventoryAwareRecommendation<T> {
    return {
      recommendation,
      priority: {
        level: "low",
        reason: "High value suggestion - not currently tracked in inventory",
        confidence: 0.7,
        visualIndicator: {
          badge: "💡",
          color: "#8E8E93",
          label: "High Value",
          tooltip: "This is a recommendation but not currently in inventory system",
        },
      },
      inventoryStatus,
      actionable: false,
      estimatedAvailability: null,
    };
  }

  /**
   * Calculate days until reorder point
   */
  private calculateDaysUntilReorder(inventory: InventoryStatus): number {
    if (inventory.currentQuantity <= 0) return 0;
    if (inventory.currentQuantity <= inventory.reorderPoint) return 0;

    // Estimate consumption rate (simplified - assumes linear consumption to par level over 30 days)
    const consumptionPerDay = (inventory.parLevel - inventory.reorderPoint) / 30;
    if (consumptionPerDay <= 0) return 999; // No consumption

    const daysToReorder = Math.ceil(
      (inventory.currentQuantity - inventory.reorderPoint) / consumptionPerDay
    );

    return Math.max(0, daysToReorder);
  }

  /**
   * Get inventory statuses for items (from inventory service)
   */
  async getInventoryStatuses(
    itemIds: string[],
    orgId: string,
    locationId?: string
  ): Promise<InventoryStatus[]> {
    // Import dynamically to avoid circular dependencies
    const { getInventoryStatuses: fetchStatuses } = await import("./inventory-service-adapter");
    return fetchStatuses(itemIds, orgId, locationId);
  }
}

// Export singleton instance
export const inventoryAwareRecommendationsService = new InventoryAwareRecommendationsService();
