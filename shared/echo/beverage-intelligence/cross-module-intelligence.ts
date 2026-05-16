/**
 * Cross-Module Intelligence Engine
 * Connects Wine, Mixology, and Culinary intelligence for unified recommendations
 * 
 * Features:
 * - Wine ↔ Cocktail recommendations
 * - Food ↔ Beverage pairings
 * - Unified customer profiles
 * - Inventory synergy detection
 */

import { wineIntelligenceService, type WineRecommendation, type RecommendationContext } from "./wine-intelligence";
import { mixologyIntelligenceService, type GeneratedRecipe, type RecipeGenerationRequest } from "./mixology-intelligence";
import {
  computeFlavorFingerprint,
  type FlavorFingerprint,
  type RecipeAnalysisInput,
} from "../../../client/modules/Culinary/shared/echo/flavor-engine";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UnifiedRecommendation {
  customerId?: string;
  context: RecommendationContext;
  recommendations: {
    wines: WineRecommendation[];
    cocktails: GeneratedRecipe[];
    foodPairings?: FoodBeveragePairing[];
  };
  synergies: InventorySynergy[];
  reasoning: string[];
  confidence: number;
}

export interface FoodBeveragePairing {
  dishId: string;
  dishName: string;
  wineRecommendations: WineRecommendation[];
  cocktailRecommendations: GeneratedRecipe[];
  compatibilityScore: number;
  reasoning: string[];
}

export interface InventorySynergy {
  type: "wine_cocktail" | "food_beverage" | "ingredient_overlap";
  items: Array<{ id: string; name: string; type: "wine" | "cocktail" | "dish" }>;
  benefit: string;
  costSavings?: number;
  score: number;
}

export interface CustomerProfile {
  customerId: string;
  preferences: {
    wines: string[]; // Wine IDs
    cocktails: string[]; // Recipe IDs
    dishes: string[]; // Dish IDs
    priceRange: { min: number; max: number };
    flavorPreferences: string[];
    avoidedItems: string[];
  };
  orderHistory: Array<{
    itemId: string;
    itemType: "wine" | "cocktail" | "dish";
    timestamp: Date;
    rating?: number;
  }>;
  preferencesLearned: boolean;
}

// ============================================================================
// CROSS-MODULE INTELLIGENCE SERVICE
// ============================================================================

export class CrossModuleIntelligenceService {
  private customerProfiles: Map<string, CustomerProfile> = new Map();
  private unifiedFlavorSpace: Map<string, FlavorFingerprint> = new Map();

  /**
   * Get unified recommendations across all modules
   */
  async getUnifiedRecommendations(context: RecommendationContext): Promise<UnifiedRecommendation> {
    const reasoning: string[] = [];

    // 1. Build customer profile if available
    let customerProfile: CustomerProfile | null = null;
    if (context.customerId) {
      customerProfile = await this.getOrCreateCustomerProfile(context.customerId);
      context.preferences = this.buildPreferencesFromProfile(customerProfile);
      reasoning.push("Using learned customer preferences");
    }

    // 2. Get wine recommendations
    const wineRecommendations = await wineIntelligenceService.getRecommendations(context);
    reasoning.push(`Found ${wineRecommendations.length} wine recommendations`);

    // 3. Get cocktail recommendations (if dish context)
    let cocktailRecommendations: GeneratedRecipe[] = [];
    if (context.dish) {
      const cocktailRequest = this.dishToCocktailRequest(context.dish);
      const cocktailRec = await mixologyIntelligenceService.generateFromFlavors(cocktailRequest);
      cocktailRecommendations = [cocktailRec, ...cocktailRec.alternatives];
      reasoning.push(`Generated ${cocktailRecommendations.length} cocktail recommendations`);
    }

    // 4. Generate food-beverage pairings
    const foodPairings = context.dish
      ? await this.generateFoodBeveragePairings(context.dish, wineRecommendations, cocktailRecommendations)
      : undefined;

    // 5. Detect inventory synergies
    const synergies = await this.detectInventorySynergies(
      wineRecommendations.map(r => ({ id: r.wine.id, name: r.wine.name, type: "wine" as const })),
      cocktailRecommendations.map(r => ({ id: r.recipe.id, name: r.recipe.name, type: "cocktail" as const })),
      context.dish ? [{ id: context.dish.dishId, name: context.dish.dishName, type: "dish" as const }] : []
    );

    // 6. Calculate overall confidence
    const confidence = this.calculateUnifiedConfidence(
      wineRecommendations,
      cocktailRecommendations,
      context
    );

    return {
      customerId: context.customerId,
      context,
      recommendations: {
        wines: wineRecommendations,
        cocktails: cocktailRecommendations,
        foodPairings,
      },
      synergies,
      reasoning,
      confidence,
    };
  }

  /**
   * Get wine recommendations based on cocktail selection
   */
  async getWinesForCocktail(cocktailId: string, context: RecommendationContext): Promise<WineRecommendation[]> {
    // Get cocktail flavor profile
    // Find wines with similar/complementary profiles
    // Return recommendations

    // Implementation would:
    // 1. Get cocktail recipe
    // 2. Extract flavor profile
    // 3. Find similar wines
    // 4. Return top matches

    return [];
  }

  /**
   * Get cocktail recommendations based on wine selection
   */
  async getCocktailsForWine(wineId: string, context: RecommendationContext): Promise<GeneratedRecipe[]> {
    // Get wine flavor profile
    // Find cocktails with similar/complementary profiles
    // Return recommendations

    return [];
  }

  /**
   * Generate food-beverage pairings
   */
  private async generateFoodBeveragePairings(
    dish: RecommendationContext["dish"],
    wineRecommendations: WineRecommendation[],
    cocktailRecommendations: GeneratedRecipe[]
  ): Promise<FoodBeveragePairing[]> {
    if (!dish) return [];

    const pairings: FoodBeveragePairing[] = [];

    // Get dish flavor profile
    const dishProfile = dish.flavorProfile || await this.analyzeDishFlavor(dish);

    // Score wine pairings
    const wineScores = await Promise.all(
      wineRecommendations.map(async (wineRec) => {
        const score = await this.scoreBeveragePairing(dishProfile, wineRec.wine, "wine");
        return { recommendation: wineRec, score };
      })
    );

    // Score cocktail pairings
    const cocktailScores = await Promise.all(
      cocktailRecommendations.map(async (cocktailRec) => {
        const score = await this.scoreBeveragePairing(dishProfile, cocktailRec.recipe, "cocktail");
        return { recommendation: cocktailRec, score };
      })
    );

    // Combine into pairing
    const topWines = wineScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.recommendation);

    const topCocktails = cocktailScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.recommendation);

    const compatibilityScore = Math.max(
      ...wineScores.map(s => s.score),
      ...cocktailScores.map(s => s.score),
      0
    );

    pairings.push({
      dishId: dish.dishId,
      dishName: dish.dishName,
      wineRecommendations: topWines,
      cocktailRecommendations: topCocktails,
      compatibilityScore,
      reasoning: this.generatePairingReasoning(dishProfile, topWines[0], topCocktails[0]),
    });

    return pairings;
  }

  /**
   * Score beverage pairing with dish
   */
  private async scoreBeveragePairing(
    dishProfile: FlavorFingerprint,
    beverage: any,
    type: "wine" | "cocktail"
  ): Promise<number> {
    // Get beverage flavor profile
    let beverageProfile: FlavorFingerprint;

    if (type === "wine") {
      const wineProfile = await wineIntelligenceService.analyzeTasteProfile(beverage);
      beverageProfile = {
        recipeId: beverage.id,
        recipeName: beverage.name,
        attributes: wineProfile.flavorAttributes || [],
        descriptors: wineProfile.primaryNotes,
      };
    } else {
      // Cocktail
      beverageProfile = {
        recipeId: beverage.id,
        recipeName: beverage.name,
        attributes: beverage.flavorProfile?.flavorAttributes || [],
        descriptors: beverage.flavorProfile?.primary || [],
      };
    }

    // Calculate compatibility using flavor engine
    return this.calculatePairingCompatibility(dishProfile, beverageProfile);
  }

  /**
   * Calculate pairing compatibility using flavor engine
   */
  private calculatePairingCompatibility(
    dishProfile: FlavorFingerprint,
    beverageProfile: FlavorFingerprint
  ): number {
    // Use flavor engine's pairing logic
    // Check complementary flavors (acid + fat, sweet + spicy, etc.)
    
    let compatibility = 0;

    const getIntensity = (profile: FlavorFingerprint, id: string) =>
      profile.attributes.find(a => a.id === id)?.intensity || 0;

    // Acid + Fat complement
    const dishFat = getIntensity(dishProfile, "fat");
    const bevAcid = getIntensity(beverageProfile, "sour");
    if (dishFat > 0.5 && bevAcid > 0.5) {
      compatibility += 0.3;
    }

    // Sweet + Spicy complement
    const dishSpicy = getIntensity(dishProfile, "spicy");
    const bevSweet = getIntensity(beverageProfile, "sweet");
    if (dishSpicy > 0.5 && bevSweet > 0.5) {
      compatibility += 0.3;
    }

    // Umami pairing
    const dishUmami = getIntensity(dishProfile, "umami");
    const bevUmami = getIntensity(beverageProfile, "umami");
    if (dishUmami > 0.5 && bevUmami > 0.5) {
      compatibility += 0.2;
    }

    // Intensity matching
    const dishIntensity = this.calculateIntensity(dishProfile);
    const bevIntensity = this.calculateIntensity(beverageProfile);
    const intensityMatch = 1 - Math.abs(dishIntensity - bevIntensity);
    compatibility += intensityMatch * 0.2;

    return Math.min(1, compatibility);
  }

  /**
   * Detect inventory synergies
   */
  private async detectInventorySynergies(
    wines: Array<{ id: string; name: string; type: "wine" }>,
    cocktails: Array<{ id: string; name: string; type: "cocktail" }>,
    dishes: Array<{ id: string; name: string; type: "dish" }>
  ): Promise<InventorySynergy[]> {
    const synergies: InventorySynergy[] = [];

    // 1. Wine-Cocktail synergies (shared ingredients)
    for (const wine of wines) {
      for (const cocktail of cocktails) {
        // Check for shared ingredients (e.g., wine used in cocktail)
        // This would require ingredient database lookup
        // For now, placeholder logic
        const synergy = this.checkWineCocktailSynergy(wine, cocktail);
        if (synergy) synergies.push(synergy);
      }
    }

    // 2. Food-Beverage synergies (complementary flavors)
    for (const dish of dishes) {
      for (const wine of wines) {
        const synergy = this.checkFoodBeverageSynergy(dish, wine);
        if (synergy) synergies.push(synergy);
      }

      for (const cocktail of cocktails) {
        const synergy = this.checkFoodBeverageSynergy(dish, cocktail);
        if (synergy) synergies.push(synergy);
      }
    }

    // 3. Ingredient overlap (cost savings)
    const ingredientOverlap = this.detectIngredientOverlap(cocktails, dishes);
    synergies.push(...ingredientOverlap);

    return synergies.sort((a, b) => b.score - a.score);
  }

  /**
   * Check wine-cocktail synergy
   */
  private checkWineCocktailSynergy(
    wine: { id: string; name: string },
    cocktail: { id: string; name: string }
  ): InventorySynergy | null {
    // Would check if cocktail uses wine as ingredient
    // Or if they share flavor profiles
    // Placeholder for now
    return null;
  }

  /**
   * Check food-beverage synergy
   */
  private checkFoodBeverageSynergy(
    dish: { id: string; name: string },
    beverage: { id: string; name: string; type: "wine" | "cocktail" }
  ): InventorySynergy | null {
    // High compatibility = synergy
    // Would be calculated from pairing scores
    return null;
  }

  /**
   * Detect ingredient overlap between cocktails and dishes
   */
  private detectIngredientOverlap(
    cocktails: Array<{ id: string; name: string }>,
    dishes: Array<{ id: string; name: string }>
  ): InventorySynergy[] {
    // Check for shared ingredients (citrus, herbs, etc.)
    // Return cost savings opportunities
    return [];
  }

  /**
   * Get or create customer profile
   */
  private async getOrCreateCustomerProfile(customerId: string): Promise<CustomerProfile> {
    let profile = this.customerProfiles.get(customerId);

    if (!profile) {
      profile = {
        customerId,
        preferences: {
          wines: [],
          cocktails: [],
          dishes: [],
          priceRange: { min: 0, max: 1000 },
          flavorPreferences: [],
          avoidedItems: [],
        },
        orderHistory: [],
        preferencesLearned: false,
      };
      this.customerProfiles.set(customerId, profile);
    }

    return profile;
  }

  /**
   * Build preferences from customer profile
   */
  private buildPreferencesFromProfile(profile: CustomerProfile): RecommendationContext["preferences"] {
    return {
      preferredStyles: profile.preferences.flavorPreferences,
      previousOrders: [...profile.preferences.wines, ...profile.preferences.cocktails],
      priceRange: profile.preferences.priceRange,
      avoidedStyles: profile.preferences.avoidedItems,
    };
  }

  /**
   * Convert dish context to cocktail generation request
   */
  private dishToCocktailRequest(dish: NonNullable<RecommendationContext["dish"]>): RecipeGenerationRequest {
    return {
      availableIngredients: [], // Would be populated from inventory
      targetFlavor: dish.flavorProfile ? {
        primary: dish.flavorProfile.descriptors.slice(0, 3),
        intensity: this.calculateIntensity(dish.flavorProfile),
        profile: dish.flavorProfile,
      } : undefined,
      style: "modern",
    };
  }

  /**
   * Analyze dish flavor profile
   */
  private async analyzeDishFlavor(dish: NonNullable<RecommendationContext["dish"]>): Promise<FlavorFingerprint> {
    // If flavor profile not provided, analyze from dish name/cuisine
    // For now, return basic profile
    const input: RecipeAnalysisInput = {
      name: dish.dishName,
      servings: 1,
      ingredients: [], // Would be populated from recipe
      techniqueSteps: [],
      richness: dish.richness || 0.5,
      aromaticLift: 0.6,
    };

    return computeFlavorFingerprint(input);
  }

  /**
   * Calculate intensity from flavor profile
   */
  private calculateIntensity(profile: FlavorFingerprint): number {
    return profile.attributes.reduce((sum, a) => sum + a.intensity, 0) / profile.attributes.length;
  }

  /**
   * Generate pairing reasoning
   */
  private generatePairingReasoning(
    dishProfile: FlavorFingerprint,
    wine?: WineRecommendation,
    cocktail?: GeneratedRecipe
  ): string[] {
    const reasoning: string[] = [];

    if (wine) {
      reasoning.push(...wine.reasoning);
    }

    if (cocktail) {
      reasoning.push(`Cocktail complements dish with ${cocktail.recipe.flavorProfile.primary.join(", ")} notes`);
    }

    return reasoning;
  }

  /**
   * Calculate unified confidence
   */
  private calculateUnifiedConfidence(
    wines: WineRecommendation[],
    cocktails: GeneratedRecipe[],
    context: RecommendationContext
  ): number {
    let confidence = 0.7; // Base

    // More recommendations = higher confidence
    if (wines.length > 3) confidence += 0.1;
    if (cocktails.length > 0) confidence += 0.1;

    // More context = higher confidence
    if (context.dish) confidence += 0.05;
    if (context.preferences) confidence += 0.05;

    // High-scoring recommendations = higher confidence
    const avgWineScore = wines.reduce((sum, w) => sum + (w.score || 0), 0) / wines.length;
    if (avgWineScore > 80) confidence += 0.05;

    return Math.min(1, confidence);
  }
}

// Export singleton instance
export const crossModuleIntelligenceService = new CrossModuleIntelligenceService();
