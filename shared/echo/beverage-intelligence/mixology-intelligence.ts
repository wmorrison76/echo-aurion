/**
 * Mixology Intelligence Service
 * Enterprise-grade AI service for cocktail recipe generation and flavor-based creation
 * 
 * Features:
 * - Flavor-mapping recipe generation
 * - Ingredient compatibility analysis
 * - Cost-optimized recipe creation
 * - Substitution suggestions
 * - Flavor profile analysis
 */

import {
  analyzeRecipeForEcho,
  computeFlavorFingerprint,
  buildIngredientNetwork,
  type RecipeAnalysisInput,
  type FlavorFingerprint,
  type IngredientNetwork,
  type FlavorAttribute,
} from "../../../client/modules/Culinary/shared/echo/flavor-engine";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Ingredient {
  id: string;
  name: string;
  category: "spirit" | "liqueur" | "wine" | "beer" | "juice" | "syrup" | "bitters" | "garnish" | "mixer" | "other";
  abv?: number; // Alcohol by volume (0-100)
  flavorProfile?: FlavorProfile;
  costPerOz: number;
  inventoryItemId?: string;
  available: boolean;
  substitutions?: string[]; // Ingredient IDs
}

export interface FlavorProfile {
  primary: string[]; // ["citrus", "herbal"]
  secondary: string[];
  tertiary: string[];
  intensity: number; // 0-1
  complexity: number; // 0-1
  balance: number; // 0-1
  flavorAttributes: FlavorAttribute[]; // From flavor engine
}

export interface FlavorMapping {
  ingredient: string;
  ingredientId: string;
  primaryFlavors: string[];
  secondaryFlavors: string[];
  intensity: number; // 0-1
  compatibility: string[]; // Other ingredient IDs that pair well
  flavorAttributes: FlavorAttribute[];
}

export interface CocktailRecipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  garnish?: string;
  glassware?: string;
  abv?: number;
  flavorProfile: FlavorProfile;
  cost: number;
  costPerOz: number;
  sellingPrice?: number;
  margin?: number;
  version: string;
  parentVersion?: string;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: "oz" | "ml" | "dash" | "slice" | "splash" | "drop";
  cost: number;
  notes?: string;
}

export interface RecipeGenerationRequest {
  availableIngredients: Ingredient[];
  targetFlavor?: FlavorTarget;
  maxCost?: number;
  targetABV?: number;
  style?: "classic" | "modern" | "creative" | "tropical" | "spirit-forward" | "sour" | "highball";
  avoidIngredients?: string[]; // Ingredient IDs to avoid
  baseSpirit?: string; // Specific spirit to build around
  complexity?: "simple" | "moderate" | "complex";
}

export interface FlavorTarget {
  primary: string[];
  secondary?: string[];
  intensity?: number;
  profile?: Partial<FlavorFingerprint>;
}

export interface GeneratedRecipe {
  recipe: CocktailRecipe;
  confidence: number;
  reasoning: string[];
  alternatives: CocktailRecipe[];
  substitutions?: IngredientSubstitution[];
  flavorMatch: number; // 0-1 how well it matches target
}

export interface IngredientSubstitution {
  original: string;
  substitute: string;
  reason: string;
  impact: "minimal" | "moderate" | "significant";
  costDifference: number;
}

export interface RecipeScore {
  recipe: CocktailRecipe;
  score: number;
  factors: {
    flavorMatch: number;
    costEfficiency: number;
    ingredientAvailability: number;
    techniqueComplexity: number;
    balance: number;
  };
}

// ============================================================================
// MIXOLOGY INTELLIGENCE SERVICE
// ============================================================================

export class MixologyIntelligenceService {
  private flavorMappingDatabase: Map<string, FlavorMapping> = new Map();
  private ingredientDatabase: Map<string, Ingredient> = new Map();
  private compatibilityMatrix: Map<string, Map<string, number>> = new Map();

  /**
   * Initialize flavor mapping database
   */
  async initialize(ingredients: Ingredient[]): Promise<void> {
    for (const ingredient of ingredients) {
      this.ingredientDatabase.set(ingredient.id, ingredient);

      // Build flavor mapping from flavor profile
      if (ingredient.flavorProfile) {
        const mapping: FlavorMapping = {
          ingredient: ingredient.name,
          ingredientId: ingredient.id,
          primaryFlavors: ingredient.flavorProfile.primary,
          secondaryFlavors: ingredient.flavorProfile.secondary || [],
          intensity: ingredient.flavorProfile.intensity,
          compatibility: [],
          flavorAttributes: ingredient.flavorProfile.flavorAttributes || [],
        };

        // Build compatibility matrix
        this.buildCompatibility(mapping, ingredients);

        this.flavorMappingDatabase.set(ingredient.id, mapping);
      }
    }
  }

  /**
   * Generate recipe from flavor mappings
   * Core feature: Create new cocktail creations based on flavor compatibility
   */
  async generateFromFlavors(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    // 1. Analyze available ingredients for flavor profiles
    const ingredientProfiles = await this.analyzeIngredientProfiles(request.availableIngredients);

    // 2. Build flavor compatibility graph
    const compatibilityGraph = this.buildCompatibilityGraph(ingredientProfiles);

    // 3. Generate recipe candidates based on flavor mappings
    const candidates = await this.generateRecipeCandidates(
      ingredientProfiles,
      compatibilityGraph,
      request
    );

    // 4. Score and rank candidates
    const scored = await Promise.all(
      candidates.map(candidate => this.scoreRecipe(candidate, request))
    );

    // 5. Select best match
    const best = scored.sort((a, b) => b.score - a.score)[0];

    // 6. Generate alternatives
    const alternatives = scored.slice(1, 4).map(s => s.recipe.recipe);

    // 7. Generate substitutions if needed
    const substitutions = await this.generateSubstitutions(best.recipe.recipe, request.availableIngredients);

    return {
      recipe: best.recipe.recipe,
      confidence: best.score / 100,
      reasoning: this.generateReasoning(best, request),
      alternatives,
      substitutions,
      flavorMatch: best.factors.flavorMatch,
    };
  }

  /**
   * Analyze ingredient flavor profiles using flavor engine
   */
  private async analyzeIngredientProfiles(ingredients: Ingredient[]): Promise<Map<string, FlavorFingerprint>> {
    const profiles = new Map<string, FlavorFingerprint>();

    for (const ingredient of ingredients) {
      if (ingredient.flavorProfile?.flavorAttributes) {
        // Use existing flavor attributes
        const fingerprint: FlavorFingerprint = {
          recipeId: ingredient.id,
          recipeName: ingredient.name,
          attributes: ingredient.flavorProfile.flavorAttributes,
          descriptors: ingredient.flavorProfile.primary,
        };
        profiles.set(ingredient.id, fingerprint);
      } else {
        // Generate from ingredient properties
        const input: RecipeAnalysisInput = {
          name: ingredient.name,
          servings: 1,
          ingredients: [{
            name: ingredient.name,
            amount: 100,
            tags: this.getIngredientTags(ingredient),
            sugarPercent: ingredient.category === "syrup" ? 50 : undefined,
          }],
          techniqueSteps: [],
          richness: ingredient.category === "liqueur" ? 0.7 : 0.3,
          aromaticLift: ingredient.category === "bitters" ? 0.9 : 0.5,
        };

        const fingerprint = computeFlavorFingerprint(input);
        profiles.set(ingredient.id, fingerprint);
      }
    }

    return profiles;
  }

  /**
   * Build compatibility graph from flavor mappings
   */
  private buildCompatibilityGraph(profiles: Map<string, FlavorFingerprint>): Map<string, Map<string, number>> {
    const graph = new Map<string, Map<string, number>>();

    for (const [id1, profile1] of profiles.entries()) {
      const compatibilities = new Map<string, number>();

      for (const [id2, profile2] of profiles.entries()) {
        if (id1 === id2) continue;

        const compatibility = this.calculateFlavorCompatibility(profile1, profile2);
        if (compatibility > 0.3) {
          compatibilities.set(id2, compatibility);
        }
      }

      graph.set(id1, compatibilities);
    }

    return graph;
  }

  /**
   * Calculate flavor compatibility between two ingredients
   * Uses flavor engine's ingredient network logic
   */
  private calculateFlavorCompatibility(profile1: FlavorFingerprint, profile2: FlavorFingerprint): number {
    // Use cosine similarity on flavor attributes
    const attrMap1 = new Map(profile1.attributes.map(a => [a.id, a.intensity]));
    const attrMap2 = new Map(profile2.attributes.map(a => [a.id, a.intensity]));

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

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

    // Boost complementary flavors (sweet + sour, fat + acid, etc.)
    const complementScore = this.calculateComplementarity(profile1, profile2);
    
    return (similarity * 0.6) + (complementScore * 0.4);
  }

  /**
   * Calculate complementarity (opposites attract)
   */
  private calculateComplementarity(profile1: FlavorFingerprint, profile2: FlavorFingerprint): number {
    let complement = 0;

    const getIntensity = (profile: FlavorFingerprint, id: string) =>
      profile.attributes.find(a => a.id === id)?.intensity || 0;

    // Sweet + Sour
    const sweet1 = getIntensity(profile1, "sweet");
    const sweet2 = getIntensity(profile2, "sweet");
    const sour1 = getIntensity(profile1, "sour");
    const sour2 = getIntensity(profile2, "sour");
    if ((sweet1 > 0.5 && sour2 > 0.5) || (sweet2 > 0.5 && sour1 > 0.5)) {
      complement += 0.3;
    }

    // Fat + Acid
    const fat1 = getIntensity(profile1, "fat");
    const fat2 = getIntensity(profile2, "fat");
    if ((fat1 > 0.5 && sour2 > 0.5) || (fat2 > 0.5 && sour1 > 0.5)) {
      complement += 0.3;
    }

    // Sweet + Spicy
    const spicy1 = getIntensity(profile1, "spicy");
    const spicy2 = getIntensity(profile2, "spicy");
    if ((sweet1 > 0.5 && spicy2 > 0.5) || (sweet2 > 0.5 && spicy1 > 0.5)) {
      complement += 0.2;
    }

    // Herbal + Citrus
    const herbal1 = getIntensity(profile1, "herbal");
    const herbal2 = getIntensity(profile2, "herbal");
    const fruity1 = getIntensity(profile1, "fruity");
    const fruity2 = getIntensity(profile2, "fruity");
    if ((herbal1 > 0.5 && fruity2 > 0.5) || (herbal2 > 0.5 && fruity1 > 0.5)) {
      complement += 0.2;
    }

    return Math.min(1, complement);
  }

  /**
   * Generate recipe candidates from flavor compatibility graph
   */
  private async generateRecipeCandidates(
    profiles: Map<string, FlavorFingerprint>,
    graph: Map<string, Map<string, number>>,
    request: RecipeGenerationRequest
  ): Promise<CocktailRecipe[]> {
    const candidates: CocktailRecipe[] = [];

    // Strategy 1: Spirit-forward (base spirit + modifiers)
    if (request.style === "spirit-forward" || !request.style) {
      const spiritForward = this.generateSpiritForwardRecipes(profiles, graph, request);
      candidates.push(...spiritForward);
    }

    // Strategy 2: Balanced (equal parts)
    if (request.style === "classic" || request.style === "modern") {
      const balanced = this.generateBalancedRecipes(profiles, graph, request);
      candidates.push(...balanced);
    }

    // Strategy 3: Sour cocktails (spirit + citrus + sweet)
    if (request.style === "sour" || request.style === "classic") {
      const sours = this.generateSourRecipes(profiles, graph, request);
      candidates.push(...sours);
    }

    // Strategy 4: Highball (spirit + mixer)
    if (request.style === "highball" || !request.style) {
      const highballs = this.generateHighballRecipes(profiles, graph, request);
      candidates.push(...highballs);
    }

    // Strategy 5: Creative (flavor-mapped combinations)
    if (request.style === "creative" || request.targetFlavor) {
      const creative = await this.generateCreativeRecipes(profiles, graph, request);
      candidates.push(...creative);
    }

    return candidates;
  }

  /**
   * Generate spirit-forward recipes (base spirit + 1-2 modifiers)
   */
  private generateSpiritForwardRecipes(
    profiles: Map<string, FlavorFingerprint>,
    graph: Map<string, Map<string, number>>,
    request: RecipeGenerationRequest
  ): CocktailRecipe[] {
    const recipes: CocktailRecipe[] = [];
    const spirits = request.availableIngredients.filter(i => i.category === "spirit" && i.available);

    for (const spirit of spirits) {
      if (request.baseSpirit && spirit.id !== request.baseSpirit) continue;

      const spiritProfile = profiles.get(spirit.id);
      if (!spiritProfile) continue;

      // Find compatible modifiers
      const compatibilities = graph.get(spirit.id);
      if (!compatibilities) continue;

      const topCompatible = Array.from(compatibilities.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [modifierId, compatibility] of topCompatible) {
        const modifier = request.availableIngredients.find(i => i.id === modifierId);
        if (!modifier || !modifier.available) continue;

        // Generate recipe
        const recipe = this.buildSpiritForwardRecipe(spirit, modifier, compatibility, request);
        recipes.push(recipe);
      }
    }

    return recipes;
  }

  /**
   * Build spirit-forward recipe
   */
  private buildSpiritForwardRecipe(
    spirit: Ingredient,
    modifier: Ingredient,
    compatibility: number,
    request: RecipeGenerationRequest
  ): CocktailRecipe {
    const ingredients: RecipeIngredient[] = [
      {
        id: `ing-${spirit.id}`,
        ingredientId: spirit.id,
        name: spirit.name,
        quantity: 2,
        unit: "oz",
        cost: spirit.costPerOz * 2,
      },
      {
        id: `ing-${modifier.id}`,
        ingredientId: modifier.id,
        name: modifier.name,
        quantity: compatibility > 0.7 ? 1 : 0.5,
        unit: modifier.category === "bitters" ? "dash" : "oz",
        cost: modifier.costPerOz * (compatibility > 0.7 ? 1 : 0.5),
      },
    ];

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const totalOz = ingredients.reduce((sum, ing) => {
      if (ing.unit === "oz") return sum + ing.quantity;
      if (ing.unit === "dash") return sum + 0.1; // Approximate dash
      return sum;
    }, 0);

    const abv = this.calculateABV(ingredients, request.availableIngredients);

    // Generate instructions
    const instructions = this.generateInstructions("spirit-forward", ingredients);

    // Generate flavor profile
    const flavorProfile = this.generateFlavorProfile(ingredients, request.availableIngredients);

    return {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateName(spirit, modifier, "spirit-forward"),
      ingredients,
      instructions,
      glassware: "rocks",
      abv,
      flavorProfile,
      cost: totalCost,
      costPerOz: totalCost / totalOz,
      version: "1.0.0",
    };
  }

  /**
   * Generate balanced recipes (equal parts or variations)
   */
  private generateBalancedRecipes(
    profiles: Map<string, FlavorFingerprint>,
    graph: Map<string, Map<string, number>>,
    request: RecipeGenerationRequest
  ): CocktailRecipe[] {
    const recipes: CocktailRecipe[] = [];
    const spirits = request.availableIngredients.filter(i => i.category === "spirit" && i.available);

    // Generate 2-3 ingredient balanced cocktails
    for (const spirit of spirits) {
      const compatibilities = graph.get(spirit.id);
      if (!compatibilities) continue;

      const topCompatible = Array.from(compatibilities.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Try pairs
      for (let i = 0; i < topCompatible.length; i++) {
        for (let j = i + 1; j < topCompatible.length; j++) {
          const [mod1Id] = topCompatible[i];
          const [mod2Id] = topCompatible[j];

          const mod1 = request.availableIngredients.find(i => i.id === mod1Id);
          const mod2 = request.availableIngredients.find(i => i.id === mod2Id);

          if (!mod1 || !mod1.available || !mod2 || !mod2.available) continue;

          // Check if mod1 and mod2 are compatible
          const modCompat = graph.get(mod1Id)?.get(mod2Id) || 0;
          if (modCompat < 0.4) continue;

          const recipe = this.buildBalancedRecipe(spirit, mod1, mod2, request);
          recipes.push(recipe);
        }
      }
    }

    return recipes;
  }

  /**
   * Build balanced recipe
   */
  private buildBalancedRecipe(
    spirit: Ingredient,
    modifier1: Ingredient,
    modifier2: Ingredient,
    request: RecipeGenerationRequest
  ): CocktailRecipe {
    const baseQuantity = 0.75;
    const ingredients: RecipeIngredient[] = [
      {
        id: `ing-${spirit.id}`,
        ingredientId: spirit.id,
        name: spirit.name,
        quantity: baseQuantity,
        unit: "oz",
        cost: spirit.costPerOz * baseQuantity,
      },
      {
        id: `ing-${modifier1.id}`,
        ingredientId: modifier1.id,
        name: modifier1.name,
        quantity: baseQuantity,
        unit: modifier1.category === "bitters" ? "dash" : "oz",
        cost: modifier1.costPerOz * baseQuantity,
      },
      {
        id: `ing-${modifier2.id}`,
        ingredientId: modifier2.id,
        name: modifier2.name,
        quantity: baseQuantity,
        unit: modifier2.category === "bitters" ? "dash" : "oz",
        cost: modifier2.costPerOz * baseQuantity,
      },
    ];

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const totalOz = ingredients.reduce((sum, ing) => {
      if (ing.unit === "oz") return sum + ing.quantity;
      if (ing.unit === "dash") return sum + 0.1;
      return sum;
    }, 0);

    const abv = this.calculateABV(ingredients, request.availableIngredients);
    const instructions = this.generateInstructions("balanced", ingredients);
    const flavorProfile = this.generateFlavorProfile(ingredients, request.availableIngredients);

    return {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateName(spirit, modifier1, "balanced"),
      ingredients,
      instructions,
      glassware: "coupe",
      abv,
      flavorProfile,
      cost: totalCost,
      costPerOz: totalCost / totalOz,
      version: "1.0.0",
    };
  }

  /**
   * Generate sour cocktails (spirit + citrus + sweet)
   */
  private generateSourRecipes(
    profiles: Map<string, FlavorFingerprint>,
    graph: Map<string, Map<string, number>>,
    request: RecipeGenerationRequest
  ): CocktailRecipe[] {
    const recipes: CocktailRecipe[] = [];
    const spirits = request.availableIngredients.filter(i => i.category === "spirit" && i.available);
    const citrus = request.availableIngredients.filter(i =>
      (i.category === "juice" || i.name.toLowerCase().includes("lemon") || i.name.toLowerCase().includes("lime")) && i.available
    );
    const sweeteners = request.availableIngredients.filter(i =>
      (i.category === "syrup" || i.category === "liqueur") && i.available
    );

    for (const spirit of spirits) {
      for (const cit of citrus.slice(0, 2)) {
        for (const sweet of sweeteners.slice(0, 2)) {
          const recipe = this.buildSourRecipe(spirit, cit, sweet, request);
          recipes.push(recipe);
        }
      }
    }

    return recipes;
  }

  /**
   * Build sour recipe (classic sour template)
   */
  private buildSourRecipe(
    spirit: Ingredient,
    citrus: Ingredient,
    sweetener: Ingredient,
    request: RecipeGenerationRequest
  ): CocktailRecipe {
    const ingredients: RecipeIngredient[] = [
      {
        id: `ing-${spirit.id}`,
        ingredientId: spirit.id,
        name: spirit.name,
        quantity: 2,
        unit: "oz",
        cost: spirit.costPerOz * 2,
      },
      {
        id: `ing-${citrus.id}`,
        ingredientId: citrus.id,
        name: citrus.name,
        quantity: 0.75,
        unit: "oz",
        cost: citrus.costPerOz * 0.75,
      },
      {
        id: `ing-${sweetener.id}`,
        ingredientId: sweetener.id,
        name: sweetener.name,
        quantity: 0.75,
        unit: "oz",
        cost: sweetener.costPerOz * 0.75,
      },
    ];

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const abv = this.calculateABV(ingredients, request.availableIngredients);
    const instructions = this.generateInstructions("sour", ingredients);
    const flavorProfile = this.generateFlavorProfile(ingredients, request.availableIngredients);

    return {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateName(spirit, citrus, "sour"),
      ingredients,
      instructions,
      glassware: "coupe",
      garnish: "citrus twist",
      abv,
      flavorProfile,
      cost: totalCost,
      costPerOz: totalCost / 3.5,
      version: "1.0.0",
    };
  }

  /**
   * Generate highball recipes (spirit + mixer)
   */
  private generateHighballRecipes(
    profiles: Map<string, FlavorFingerprint>,
    graph: Map<string, Map<string, number>>,
    request: RecipeGenerationRequest
  ): CocktailRecipe[] {
    const recipes: CocktailRecipe[] = [];
    const spirits = request.availableIngredients.filter(i => i.category === "spirit" && i.available);
    const mixers = request.availableIngredients.filter(i =>
      (i.category === "mixer" || i.category === "juice" || i.category === "soda") && i.available
    );

    for (const spirit of spirits) {
      for (const mixer of mixers.slice(0, 3)) {
        const recipe = this.buildHighballRecipe(spirit, mixer, request);
        recipes.push(recipe);
      }
    }

    return recipes;
  }

  /**
   * Build highball recipe
   */
  private buildHighballRecipe(
    spirit: Ingredient,
    mixer: Ingredient,
    request: RecipeGenerationRequest
  ): CocktailRecipe {
    const ingredients: RecipeIngredient[] = [
      {
        id: `ing-${spirit.id}`,
        ingredientId: spirit.id,
        name: spirit.name,
        quantity: 1.5,
        unit: "oz",
        cost: spirit.costPerOz * 1.5,
      },
      {
        id: `ing-${mixer.id}`,
        ingredientId: mixer.id,
        name: mixer.name,
        quantity: 4,
        unit: "oz",
        cost: mixer.costPerOz * 4,
      },
    ];

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const abv = this.calculateABV(ingredients, request.availableIngredients);
    const instructions = this.generateInstructions("highball", ingredients);
    const flavorProfile = this.generateFlavorProfile(ingredients, request.availableIngredients);

    return {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateName(spirit, mixer, "highball"),
      ingredients,
      instructions,
      glassware: "highball",
      garnish: "lime wedge",
      abv,
      flavorProfile,
      cost: totalCost,
      costPerOz: totalCost / 5.5,
      version: "1.0.0",
    };
  }

  /**
   * Generate creative recipes based on flavor mappings
   */
  private async generateCreativeRecipes(
    profiles: Map<string, FlavorFingerprint>,
    graph: Map<string, Map<string, number>>,
    request: RecipeGenerationRequest
  ): Promise<CocktailRecipe[]> {
    const recipes: CocktailRecipe[] = [];

    if (!request.targetFlavor) {
      return recipes;
    }

    // Find ingredients matching target flavors
    const matchingIngredients = this.findMatchingIngredients(
      request.targetFlavor,
      request.availableIngredients,
      profiles
    );

    // Build recipes from matching ingredients
    for (let i = 0; i < Math.min(matchingIngredients.length, 5); i++) {
      for (let j = i + 1; j < Math.min(matchingIngredients.length, 5); j++) {
        for (let k = j + 1; k < Math.min(matchingIngredients.length, 5); k++) {
          const ing1 = matchingIngredients[i];
          const ing2 = matchingIngredients[j];
          const ing3 = matchingIngredients[k];

          // Check compatibility
          const compat12 = graph.get(ing1.id)?.get(ing2.id) || 0;
          const compat13 = graph.get(ing1.id)?.get(ing3.id) || 0;
          const compat23 = graph.get(ing2.id)?.get(ing3.id) || 0;

          if (compat12 > 0.4 && compat13 > 0.4 && compat23 > 0.4) {
            const recipe = this.buildCreativeRecipe(ing1, ing2, ing3, request);
            recipes.push(recipe);
          }
        }
      }
    }

    return recipes;
  }

  /**
   * Find ingredients matching target flavor profile
   */
  private findMatchingIngredients(
    target: FlavorTarget,
    available: Ingredient[],
    profiles: Map<string, FlavorFingerprint>
  ): Ingredient[] {
    const matches: Array<{ ingredient: Ingredient; score: number }> = [];

    for (const ingredient of available) {
      if (!ingredient.available) continue;

      const profile = profiles.get(ingredient.id);
      if (!profile) continue;

      let score = 0;

      // Match primary flavors
      if (target.primary) {
        for (const targetFlavor of target.primary) {
          const hasFlavor = profile.descriptors.some(d =>
            d.toLowerCase().includes(targetFlavor.toLowerCase())
          );
          if (hasFlavor) score += 0.4;
        }
      }

      // Match intensity
      if (target.intensity !== undefined) {
        const profileIntensity = this.calculateIntensity(profile);
        const intensityDiff = Math.abs(profileIntensity - target.intensity);
        score += (1 - intensityDiff) * 0.3;
      }

      // Match profile if provided
      if (target.profile) {
        const profileMatch = this.calculateProfileMatch(profile, target.profile);
        score += profileMatch * 0.3;
      }

      if (score > 0.3) {
        matches.push({ ingredient, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .map(m => m.ingredient);
  }

  /**
   * Build creative recipe from flavor-matched ingredients
   */
  private buildCreativeRecipe(
    ing1: Ingredient,
    ing2: Ingredient,
    ing3: Ingredient,
    request: RecipeGenerationRequest
  ): CocktailRecipe {
    // Determine proportions based on categories
    const proportions = this.determineProportions(ing1, ing2, ing3);

    const ingredients: RecipeIngredient[] = [
      {
        id: `ing-${ing1.id}`,
        ingredientId: ing1.id,
        name: ing1.name,
        quantity: proportions[0],
        unit: ing1.category === "bitters" ? "dash" : "oz",
        cost: ing1.costPerOz * proportions[0],
      },
      {
        id: `ing-${ing2.id}`,
        ingredientId: ing2.id,
        name: ing2.name,
        quantity: proportions[1],
        unit: ing2.category === "bitters" ? "dash" : "oz",
        cost: ing2.costPerOz * proportions[1],
      },
      {
        id: `ing-${ing3.id}`,
        ingredientId: ing3.id,
        name: ing3.name,
        quantity: proportions[2],
        unit: ing3.category === "bitters" ? "dash" : "oz",
        cost: ing3.costPerOz * proportions[2],
      },
    ];

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const totalOz = ingredients.reduce((sum, ing) => {
      if (ing.unit === "oz") return sum + ing.quantity;
      if (ing.unit === "dash") return sum + 0.1;
      return sum;
    }, 0);

    const abv = this.calculateABV(ingredients, request.availableIngredients);
    const instructions = this.generateInstructions("creative", ingredients);
    const flavorProfile = this.generateFlavorProfile(ingredients, request.availableIngredients);

    return {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateName(ing1, ing2, "creative"),
      ingredients,
      instructions,
      glassware: "coupe",
      abv,
      flavorProfile,
      cost: totalCost,
      costPerOz: totalCost / totalOz,
      version: "1.0.0",
    };
  }

  /**
   * Score recipe against request criteria
   */
  private async scoreRecipe(recipe: CocktailRecipe, request: RecipeGenerationRequest): Promise<RecipeScore> {
    const factors = {
      flavorMatch: this.scoreFlavorMatch(recipe, request),
      costEfficiency: this.scoreCostEfficiency(recipe, request),
      ingredientAvailability: this.scoreAvailability(recipe, request),
      techniqueComplexity: this.scoreComplexity(recipe, request),
      balance: this.scoreBalance(recipe),
    };

    const totalScore = (
      factors.flavorMatch * 0.35 +
      factors.costEfficiency * 0.25 +
      factors.ingredientAvailability * 0.20 +
      factors.techniqueComplexity * 0.10 +
      factors.balance * 0.10
    ) * 100;

    return {
      recipe,
      score: totalScore,
      factors,
    };
  }

  /**
   * Score flavor match
   */
  private scoreFlavorMatch(recipe: CocktailRecipe, request: RecipeGenerationRequest): number {
    if (!request.targetFlavor) return 0.7; // Default if no target

    const profile = recipe.flavorProfile;
    let score = 0;

    // Match primary flavors
    if (request.targetFlavor.primary) {
      const matchedFlavors = request.targetFlavor.primary.filter(targetFlavor =>
        profile.primary.some(p => p.toLowerCase().includes(targetFlavor.toLowerCase()))
      );
      score += (matchedFlavors.length / request.targetFlavor.primary.length) * 0.5;
    }

    // Match intensity
    if (request.targetFlavor.intensity !== undefined) {
      const intensityDiff = Math.abs(profile.intensity - request.targetFlavor.intensity);
      score += (1 - intensityDiff) * 0.3;
    }

    // Match profile if provided
    if (request.targetFlavor.profile) {
      // Use flavor engine to compare profiles
      const profileMatch = this.calculateProfileMatch(
        this.recipeToFingerprint(recipe),
        request.targetFlavor.profile
      );
      score += profileMatch * 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Score cost efficiency
   */
  private scoreCostEfficiency(recipe: CocktailRecipe, request: RecipeGenerationRequest): number {
    if (!request.maxCost) return 0.8; // No cost constraint

    if (recipe.cost <= request.maxCost) {
      // Lower cost = better efficiency
      const efficiency = 1 - (recipe.cost / request.maxCost);
      return Math.max(0.5, efficiency);
    }

    return 0; // Over budget
  }

  /**
   * Score ingredient availability
   */
  private scoreAvailability(recipe: CocktailRecipe, request: RecipeGenerationRequest): number {
    const unavailable = recipe.ingredients.filter(ing => {
      const ingredient = request.availableIngredients.find(i => i.id === ing.ingredientId);
      return !ingredient || !ingredient.available;
    });

    if (unavailable.length === 0) return 1.0;
    if (unavailable.length === 1) return 0.7;
    if (unavailable.length === 2) return 0.4;
    return 0.1;
  }

  /**
   * Score complexity
   */
  private scoreComplexity(recipe: CocktailRecipe, request: RecipeGenerationRequest): number {
    if (!request.complexity) return 0.8;

    const actualComplexity = recipe.ingredients.length > 4 ? "complex" :
                             recipe.ingredients.length > 2 ? "moderate" : "simple";

    if (actualComplexity === request.complexity) return 1.0;
    if (Math.abs(this.complexityToNumber(actualComplexity) - this.complexityToNumber(request.complexity)) === 1) {
      return 0.7;
    }
    return 0.4;
  }

  /**
   * Score balance
   */
  private scoreBalance(recipe: CocktailRecipe): number {
    return recipe.flavorProfile.balance;
  }

  /**
   * Generate substitutions for unavailable ingredients
   */
  private async generateSubstitutions(
    recipe: CocktailRecipe,
    availableIngredients: Ingredient[]
  ): Promise<IngredientSubstitution[]> {
    const substitutions: IngredientSubstitution[] = [];

    for (const recipeIngredient of recipe.ingredients) {
      const ingredient = availableIngredients.find(i => i.id === recipeIngredient.ingredientId);
      
      if (!ingredient || !ingredient.available) {
        // Find substitute
        const substitute = this.findSubstitute(recipeIngredient, availableIngredients);
        
        if (substitute) {
          substitutions.push({
            original: recipeIngredient.name,
            substitute: substitute.name,
            reason: this.generateSubstitutionReason(recipeIngredient, substitute),
            impact: this.calculateSubstitutionImpact(recipeIngredient, substitute),
            costDifference: (substitute.costPerOz * recipeIngredient.quantity) - recipeIngredient.cost,
          });
        }
      }
    }

    return substitutions;
  }

  /**
   * Find substitute ingredient
   */
  private findSubstitute(
    original: RecipeIngredient,
    availableIngredients: Ingredient[]
  ): Ingredient | null {
    const originalIng = availableIngredients.find(i => i.id === original.ingredientId);
    if (!originalIng) return null;

    // Check for direct substitutions
    if (originalIng.substitutions) {
      for (const subId of originalIng.substitutions) {
        const substitute = availableIngredients.find(i => i.id === subId && i.available);
        if (substitute) return substitute;
      }
    }

    // Find similar category
    const sameCategory = availableIngredients.filter(i =>
      i.category === originalIng.category && i.available && i.id !== originalIng.id
    );

    if (sameCategory.length > 0) {
      // Return first available (can be enhanced with flavor matching)
      return sameCategory[0];
    }

    return null;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getIngredientTags(ingredient: Ingredient): string[] {
    const tags: string[] = [ingredient.category];

    if (ingredient.abv && ingredient.abv > 0) {
      tags.push("alcoholic");
      if (ingredient.abv > 40) tags.push("spirit");
      else if (ingredient.abv > 15) tags.push("fortified");
    }

    if (ingredient.category === "juice") tags.push("acid");
    if (ingredient.category === "syrup") tags.push("sweet");

    return tags;
  }

  private buildCompatibility(mapping: FlavorMapping, allIngredients: Ingredient[]): void {
    for (const other of allIngredients) {
      if (other.id === mapping.ingredientId) continue;
      
      if (other.flavorProfile) {
        const compatibility = this.calculateCompatibilityFromProfiles(
          mapping.flavorAttributes,
          other.flavorProfile.flavorAttributes || []
        );

        if (compatibility > 0.5) {
          mapping.compatibility.push(other.id);
        }
      }
    }
  }

  private calculateCompatibilityFromProfiles(
    attrs1: FlavorAttribute[],
    attrs2: FlavorAttribute[]
  ): number {
    return this.calculateAttributeSimilarity(attrs1, attrs2);
  }

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

  private calculateABV(ingredients: RecipeIngredient[], allIngredients: Ingredient[]): number {
    let totalAlcohol = 0;
    let totalVolume = 0;

    for (const ing of ingredients) {
      const ingredient = allIngredients.find(i => i.id === ing.ingredientId);
      if (!ingredient || !ingredient.abv) continue;

      const volumeOz = ing.unit === "oz" ? ing.quantity : ing.unit === "ml" ? ing.quantity / 29.5735 : 0.1;
      const alcoholOz = volumeOz * (ingredient.abv / 100);
      
      totalAlcohol += alcoholOz;
      totalVolume += volumeOz;
    }

    if (totalVolume === 0) return 0;
    return (totalAlcohol / totalVolume) * 100;
  }

  private generateInstructions(style: string, ingredients: RecipeIngredient[]): string[] {
    const instructions: string[] = [];

    switch (style) {
      case "spirit-forward":
        instructions.push("Add all ingredients to mixing glass with ice");
        instructions.push("Stir for 30 seconds");
        instructions.push("Strain into chilled glass");
        break;

      case "sour":
        instructions.push("Add all ingredients to shaker with ice");
        instructions.push("Shake vigorously for 10 seconds");
        instructions.push("Strain into chilled coupe glass");
        instructions.push("Garnish with citrus twist");
        break;

      case "highball":
        instructions.push("Fill glass with ice");
        instructions.push("Add spirit");
        instructions.push("Top with mixer");
        instructions.push("Stir gently");
        instructions.push("Garnish with lime wedge");
        break;

      case "balanced":
        instructions.push("Add all ingredients to mixing glass");
        instructions.push("Stir with ice for 20 seconds");
        instructions.push("Strain into appropriate glass");
        break;

      case "creative":
        instructions.push("Combine all ingredients in mixing glass");
        instructions.push("Add ice and stir until well-chilled");
        instructions.push("Strain into serving glass");
        instructions.push("Garnish as desired");
        break;

      default:
        instructions.push("Combine ingredients");
        instructions.push("Mix well");
        instructions.push("Serve");
    }

    return instructions;
  }

  private generateFlavorProfile(
    ingredients: RecipeIngredient[],
    allIngredients: Ingredient[]
  ): FlavorProfile {
    // Build recipe input for flavor engine
    const input: RecipeAnalysisInput = {
      name: "Generated Cocktail",
      servings: 1,
      ingredients: ingredients.map(ing => {
        const ingredient = allIngredients.find(i => i.id === ing.ingredientId);
        return {
          name: ing.name,
          amount: ing.unit === "oz" ? ing.quantity * 29.5735 : ing.quantity, // Convert to ml
          tags: ingredient ? this.getIngredientTags(ingredient) : [],
        };
      }),
      techniqueSteps: [],
      richness: 0.5,
      aromaticLift: 0.6,
    };

    // Use flavor engine to analyze
    const analysis = analyzeRecipeForEcho(input);
    const fingerprint = analysis.fingerprint;

    // Extract primary notes
    const primaryNotes = fingerprint.attributes
      .filter(a => a.intensity > 0.5)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3)
      .map(a => a.label.toLowerCase());

    const secondaryNotes = fingerprint.attributes
      .filter(a => a.intensity > 0.3 && a.intensity <= 0.5)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 2)
      .map(a => a.label.toLowerCase());

    // Calculate balance (how well flavors complement)
    const balance = this.calculateBalance(fingerprint);

    // Calculate complexity
    const complexity = Math.min(1, fingerprint.attributes.filter(a => a.intensity > 0.2).length / 10);

    // Calculate intensity
    const intensity = fingerprint.attributes.reduce((sum, a) => sum + a.intensity, 0) / fingerprint.attributes.length;

    return {
      primary: primaryNotes,
      secondary: secondaryNotes,
      tertiary: [],
      intensity,
      complexity,
      balance,
      flavorAttributes: fingerprint.attributes,
    };
  }

  private calculateBalance(fingerprint: FlavorFingerprint): number {
    // Check for complementary flavors
    const sweet = fingerprint.attributes.find(a => a.id === "sweet")?.intensity || 0;
    const sour = fingerprint.attributes.find(a => a.id === "sour")?.intensity || 0;
    const bitter = fingerprint.attributes.find(a => a.id === "bitter")?.intensity || 0;

    // Balance score: how well flavors complement
    const hasComplement = (sweet > 0.3 && sour > 0.3) || (sweet > 0.3 && bitter > 0.3);
    const notOverpowering = Math.max(sweet, sour, bitter) < 0.8;

    return hasComplement && notOverpowering ? 0.9 : 0.6;
  }

  private generateName(ing1: Ingredient, ing2: Ingredient, style: string): string {
    const styleNames: Record<string, string> = {
      "spirit-forward": `${ing1.name} & ${ing2.name}`,
      "sour": `${ing1.name} Sour`,
      "highball": `${ing1.name} ${ing2.name}`,
      "balanced": `${ing1.name} No. 1`,
      "creative": `${ing1.name} × ${ing2.name}`,
    };

    return styleNames[style] || `${ing1.name} Cocktail`;
  }

  private determineProportions(ing1: Ingredient, ing2: Ingredient, ing3: Ingredient): [number, number, number] {
    // Default: equal parts, adjust based on category
    let qty1 = 0.75;
    let qty2 = 0.75;
    let qty3 = 0.75;

    // Spirits get more
    if (ing1.category === "spirit") qty1 = 1.5;
    if (ing2.category === "spirit") qty2 = 1.5;
    if (ing3.category === "spirit") qty3 = 1.5;

    // Bitters get less
    if (ing1.category === "bitters") qty1 = 2; // dashes
    if (ing2.category === "bitters") qty2 = 2;
    if (ing3.category === "bitters") qty3 = 2;

    return [qty1, qty2, qty3];
  }

  private calculateIntensity(fingerprint: FlavorFingerprint): number {
    return fingerprint.attributes.reduce((sum, a) => sum + a.intensity, 0) / fingerprint.attributes.length;
  }

  private calculateProfileMatch(profile1: FlavorFingerprint, profile2: Partial<FlavorFingerprint>): number {
    if (!profile2.attributes) return 0.5;

    return this.calculateAttributeSimilarity(profile1.attributes, profile2.attributes);
  }

  private recipeToFingerprint(recipe: CocktailRecipe): FlavorFingerprint {
    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      attributes: recipe.flavorProfile.flavorAttributes,
      descriptors: recipe.flavorProfile.primary,
    };
  }

  private complexityToNumber(complexity: string): number {
    const map: Record<string, number> = { simple: 1, moderate: 2, complex: 3 };
    return map[complexity] || 2;
  }

  private generateSubstitutionReason(original: RecipeIngredient, substitute: Ingredient): string {
    return `Similar flavor profile and category. ${substitute.name} works as a substitute for ${original.name}.`;
  }

  private calculateSubstitutionImpact(original: RecipeIngredient, substitute: Ingredient): "minimal" | "moderate" | "significant" {
    const costDiff = Math.abs((substitute.costPerOz * original.quantity) - original.cost);
    const percentDiff = costDiff / original.cost;

    if (percentDiff < 0.1) return "minimal";
    if (percentDiff < 0.3) return "moderate";
    return "significant";
  }

  private generateReasoning(score: RecipeScore, request: RecipeGenerationRequest): string[] {
    const reasoning: string[] = [];

    if (score.factors.flavorMatch > 0.8) {
      reasoning.push("Excellent flavor match with target profile");
    }

    if (score.factors.costEfficiency > 0.8) {
      reasoning.push("Cost-efficient recipe");
    }

    if (score.factors.ingredientAvailability === 1.0) {
      reasoning.push("All ingredients available in inventory");
    }

    if (score.factors.balance > 0.8) {
      reasoning.push("Well-balanced flavor profile");
    }

    return reasoning;
  }
}

// Export singleton instance
export const mixologyIntelligenceService = new MixologyIntelligenceService();
