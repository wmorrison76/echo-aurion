import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Recipe AI analyzer requires @vercel/postgres, which is not installed in this environment.",
    );
  });

// OpenAI client - optional dependency
let openai: any = null;
try {
  const OpenAI = require("openai").default;
import { getOpenAIClient } from "../lib/env";
  openai = getOpenAIClient();
} catch (error) {
  logger.warn("OpenAI package not available for recipe analysis");
}

export interface RecipeIngredient {
  name: string;
  originalQuantity: number;
  originalUnit: string;
  scaledQuantity?: number;
  scaledUnit?: string;
  purchaseUnit?: string;
  purchaseQuantity?: number;
  unitCost?: number;
  totalCost?: number;
  supplier?: string;
}

export interface ScaledRecipe {
  recipeName: string;
  originalYield: number;
  originalYieldUnit: string;
  targetYield: number;
  targetYieldUnit: string;
  scalingFactor: number;
  ingredients: RecipeIngredient[];
  prepSteps: string[];
  analysisNotes?: string;
}

class RecipeAIAnalyzer {
  // Cache for analyzed recipes (hash -> analysis result)
  private analysisCache: Map<string, { result: ScaledRecipe; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Generate hash for recipe text (for caching)
   */
  private hashRecipeText(text: string): string {
    return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
  }

  /**
   * Analyze a recipe and extract ingredients using AI
   * Uses caching to avoid re-analyzing the same recipe text
   */
  async analyzeRecipe(recipeText: string): Promise<ScaledRecipe> {
    try {
      // Check cache first
      const recipeHash = this.hashRecipeText(recipeText);
      const cached = this.analysisCache.get(recipeHash);
      if (cached && cached.expiresAt > Date.now()) {
        logger.debug("[RecipeAIAnalyzer] Using cached analysis", {
          recipeHash: recipeHash.substring(0, 8),
        });
        return cached.result;
      }

      logger.info("[RecipeAIAnalyzer] Analyzing recipe with AI", {
        recipeHash: recipeHash.substring(0, 8),
      });

      const prompt = `
Analyze the following recipe and extract:
1. Recipe name
2. Original yield (number of servings/portions)
3. All ingredients with quantities and units
4. Basic prep steps (not detailed cooking, just ingredient prep)

Return ONLY valid JSON in this exact format:
{
  "recipeName": "string",
  "originalYield": number,
  "originalYieldUnit": "servings|portions|weight|pieces",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": number,
      "unit": "cups|oz|grams|tbsp|tsp|pieces|lb|ml|l"
    }
  ],
  "prepSteps": [
    "step description"
  ]
}

Recipe:
${recipeText}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);

      const result: ScaledRecipe = {
        recipeName: parsed.recipeName,
        originalYield: parsed.originalYield,
        originalYieldUnit: parsed.originalYieldUnit,
        targetYield: parsed.originalYield, // Default to original until scaled
        targetYieldUnit: parsed.originalYieldUnit,
        scalingFactor: 1,
        ingredients: parsed.ingredients.map((ing: any) => ({
          name: ing.name,
          originalQuantity: ing.quantity,
          originalUnit: ing.unit,
        })),
        prepSteps: parsed.prepSteps || [],
      };

      // Cache the result
      this.analysisCache.set(recipeHash, {
        result,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      // Clean up expired cache entries (keep cache size reasonable)
      if (this.analysisCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of this.analysisCache.entries()) {
          if (value.expiresAt <= now) {
            this.analysisCache.delete(key);
          }
        }
      }

      logger.info("[RecipeAIAnalyzer] Recipe analyzed successfully", {
        recipeName: result.recipeName,
        ingredientCount: result.ingredients.length,
        cached: false,
      });

      return result;
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error analyzing recipe:", error);
      throw error;
    }
  }

  /**
   * Scale recipe ingredients for event guest count
   */
  scaleRecipe(recipe: ScaledRecipe, targetYield: number): ScaledRecipe {
    try {
      const scalingFactor = targetYield / recipe.originalYield;

      const scaled: ScaledRecipe = {
        ...recipe,
        targetYield,
        scalingFactor,
        ingredients: recipe.ingredients.map((ing) => ({
          ...ing,
          scaledQuantity:
            Math.round(ing.originalQuantity * scalingFactor * 100) / 100,
          scaledUnit: ing.originalUnit,
        })),
      };

      logger.info("[RecipeAIAnalyzer] Recipe scaled", {
        recipeName: recipe.recipeName,
        originalYield: recipe.originalYield,
        targetYield,
        scalingFactor,
      });

      return scaled;
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error scaling recipe:", error);
      throw error;
    }
  }

  /**
   * Assign recipe to production task
   */
  async assignRecipeToTask(
    productionTaskId: string,
    orgId: string,
    recipeName: string,
    originalYield: number,
    originalYieldUnit: string,
    guestCount: number,
    userId: string,
  ): Promise<string> {
    try {
      const scalingFactor = guestCount / originalYield;

      const result = await sql`
        INSERT INTO production_task_recipes (
          id,
          production_task_id,
          org_id,
          recipe_name,
          recipe_source,
          original_yield,
          original_yield_unit,
          target_yield,
          target_yield_unit,
          scaling_factor,
          assigned_by,
          assigned_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${productionTaskId},
          ${orgId},
          ${recipeName},
          'manual',
          ${originalYield},
          ${originalYieldUnit},
          ${guestCount},
          ${originalYieldUnit},
          ${scalingFactor},
          ${userId},
          NOW(),
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const recipeId = result.rows[0].id;

      logger.info("[RecipeAIAnalyzer] Recipe assigned to task", {
        recipeId,
        productionTaskId,
        scalingFactor,
      });

      return recipeId;
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error assigning recipe:", error);
      throw error;
    }
  }

  /**
   * Add scaled ingredients to production task
   */
  async addScaledIngredients(
    productionTaskId: string,
    eventId: string,
    orgId: string,
    ingredients: RecipeIngredient[],
  ): Promise<string[]> {
    try {
      const ingredientIds: string[] = [];

      for (const ing of ingredients) {
        const result = await sql`
          INSERT INTO scaled_ingredients (
            id,
            production_task_id,
            event_id,
            org_id,
            ingredient_name,
            original_quantity,
            original_unit,
            scaled_quantity,
            scaled_unit,
            purchase_unit,
            purchase_quantity_needed,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${productionTaskId},
            ${eventId},
            ${orgId},
            ${ing.name},
            ${ing.originalQuantity},
            ${ing.originalUnit},
            ${ing.scaledQuantity || ing.originalQuantity},
            ${ing.scaledUnit || ing.originalUnit},
            ${ing.purchaseUnit || ing.originalUnit},
            ${ing.purchaseQuantity || ing.scaledQuantity || ing.originalQuantity},
            NOW(),
            NOW()
          )
          RETURNING id;
        `;

        ingredientIds.push(result.rows[0].id);
      }

      logger.info("[RecipeAIAnalyzer] Scaled ingredients added", {
        productionTaskId,
        ingredientCount: ingredientIds.length,
      });

      return ingredientIds;
    } catch (error) {
      logger.error(
        "[RecipeAIAnalyzer] Error adding scaled ingredients:",
        error,
      );
      throw error;
    }
  }

  /**
   * Generate prep list from scaled ingredients
   */
  async generatePrepList(
    productionTaskId: string,
    eventId: string,
  ): Promise<number> {
    try {
      const result = await sql`
        SELECT * FROM generate_prep_list_from_ingredients(
          ${productionTaskId}::UUID,
          ${eventId}::UUID
        );
      `;

      const prepItemCount = result.rows[0].prep_item_count || 0;

      logger.info("[RecipeAIAnalyzer] Prep list generated", {
        productionTaskId,
        prepItemCount,
      });

      return prepItemCount;
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error generating prep list:", error);
      throw error;
    }
  }

  /**
   * Log recipe analysis
   */
  async logAnalysis(
    productionTaskId: string,
    eventId: string,
    orgId: string,
    recipeName: string,
    analysisType: string,
    inputData: Record<string, any>,
    analysisResult: Record<string, any>,
    status: string = "success",
    errorMessage?: string,
  ): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO recipe_analysis_logs (
          id,
          production_task_id,
          event_id,
          org_id,
          recipe_name,
          analysis_type,
          ai_model,
          input_data,
          analysis_result,
          status,
          error_message,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${productionTaskId},
          ${eventId},
          ${orgId},
          ${recipeName},
          ${analysisType},
          'gpt-4',
          ${JSON.stringify(inputData)}::JSONB,
          ${JSON.stringify(analysisResult)}::JSONB,
          ${status},
          ${errorMessage || null},
          NOW()
        )
        RETURNING id;
      `;

      return result.rows[0].id;
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error logging analysis:", error);
      throw error;
    }
  }

  /**
   * Get recipe for production task
   */
  async getTaskRecipe(productionTaskId: string): Promise<any | null> {
    try {
      const result = await sql`
        SELECT
          id,
          recipe_name,
          original_yield,
          original_yield_unit,
          target_yield,
          target_yield_unit,
          scaling_factor
        FROM production_task_recipes
        WHERE production_task_id = ${productionTaskId}
        LIMIT 1;
      `;

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error getting task recipe:", error);
      throw error;
    }
  }

  /**
   * Get scaled ingredients for production task
   */
  async getTaskIngredients(
    productionTaskId: string,
  ): Promise<RecipeIngredient[]> {
    try {
      const result = await sql`
        SELECT
          ingredient_name,
          original_quantity,
          original_unit,
          scaled_quantity,
          scaled_unit,
          purchase_unit,
          purchase_quantity_needed,
          unit_cost,
          total_cost,
          supplier_name
        FROM scaled_ingredients
        WHERE production_task_id = ${productionTaskId}
        ORDER BY ingredient_name ASC;
      `;

      return result.rows.map((row) => ({
        name: row.ingredient_name,
        originalQuantity: parseFloat(row.original_quantity),
        originalUnit: row.original_unit,
        scaledQuantity: parseFloat(row.scaled_quantity),
        scaledUnit: row.scaled_unit,
        purchaseUnit: row.purchase_unit,
        purchaseQuantity: parseFloat(row.purchase_quantity_needed),
        unitCost: row.unit_cost ? parseFloat(row.unit_cost) : undefined,
        totalCost: row.total_cost ? parseFloat(row.total_cost) : undefined,
        supplier: row.supplier_name,
      }));
    } catch (error) {
      logger.error("[RecipeAIAnalyzer] Error getting task ingredients:", error);
      throw error;
    }
  }

  /**
   * Calculate ingredient costs (would integrate with Purchasing module)
   */
  async calculateIngredientCosts(
    ingredients: RecipeIngredient[],
  ): Promise<RecipeIngredient[]> {
    try {
      // TODO: Integrate with Purchasing module to get actual costs
      // For now, return with placeholder calculations

      return ingredients.map((ing) => ({
        ...ing,
        unitCost: ing.unitCost || 0,
        totalCost: (ing.purchaseQuantity || 0) * (ing.unitCost || 0),
      }));
    } catch (error) {
      logger.error(
        "[RecipeAIAnalyzer] Error calculating ingredient costs:",
        error,
      );
      throw error;
    }
  }

  /**
   * Calculate total event ingredient cost
   */
  async calculateEventIngredientCost(
    productionTaskId: string,
  ): Promise<number> {
    try {
      const result = await sql`
        SELECT COALESCE(SUM(total_cost), 0) as total_cost
        FROM scaled_ingredients
        WHERE production_task_id = ${productionTaskId};
      `;

      return parseFloat(result.rows[0].total_cost || 0);
    } catch (error) {
      logger.error(
        "[RecipeAIAnalyzer] Error calculating ingredient cost:",
        error,
      );
      throw error;
    }
  }

  /**
   * Clear analysis cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.analysisCache.clear();
    logger.info("[RecipeAIAnalyzer] Analysis cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    const now = Date.now();
    let validEntries = 0;
    for (const value of this.analysisCache.values()) {
      if (value.expiresAt > now) {
        validEntries++;
      }
    }
    return {
      size: this.analysisCache.size,
      entries: validEntries,
    };
  }
}

export const recipeAIAnalyzer = new RecipeAIAnalyzer();
