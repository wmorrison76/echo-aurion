/**
 * EchoAI³ Real-Time Learning System
 * ---------------------------------
 * Learns from every user action, decision, and outcome automatically
 * without manual training
 */

export interface UserAction {
  id: string;
  userId: string;
  orgId: string;
  module: string;
  actionType: string; // e.g., "recipe_selected", "cost_adjusted", "order_placed"
  action: Record<string, any>; // Action details
  context: Record<string, any>; // Context at time of action
  timestamp: string;
}

export interface ActionOutcome {
  actionId: string;
  success: boolean;
  outcome: Record<string, any>; // Outcome details
  metrics?: {
    accuracy?: number;
    cost?: number;
    time?: number;
    satisfaction?: number;
  };
  timestamp: string;
}

export interface LearningEvent {
  id: string;
  action: UserAction;
  outcome?: ActionOutcome;
  pattern?: string; // Identified pattern
  learnedInsight?: string; // What was learned
  confidence: number;
  timestamp: string;
}

export interface LearningModel {
  id: string;
  modelType: string;
  version: number;
  trainingData: LearningEvent[];
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  lastUpdated: string;
}

/**
 * Real-Time Learning System
 * Captures actions, measures outcomes, and updates knowledge base automatically
 */
export class RealTimeLearningSystem {
  private actionStore: Map<string, UserAction> = new Map();
  private outcomeStore: Map<string, ActionOutcome> = new Map();
  private learningEvents: LearningEvent[] = [];
  private learningModels: Map<string, LearningModel> = new Map();
  private updateQueue: LearningEvent[] = [];

  constructor() {
    this.startLearningPipeline();
  }

  /**
   * Track user action
   */
  async trackAction(action: UserAction): Promise<void> {
    // Store action
    this.actionStore.set(action.id, action);

    // Add to learning queue
    const learningEvent: LearningEvent = {
      id: `learning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      confidence: 0.5, // Initial confidence
      timestamp: new Date().toISOString(),
    };

    this.learningEvents.push(learningEvent);
    this.updateQueue.push(learningEvent);

    // Trigger async learning process
    this.processLearningQueue();

    console.log(`[RealTimeLearning] Action tracked: ${action.actionType}`, {
      module: action.module,
      userId: action.userId,
    });
  }

  /**
   * Record action outcome
   */
  async recordOutcome(outcome: ActionOutcome): Promise<void> {
    // Store outcome
    this.outcomeStore.set(outcome.actionId, outcome);

    // Find associated action
    const action = this.actionStore.get(outcome.actionId);
    if (!action) {
      console.warn(
        `[RealTimeLearning] Outcome recorded for unknown action: ${outcome.actionId}`,
      );
      return;
    }

    // Update learning event with outcome
    const learningEvent = this.learningEvents.find(
      (e) => e.action.id === outcome.actionId,
    );

    if (learningEvent) {
      learningEvent.outcome = outcome;
      learningEvent.confidence = this.calculateConfidence(learningEvent);

      // Trigger pattern detection and learning
      await this.detectPattern(learningEvent);
      await this.updateKnowledgeBase(learningEvent);

      console.log(`[RealTimeLearning] Outcome recorded: ${outcome.success}`, {
        actionId: outcome.actionId,
        metrics: outcome.metrics,
      });
    }
  }

  /**
   * Process learning queue
   */
  private async processLearningQueue(): Promise<void> {
    if (this.updateQueue.length === 0) return;

    // Process batch of learning events
    const batch = this.updateQueue.splice(0, 10); // Process 10 at a time

    for (const event of batch) {
      try {
        // Detect patterns
        await this.detectPattern(event);

        // Update knowledge base if confidence is high enough
        if (event.confidence > 0.7) {
          await this.updateKnowledgeBase(event);
        }
      } catch (error) {
        console.error(
          `[RealTimeLearning] Error processing learning event ${event.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Detect patterns from learning events
   */
  private async detectPattern(event: LearningEvent): Promise<void> {
    if (!event.outcome) return; // Wait for outcome

    const { action, outcome } = event;

    // Pattern 1: Recipe cost adjustment patterns
    if (
      action.actionType === "recipe_cost_adjusted" &&
      outcome.success &&
      outcome.metrics?.cost
    ) {
      const pattern = `Recipe cost adjustments in ${action.module} module`;
      event.pattern = pattern;
      event.learnedInsight = `Optimal cost adjustment of ${outcome.metrics.cost}% leads to ${outcome.success ? "success" : "failure"}`;
    }

    // Pattern 2: Inventory ordering patterns
    if (
      action.actionType === "inventory_order_placed" &&
      outcome.success &&
      outcome.metrics?.accuracy
    ) {
      const pattern = `Inventory ordering patterns`;
      event.pattern = pattern;
      event.learnedInsight = `Ordering patterns based on ${action.context.demandForecast || "manual"} achieve ${outcome.metrics.accuracy}% accuracy`;
    }

    // Pattern 3: Labor scheduling patterns
    if (
      action.actionType === "labor_schedule_created" &&
      outcome.success &&
      outcome.metrics?.time
    ) {
      const pattern = `Labor scheduling optimization`;
      event.pattern = pattern;
      event.learnedInsight = `Scheduling based on ${action.context.forecast ? "forecast" : "historical"} data saves ${outcome.metrics.time} hours`;
    }

    // Pattern 4: Menu pricing patterns
    if (
      action.actionType === "menu_price_adjusted" &&
      outcome.success &&
      outcome.metrics?.satisfaction
    ) {
      const pattern = `Menu pricing optimization`;
      event.pattern = pattern;
      event.learnedInsight = `Price adjustments based on ${action.context.marginTarget || "default"} target achieve ${outcome.metrics.satisfaction}% satisfaction`;
    }

    // Calculate pattern confidence
    event.confidence = this.calculatePatternConfidence(event);
  }

  /**
   * Update knowledge base with learned insights
   */
  private async updateKnowledgeBase(event: LearningEvent): Promise<void> {
    if (!event.pattern || !event.learnedInsight) return;

    // In production, this would:
    // 1. Update vector embeddings in Pinecone/pgvector
    // 2. Update knowledge graph relationships
    // 3. Retrain ML models incrementally
    // 4. Update domain engine parameters

    console.log(`[RealTimeLearning] Knowledge base updated:`, {
      pattern: event.pattern,
      insight: event.learnedInsight,
      confidence: event.confidence,
    });

    // Mock: Update vector store (in production, call actual update API)
    await this.updateVectorStore(event);

    // Mock: Update knowledge graph (in production, call graph DB)
    await this.updateKnowledgeGraph(event);

    // Mock: Incrementally update ML models
    await this.updateMLModels(event);
  }

  /**
   * Update vector store with new knowledge
   */
  private async updateVectorStore(event: LearningEvent): Promise<void> {
    // In production, this would:
    // 1. Generate embedding for learned insight
    // 2. Upsert to Pinecone/pgvector
    // 3. Tag with domain and pattern type

    console.log(
      `[RealTimeLearning] Vector store update scheduled for pattern: ${event.pattern}`,
    );

    // Mock implementation - in production, call actual vector store API
    const embeddingPayload = {
      id: `learning_${event.id}`,
      text: event.learnedInsight || "",
      metadata: {
        pattern: event.pattern,
        module: event.action.module,
        actionType: event.action.actionType,
        confidence: event.confidence,
        timestamp: event.timestamp,
      },
    };

    // Would call: await vectorStore.upsert(embeddingPayload)
  }

  /**
   * Update knowledge graph with new relationships
   */
  private async updateKnowledgeGraph(event: LearningEvent): Promise<void> {
    // In production, this would:
    // 1. Extract entities and relationships from learned insight
    // 2. Add/update nodes and edges in Neo4j or similar
    // 3. Strengthen/weaken edge weights based on outcomes

    console.log(
      `[RealTimeLearning] Knowledge graph update scheduled for pattern: ${event.pattern}`,
    );

    // Mock implementation - in production, call graph DB API
    const graphUpdate = {
      pattern: event.pattern,
      entities: this.extractEntities(event),
      relationships: this.extractRelationships(event),
      weight: event.confidence,
    };

    // Would call: await graphDB.updateRelationships(graphUpdate)
  }

  /**
   * Update ML models incrementally
   */
  private async updateMLModels(event: LearningEvent): Promise<void> {
    // In production, this would:
    // 1. Add new training data point
    // 2. Trigger incremental model update
    // 3. Validate model performance
    // 4. Rollback if performance degrades

    const modelType = this.determineModelType(event);
    const model = this.learningModels.get(modelType);

    if (!model) {
      // Create new model
      const newModel: LearningModel = {
        id: modelType,
        modelType,
        version: 1,
        trainingData: [event],
        performance: {
          accuracy: 0.5,
          precision: 0.5,
          recall: 0.5,
          f1Score: 0.5,
        },
        lastUpdated: new Date().toISOString(),
      };
      this.learningModels.set(modelType, newModel);
    } else {
      // Update existing model
      model.trainingData.push(event);
      model.lastUpdated = new Date().toISOString();

      // Incrementally update performance metrics
      if (event.outcome?.metrics) {
        // Simple moving average - in production, use proper ML evaluation
        const recentAccuracy =
          event.outcome.metrics.accuracy || model.performance.accuracy;
        model.performance.accuracy =
          model.performance.accuracy * 0.9 + recentAccuracy * 0.1;

        // Update other metrics similarly
        model.performance.f1Score = model.performance.accuracy * 0.9; // Simplified
        model.performance.precision = model.performance.accuracy * 0.95; // Simplified
        model.performance.recall = model.performance.accuracy * 0.95; // Simplified
      }

      // Trigger model retraining if needed (e.g., after 100 new examples)
      if (model.trainingData.length % 100 === 0) {
        await this.retrainModel(model);
      }
    }
  }

  /**
   * Determine model type from event
   */
  private determineModelType(event: LearningEvent): string {
    const { action } = event;

    if (action.actionType.includes("cost")) return "cost_prediction";
    if (
      action.actionType.includes("order") ||
      action.actionType.includes("inventory")
    )
      return "inventory_prediction";
    if (
      action.actionType.includes("labor") ||
      action.actionType.includes("schedule")
    )
      return "labor_prediction";
    if (
      action.actionType.includes("price") ||
      action.actionType.includes("menu")
    )
      return "pricing_prediction";
    if (action.actionType.includes("forecast")) return "demand_forecast";

    return "general_prediction";
  }

  /**
   * Retrain ML model
   */
  private async retrainModel(model: LearningModel): Promise<void> {
    console.log(`[RealTimeLearning] Retraining model: ${model.modelType}`, {
      version: model.version,
      trainingDataSize: model.trainingData.length,
    });

    // In production, this would:
    // 1. Prepare training data
    // 2. Split into train/validation sets
    // 3. Train new model version
    // 4. Evaluate on validation set
    // 5. Compare with current model
    // 6. Promote new version if better, otherwise rollback

    // Mock: Increment version
    model.version += 1;

    // Mock: Update performance (in production, calculate from validation)
    const validationPerformance = {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
    };

    // Only update if performance improved
    if (validationPerformance.accuracy > model.performance.accuracy) {
      model.performance = validationPerformance;
      console.log(
        `[RealTimeLearning] Model ${model.modelType} updated to v${model.version} with improved performance`,
      );
    } else {
      console.log(
        `[RealTimeLearning] Model ${model.modelType} v${model.version} performance did not improve, keeping v${model.version - 1}`,
      );
      model.version -= 1; // Rollback
    }
  }

  /**
   * Calculate confidence for learning event
   */
  private calculateConfidence(event: LearningEvent): number {
    let confidence = 0.5; // Base confidence

    if (event.outcome) {
      // Higher confidence if outcome is successful
      if (event.outcome.success) {
        confidence += 0.2;
      } else {
        confidence -= 0.1;
      }

      // Higher confidence if metrics are available
      if (event.outcome.metrics) {
        confidence += 0.1;

        // Boost confidence based on metric quality
        if (
          event.outcome.metrics.accuracy &&
          event.outcome.metrics.accuracy > 0.8
        ) {
          confidence += 0.1;
        }
      }
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(event: LearningEvent): number {
    if (!event.pattern) return event.confidence;

    // Boost confidence if pattern matches multiple similar events
    const similarEvents = this.learningEvents.filter(
      (e) => e.pattern === event.pattern && e.id !== event.id,
    );

    const patternFrequency = similarEvents.length;
    const patternSuccessRate =
      similarEvents.filter((e) => e.outcome?.success).length /
      Math.max(1, patternFrequency);

    // Confidence increases with pattern frequency and success rate
    const patternBoost = Math.min(
      0.3,
      patternFrequency * 0.05 + patternSuccessRate * 0.2,
    );

    return Math.min(1.0, event.confidence + patternBoost);
  }

  /**
   * Extract entities from learning event
   */
  private extractEntities(event: LearningEvent): string[] {
    const entities: string[] = [];

    entities.push(event.action.module);
    entities.push(event.action.actionType);

    if (event.action.context) {
      Object.keys(event.action.context).forEach((key) => {
        entities.push(key);
      });
    }

    return entities;
  }

  /**
   * Extract relationships from learning event
   */
  private extractRelationships(event: LearningEvent): Array<{
    source: string;
    target: string;
    type: string;
    weight: number;
  }> {
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
    }> = [];

    // Example: action module -> outcome success
    relationships.push({
      source: event.action.module,
      target: event.outcome?.success ? "success" : "failure",
      type: "leads_to",
      weight: event.confidence,
    });

    // Example: action type -> pattern
    if (event.pattern) {
      relationships.push({
        source: event.action.actionType,
        target: event.pattern,
        type: "follows_pattern",
        weight: event.confidence,
      });
    }

    return relationships;
  }

  /**
   * Start learning pipeline (periodic processing)
   */
  private startLearningPipeline(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processLearningQueue();
    }, 30000);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalActions: number;
    totalOutcomes: number;
    totalPatterns: number;
    models: Array<{ type: string; version: number; performance: any }>;
  } {
    return {
      totalActions: this.actionStore.size,
      totalOutcomes: this.outcomeStore.size,
      totalPatterns: new Set(
        this.learningEvents.map((e) => e.pattern).filter(Boolean),
      ).size,
      models: Array.from(this.learningModels.values()).map((m) => ({
        type: m.modelType,
        version: m.version,
        performance: m.performance,
      })),
    };
  }
}

// Singleton instance
let realTimeLearningInstance: RealTimeLearningSystem | null = null;

export function getRealTimeLearningSystem(): RealTimeLearningSystem {
  if (!realTimeLearningInstance) {
    realTimeLearningInstance = new RealTimeLearningSystem();
  }
  return realTimeLearningInstance;
}

export default RealTimeLearningSystem;
