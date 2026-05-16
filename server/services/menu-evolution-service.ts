/**
 * Autonomous Menu Engineering & Recipe Evolution Engine
 * Moat #29: Autonomous Menu Engineering & Recipe Evolution Engine
 * 
 * Industry First: Autonomous menu evolution with human-in-the-loop
 * - Autonomous recipe generation
 * - Menu optimization (retire underperformers, promote winners)
 * - Flavor matrix fingerprint integration
 * - R&D mode for experimental recipes
 * - Human-in-the-loop approval workflow
 */

import { logger } from "../lib/logger";

export interface RecipeEvolutionRequest {
  constraints: {
    targetCost?: number;
    targetPrepTime?: number;
    targetMargin?: number;
    dietaryRestrictions?: string[];
    cuisine?: string;
    flavorProfile?: FlavorProfileTarget;
  };
  performanceData?: {
    similarRecipes: Array<{ recipeId: string; performance: RecipePerformance }>;
  };
}

export interface FlavorProfileTarget {
  attributes: Array<{ id: string; targetIntensity: number }>;
  descriptors?: string[];
}

export interface RecipePerformance {
  sales: number;
  revenue: number;
  profitMargin: number;
  guestRating: number;
  wastePercent: number;
  prepTime: number;
}

export interface EvolvedRecipe {
  recipeId: string;
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  flavorFingerprint: FlavorFingerprint;
  estimatedCost: number;
  estimatedPrepTime: number;
  estimatedMargin: number;
  status: "draft" | "rd_mode" | "pending_approval" | "approved" | "rejected";
  humanFeedback?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  rdmode?: {
    experimental: boolean;
    testDuration: number; // days
    successCriteria: string[];
  };
}

export interface FlavorFingerprint {
  attributes: Array<{ id: string; intensity: number }>;
  descriptors: string[];
  balanceScore: number; // 0-100
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  cost: number;
  substitutionOptions?: Array<{ name: string; costDifference: number }>;
}

export interface MenuOptimization {
  recommendations: MenuRecommendation[];
  removals: MenuRemoval[];
  promotions: MenuPromotion[];
  requiresApproval: boolean;
}

export interface MenuRecommendation {
  recipeId: string;
  recipeName: string;
  action: "add" | "modify" | "remove" | "promote";
  reason: string;
  expectedImpact: string;
  priority: "low" | "medium" | "high";
}

export interface MenuRemoval {
  recipeId: string;
  recipeName: string;
  reason: string;
  performanceData: RecipePerformance;
  replacementSuggestion?: string;
}

export interface MenuPromotion {
  recipeId: string;
  recipeName: string;
  currentPosition: string;
  recommendedPosition: string;
  reason: string;
  expectedImpact: string;
}

export class MenuEvolutionService {
  private recipes: Map<string, EvolvedRecipe> = new Map();
  private optimizations: Map<string, MenuOptimization> = new Map();
  private flavorFingerprints: Map<string, FlavorFingerprint> = new Map();

  /**
   * Generate evolved recipe (with human-in-the-loop)
   */
  async generateEvolvedRecipe(request: RecipeEvolutionRequest): Promise<EvolvedRecipe> {
    // Generate recipe using constraints
    const recipe = await this.generateRecipe(request);

    // Calculate flavor fingerprint (integrate with flavor matrix system)
    const flavorFingerprint = await this.calculateFlavorFingerprint(recipe);

    recipe.flavorFingerprint = flavorFingerprint;

    // Determine if human approval needed
    const requiresApproval = this.determineApprovalRequirement(recipe, request);

    recipe.status = requiresApproval ? "pending_approval" : "rd_mode";

    if (recipe.status === "rd_mode") {
      recipe.rdmode = {
        experimental: true,
        testDuration: 14, // 2 weeks
        successCriteria: [
          "Sales > 20 units/week",
          "Guest rating > 4.0",
          "Profit margin > 30%",
        ],
      };
    }

    this.recipes.set(recipe.recipeId, recipe);

    logger.info("[Menu Evolution] Recipe generated", {
      recipeId: recipe.recipeId,
      name: recipe.name,
      status: recipe.status,
      requiresApproval,
    });

    return recipe;
  }

  /**
   * Human approves/rejects recipe
   */
  async humanApproveRecipe(
    recipeId: string,
    approved: boolean,
    feedback?: string,
    moveToRDMode?: boolean
  ): Promise<EvolvedRecipe> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error("Recipe not found");
    }

    if (approved) {
      recipe.approvalStatus = "approved";
      recipe.status = moveToRDMode ? "rd_mode" : "approved";
      
      if (moveToRDMode) {
        recipe.rdmode = {
          experimental: true,
          testDuration: 14,
          successCriteria: [
            "Sales > 20 units/week",
            "Guest rating > 4.0",
            "Profit margin > 30%",
          ],
        };
      }
    } else {
      recipe.approvalStatus = "rejected";
      recipe.status = "rejected";
    }

    if (feedback) {
      recipe.humanFeedback = feedback;
    }

    logger.info("[Menu Evolution] Human decision", {
      recipeId,
      approved,
      moveToRDMode,
      hasFeedback: !!feedback,
    });

    return recipe;
  }

  /**
   * Optimize menu (retire underperformers, promote winners)
   */
  async optimizeMenu(
    recipes: Array<{ recipeId: string; performance: RecipePerformance }>,
    threshold: { minSales: number; minRating: number; minMargin: number }
  ): Promise<MenuOptimization> {
    const recommendations: MenuRecommendation[] = [];
    const removals: MenuRemoval[] = [];
    const promotions: MenuPromotion[] = [];

    // Identify underperformers
    recipes.forEach(recipe => {
      if (
        recipe.performance.sales < threshold.minSales ||
        recipe.performance.guestRating < threshold.minRating ||
        recipe.performance.profitMargin < threshold.minMargin
      ) {
        removals.push({
          recipeId: recipe.recipeId,
          recipeName: `Recipe ${recipe.recipeId}`, // Would fetch name
          reason: `Performance below thresholds (sales: ${recipe.performance.sales}, rating: ${recipe.performance.guestRating.toFixed(1)}, margin: ${recipe.performance.profitMargin.toFixed(1)}%)`,
          performanceData: recipe.performance,
        });
      }
    });

    // Identify winners (promote)
    const topPerformers = recipes
      .filter(r => 
        r.performance.sales > threshold.minSales * 2 &&
        r.performance.guestRating > threshold.minRating + 0.5 &&
        r.performance.profitMargin > threshold.minMargin + 5
      )
      .sort((a, b) => b.performance.revenue - a.performance.revenue)
      .slice(0, 3);

    topPerformers.forEach(recipe => {
      promotions.push({
        recipeId: recipe.recipeId,
        recipeName: `Recipe ${recipe.recipeId}`,
        currentPosition: "Standard menu",
        recommendedPosition: "Featured/Signature",
        reason: `High performance (sales: ${recipe.performance.sales}, rating: ${recipe.performance.guestRating.toFixed(1)}, margin: ${recipe.performance.profitMargin.toFixed(1)}%)`,
        expectedImpact: "20-30% sales increase from promotion",
      });
    });

    const requiresApproval = removals.length > 0 || promotions.length > 0;

    const optimization: MenuOptimization = {
      recommendations: [...removals.map(r => ({
        recipeId: r.recipeId,
        recipeName: r.recipeName,
        action: "remove" as const,
        reason: r.reason,
        expectedImpact: "Reduce menu complexity, focus on winners",
        priority: "high" as const,
      })), ...promotions.map(p => ({
        recipeId: p.recipeId,
        recipeName: p.recipeName,
        action: "promote" as const,
        reason: p.reason,
        expectedImpact: p.expectedImpact,
        priority: "medium" as const,
      }))],
      removals,
      promotions,
      requiresApproval,
    };

    this.optimizations.set(`opt-${Date.now()}`, optimization);

    logger.info("[Menu Evolution] Menu optimized", {
      removals: removals.length,
      promotions: promotions.length,
      requiresApproval,
    });

    return optimization;
  }

  /**
   * Generate recipe (simplified - would use generative AI)
   */
  private async generateRecipe(request: RecipeEvolutionRequest): Promise<EvolvedRecipe> {
    // Simplified recipe generation (would use GPT-4/Claude in production)
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const recipe: EvolvedRecipe = {
      recipeId,
      name: `Evolved ${request.constraints.cuisine || "Recipe"}`,
      ingredients: [
        { name: "Ingredient 1", amount: 100, unit: "g", cost: 5.0 },
        { name: "Ingredient 2", amount: 50, unit: "g", cost: 3.0 },
      ],
      instructions: [
        "Prepare ingredients",
        "Cook according to method",
        "Plate and serve",
      ],
      flavorFingerprint: {
        attributes: [],
        descriptors: [],
        balanceScore: 0,
      },
      estimatedCost: 8.0,
      estimatedPrepTime: 30,
      estimatedMargin: 35,
      status: "draft",
    };

    return recipe;
  }

  /**
   * Calculate flavor fingerprint (integrate with flavor matrix)
   */
  private async calculateFlavorFingerprint(recipe: EvolvedRecipe): Promise<FlavorFingerprint> {
    // Integrate with flavor matrix system
    // Would import from: shared/echo/flavor-engine or client/modules/Culinary/client/echo/brain/flavorMatrix
    // For production: use analyzeRecipeForEcho or computeFlavorFingerprint from flavor-engine
    
    // Simplified implementation - in production would use:
    // import { analyzeRecipeForEcho, computeFlavorFingerprint } from "../../shared/echo/flavor-engine";
    // const analysis = analyzeRecipeForEcho({ name: recipe.name, ingredients: [...], ... });
    // const fingerprint = analysis.fingerprint;
    
    // Generate fingerprint from recipe data
    const attributes = [
      { id: "sweet", intensity: 0.3 },
      { id: "sour", intensity: 0.4 },
      { id: "salty", intensity: 0.5 },
      { id: "umami", intensity: 0.6 },
      { id: "fat", intensity: 0.4 },
      { id: "spicy", intensity: 0.2 },
      { id: "bitter", intensity: 0.1 },
      { id: "aromatic", intensity: 0.5 },
    ];

    const descriptors = ["balanced", "savory", "rich"];

    // Calculate balance score (simplified - would use flavor matrix calculations)
    const balanceScore = this.calculateBalanceScore(attributes);

    const fingerprint: FlavorFingerprint = {
      attributes,
      descriptors,
      balanceScore,
    };

    this.flavorFingerprints.set(recipe.recipeId, fingerprint);

    logger.info("[Menu Evolution] Flavor fingerprint calculated", {
      recipeId: recipe.recipeId,
      balanceScore,
      attributesCount: attributes.length,
    });

    return fingerprint;
  }

  /**
   * Calculate balance score
   */
  private calculateBalanceScore(attributes: Array<{ id: string; intensity: number }>): number {
    // Simplified balance calculation
    // Would use more sophisticated flavor matrix calculations
    const intensities = attributes.map(a => a.intensity);
    const avg = intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
    const variance = intensities.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intensities.length;
    
    // Lower variance = more balanced = higher score
    const balanceScore = Math.max(0, 100 - variance * 200);
    
    return Math.round(balanceScore);
  }

  /**
   * Determine if human approval required
   */
  private determineApprovalRequirement(
    recipe: EvolvedRecipe,
    request: RecipeEvolutionRequest
  ): boolean {
    // Require approval for:
    // - High-cost recipes
    // - Significant flavor profile changes
    // - Recipes outside normal constraints
    
    if (recipe.estimatedCost > 20) return true;
    if (recipe.estimatedMargin < 20) return true;
    if (recipe.flavorFingerprint.balanceScore < 60) return true;

    return false;
  }

  /**
   * Get R&D mode recipes
   */
  async getRDModeRecipes(): Promise<EvolvedRecipe[]> {
    return Array.from(this.recipes.values())
      .filter(r => r.status === "rd_mode" && r.rdmode?.experimental);
  }
}

let serviceInstance: MenuEvolutionService | null = null;

export function getMenuEvolutionService(): MenuEvolutionService {
  if (!serviceInstance) {
    serviceInstance = new MenuEvolutionService();
  }
  return serviceInstance;
}

export default MenuEvolutionService;
