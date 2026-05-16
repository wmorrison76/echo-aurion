/**
 * Yield Comparison Service
 *
 * Compares predicted yields from recipes vs actual production yields
 * Provides feedback loop for yield accuracy improvement
 */

export interface YieldPrediction {
  recipeId: string;
  recipeName: string;
  ingredientId: string;
  ingredientName: string;
  predictedYield: number; // percentage
  predictedOutput: number; // in standard units
  inputQuantity: number;
  inputUnit: string;
  prepMethod?: string;
  batchSize?: number;
  date: string;
}

export interface ActualYield {
  recipeId: string;
  recipeName: string;
  ingredientId: string;
  ingredientName: string;
  actualYield: number; // percentage
  actualOutput: number; // in standard units
  inputQuantity: number;
  inputUnit: string;
  prepMethod?: string;
  batchSize?: number;
  date: string;
  recordedBy?: string;
  notes?: string;
}

export interface YieldComparison {
  recipeId: string;
  recipeName: string;
  ingredientId: string;
  ingredientName: string;
  predictedYield: number;
  actualYield: number;
  variance: number; // actual - predicted
  variancePercent: number; // (actual - predicted) / predicted * 100
  accuracy: number; // 1 - abs(variancePercent) / 100
  date: string;
  needsReview: boolean;
  suggestedAdjustment?: number; // suggested new yield percentage
}

export interface YieldPerformanceMetrics {
  recipeId: string;
  recipeName: string;
  averageAccuracy: number;
  varianceTrend: "improving" | "stable" | "declining";
  recentVariance: number;
  sampleCount: number;
  lastUpdated: string;
  recommendations: string[];
}

class YieldComparisonService {
  private predictions: Map<string, YieldPrediction[]> = new Map();
  private actualYields: Map<string, ActualYield[]> = new Map();
  private comparisons: Map<string, YieldComparison[]> = new Map();

  /**
   * Record a yield prediction (from recipe scaling)
   */
  recordPrediction(prediction: YieldPrediction): void {
    const key = `${prediction.recipeId}:${prediction.ingredientId}`;
    const existing = this.predictions.get(key) || [];
    existing.push(prediction);
    this.predictions.set(key, existing);

    // Automatically compare if we have actual yield
    this.compareIfAvailable(prediction);
  }

  /**
   * Record actual yield (from production)
   */
  recordActual(actual: ActualYield): void {
    const key = `${actual.recipeId}:${actual.ingredientId}`;
    const existing = this.actualYields.get(key) || [];
    existing.push(actual);
    this.actualYields.set(key, existing);

    // Automatically compare if we have prediction
    this.compareIfAvailable(actual);
  }

  /**
   * Compare predicted vs actual yields
   */
  compare(prediction: YieldPrediction, actual: ActualYield): YieldComparison {
    const variance = actual.actualYield - prediction.predictedYield;
    const variancePercent =
      prediction.predictedYield > 0
        ? (variance / prediction.predictedYield) * 100
        : 0;
    const accuracy = Math.max(0, 1 - Math.abs(variancePercent) / 100);

    const comparison: YieldComparison = {
      recipeId: prediction.recipeId,
      recipeName: prediction.recipeName,
      ingredientId: prediction.ingredientId,
      ingredientName: prediction.ingredientName,
      predictedYield: prediction.predictedYield,
      actualYield: actual.actualYield,
      variance,
      variancePercent,
      accuracy,
      date: actual.date,
      needsReview: Math.abs(variancePercent) > 5, // Flag if variance > 5%
      suggestedAdjustment: this.calculateSuggestedAdjustment(
        prediction,
        actual,
      ),
    };

    // Store comparison
    const key = `${prediction.recipeId}:${prediction.ingredientId}`;
    const existing = this.comparisons.get(key) || [];
    existing.push(comparison);
    // Keep last 100 comparisons
    this.comparisons.set(key, existing.slice(-100));

    return comparison;
  }

  /**
   * Get yield performance metrics for a recipe
   */
  getPerformanceMetrics(recipeId: string): YieldPerformanceMetrics | null {
    const allComparisons: YieldComparison[] = [];

    // Collect all comparisons for this recipe
    for (const [key, comparisons] of this.comparisons.entries()) {
      if (key.startsWith(`${recipeId}:`)) {
        allComparisons.push(...comparisons);
      }
    }

    if (allComparisons.length === 0) {
      return null;
    }

    // Calculate metrics
    const averageAccuracy =
      allComparisons.reduce((sum, c) => sum + c.accuracy, 0) /
      allComparisons.length;
    const recentComparisons = allComparisons.slice(-10);
    const recentVariance =
      recentComparisons.length > 0
        ? recentComparisons.reduce((sum, c) => sum + c.variancePercent, 0) /
          recentComparisons.length
        : 0;

    // Determine trend
    const olderComparisons = allComparisons.slice(0, -10);
    const olderVariance =
      olderComparisons.length > 0
        ? olderComparisons.reduce((sum, c) => sum + c.variancePercent, 0) /
          olderComparisons.length
        : 0;

    let varianceTrend: "improving" | "stable" | "declining";
    if (Math.abs(recentVariance) < Math.abs(olderVariance)) {
      varianceTrend = "improving";
    } else if (Math.abs(recentVariance) > Math.abs(olderVariance) * 1.1) {
      varianceTrend = "declining";
    } else {
      varianceTrend = "stable";
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      allComparisons,
      averageAccuracy,
      varianceTrend,
    );

    return {
      recipeId,
      recipeName: allComparisons[0]?.recipeName || "",
      averageAccuracy,
      varianceTrend,
      recentVariance,
      sampleCount: allComparisons.length,
      lastUpdated: allComparisons[allComparisons.length - 1]?.date || "",
      recommendations,
    };
  }

  /**
   * Get comparisons for a recipe
   */
  getComparisons(recipeId: string, ingredientId?: string): YieldComparison[] {
    if (ingredientId) {
      return this.comparisons.get(`${recipeId}:${ingredientId}`) || [];
    }

    // Return all comparisons for recipe
    const all: YieldComparison[] = [];
    for (const [key, comparisons] of this.comparisons.entries()) {
      if (key.startsWith(`${recipeId}:`)) {
        all.push(...comparisons);
      }
    }
    return all.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  /**
   * Get recipes that need yield review
   */
  getRecipesNeedingReview(): Array<{
    recipeId: string;
    recipeName: string;
    issueCount: number;
  }> {
    const needsReview = new Map<
      string,
      { recipeName: string; count: number }
    >();

    for (const comparisons of this.comparisons.values()) {
      for (const comp of comparisons) {
        if (comp.needsReview) {
          const existing = needsReview.get(comp.recipeId) || {
            recipeName: comp.recipeName,
            count: 0,
          };
          existing.count++;
          needsReview.set(comp.recipeId, existing);
        }
      }
    }

    return Array.from(needsReview.entries()).map(([recipeId, data]) => ({
      recipeId,
      recipeName: data.recipeName,
      issueCount: data.count,
    }));
  }

  /**
   * Private methods
   */

  private compareIfAvailable(data: YieldPrediction | ActualYield): void {
    const key = `${data.recipeId}:${data.ingredientId}`;

    if ("predictedYield" in data) {
      // This is a prediction - look for matching actual
      const actuals = this.actualYields.get(key) || [];
      const matching = actuals.find(
        (a) =>
          Math.abs(new Date(a.date).getTime() - new Date(data.date).getTime()) <
          24 * 60 * 60 * 1000, // Within 24 hours
      );
      if (matching) {
        this.compare(data, matching);
      }
    } else {
      // This is an actual - look for matching prediction
      const predictions = this.predictions.get(key) || [];
      const matching = predictions.find(
        (p) =>
          Math.abs(new Date(p.date).getTime() - new Date(data.date).getTime()) <
          24 * 60 * 60 * 1000,
      );
      if (matching) {
        this.compare(matching, data);
      }
    }
  }

  private calculateSuggestedAdjustment(
    prediction: YieldPrediction,
    actual: ActualYield,
  ): number | undefined {
    // If variance is consistently in one direction, suggest adjustment
    const variance = actual.actualYield - prediction.predictedYield;

    if (Math.abs(variance) > 2) {
      // More than 2% variance
      // Weighted average: 70% actual, 30% predicted (favor actual but don't ignore prediction)
      return actual.actualYield * 0.7 + prediction.predictedYield * 0.3;
    }

    return undefined;
  }

  private generateRecommendations(
    comparisons: YieldComparison[],
    averageAccuracy: number,
    trend: "improving" | "stable" | "declining",
  ): string[] {
    const recommendations: string[] = [];

    if (averageAccuracy < 0.9) {
      recommendations.push(
        "Yield predictions are inaccurate. Review prep methods and equipment.",
      );
    }

    if (trend === "declining") {
      recommendations.push(
        "Yield accuracy is declining. Check for changes in ingredients or processes.",
      );
    }

    const highVariance = comparisons.filter(
      (c) => Math.abs(c.variancePercent) > 10,
    );
    if (highVariance.length > comparisons.length * 0.2) {
      recommendations.push(
        "High variance detected in 20%+ of batches. Standardize prep procedures.",
      );
    }

    const needsReview = comparisons.filter((c) => c.needsReview);
    if (needsReview.length > 0) {
      recommendations.push(
        `${needsReview.length} yield comparisons need review.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Yield predictions are performing well. Continue monitoring.",
      );
    }

    return recommendations;
  }
}

export const yieldComparisonService = new YieldComparisonService();
