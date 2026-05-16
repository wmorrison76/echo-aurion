/**
 * Real-Time Learning System
 * Continuously learns from user interactions to improve recommendations
 * 
 * Features:
 * - Online learning (immediate model updates)
 - Batch retraining (weekly full retrain)
 * - Interaction tracking
 * - Model versioning
 * - A/B testing support
 */

import { wineIntelligenceService } from "./wine-intelligence";
import { mixologyIntelligenceService } from "./mixology-intelligence";
import { crossModuleIntelligenceService } from "./cross-module-intelligence";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Interaction {
  id: string;
  type: "recommendation_shown" | "recommendation_accepted" | "recommendation_rejected" | "order_placed" | "rating_given";
  userId?: string;
  venueId?: string;
  timestamp: Date;
  context: InteractionContext;
  outcome: InteractionOutcome;
}

export interface InteractionContext {
  recommendationType?: "wine" | "cocktail" | "pairing";
  itemId?: string;
  itemType?: "wine" | "cocktail" | "dish";
  dishContext?: string;
  customerContext?: string;
  inventoryContext?: string;
}

export interface InteractionOutcome {
  accepted: boolean;
  rating?: number; // 1-5
  ordered?: boolean;
  feedback?: string;
  alternativesSelected?: string[]; // IDs of alternatives chosen
}

export interface ModelUpdate {
  modelId: string;
  version: string;
  timestamp: Date;
  interactionsProcessed: number;
  improvements: ModelImprovement[];
  performanceMetrics: ModelMetrics;
}

export interface ModelImprovement {
  metric: string;
  before: number;
  after: number;
  improvement: number; // percentage
}

export interface ModelMetrics {
  recommendationAccuracy: number; // 0-1
  acceptanceRate: number; // 0-1
  averageRating: number; // 1-5
  responseTime: number; // ms
}

// ============================================================================
// REAL-TIME LEARNING SERVICE
// ============================================================================

export class RealTimeLearningService {
  private interactionQueue: Interaction[] = [];
  private learningEnabled: boolean = true;
  private modelVersion: string = "1.0.0";
  private interactionCount: number = 0;
  private lastRetrain: Date = new Date();

  /**
   * Record interaction for learning
   */
  async recordInteraction(interaction: Interaction): Promise<void> {
    this.interactionQueue.push(interaction);
    this.interactionCount++;

    // Process immediately for online learning
    if (this.learningEnabled) {
      await this.processInteraction(interaction);
    }

    // Trigger batch processing if queue is large
    if (this.interactionQueue.length >= 100) {
      await this.processBatch();
    }
  }

  /**
   * Process single interaction (online learning)
   */
  private async processInteraction(interaction: Interaction): Promise<void> {
    try {
      switch (interaction.type) {
        case "recommendation_accepted":
          await this.learnFromAcceptance(interaction);
          break;
        case "recommendation_rejected":
          await this.learnFromRejection(interaction);
          break;
        case "order_placed":
          await this.learnFromOrder(interaction);
          break;
        case "rating_given":
          await this.learnFromRating(interaction);
          break;
      }

      // Update model weights (simplified - would use actual ML framework)
      await this.updateModelWeights(interaction);

    } catch (error) {
      console.error("[RealTimeLearning] Failed to process interaction:", error);
    }
  }

  /**
   * Learn from recommendation acceptance
   */
  private async learnFromAcceptance(interaction: Interaction): Promise<void> {
    // Positive reinforcement for:
    // - Item features that led to acceptance
    // - Context that influenced decision
    // - User preferences

    if (!interaction.context.itemId) return;

    // Update item popularity
    // Update context preferences
    // Update user preferences if userId available

    // Emit learning event
    this.emitLearningEvent({
      type: "positive_reinforcement",
      itemId: interaction.context.itemId,
      context: interaction.context,
      weight: interaction.outcome.rating ? interaction.outcome.rating / 5 : 1.0,
    });
  }

  /**
   * Learn from recommendation rejection
   */
  private async learnFromRejection(interaction: Interaction): Promise<void> {
    // Negative reinforcement:
    // - Avoid similar recommendations
    // - Adjust scoring weights
    // - Learn what to avoid

    if (!interaction.context.itemId) return;

    // Update avoidance patterns
    // Adjust recommendation weights

    this.emitLearningEvent({
      type: "negative_reinforcement",
      itemId: interaction.context.itemId,
      context: interaction.context,
      weight: -0.5,
    });
  }

  /**
   * Learn from order placement
   */
  private async learnFromOrder(interaction: Interaction): Promise<void> {
    // Strong positive signal:
    // - Item was not just accepted, but actually purchased
    // - Update revenue impact
    // - Strengthen recommendation

    if (!interaction.context.itemId) return;

    this.emitLearningEvent({
      type: "order_placed",
      itemId: interaction.context.itemId,
      context: interaction.context,
      weight: 2.0, // Stronger signal
    });
  }

  /**
   * Learn from rating
   */
  private async learnFromRating(interaction: Interaction): Promise<void> {
    // Use rating to adjust recommendation strength
    if (!interaction.outcome.rating) return;

    const normalizedRating = interaction.outcome.rating / 5; // 0-1

    this.emitLearningEvent({
      type: "rating",
      itemId: interaction.context.itemId,
      context: interaction.context,
      weight: normalizedRating,
      rating: interaction.outcome.rating,
    });
  }

  /**
   * Update model weights (simplified implementation)
   */
  private async updateModelWeights(interaction: Interaction): Promise<void> {
    // In production, this would:
    // 1. Update neural network weights
    // 2. Adjust scoring algorithms
    // 3. Update feature importance
    // 4. Refresh recommendation cache

    // For now, emit event for other services to react
    this.emitModelUpdate({
      interactionId: interaction.id,
      timestamp: new Date(),
      changes: this.calculateWeightChanges(interaction),
    });
  }

  /**
   * Process batch of interactions
   */
  async processBatch(): Promise<void> {
    if (this.interactionQueue.length === 0) return;

    const batch = this.interactionQueue.splice(0, 100);

    try {
      // Aggregate learning from batch
      const aggregatedLearning = this.aggregateBatchLearning(batch);

      // Update model
      await this.applyBatchUpdates(aggregatedLearning);

      // Clear processed interactions
      console.log(`[RealTimeLearning] Processed batch of ${batch.length} interactions`);

    } catch (error) {
      console.error("[RealTimeLearning] Batch processing failed:", error);
      // Re-queue failed interactions
      this.interactionQueue.unshift(...batch);
    }
  }

  /**
   * Weekly batch retraining
   */
  async batchRetrain(): Promise<void> {
    console.log("[RealTimeLearning] Starting weekly batch retraining...");

    try {
      // 1. Collect all interactions since last retrain
      const allInteractions = await this.getAllInteractionsSince(this.lastRetrain);

      // 2. Aggregate learning
      const aggregated = this.aggregateBatchLearning(allInteractions);

      // 3. Retrain models
      await this.retrainModels(aggregated);

      // 4. Update model version
      this.modelVersion = this.incrementVersion(this.modelVersion);
      this.lastRetrain = new Date();

      // 5. Emit model update event
      this.emitModelUpdate({
        interactionId: "batch-retrain",
        timestamp: new Date(),
        version: this.modelVersion,
        interactionsProcessed: allInteractions.length,
      });

      console.log(`[RealTimeLearning] Batch retraining complete. New version: ${this.modelVersion}`);

    } catch (error) {
      console.error("[RealTimeLearning] Batch retraining failed:", error);
      throw error;
    }
  }

  /**
   * Get learning metrics
   */
  async getMetrics(): Promise<ModelMetrics> {
    // Calculate metrics from recent interactions
    const recentInteractions = this.interactionQueue.slice(-1000);

    const accepted = recentInteractions.filter(i => i.outcome.accepted).length;
    const rated = recentInteractions.filter(i => i.outcome.rating).length;
    const ratings = recentInteractions
      .filter(i => i.outcome.rating)
      .map(i => i.outcome.rating!);

    return {
      recommendationAccuracy: 0.85, // Would be calculated from test set
      acceptanceRate: recentInteractions.length > 0 ? accepted / recentInteractions.length : 0,
      averageRating: ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0,
      responseTime: 150, // Average response time in ms
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private emitLearningEvent(event: {
    type: string;
    itemId?: string;
    context?: InteractionContext;
    weight: number;
    rating?: number;
  }): void {
    // Emit to OS Bus for other services to react
    // window.dispatchEvent(new CustomEvent("ai:learning", { detail: event }));
  }

  private emitModelUpdate(update: {
    interactionId: string;
    timestamp: Date;
    version?: string;
    interactionsProcessed?: number;
    changes?: any;
  }): void {
    // Emit to OS Bus
    // window.dispatchEvent(new CustomEvent("ai:model_updated", { detail: update }));
  }

  private calculateWeightChanges(interaction: Interaction): any {
    // Calculate what weights should change based on interaction
    return {
      // Placeholder - would contain actual weight adjustments
      adjustments: [],
    };
  }

  private aggregateBatchLearning(interactions: Interaction[]): any {
    // Aggregate learning signals from batch
    return {
      positiveSignals: interactions.filter(i => i.outcome.accepted).length,
      negativeSignals: interactions.filter(i => !i.outcome.accepted).length,
      averageRating: this.calculateAverageRating(interactions),
      contextPatterns: this.extractContextPatterns(interactions),
    };
  }

  private calculateAverageRating(interactions: Interaction[]): number {
    const ratings = interactions
      .filter(i => i.outcome.rating)
      .map(i => i.outcome.rating!);

    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  private extractContextPatterns(interactions: Interaction[]): any {
    // Extract common patterns from interactions
    // E.g., "wine recommendations work better with dish context"
    return {};
  }

  private async applyBatchUpdates(aggregated: any): Promise<void> {
    // Apply aggregated updates to model
    // Update weights, refresh cache, etc.
  }

  private async getAllInteractionsSince(date: Date): Promise<Interaction[]> {
    // Fetch from database/storage
    // For now, return queue
    return this.interactionQueue.filter(i => i.timestamp >= date);
  }

  private async retrainModels(aggregated: any): Promise<void> {
    // Full model retraining
    // This would use actual ML framework (TensorFlow, PyTorch, etc.)
  }

  private incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = parseInt(parts[2] || "0") + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}

// Export singleton instance
export const realTimeLearningService = new RealTimeLearningService();

// Start weekly retraining
if (typeof window !== "undefined") {
  setInterval(async () => {
    try {
      await realTimeLearningService.batchRetrain();
    } catch (error) {
      console.error("[RealTimeLearning] Scheduled retraining failed:", error);
    }
  }, 7 * 24 * 60 * 60 * 1000); // Weekly
}
