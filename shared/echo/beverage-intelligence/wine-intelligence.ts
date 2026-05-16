/**
 * Wine Intelligence Service
 * Enterprise-grade AI service for wine recommendations, pairings, and analysis
 * 
 * Features:
 * - Taste profile analysis
 * - Food pairing engine
 * - Vintage intelligence
 * - Inventory-aware recommendations (Low/Med/High priority)
 * - Price optimization
 */

import type { FlavorFingerprint, FlavorAttribute } from "../../../client/modules/Culinary/shared/echo/flavor-engine";
import { analyzeRecipeForEcho, computeFlavorFingerprint, type RecipeAnalysisInput } from "../../../client/modules/Culinary/shared/echo/flavor-engine";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Wine {
  id: string;
  name: string;
  producer: string;
  vintage?: number;
  region: string;
  grapeVariety: string[];
  wineType: "red" | "white" | "rosé" | "sparkling" | "fortified" | "dessert";
  price: number;
  costPrice?: number;
  abv?: number; // Alcohol by volume
  flavorProfile?: FlavorProfile;
  inventoryItemId?: string; // Link to inventory
}

export interface FlavorProfile {
  body: "light" | "medium" | "full";
  acidity: "low" | "medium" | "high";
  tannins?: "low" | "medium" | "high"; // For red wines
  sweetness: "dry" | "off-dry" | "sweet";
  intensity: "delicate" | "moderate" | "bold";
  primaryNotes: string[]; // ["fruity", "earthy", "spicy"]
  flavorAttributes: FlavorAttribute[]; // From flavor engine
}

export interface InventoryStatus {
  itemId: string;
  currentQuantity: number;
  reorderPoint: number;
  parLevel: number;
  leadTimeDays: number;
  lastOrderedAt?: string;
  lastReceivedAt?: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface RecommendationPriority {
  priority: "low" | "medium" | "high";
  reason: string;
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock";
  estimatedOrderTime?: number; // days
  confidence: number;
}

export interface WineRecommendation {
  wine: Wine;
  score: number; // 0-100 compatibility score
  confidence: number; // 0-1 AI confidence
  reasoning: string[];
  priority: RecommendationPriority;
  alternatives: Wine[];
  foodPairings?: DishPairing[];
  cocktailPairings?: CocktailPairing[];
  priceOptimization?: PriceRecommendation;
}

export interface DishPairing {
  dishId: string;
  dishName: string;
  score: number;
  reasoning: string;
}

export interface CocktailPairing {
  cocktailId: string;
  cocktailName: string;
  score: number;
  reasoning: string;
}

export interface PriceRecommendation {
  currentPrice: number;
  suggestedPrice: number;
  margin: number;
  marginPercent: number;
  reasoning: string;
}

export interface RecommendationContext {
  customerId?: string;
  occasion?: string;
  budget?: { min: number; max: number };
  preferences?: CustomerPreferences;
  dish?: DishContext;
  inventory?: InventoryStatus[];
  venueId?: string;
}

export interface CustomerPreferences {
  preferredStyles?: string[];
  avoidedStyles?: string[];
  priceRange?: { min: number; max: number };
  previousOrders?: string[]; // Wine IDs
}

export interface DishContext {
  dishId: string;
  dishName: string;
  flavorProfile?: FlavorFingerprint;
  cuisine?: string;
  spiceLevel?: number; // 0-10
  richness?: number; // 0-1
}

// ============================================================================
// WINE INTELLIGENCE SERVICE
// ============================================================================

export class WineIntelligenceService {
  private wineDatabase: Map<string, Wine> = new Map();
  private flavorProfiles: Map<string, FlavorProfile> = new Map();
  
  /**
   * Initialize wine database (load from storage/API)
   */
  async initialize(wines: Wine[]): Promise<void> {
    for (const wine of wines) {
      this.wineDatabase.set(wine.id, wine);
      if (wine.flavorProfile) {
        this.flavorProfiles.set(wine.id, wine.flavorProfile);
      }
    }
  }

  /**
   * Analyze wine taste profile
   * Uses flavor engine to extract 18-dimension flavor fingerprint
   */
  async analyzeTasteProfile(wine: Wine): Promise<FlavorProfile> {
    // Convert wine to flavor engine input
    const input: RecipeAnalysisInput = {
      name: wine.name,
      servings: 1,
      ingredients: this.wineToIngredients(wine),
      techniqueSteps: [],
      richness: this.estimateRichness(wine),
      aromaticLift: this.estimateAromaticLift(wine),
    };

    // Use existing flavor engine
    const fingerprint = computeFlavorFingerprint(input);

    // Map to wine-specific profile
    const profile: FlavorProfile = {
      body: this.determineBody(fingerprint),
      acidity: this.determineAcidity(fingerprint),
      tannins: wine.wineType === "red" ? this.determineTannins(fingerprint) : undefined,
      sweetness: this.determineSweetness(fingerprint),
      intensity: this.determineIntensity(fingerprint),
      primaryNotes: this.extractPrimaryNotes(fingerprint),
      flavorAttributes: fingerprint.attributes,
    };

    return profile;
  }

  /**
   * Get wine recommendations with inventory-aware priority
   */
  async getRecommendations(context: RecommendationContext): Promise<WineRecommendation[]> {
    // 1. Get base recommendations (without inventory check)
    const baseRecommendations = await this.generateBaseRecommendations(context);

    // 2. Enrich with inventory status and priority
    const enrichedRecommendations = await Promise.all(
      baseRecommendations.map(rec => this.enrichWithInventory(rec, context.inventory || []))
    );

    // 3. Sort by priority and score
    return enrichedRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority.priority] - priorityOrder[a.priority.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.score - a.score;
    });
  }

  /**
   * Generate base recommendations (AI matching)
   */
  private async generateBaseRecommendations(context: RecommendationContext): Promise<Omit<WineRecommendation, "priority">[]> {
    const candidates: Array<{ wine: Wine; score: number; reasoning: string[] }> = [];

    for (const wine of this.wineDatabase.values()) {
      let score = 0;
      const reasoning: string[] = [];

      // Context-based scoring
      if (context.dish) {
        const pairingScore = await this.scoreFoodPairing(wine, context.dish);
        score += pairingScore.score * 0.5;
        reasoning.push(...pairingScore.reasoning);
      }

      if (context.preferences) {
        const preferenceScore = this.scorePreferences(wine, context.preferences);
        score += preferenceScore.score * 0.3;
        reasoning.push(...preferenceScore.reasoning);
      }

      if (context.budget) {
        const budgetScore = this.scoreBudget(wine, context.budget);
        score += budgetScore.score * 0.2;
        reasoning.push(...budgetScore.reasoning);
      }

      if (score > 0) {
        candidates.push({
          wine,
          score,
          reasoning,
        });
      }
    }

    // Get top candidates with alternatives
    const topCandidates = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return topCandidates.map((candidate, index) => ({
      wine: candidate.wine,
      score: candidate.score,
      confidence: this.calculateConfidence(candidate.score, context),
      reasoning: candidate.reasoning,
      alternatives: topCandidates.slice(index + 1, index + 4).map(c => c.wine),
      foodPairings: context.dish ? [{
        dishId: context.dish.dishId,
        dishName: context.dish.dishName,
        score: candidate.score,
        reasoning: candidate.reasoning,
      }] : undefined,
    }));
  }

  /**
   * Enrich recommendation with inventory status and priority
   */
  private async enrichWithInventory(
    recommendation: Omit<WineRecommendation, "priority">,
    inventory: InventoryStatus[]
  ): Promise<WineRecommendation> {
    if (!recommendation.wine.inventoryItemId) {
      // No inventory link - default to low priority (high value suggestion)
      return {
        ...recommendation,
        priority: {
          priority: "low",
          reason: "High value suggestion - not currently in inventory",
          inventoryStatus: "out_of_stock",
          confidence: recommendation.confidence,
        },
      };
    }

    const inventoryStatus = inventory.find(inv => inv.itemId === recommendation.wine.inventoryItemId);

    if (!inventoryStatus) {
      return {
        ...recommendation,
        priority: {
          priority: "low",
          reason: "Item not found in inventory - requires ordering",
          inventoryStatus: "out_of_stock",
          confidence: recommendation.confidence,
        },
      };
    }

    // Calculate priority based on stock level
    const priority = this.calculatePriority(inventoryStatus);

    return {
      ...recommendation,
      priority: {
        ...priority,
        confidence: recommendation.confidence,
      },
    };
  }

  /**
   * Calculate recommendation priority based on inventory status
   */
  private calculatePriority(inventory: InventoryStatus): RecommendationPriority {
    const stockRatio = inventory.currentQuantity / inventory.parLevel;
    const daysUntilReorder = this.calculateDaysUntilReorder(inventory);

    // HIGH PRIORITY: In stock with sufficient quantity
    if (inventory.status === "in_stock" && stockRatio >= 0.5 && inventory.currentQuantity > inventory.reorderPoint) {
      return {
        priority: "high",
        reason: "Available in inventory - ready to serve",
        inventoryStatus: "in_stock",
        confidence: 0.95,
      };
    }

    // MEDIUM PRIORITY: Low stock - order soon
    if (inventory.status === "low_stock" || (inventory.currentQuantity <= inventory.reorderPoint && inventory.currentQuantity > 0)) {
      return {
        priority: "medium",
        reason: `Low stock (${inventory.currentQuantity} units) - order soon to maintain availability`,
        inventoryStatus: "low_stock",
        estimatedOrderTime: daysUntilReorder + inventory.leadTimeDays,
        confidence: 0.85,
      };
    }

    // LOW PRIORITY: Out of stock - high value suggestion
    if (inventory.status === "out_of_stock" || inventory.currentQuantity === 0) {
      return {
        priority: "low",
        reason: "High value suggestion - requires ordering (not currently in inventory)",
        inventoryStatus: "out_of_stock",
        estimatedOrderTime: inventory.leadTimeDays,
        confidence: 0.75,
      };
    }

    // Default fallback
    return {
      priority: "medium",
      reason: "Available with ordering",
      inventoryStatus: inventory.status,
      estimatedOrderTime: inventory.leadTimeDays,
      confidence: 0.8,
    };
  }

  /**
   * Score food pairing compatibility
   */
  private async scoreFoodPairing(wine: Wine, dish: DishContext): Promise<{ score: number; reasoning: string[] }> {
    const reasoning: string[] = [];
    let score = 50; // Base score

    // Get wine flavor profile
    const wineProfile = this.flavorProfiles.get(wine.id) || await this.analyzeTasteProfile(wine);
    
    // Get dish flavor profile if available
    if (dish.flavorProfile) {
      // Use flavor engine pairing logic
      score += this.calculateFlavorCompatibility(wineProfile, dish.flavorProfile);
      reasoning.push("Flavor profiles analyzed for compatibility");
    }

    // Intensity matching
    if (dish.richness) {
      const intensityMatch = this.matchIntensity(wineProfile.intensity, dish.richness);
      score += intensityMatch * 20;
      reasoning.push(`Intensity match: ${intensityMatch > 0.7 ? "Excellent" : intensityMatch > 0.5 ? "Good" : "Fair"}`);
    }

    // Regional pairing traditions
    const traditionBonus = this.checkTraditions(wine, dish);
    score += traditionBonus;
    if (traditionBonus > 0) {
      reasoning.push("Matches traditional regional pairing");
    }

    // Spice level handling
    if (dish.spiceLevel && dish.spiceLevel > 5) {
      if (wineProfile.sweetness === "sweet" || wineProfile.sweetness === "off-dry") {
        score += 15;
        reasoning.push("Sweetness balances spicy dish");
      } else if (wineProfile.acidity === "high") {
        score += 10;
        reasoning.push("High acidity cuts through spice");
      }
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      reasoning,
    };
  }

  /**
   * Score customer preferences
   */
  private scorePreferences(wine: Wine, preferences: CustomerPreferences): { score: number; reasoning: string[] } {
    const reasoning: string[] = [];
    let score = 0;

    if (preferences.preferredStyles) {
      const styleMatch = this.checkStyleMatch(wine, preferences.preferredStyles);
      if (styleMatch) {
        score += 30;
        reasoning.push(`Matches preferred style: ${styleMatch}`);
      }
    }

    if (preferences.avoidedStyles) {
      const avoided = this.checkStyleMatch(wine, preferences.avoidedStyles);
      if (avoided) {
        score -= 40;
        reasoning.push(`Avoided style detected: ${avoided}`);
      }
    }

    if (preferences.priceRange) {
      if (wine.price >= preferences.priceRange.min && wine.price <= preferences.priceRange.max) {
        score += 20;
        reasoning.push("Within preferred price range");
      } else if (wine.price > preferences.priceRange.max) {
        score -= 20;
        reasoning.push("Above preferred price range");
      }
    }

    if (preferences.previousOrders?.includes(wine.id)) {
      score += 15;
      reasoning.push("Previously ordered by customer");
    }

    return {
      score: Math.max(0, score),
      reasoning,
    };
  }

  /**
   * Score budget compatibility
   */
  private scoreBudget(wine: Wine, budget: { min: number; max: number }): { score: number; reasoning: string[] } {
    const reasoning: string[] = [];
    let score = 0;

    if (wine.price >= budget.min && wine.price <= budget.max) {
      score = 100;
      reasoning.push("Perfect budget match");
    } else if (wine.price < budget.min) {
      score = 60;
      reasoning.push("Below budget - excellent value");
    } else if (wine.price <= budget.max * 1.1) {
      score = 40;
      reasoning.push("Slightly above budget");
    } else {
      score = 0;
      reasoning.push("Significantly above budget");
    }

    return { score, reasoning };
  }

  /**
   * Calculate flavor compatibility between wine and dish
   */
  private calculateFlavorCompatibility(wine: FlavorProfile, dish: FlavorFingerprint): number {
    let compatibility = 0;

    // Map wine profile to flavor attributes
    const wineAttributes = wine.flavorAttributes || [];

    // Compare complementary attributes
    // Acid + fat complement
    const dishFat = dish.attributes.find(a => a.id === "fat")?.intensity || 0;
    if (wine.acidity === "high" && dishFat > 0.5) {
      compatibility += 0.3;
    }

    // Sweet + spicy complement
    const dishSpicy = dish.attributes.find(a => a.id === "spicy")?.intensity || 0;
    if (wine.sweetness === "sweet" && dishSpicy > 0.5) {
      compatibility += 0.3;
    }

    // Umami pairing
    const dishUmami = dish.attributes.find(a => a.id === "umami")?.intensity || 0;
    if (wine.flavorAttributes?.some(a => a.id === "umami" && a.intensity > 0.5) && dishUmami > 0.5) {
      compatibility += 0.2;
    }

    // Intensity matching
    const intensityMatch = this.matchIntensity(wine.intensity, this.getDishIntensity(dish));
    compatibility += intensityMatch * 0.2;

    return compatibility;
  }

  /**
   * Match intensity between wine and dish
   */
  private matchIntensity(wineIntensity: string, dishIntensity: number): number {
    const wineMap: Record<string, number> = {
      delicate: 0.3,
      moderate: 0.6,
      bold: 0.9,
    };

    const wineValue = wineMap[wineIntensity] || 0.6;
    const diff = Math.abs(wineValue - dishIntensity);
    return 1 - diff; // Higher match = lower difference
  }

  /**
   * Check regional pairing traditions
   */
  private checkTraditions(wine: Wine, dish: DishContext): number {
    // Basic implementation - can be enhanced with tradition database
    if (wine.region && dish.cuisine) {
      const regionalPairings: Record<string, string[]> = {
        "French": ["French", "Mediterranean"],
        "Italian": ["Italian", "Mediterranean"],
        "Spanish": ["Spanish", "Mediterranean", "Latin"],
        "California": ["American", "Fusion"],
      };

      for (const [region, cuisines] of Object.entries(regionalPairings)) {
        if (wine.region.includes(region) && cuisines.includes(dish.cuisine)) {
          return 10;
        }
      }
    }

    return 0;
  }

  /**
   * Find similar wines based on flavor profile
   */
  async findSimilarWines(wine: Wine, limit: number = 5): Promise<Wine[]> {
    const wineProfile = this.flavorProfiles.get(wine.id) || await this.analyzeTasteProfile(wine);
    const similarities: Array<{ wine: Wine; similarity: number }> = [];

    for (const candidate of this.wineDatabase.values()) {
      if (candidate.id === wine.id) continue;

      const candidateProfile = this.flavorProfiles.get(candidate.id) || await this.analyzeTasteProfile(candidate);
      const similarity = this.calculateSimilarity(wineProfile, candidateProfile);

      similarities.push({ wine: candidate, similarity });
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.wine);
  }

  /**
   * Calculate similarity between two wine profiles
   */
  private calculateSimilarity(profile1: FlavorProfile, profile2: FlavorProfile): number {
    let similarity = 0;

    // Body match
    if (profile1.body === profile2.body) similarity += 0.25;
    else if (Math.abs(this.bodyToNumber(profile1.body) - this.bodyToNumber(profile2.body)) === 1) similarity += 0.15;

    // Acidity match
    if (profile1.acidity === profile2.acidity) similarity += 0.25;

    // Sweetness match
    if (profile1.sweetness === profile2.sweetness) similarity += 0.25;

    // Intensity match
    if (profile1.intensity === profile2.intensity) similarity += 0.25;

    // Flavor attributes similarity
    if (profile1.flavorAttributes && profile2.flavorAttributes) {
      const attrSimilarity = this.calculateAttributeSimilarity(
        profile1.flavorAttributes,
        profile2.flavorAttributes
      );
      similarity = (similarity * 0.6) + (attrSimilarity * 0.4);
    }

    return similarity;
  }

  /**
   * Calculate attribute similarity using cosine similarity
   */
  private calculateAttributeSimilarity(attrs1: FlavorAttribute[], attrs2: FlavorAttribute[]): number {
    const attrMap1 = new Map(attrs1.map(a => [a.id, a.intensity]));
    const attrMap2 = new Map(attrs2.map(a => [a.id, a.intensity]));

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allIds = new Set([...attrMap1.keys(), ...attrMap2.keys()]);

    for (const id of allIds) {
      const v1 = attrMap1.get(id) || 0;
      const v2 = attrMap2.get(id) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private wineToIngredients(wine: Wine): Array<{ name: string; amount: number; tags?: string[] }> {
    const ingredients: Array<{ name: string; amount: number; tags?: string[]; sugarPercent?: number }> = [];

    // Wine base
    ingredients.push({
      name: wine.wineType,
      amount: 750, // Standard bottle
      tags: ["alcoholic", wine.wineType],
      sugarPercent: wine.flavorProfile?.sweetness === "sweet" ? 50 : wine.flavorProfile?.sweetness === "off-dry" ? 15 : 0,
    });

    // Add grape variety characteristics
    for (const grape of wine.grapeVariety) {
      ingredients.push({
        name: grape,
        amount: 100,
        tags: this.getGrapeTags(grape),
      });
    }

    return ingredients;
  }

  private getGrapeTags(grape: string): string[] {
    const tagMap: Record<string, string[]> = {
      "Chardonnay": ["fruity", "buttery", "oaky"],
      "Sauvignon Blanc": ["citrus", "herbal", "acidic"],
      "Pinot Noir": ["fruity", "earthy", "delicate"],
      "Cabernet Sauvignon": ["bold", "tannic", "fruity"],
      "Merlot": ["smooth", "fruity", "medium-body"],
    };

    return tagMap[grape] || ["wine"];
  }

  private estimateRichness(wine: Wine): number {
    if (wine.wineType === "fortified" || wine.wineType === "dessert") return 0.9;
    if (wine.wineType === "red" && wine.flavorProfile?.body === "full") return 0.8;
    if (wine.wineType === "white" && wine.flavorProfile?.body === "full") return 0.7;
    if (wine.wineType === "red") return 0.6;
    return 0.4;
  }

  private estimateAromaticLift(wine: Wine): number {
    const aromaticVarieties = ["Sauvignon Blanc", "Riesling", "Gewürztraminer", "Muscat"];
    const hasAromatic = wine.grapeVariety.some(g => aromaticVarieties.includes(g));
    return hasAromatic ? 0.8 : 0.5;
  }

  private determineBody(fingerprint: FlavorFingerprint): "light" | "medium" | "full" {
    const fat = fingerprint.attributes.find(a => a.id === "fat")?.intensity || 0;
    const umami = fingerprint.attributes.find(a => a.id === "umami")?.intensity || 0;
    const total = fat + umami;

    if (total > 0.7) return "full";
    if (total > 0.4) return "medium";
    return "light";
  }

  private determineAcidity(fingerprint: FlavorFingerprint): "low" | "medium" | "high" {
    const sour = fingerprint.attributes.find(a => a.id === "sour")?.intensity || 0;
    if (sour > 0.6) return "high";
    if (sour > 0.3) return "medium";
    return "low";
  }

  private determineTannins(fingerprint: FlavorFingerprint): "low" | "medium" | "high" {
    const astringent = fingerprint.attributes.find(a => a.id === "astringent")?.intensity || 0;
    if (astringent > 0.6) return "high";
    if (astringent > 0.3) return "medium";
    return "low";
  }

  private determineSweetness(fingerprint: FlavorFingerprint): "dry" | "off-dry" | "sweet" {
    const sweet = fingerprint.attributes.find(a => a.id === "sweet")?.intensity || 0;
    if (sweet > 0.5) return "sweet";
    if (sweet > 0.2) return "off-dry";
    return "dry";
  }

  private determineIntensity(fingerprint: FlavorFingerprint): "delicate" | "moderate" | "bold" {
    const totalIntensity = fingerprint.attributes.reduce((sum, attr) => sum + attr.intensity, 0) / fingerprint.attributes.length;
    if (totalIntensity > 0.7) return "bold";
    if (totalIntensity > 0.4) return "moderate";
    return "delicate";
  }

  private extractPrimaryNotes(fingerprint: FlavorFingerprint): string[] {
    const notes: string[] = [];
    const highIntensity = fingerprint.attributes.filter(a => a.intensity > 0.5);

    for (const attr of highIntensity) {
      notes.push(attr.label.toLowerCase());
    }

    return notes.slice(0, 5); // Top 5 notes
  }

  private bodyToNumber(body: string): number {
    const map: Record<string, number> = { light: 1, medium: 2, full: 3 };
    return map[body] || 2;
  }

  private getDishIntensity(fingerprint: FlavorFingerprint): number {
    const totalIntensity = fingerprint.attributes.reduce((sum, attr) => sum + attr.intensity, 0);
    return totalIntensity / fingerprint.attributes.length;
  }

  private checkStyleMatch(wine: Wine, styles: string[]): string | null {
    // Check wine type
    if (styles.includes(wine.wineType)) return wine.wineType;

    // Check region
    if (styles.some(style => wine.region.toLowerCase().includes(style.toLowerCase()))) {
      return wine.region;
    }

    // Check grape variety
    for (const grape of wine.grapeVariety) {
      if (styles.includes(grape)) return grape;
    }

    return null;
  }

  private calculateConfidence(baseScore: number, context: RecommendationContext): number {
    let confidence = 0.7; // Base confidence

    // More context = higher confidence
    if (context.dish) confidence += 0.1;
    if (context.preferences) confidence += 0.1;
    if (context.customerId) confidence += 0.05;

    // Score-based confidence adjustment
    if (baseScore > 80) confidence += 0.05;
    else if (baseScore < 40) confidence -= 0.1;

    return Math.min(1, Math.max(0, confidence));
  }

  private calculateDaysUntilReorder(inventory: InventoryStatus): number {
    if (inventory.currentQuantity <= 0) return 0;

    // Estimate days based on consumption rate (if available)
    // For now, use par level as reference
    const daysToReorderPoint = Math.ceil(
      (inventory.currentQuantity - inventory.reorderPoint) / (inventory.parLevel / 30) // Assuming monthly consumption
    );

    return Math.max(0, daysToReorderPoint);
  }
}

// Export singleton instance
export const wineIntelligenceService = new WineIntelligenceService();
