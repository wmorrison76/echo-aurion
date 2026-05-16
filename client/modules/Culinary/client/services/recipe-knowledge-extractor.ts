import type { KnowledgeItem } from "../echo/codex/KnowledgeCodex";
import { CulinaryScienceEngine } from "../echo/engines/CulinaryScienceEngine";

export interface ParsedRecipe {
  id: string;
  title: string;
  source: string;
  ingredients: Array<{
    id: string;
    name: string;
    amount: number;
    unit: string;
    category?: string;
  }>;
  instructions: string[];
  metadata?: {
    cuisine?: string;
    course?: string;
    difficulty?: string;
    prepTime?: number;
    cookTime?: number;
    yield?: string;
    techniques?: string[];
  };
}

/**
 * Extract knowledge items from an imported recipe
 * Automatically populates the knowledge codex when recipes are imported
 */
export class RecipeKnowledgeExtractor {
  /**
   * Extract all knowledge from a recipe
   */
  static extractKnowledgeItems(recipe: ParsedRecipe): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];

    // Extract ingredients as IngredientKnowledge items
    for (const ingredient of recipe.ingredients) {
      items.push(this.extractIngredientKnowledge(ingredient, recipe.source));
    }

    // Extract techniques
    const techniques = CulinaryScienceEngine.extractTechniquesFromRecipe(
      recipe.ingredients.map((i) => i.name),
      recipe.instructions,
    );

    for (const technique of techniques) {
      items.push(
        this.extractTechniqueKnowledge(technique, recipe, recipe.source),
      );
    }

    // Extract flavor profile
    if (recipe.metadata?.techniques?.length) {
      items.push(this.extractFlavorProfileKnowledge(recipe, recipe.source));
    }

    // Extract cost-related knowledge
    items.push(this.extractFinancialKnowledge(recipe, recipe.source));

    return items;
  }

  /**
   * Extract ingredient knowledge from recipe ingredient
   */
  private static extractIngredientKnowledge(
    ingredient: ParsedRecipe["ingredients"][0],
    source: string,
  ): KnowledgeItem {
    return {
      id: `ingredient-${ingredient.id}-${Date.now()}`,
      domain: "culinary",
      type: "ingredient",
      title: ingredient.name,
      description: `${ingredient.name} - ${ingredient.amount}${ingredient.unit}`,
      content: `Used in recipes as ${ingredient.category || "protein, vegetable, etc"}. Amount: ${ingredient.amount}${ingredient.unit}`,
      tags: [
        ingredient.category || "ingredient",
        "imported",
        ingredient.unit.toLowerCase(),
      ],
      confidenceScore: 0.85,
      sources: [source],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedItems: [],
      properties: {
        scientificName: undefined,
        origin: undefined,
        seasonality: [],
        yieldPercentage: 1,
        allergens: [],
        volatileCompounds: [],
        flavorFamily: [],
      },
    } as any;
  }

  /**
   * Extract technique knowledge
   */
  private static extractTechniqueKnowledge(
    techniqueName: string,
    recipe: ParsedRecipe,
    source: string,
  ): KnowledgeItem {
    const technique =
      recipe.instructions.find((inst) =>
        inst.toLowerCase().includes(techniqueName.toLowerCase()),
      ) || "";

    return {
      id: `technique-${techniqueName}-${recipe.id}-${Date.now()}`,
      domain: "culinary",
      type: "technique",
      title: `${techniqueName.charAt(0).toUpperCase()}${techniqueName.slice(1)}`,
      description: `${techniqueName} technique from ${recipe.title}`,
      content: technique,
      tags: [
        techniqueName,
        "cooking_technique",
        recipe.metadata?.cuisine || "",
      ].filter(Boolean),
      confidenceScore: 0.8,
      sources: [source, recipe.title],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedItems: [],
      properties: {
        steps: [technique],
        equipment: [],
        temperatureRange: undefined,
        timeMinutes: [
          recipe.metadata?.cookTime || 0,
          recipe.metadata?.cookTime || 0,
        ],
        difficulty: this.inferDifficulty(
          recipe.metadata?.difficulty || "medium",
        ),
        applicableIngredients: recipe.ingredients.map((i) => i.name),
      },
    } as any;
  }

  /**
   * Extract flavor profile knowledge
   */
  private static extractFlavorProfileKnowledge(
    recipe: ParsedRecipe,
    source: string,
  ): KnowledgeItem {
    return {
      id: `flavor-${recipe.id}-${Date.now()}`,
      domain: "culinary",
      type: "flavor_compound",
      title: `Flavor Profile: ${recipe.title}`,
      description: `Flavor profile for the dish ${recipe.title}`,
      content: `A ${recipe.metadata?.cuisine || "diverse"} ${recipe.metadata?.course || "dish"} with ${recipe.metadata?.techniques?.join(", ") || "various"} techniques`,
      tags: [
        "flavor_profile",
        recipe.metadata?.cuisine || "",
        recipe.metadata?.course || "",
      ].filter(Boolean),
      confidenceScore: 0.75,
      sources: [source],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedItems: recipe.ingredients.map((i) => `ingredient-${i.id}`),
      properties: {
        chemicalFormula: undefined,
        flavorProfile: [
          recipe.metadata?.cuisine || "mixed",
          recipe.metadata?.course || "main",
        ],
        sources: recipe.ingredients.map((i) => i.name),
        synergyWith: [],
        conflictsWith: [],
        concentration: 0.8,
      },
    } as any;
  }

  /**
   * Extract financial knowledge from recipe
   */
  private static extractFinancialKnowledge(
    recipe: ParsedRecipe,
    source: string,
  ): KnowledgeItem {
    return {
      id: `cost-${recipe.id}-${Date.now()}`,
      domain: "finance",
      type: "financial_model",
      title: `Cost Model: ${recipe.title}`,
      description: `Food cost model for ${recipe.title}`,
      content: `Cost analysis template for ${recipe.title}. Ingredients: ${recipe.ingredients.length}. Complexity: ${recipe.metadata?.difficulty || "medium"}`,
      tags: ["food_cost", "recipe_costing", "imported"],
      confidenceScore: 0.7,
      sources: [source],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedItems: recipe.ingredients.map((i) => `ingredient-${i.id}`),
      properties: {
        modelType: "recipe_costing",
        assumptions: {
          ingredientCount: recipe.ingredients.length,
          prepTime: recipe.metadata?.prepTime,
          cookTime: recipe.metadata?.cookTime,
        },
        calculations: [
          "Sum ingredient costs",
          "Divide by number of portions",
          "Add waste percentage",
        ],
        outputs: {
          costPerPortion: 0,
          suggestedPrice: 0,
          foodCostPercent: 0.3,
        },
        bestPractices: [
          "Track ingredient costs monthly",
          "Review pricing quarterly",
          "Monitor waste percentages",
        ],
        benchmarks: {
          foodCostPercent: 0.3,
          laborPercent: 0.25,
          otherCosts: 0.15,
        },
      },
    } as any;
  }

  /**
   * Infer difficulty level from text
   */
  private static inferDifficulty(difficulty: string): 1 | 2 | 3 | 4 | 5 {
    const lower = difficulty.toLowerCase();
    if (lower.includes("easy") || lower.includes("simple")) return 1;
    if (lower.includes("medium") || lower.includes("moderate")) return 3;
    if (lower.includes("hard") || lower.includes("advanced")) return 4;
    if (lower.includes("expert") || lower.includes("complex")) return 5;
    return 3;
  }

  /**
   * Store extracted knowledge items (call this after extraction)
   */
  static async storeKnowledgeItems(items: KnowledgeItem[]): Promise<void> {
    try {
      // Store in Pinecone/vector database
      for (const item of items) {
        // TODO: Implement vector storage
        // await storeKnowledgeVector(item);
        console.log(
          `[RecipeKnowledgeExtractor] Storing knowledge item: ${item.title}`,
        );
      }
    } catch (error) {
      console.error(
        "[RecipeKnowledgeExtractor] Failed to store knowledge items:",
        error,
      );
      throw error;
    }
  }
}
