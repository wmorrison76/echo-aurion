/**
 * Yield Adjustment Engine
 *
 * Automatically suggests and applies yield adjustments to recipes
 * based on actual vs predicted yield comparisons
 */

import {
  yieldComparisonService,
  type YieldComparison,
} from "./yield-comparison-service";

export interface YieldAdjustment {
  recipeId: string;
  recipeName: string;
  ingredientId: string;
  ingredientName: string;
  currentYield: number;
  suggestedYield: number;
  adjustment: number; // suggested - current
  confidence: number; // 0-1, how confident we are in this adjustment
  reason: string;
  sampleSize: number; // number of comparisons used
  lastComparisonDate: string;
}

export interface AdjustmentRecommendation {
  recipeId: string;
  recipeName: string;
  adjustments: YieldAdjustment[];
  overallConfidence: number;
  shouldAutoApply: boolean; // true if confidence > 0.90 and sample size > 10
  requiresApproval: boolean;
}

class YieldAdjustmentEngine {
  private adjustmentHistory: Map<
    string,
    Array<{ date: string; from: number; to: number }>
  > = new Map();

  /**
   * Generate yield adjustment recommendations for a recipe
   */
  generateRecommendations(recipeId: string): AdjustmentRecommendation | null {
    const comparisons = yieldComparisonService.getComparisons(recipeId);

    if (comparisons.length === 0) {
      return null;
    }

    // Group comparisons by ingredient
    const byIngredient = new Map<string, YieldComparison[]>();
    for (const comp of comparisons) {
      const key = comp.ingredientId;
      const existing = byIngredient.get(key) || [];
      existing.push(comp);
      byIngredient.set(key, existing);
    }

    const adjustments: YieldAdjustment[] = [];

    for (const [
      ingredientId,
      ingredientComparisons,
    ] of byIngredient.entries()) {
      // Need at least 5 comparisons to suggest adjustment
      if (ingredientComparisons.length < 5) {
        continue;
      }

      // Calculate average variance
      const avgVariance =
        ingredientComparisons.reduce((sum, c) => sum + c.variancePercent, 0) /
        ingredientComparisons.length;
      const avgActual =
        ingredientComparisons.reduce((sum, c) => sum + c.actualYield, 0) /
        ingredientComparisons.length;
      const avgPredicted =
        ingredientComparisons.reduce((sum, c) => sum + c.predictedYield, 0) /
        ingredientComparisons.length;

      // Only suggest if variance is consistently in one direction
      const consistentDirection =
        ingredientComparisons.filter(
          (c) => Math.sign(c.variancePercent) === Math.sign(avgVariance),
        ).length / ingredientComparisons.length;

      if (consistentDirection < 0.7) {
        // Variance is not consistent - don't suggest adjustment
        continue;
      }

      // Calculate confidence based on sample size and consistency
      const sampleSize = ingredientComparisons.length;
      const consistency = consistentDirection;
      const varianceMagnitude = Math.abs(avgVariance);

      let confidence = 0;
      confidence += Math.min(sampleSize / 20, 0.4); // Up to 40% for sample size
      confidence += consistency * 0.3; // Up to 30% for consistency
      confidence += Math.min(varianceMagnitude / 10, 0.3); // Up to 30% for variance magnitude

      // Only suggest if variance is significant (>3%)
      if (Math.abs(avgVariance) < 3) {
        continue;
      }

      const adjustment: YieldAdjustment = {
        recipeId,
        recipeName: ingredientComparisons[0].recipeName,
        ingredientId,
        ingredientName: ingredientComparisons[0].ingredientName,
        currentYield: avgPredicted,
        suggestedYield: avgActual,
        adjustment: avgActual - avgPredicted,
        confidence: Math.min(confidence, 0.95), // Cap at 95%
        reason: this.generateReason(avgVariance, sampleSize, consistency),
        sampleSize,
        lastComparisonDate: ingredientComparisons[0].date,
      };

      adjustments.push(adjustment);
    }

    if (adjustments.length === 0) {
      return null;
    }

    // Calculate overall confidence
    const overallConfidence =
      adjustments.reduce((sum, a) => sum + a.confidence, 0) /
      adjustments.length;
    const shouldAutoApply =
      overallConfidence > 0.9 && adjustments.every((a) => a.sampleSize > 10);
    const requiresApproval = !shouldAutoApply && overallConfidence > 0.75;

    return {
      recipeId,
      recipeName: adjustments[0].recipeName,
      adjustments,
      overallConfidence,
      shouldAutoApply,
      requiresApproval,
    };
  }

  /**
   * Apply yield adjustment to a recipe
   */
  async applyAdjustment(
    recipeId: string,
    ingredientId: string,
    newYield: number,
    approvedBy: string,
  ): Promise<void> {
    console.log(
      `[YieldAdjustment] Applying adjustment: ${recipeId}:${ingredientId} → ${newYield}%`,
    );

    // In production, this would update the recipe in the database:
    // await recipeService.updateIngredientYield(recipeId, ingredientId, newYield);

    // Record in history
    const key = `${recipeId}:${ingredientId}`;
    const history = this.adjustmentHistory.get(key) || [];
    history.push({
      date: new Date().toISOString(),
      from: 0, // Would get current yield from recipe
      to: newYield,
    });
    this.adjustmentHistory.set(key, history);

    // Dispatch event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("yield-adjustment-applied", {
          detail: {
            recipeId,
            ingredientId,
            newYield,
            approvedBy,
          },
        }),
      );
    }
  }

  /**
   * Get adjustment history for an ingredient
   */
  getAdjustmentHistory(
    recipeId: string,
    ingredientId: string,
  ): Array<{ date: string; from: number; to: number }> {
    const key = `${recipeId}:${ingredientId}`;
    return this.adjustmentHistory.get(key) || [];
  }

  /**
   * Get all recipes with pending adjustments
   */
  getPendingAdjustments(): AdjustmentRecommendation[] {
    const recipes = new Set<string>();

    // Get all recipes that have comparisons
    const allComparisons = yieldComparisonService.getComparisons("");
    for (const comp of allComparisons) {
      recipes.add(comp.recipeId);
    }

    const recommendations: AdjustmentRecommendation[] = [];
    for (const recipeId of recipes) {
      const rec = this.generateRecommendations(recipeId);
      if (rec && (rec.shouldAutoApply || rec.requiresApproval)) {
        recommendations.push(rec);
      }
    }

    return recommendations.sort(
      (a, b) => b.overallConfidence - a.overallConfidence,
    );
  }

  /**
   * Private methods
   */

  private generateReason(
    variance: number,
    sampleSize: number,
    consistency: number,
  ): string {
    const direction = variance > 0 ? "higher" : "lower";
    const magnitude = Math.abs(variance);

    if (magnitude > 10) {
      return `Actual yields are consistently ${direction} by ${magnitude.toFixed(1)}% across ${sampleSize} batches. Strong evidence for adjustment.`;
    } else if (magnitude > 5) {
      return `Actual yields are ${direction} by ${magnitude.toFixed(1)}% on average. Moderate evidence suggests adjustment.`;
    } else {
      return `Small but consistent variance of ${magnitude.toFixed(1)}% detected. Consider adjustment if pattern continues.`;
    }
  }
}

export const yieldAdjustmentEngine = new YieldAdjustmentEngine();
