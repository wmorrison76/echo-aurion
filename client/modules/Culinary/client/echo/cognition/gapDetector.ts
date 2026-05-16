/**
 * EchoAi³ Knowledge Gap Detection System
 * Identifies missing knowledge across multiple culinary domains
 * Prioritizes gaps by criticality and relevance to operations
 */

import type { RecipeCodexMetadata } from "../codex";

export type GapCategory =
  | "allergen_information"
  | "nutrition_data"
  | "flavor_chemistry"
  | "technique"
  | "substitutions"
  | "cost_data"
  | "ingredient_specs"
  | "workflow_optimization"
  | "dietary_restrictions"
  | "sourcing_information"
  | "regional_variations"
  | "equipment_specifications";

export interface KnowledgeGap {
  id: string;
  category: GapCategory;
  title: string;
  description: string;
  affectedRecipes: string[];
  affectedIngredients: string[];
  priority: "low" | "medium" | "high" | "critical";
  severity: number; // 0-1
  relatedTopics: string[];
  suggestedSources: string[];
  detectedAt: number;
  detectionReason: string;
}

export interface CurrentKnowledgeState {
  totalRecipes: number;
  recipesWithAllergens: number;
  recipesWithNutrition: number;
  ingredientsWithChemistry: number;
  techniquesDocumented: number;
  substitutionRules: number;
  costDataPoints: number;
}

export interface GapAnalysis {
  gaps: KnowledgeGap[];
  state: CurrentKnowledgeState;
  summary: string;
  recommendations: string[];
  coveragePercentage: Record<GapCategory, number>;
}

/**
 * Knowledge Gap Detector
 * Analyzes current knowledge base and identifies missing information
 */
export class KnowledgeGapDetector {
  private recipes: Map<string, RecipeCodexMetadata>;
  private ingredients: Map<string, any>;
  private techniques: Map<string, any>;

  constructor() {
    this.recipes = new Map();
    this.ingredients = new Map();
    this.techniques = new Map();
  }

  /**
   * Register recipes for gap analysis
   */
  registerRecipes(recipes: RecipeCodexMetadata[]): void {
    recipes.forEach((recipe) => {
      this.recipes.set(recipe.id, recipe);
    });
  }

  /**
   * Register ingredients for gap analysis
   */
  registerIngredients(ingredients: Record<string, any>): void {
    Object.entries(ingredients).forEach(([id, ingredient]) => {
      this.ingredients.set(id, ingredient);
    });
  }

  /**
   * Register techniques for gap analysis
   */
  registerTechniques(techniques: Record<string, any>): void {
    Object.entries(techniques).forEach(([id, technique]) => {
      this.techniques.set(id, technique);
    });
  }

  /**
   * Detect all knowledge gaps
   */
  detectAllGaps(): GapAnalysis {
    const gaps: KnowledgeGap[] = [];

    // Detect gaps for each category
    gaps.push(...this.detectAllergenGaps());
    gaps.push(...this.detectNutritionGaps());
    gaps.push(...this.detectFlavorChemistryGaps());
    gaps.push(...this.detectTechniqueGaps());
    gaps.push(...this.detectSubstitutionGaps());
    gaps.push(...this.detectCostGaps());
    gaps.push(...this.detectIngredientSpecGaps());
    gaps.push(...this.detectWorkflowGaps());
    gaps.push(...this.detectDietaryRestrictionGaps());
    gaps.push(...this.detectSourcingGaps());
    gaps.push(...this.detectRegionalVariationGaps());
    gaps.push(...this.detectEquipmentGaps());

    // Sort by priority and severity
    gaps.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.severity - a.severity;
    });

    const state = this.getCurrentKnowledgeState();
    const coveragePercentage = this.calculateCoveragePercentage();
    const recommendations = this.generateRecommendations(gaps);

    return {
      gaps,
      state,
      summary: this.generateSummary(gaps, state),
      recommendations,
      coveragePercentage,
    };
  }

  /**
   * Detect gaps for specific ingredients
   */
  detectGapsForIngredient(ingredientName: string): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const ingredient = Array.from(this.ingredients.values()).find(
      (i) => i.name?.toLowerCase() === ingredientName.toLowerCase(),
    );

    if (!ingredient) {
      return [];
    }

    // Check allergens
    if (!ingredient.allergens || ingredient.allergens.length === 0) {
      gaps.push({
        id: `allergen_${ingredientName}`,
        category: "allergen_information",
        title: `Missing Allergen Info: ${ingredientName}`,
        description: `Complete allergen profile needed for ${ingredientName}`,
        affectedIngredients: [ingredientName],
        affectedRecipes: this.findRecipesWithIngredient(ingredientName),
        priority: "critical",
        severity: 1,
        relatedTopics: ["allergens", "food_safety"],
        suggestedSources: ["ingredient_supplier", "academic_paper"],
        detectedAt: Date.now(),
        detectionReason: "Allergen information missing for ingredient",
      });
    }

    // Check nutrition
    if (!ingredient.nutrition) {
      gaps.push({
        id: `nutrition_${ingredientName}`,
        category: "nutrition_data",
        title: `Missing Nutrition Data: ${ingredientName}`,
        description: `Complete nutritional profile needed for ${ingredientName}`,
        affectedIngredients: [ingredientName],
        affectedRecipes: this.findRecipesWithIngredient(ingredientName),
        priority: "high",
        severity: 0.8,
        relatedTopics: ["nutrition", "calories", "macros"],
        suggestedSources: [
          "ingredient_supplier",
          "academic_paper",
          "recipe_database",
        ],
        detectedAt: Date.now(),
        detectionReason: "Nutritional data missing for ingredient",
      });
    }

    // Check chemistry
    if (!ingredient.chemistry || !ingredient.chemistry.acidity) {
      gaps.push({
        id: `chemistry_${ingredientName}`,
        category: "flavor_chemistry",
        title: `Missing Chemistry Profile: ${ingredientName}`,
        description: `Flavor chemistry profile needed for ${ingredientName}`,
        affectedIngredients: [ingredientName],
        affectedRecipes: this.findRecipesWithIngredient(ingredientName),
        priority: "high",
        severity: 0.7,
        relatedTopics: ["flavor_chemistry", "acidity", "emulsion"],
        suggestedSources: ["academic_paper", "food_blog"],
        detectedAt: Date.now(),
        detectionReason: "Chemistry profile missing for ingredient",
      });
    }

    // Check substitutions
    if (!ingredient.substitutions || ingredient.substitutions.length === 0) {
      gaps.push({
        id: `substitution_${ingredientName}`,
        category: "substitutions",
        title: `Missing Substitution Rules: ${ingredientName}`,
        description: `Substitution rules needed for ${ingredientName}`,
        affectedIngredients: [ingredientName],
        affectedRecipes: this.findRecipesWithIngredient(ingredientName),
        priority: "medium",
        severity: 0.6,
        relatedTopics: ["substitutions", "alternatives"],
        suggestedSources: ["food_blog", "recipe_database"],
        detectedAt: Date.now(),
        detectionReason: "No substitution rules defined",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for recipes lacking allergen information
   */
  private detectAllergenGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const recipesWithoutAllergens = Array.from(this.recipes.values()).filter(
      (r) => !r.allergens || r.allergens.length === 0,
    );

    if (recipesWithoutAllergens.length > 0) {
      gaps.push({
        id: "allergen_coverage",
        category: "allergen_information",
        title: "Allergen Information Gap",
        description: `${recipesWithoutAllergens.length} recipes missing allergen documentation`,
        affectedRecipes: recipesWithoutAllergens.map((r) => r.id),
        affectedIngredients: this.extractIngredientsFromRecipes(
          recipesWithoutAllergens,
        ),
        priority: "critical",
        severity: 1,
        relatedTopics: ["allergens", "food_safety", "regulations", "FDA"],
        suggestedSources: ["ingredient_supplier", "academic_paper"],
        detectedAt: Date.now(),
        detectionReason: "Multiple recipes lack allergen documentation",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for recipes lacking nutrition data
   */
  private detectNutritionGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const recipesWithoutNutrition = Array.from(this.recipes.values()).filter(
      (r) => !r.nutrition || !r.nutrition.calories,
    );

    if (recipesWithoutNutrition.length > 0) {
      gaps.push({
        id: "nutrition_coverage",
        category: "nutrition_data",
        title: "Nutrition Data Gap",
        description: `${recipesWithoutNutrition.length} recipes missing nutritional information`,
        affectedRecipes: recipesWithoutNutrition.map((r) => r.id),
        affectedIngredients: this.extractIngredientsFromRecipes(
          recipesWithoutNutrition,
        ),
        priority: "high",
        severity: 0.8,
        relatedTopics: ["nutrition", "calories", "macros", "dietary_tracking"],
        suggestedSources: [
          "ingredient_supplier",
          "academic_paper",
          "recipe_database",
        ],
        detectedAt: Date.now(),
        detectionReason: "Multiple recipes lack nutritional data",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for flavor chemistry knowledge
   */
  private detectFlavorChemistryGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const ingredientsWithoutChemistry = Array.from(
      this.ingredients.values(),
    ).filter((i) => !i.chemistry || !i.chemistry.volatiles);

    if (ingredientsWithoutChemistry.length > 0) {
      gaps.push({
        id: "chemistry_coverage",
        category: "flavor_chemistry",
        title: "Flavor Chemistry Gap",
        description: `${ingredientsWithoutChemistry.length} ingredients lack chemistry profiles`,
        affectedIngredients: ingredientsWithoutChemistry.map((i) => i.name),
        affectedRecipes: [],
        priority: "high",
        severity: 0.7,
        relatedTopics: [
          "flavor_chemistry",
          "volatiles",
          "compounds",
          "flavor_balance",
        ],
        suggestedSources: ["academic_paper", "food_blog"],
        detectedAt: Date.now(),
        detectionReason: "Ingredients lack detailed chemistry profiles",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for techniques
   */
  private detectTechniqueGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const criticalTechniques = [
      "emulsification",
      "caramelization",
      "mise_en_place",
      "plating",
      "temperature_control",
    ];

    const documentedTechniques = Array.from(this.techniques.keys());
    const missingTechniques = criticalTechniques.filter(
      (t) => !documentedTechniques.some((dt) => dt.includes(t)),
    );

    if (missingTechniques.length > 0) {
      gaps.push({
        id: "technique_coverage",
        category: "technique",
        title: "Technique Documentation Gap",
        description: `${missingTechniques.length} critical techniques not documented`,
        affectedRecipes: [],
        affectedIngredients: [],
        priority: "high",
        severity: 0.7,
        relatedTopics: missingTechniques,
        suggestedSources: ["youtube_video", "food_blog"],
        detectedAt: Date.now(),
        detectionReason: "Critical techniques missing documentation",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for substitutions
   */
  private detectSubstitutionGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const ingredientsWithoutSubstitutions = Array.from(
      this.ingredients.values(),
    ).filter((i) => !i.substitutions || i.substitutions.length === 0);

    if (ingredientsWithoutSubstitutions.length > this.ingredients.size * 0.2) {
      gaps.push({
        id: "substitution_coverage",
        category: "substitutions",
        title: "Substitution Rules Gap",
        description: `Over 20% of ingredients lack substitution rules`,
        affectedIngredients: ingredientsWithoutSubstitutions.map((i) => i.name),
        affectedRecipes: [],
        priority: "medium",
        severity: 0.6,
        relatedTopics: [
          "substitutions",
          "alternatives",
          "dietary_restrictions",
        ],
        suggestedSources: ["food_blog", "recipe_database"],
        detectedAt: Date.now(),
        detectionReason: "High percentage of ingredients without substitutions",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for cost data
   */
  private detectCostGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const ingredientsWithoutCost = Array.from(this.ingredients.values()).filter(
      (i) => !i.cost || !i.cost.unitPrice,
    );

    if (ingredientsWithoutCost.length > 0) {
      gaps.push({
        id: "cost_coverage",
        category: "cost_data",
        title: "Cost Data Gap",
        description: `${ingredientsWithoutCost.length} ingredients missing cost information`,
        affectedIngredients: ingredientsWithoutCost.map((i) => i.name),
        affectedRecipes: [],
        priority: "medium",
        severity: 0.6,
        relatedTopics: ["cost", "pricing", "cogs"],
        suggestedSources: ["ingredient_supplier"],
        detectedAt: Date.now(),
        detectionReason: "Ingredients lack cost pricing data",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for ingredient specifications
   */
  private detectIngredientSpecGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const ingredientsWithoutSpecs = Array.from(
      this.ingredients.values(),
    ).filter(
      (i) => !i.specifications || Object.keys(i.specifications).length === 0,
    );

    if (ingredientsWithoutSpecs.length > 0) {
      gaps.push({
        id: "ingredient_spec_coverage",
        category: "ingredient_specs",
        title: "Ingredient Specification Gap",
        description: `${ingredientsWithoutSpecs.length} ingredients lack technical specifications`,
        affectedIngredients: ingredientsWithoutSpecs.map((i) => i.name),
        affectedRecipes: [],
        priority: "medium",
        severity: 0.5,
        relatedTopics: ["specifications", "quality", "standards"],
        suggestedSources: ["ingredient_supplier", "academic_paper"],
        detectedAt: Date.now(),
        detectionReason: "Ingredients lack quality specifications",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for workflow optimization
   */
  private detectWorkflowGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const recipesWithoutPrepTime = Array.from(this.recipes.values()).filter(
      (r) => !r.prepTime || !r.cookTime,
    );

    if (recipesWithoutPrepTime.length > 0) {
      gaps.push({
        id: "workflow_coverage",
        category: "workflow_optimization",
        title: "Workflow Optimization Gap",
        description: `${recipesWithoutPrepTime.length} recipes lack time specifications`,
        affectedRecipes: recipesWithoutPrepTime.map((r) => r.id),
        affectedIngredients: [],
        priority: "medium",
        severity: 0.5,
        relatedTopics: ["workflow", "timing", "efficiency"],
        suggestedSources: ["restaurant_menu", "youtube_video"],
        detectedAt: Date.now(),
        detectionReason: "Recipes lack detailed timing information",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for dietary restrictions
   */
  private detectDietaryRestrictionGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const requiredDiets = [
      "vegetarian",
      "vegan",
      "gluten_free",
      "dairy_free",
      "keto",
    ];
    const recipesWithoutDietaryTags = Array.from(this.recipes.values()).filter(
      (r) => !r.dietaryTags || r.dietaryTags.length === 0,
    );

    if (recipesWithoutDietaryTags.length > 0) {
      gaps.push({
        id: "dietary_coverage",
        category: "dietary_restrictions",
        title: "Dietary Restriction Gap",
        description: `${recipesWithoutDietaryTags.length} recipes lack dietary tags`,
        affectedRecipes: recipesWithoutDietaryTags.map((r) => r.id),
        affectedIngredients: [],
        priority: "high",
        severity: 0.7,
        relatedTopics: requiredDiets,
        suggestedSources: ["recipe_database", "food_blog"],
        detectedAt: Date.now(),
        detectionReason: "Recipes not tagged with dietary information",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for sourcing information
   */
  private detectSourcingGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const ingredientsWithoutSourcing = Array.from(
      this.ingredients.values(),
    ).filter(
      (i) =>
        !i.sourcing ||
        !i.sourcing.suppliers ||
        i.sourcing.suppliers.length === 0,
    );

    if (ingredientsWithoutSourcing.length > 0) {
      gaps.push({
        id: "sourcing_coverage",
        category: "sourcing_information",
        title: "Sourcing Information Gap",
        description: `${ingredientsWithoutSourcing.length} ingredients lack supplier information`,
        affectedIngredients: ingredientsWithoutSourcing.map((i) => i.name),
        affectedRecipes: [],
        priority: "medium",
        severity: 0.5,
        relatedTopics: ["sourcing", "suppliers", "quality"],
        suggestedSources: ["ingredient_supplier"],
        detectedAt: Date.now(),
        detectionReason: "Ingredients lack sourcing and supplier data",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for regional variations
   */
  private detectRegionalVariationGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const cuisines = new Set(
      Array.from(this.recipes.values()).map((r) => r.cuisineRegion),
    );

    if (cuisines.size < 8) {
      gaps.push({
        id: "regional_coverage",
        category: "regional_variations",
        title: "Regional Variation Gap",
        description: `Only ${cuisines.size} cuisines documented. Need broader regional coverage`,
        affectedRecipes: [],
        affectedIngredients: [],
        priority: "low",
        severity: 0.3,
        relatedTopics: Array.from(cuisines) as string[],
        suggestedSources: ["restaurant_menu", "recipe_database"],
        detectedAt: Date.now(),
        detectionReason: "Limited regional culinary diversity",
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for equipment specifications
   */
  private detectEquipmentGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const recipesWithoutEquipment = Array.from(this.recipes.values()).filter(
      (r) => !r.equipment || r.equipment.length === 0,
    );

    if (recipesWithoutEquipment.length > this.recipes.size * 0.3) {
      gaps.push({
        id: "equipment_coverage",
        category: "equipment_specifications",
        title: "Equipment Specification Gap",
        description: `${recipesWithoutEquipment.length} recipes lack equipment specifications`,
        affectedRecipes: recipesWithoutEquipment.map((r) => r.id),
        affectedIngredients: [],
        priority: "low",
        severity: 0.3,
        relatedTopics: ["equipment", "tools", "specifications"],
        suggestedSources: ["restaurant_menu", "youtube_video"],
        detectedAt: Date.now(),
        detectionReason: "Recipes lack equipment requirements",
      });
    }

    return gaps;
  }

  /**
   * Helper: Find recipes containing specific ingredient
   */
  private findRecipesWithIngredient(ingredientName: string): string[] {
    return Array.from(this.recipes.values())
      .filter(
        (r) =>
          r.ingredients &&
          r.ingredients.some((i) =>
            i.name.toLowerCase().includes(ingredientName.toLowerCase()),
          ),
      )
      .map((r) => r.id);
  }

  /**
   * Helper: Extract ingredients from recipes
   */
  private extractIngredientsFromRecipes(
    recipes: RecipeCodexMetadata[],
  ): string[] {
    const ingredients = new Set<string>();
    recipes.forEach((recipe) => {
      recipe.ingredients?.forEach((ingredient) => {
        ingredients.add(ingredient.name);
      });
    });
    return Array.from(ingredients);
  }

  /**
   * Helper: Get current knowledge state
   */
  private getCurrentKnowledgeState(): CurrentKnowledgeState {
    const recipesWithAllergens = Array.from(this.recipes.values()).filter(
      (r) => r.allergens && r.allergens.length > 0,
    ).length;

    const recipesWithNutrition = Array.from(this.recipes.values()).filter(
      (r) => r.nutrition && r.nutrition.calories,
    ).length;

    const ingredientsWithChemistry = Array.from(
      this.ingredients.values(),
    ).filter((i) => i.chemistry && i.chemistry.acidity !== undefined).length;

    const substitutionRules = Array.from(this.ingredients.values()).filter(
      (i) => i.substitutions && i.substitutions.length > 0,
    ).length;

    const costDataPoints = Array.from(this.ingredients.values()).filter(
      (i) => i.cost && i.cost.unitPrice,
    ).length;

    return {
      totalRecipes: this.recipes.size,
      recipesWithAllergens,
      recipesWithNutrition,
      ingredientsWithChemistry,
      techniquesDocumented: this.techniques.size,
      substitutionRules,
      costDataPoints,
    };
  }

  /**
   * Helper: Calculate coverage percentage
   */
  private calculateCoveragePercentage(): Record<GapCategory, number> {
    const state = this.getCurrentKnowledgeState();

    return {
      allergen_information:
        (state.recipesWithAllergens / state.totalRecipes) * 100,
      nutrition_data: (state.recipesWithNutrition / state.totalRecipes) * 100,
      flavor_chemistry:
        (state.ingredientsWithChemistry / this.ingredients.size) * 100,
      technique: (state.techniquesDocumented / 12) * 100, // Assume 12 critical techniques
      substitutions: (state.substitutionRules / this.ingredients.size) * 100,
      cost_data: (state.costDataPoints / this.ingredients.size) * 100,
      ingredient_specs: (this.ingredients.size / this.ingredients.size) * 50, // Estimated
      workflow_optimization: 50, // Estimated
      dietary_restrictions: 60, // Estimated
      sourcing_information: 40, // Estimated
      regional_variations:
        Array.from(this.recipes.values()).length > 0 ? 50 : 0, // Estimated
      equipment_specifications: 30, // Estimated
    };
  }

  /**
   * Helper: Generate summary
   */
  private generateSummary(
    gaps: KnowledgeGap[],
    state: CurrentKnowledgeState,
  ): string {
    const criticalGaps = gaps.filter((g) => g.priority === "critical").length;
    const highGaps = gaps.filter((g) => g.priority === "high").length;

    return `Knowledge Base Status: ${state.totalRecipes} recipes, ${this.ingredients.size} ingredients. ${criticalGaps} critical gaps, ${highGaps} high-priority gaps detected. Focus: allergens, nutrition, flavor chemistry.`;
  }

  /**
   * Helper: Generate recommendations
   */
  private generateRecommendations(gaps: KnowledgeGap[]): string[] {
    const recommendations: string[] = [];

    if (gaps.some((g) => g.category === "allergen_information")) {
      recommendations.push(
        "CRITICAL: Prioritize allergen documentation from ingredient suppliers and academic sources",
      );
    }

    if (gaps.some((g) => g.category === "nutrition_data")) {
      recommendations.push(
        "HIGH PRIORITY: Complete nutritional profiles using USDA data and supplier specs",
      );
    }

    if (gaps.some((g) => g.category === "flavor_chemistry")) {
      recommendations.push(
        "HIGH PRIORITY: Build flavor chemistry database from academic papers and Serious Eats",
      );
    }

    if (gaps.some((g) => g.category === "technique")) {
      recommendations.push(
        "Schedule technique documentation from YouTube channels",
      );
    }

    if (gaps.some((g) => g.category === "substitutions")) {
      recommendations.push(
        "Expand substitution rules from food blogs and community feedback",
      );
    }

    if (gaps.some((g) => g.category === "cost_data")) {
      recommendations.push("Update cost data quarterly from supplier catalogs");
    }

    return recommendations;
  }
}

export default KnowledgeGapDetector;
