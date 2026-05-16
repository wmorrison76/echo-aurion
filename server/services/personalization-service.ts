/**
 * Personalized Learning & Recommendations Service
 * ------------------------------------------------
 * EchoAI³ learns individual user preferences and adapts suggestions accordingly
 * Example: "Chef John prefers French techniques, suggests Coq au Vin variation"
 */

import { logger } from "../lib/logger";

export interface UserPreference {
  userId: string;
  orgId: string;
  module: string;
  preferenceType: string; // "cuisine_style", "technique", "complexity", etc.
  value: any;
  confidence: number; // 0-1, how confident we are in this preference
  source: "explicit" | "inferred" | "collaborative"; // How preference was determined
  timestamp: string;
}

export interface UserActionHistory {
  userId: string;
  action: string;
  module: string;
  context: Record<string, any>;
  outcome?: Record<string, any>;
  timestamp: string;
}

export interface PersonalizedRecommendation {
  userId: string;
  module: string;
  recommendations: Recommendation[];
  reasoning: string;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  type: string;
  content: any;
  relevance: number; // 0-1, how relevant this is to the user
  confidence: number; // 0-1, confidence in recommendation
  explanation?: string;
}

/**
 * Personalization Service
 * Tracks user preferences and generates personalized recommendations
 */
export class PersonalizationService {
  private userPreferences: Map<string, UserPreference[]> = new Map(); // userId -> preferences[]
  private userActionHistory: Map<string, UserActionHistory[]> = new Map(); // userId -> actions[]
  private collaborativeFiltering: Map<string, Set<string>> = new Map(); // item -> similar users[]

  constructor() {
    this.startPreferenceLearning();
  }

  /**
   * Track user action for preference learning
   */
  async trackUserAction(action: UserActionHistory): Promise<void> {
    const history = this.userActionHistory.get(action.userId) || [];
    history.push(action);
    this.userActionHistory.set(action.userId, history);

    // Infer preferences from action
    await this.inferPreferences(action);

    // Update collaborative filtering
    this.updateCollaborativeFiltering(action);

    logger.info("[Personalization] User action tracked", {
      userId: action.userId,
      module: action.module,
      action: action.action,
    });
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    userId: string,
    module: string,
    context?: Record<string, any>
  ): Promise<PersonalizedRecommendation> {
    const preferences = this.getUserPreferences(userId, module);
    const actionHistory = this.getUserActionHistory(userId, module);

    // Generate recommendations based on preferences and history
    const recommendations = await this.generateRecommendations(
      userId,
      module,
      preferences,
      actionHistory,
      context
    );

    // Rank recommendations by relevance
    const rankedRecommendations = this.rankRecommendations(
      recommendations,
      preferences
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(preferences, rankedRecommendations);

    return {
      userId,
      module,
      recommendations: rankedRecommendations.slice(0, 10), // Top 10
      reasoning,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Set explicit user preference
   */
  async setPreference(preference: UserPreference): Promise<void> {
    const preferences = this.userPreferences.get(preference.userId) || [];

    // Update or add preference
    const existingIndex = preferences.findIndex(
      (p) =>
        p.module === preference.module &&
        p.preferenceType === preference.preferenceType
    );

    if (existingIndex >= 0) {
      preferences[existingIndex] = preference;
    } else {
      preferences.push(preference);
    }

    this.userPreferences.set(preference.userId, preferences);

    logger.info("[Personalization] Preference set", {
      userId: preference.userId,
      module: preference.module,
      type: preference.preferenceType,
      source: "explicit",
    });
  }

  /**
   * Infer preferences from user actions
   */
  private async inferPreferences(action: UserActionHistory): Promise<void> {
    const preferences: UserPreference[] = [];

    // Infer preferences based on action type and context
    switch (action.module) {
      case "culinary":
        if (action.action === "recipe_selected") {
          const cuisineStyle = this.inferCuisineStyle(action.context);
          if (cuisineStyle) {
            preferences.push({
              userId: action.userId,
              orgId: action.orgId || "unknown",
              module: "culinary",
              preferenceType: "cuisine_style",
              value: cuisineStyle,
              confidence: 0.7, // Initial confidence
              source: "inferred",
              timestamp: new Date().toISOString(),
            });
          }

          const complexity = this.inferComplexityPreference(action.context);
          if (complexity) {
            preferences.push({
              userId: action.userId,
              orgId: action.orgId || "unknown",
              module: "culinary",
              preferenceType: "complexity",
              value: complexity,
              confidence: 0.6,
              source: "inferred",
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;

      case "finance":
        if (action.action === "cost_adjusted") {
          const costPreference = this.inferCostPreference(action.context);
          if (costPreference) {
            preferences.push({
              userId: action.userId,
              orgId: action.orgId || "unknown",
              module: "finance",
              preferenceType: "cost_preference",
              value: costPreference,
              confidence: 0.7,
              source: "inferred",
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;

      case "schedule":
        if (action.action === "schedule_created") {
          const schedulingPreference = this.inferSchedulingPreference(action.context);
          if (schedulingPreference) {
            preferences.push({
              userId: action.userId,
              orgId: action.orgId || "unknown",
              module: "schedule",
              preferenceType: "scheduling_style",
              value: schedulingPreference,
              confidence: 0.7,
              source: "inferred",
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;
    }

    // Update preferences
    for (const preference of preferences) {
      await this.mergePreference(preference);
    }
  }

  /**
   * Infer cuisine style from action context
   */
  private inferCuisineStyle(context: Record<string, any>): string | null {
    // Simplified inference - in production, use ML/NLP
    const recipeName = (context.recipeName || "").toLowerCase();
    const ingredients = (context.ingredients || []).join(" ").toLowerCase();

    if (recipeName.includes("french") || ingredients.includes("shallot")) {
      return "french";
    }
    if (recipeName.includes("italian") || ingredients.includes("basil")) {
      return "italian";
    }
    if (recipeName.includes("asian") || ingredients.includes("ginger")) {
      return "asian";
    }

    return null;
  }

  /**
   * Infer complexity preference from action context
   */
  private inferComplexityPreference(context: Record<string, any>): string | null {
    const complexity = context.complexity || context.difficulty;
    if (complexity) {
      return complexity; // "simple", "intermediate", "complex"
    }

    const steps = context.steps || 0;
    if (steps < 5) return "simple";
    if (steps < 10) return "intermediate";
    return "complex";
  }

  /**
   * Infer cost preference from action context
   */
  private inferCostPreference(context: Record<string, any>): string | null {
    const adjustment = context.adjustment || 0;
    if (adjustment < -5) return "cost_focused";
    if (adjustment > 5) return "quality_focused";
    return "balanced";
  }

  /**
   * Infer scheduling preference from action context
   */
  private inferSchedulingPreference(context: Record<string, any>): string | null {
    const coverage = context.coverage || "adequate";
    if (coverage === "excess") return "over_staffed";
    if (coverage === "adequate") return "balanced";
    return "minimal";
  }

  /**
   * Merge preference with existing preferences
   */
  private async mergePreference(newPreference: UserPreference): Promise<void> {
    const preferences = this.userPreferences.get(newPreference.userId) || [];

    const existingIndex = preferences.findIndex(
      (p) =>
        p.module === newPreference.module &&
        p.preferenceType === newPreference.preferenceType
    );

    if (existingIndex >= 0) {
      const existing = preferences[existingIndex];

      // Update confidence based on multiple observations
      const updatedConfidence = Math.min(
        1.0,
        existing.confidence * 0.9 + newPreference.confidence * 0.1
      );

      // Update value if confidence increased
      if (newPreference.confidence > existing.confidence) {
        existing.value = newPreference.value;
      }

      existing.confidence = updatedConfidence;
      existing.timestamp = new Date().toISOString();

      preferences[existingIndex] = existing;
    } else {
      preferences.push(newPreference);
    }

    this.userPreferences.set(newPreference.userId, preferences);
  }

  /**
   * Generate recommendations based on preferences
   */
  private async generateRecommendations(
    userId: string,
    module: string,
    preferences: UserPreference[],
    actionHistory: UserActionHistory[],
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Generate module-specific recommendations
    switch (module) {
      case "culinary":
        recommendations.push(...(await this.generateCulinaryRecommendations(preferences, context)));
        break;

      case "finance":
        recommendations.push(...(await this.generateFinanceRecommendations(preferences, context)));
        break;

      case "schedule":
        recommendations.push(...(await this.generateScheduleRecommendations(preferences, context)));
        break;

      default:
        recommendations.push(...(await this.generateGeneralRecommendations(preferences, context)));
    }

    // Add collaborative filtering recommendations
    recommendations.push(...(await this.generateCollaborativeRecommendations(userId, module)));

    return recommendations;
  }

  /**
   * Generate culinary recommendations
   */
  private async generateCulinaryRecommendations(
    preferences: UserPreference[],
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const cuisinePreference = preferences.find((p) => p.preferenceType === "cuisine_style");
    const complexityPreference = preferences.find((p) => p.preferenceType === "complexity");

    if (cuisinePreference) {
      recommendations.push({
        id: `culinary_${Date.now()}_1`,
        type: "recipe_suggestion",
        content: {
          cuisine: cuisinePreference.value,
          suggestion: `Try a ${cuisinePreference.value} variation of this recipe`,
        },
        relevance: cuisinePreference.confidence,
        confidence: 0.8,
        explanation: `Based on your preference for ${cuisinePreference.value} cuisine`,
      });
    }

    if (complexityPreference) {
      recommendations.push({
        id: `culinary_${Date.now()}_2`,
        type: "complexity_match",
        content: {
          complexity: complexityPreference.value,
          suggestion: `Recommended ${complexityPreference.value} recipes`,
        },
        relevance: complexityPreference.confidence,
        confidence: 0.7,
        explanation: `Matching your ${complexityPreference.value} complexity preference`,
      });
    }

    return recommendations;
  }

  /**
   * Generate finance recommendations
   */
  private async generateFinanceRecommendations(
    preferences: UserPreference[],
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const costPreference = preferences.find((p) => p.preferenceType === "cost_preference");

    if (costPreference) {
      recommendations.push({
        id: `finance_${Date.now()}_1`,
        type: "cost_suggestion",
        content: {
          preference: costPreference.value,
          suggestion: `Cost adjustments aligned with your ${costPreference.value} preference`,
        },
        relevance: costPreference.confidence,
        confidence: 0.75,
        explanation: `Based on your ${costPreference.value} cost management style`,
      });
    }

    return recommendations;
  }

  /**
   * Generate schedule recommendations
   */
  private async generateScheduleRecommendations(
    preferences: UserPreference[],
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const schedulingPreference = preferences.find((p) => p.preferenceType === "scheduling_style");

    if (schedulingPreference) {
      recommendations.push({
        id: `schedule_${Date.now()}_1`,
        type: "scheduling_suggestion",
        content: {
          style: schedulingPreference.value,
          suggestion: `Schedule optimized for ${schedulingPreference.value} staffing`,
        },
        relevance: schedulingPreference.confidence,
        confidence: 0.75,
        explanation: `Based on your ${schedulingPreference.value} scheduling preference`,
      });
    }

    return recommendations;
  }

  /**
   * Generate general recommendations
   */
  private async generateGeneralRecommendations(
    preferences: UserPreference[],
    context?: Record<string, any>
  ): Promise<Recommendation[]> {
    return [];
  }

  /**
   * Generate collaborative filtering recommendations
   */
  private async generateCollaborativeRecommendations(
    userId: string,
    module: string
  ): Promise<Recommendation[]> {
    // Simplified collaborative filtering - in production, use proper CF algorithms
    const recommendations: Recommendation[] = [];

    // Find similar users based on action history
    const similarUsers = this.findSimilarUsers(userId, module);

    if (similarUsers.length > 0) {
      recommendations.push({
        id: `collab_${Date.now()}_1`,
        type: "collaborative_suggestion",
        content: {
          source: "similar_users",
          suggestion: `Users with similar preferences also liked...`,
        },
        relevance: 0.6,
        confidence: 0.65,
        explanation: `Based on preferences of ${similarUsers.length} similar users`,
      });
    }

    return recommendations;
  }

  /**
   * Find similar users based on action history
   */
  private findSimilarUsers(userId: string, module: string): string[] {
    // Simplified - in production, use proper similarity algorithms
    const userHistory = this.userActionHistory.get(userId) || [];
    const similarUsers: string[] = [];

    // Find users with similar action patterns
    for (const [otherUserId, otherHistory] of this.userActionHistory.entries()) {
      if (otherUserId === userId) continue;

      const moduleHistory = otherHistory.filter((a) => a.module === module);
      if (moduleHistory.length === 0) continue;

      // Simple similarity check (in production, use proper algorithms)
      const similarity = this.calculateSimilarity(userHistory, moduleHistory);
      if (similarity > 0.5) {
        similarUsers.push(otherUserId);
      }
    }

    return similarUsers;
  }

  /**
   * Calculate similarity between action histories
   */
  private calculateSimilarity(
    history1: UserActionHistory[],
    history2: UserActionHistory[]
  ): number {
    // Simplified similarity calculation
    const commonActions = history1.filter((a1) =>
      history2.some((a2) => a1.action === a2.action && a1.module === a2.module)
    );

    return commonActions.length / Math.max(history1.length, history2.length, 1);
  }

  /**
   * Update collaborative filtering data
   */
  private updateCollaborativeFiltering(action: UserActionHistory): void {
    // Simplified CF update - in production, use proper CF algorithms
    const itemKey = `${action.module}_${action.action}`;
    const users = this.collaborativeFiltering.get(itemKey) || new Set();
    users.add(action.userId);
    this.collaborativeFiltering.set(itemKey, users);
  }

  /**
   * Rank recommendations by relevance
   */
  private rankRecommendations(
    recommendations: Recommendation[],
    preferences: UserPreference[]
  ): Recommendation[] {
    return recommendations.sort((a, b) => {
      // Sort by relevance * confidence
      const scoreA = a.relevance * a.confidence;
      const scoreB = b.relevance * b.confidence;
      return scoreB - scoreA;
    });
  }

  /**
   * Generate reasoning for recommendations
   */
  private generateReasoning(
    preferences: UserPreference[],
    recommendations: Recommendation[]
  ): string {
    if (preferences.length === 0) {
      return "Based on general patterns and best practices.";
    }

    const preferenceTypes = preferences.map((p) => p.preferenceType).join(", ");
    return `Based on your preferences for: ${preferenceTypes}. These recommendations are tailored to match your preferences with ${recommendations.length} personalized suggestions.`;
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string, module?: string): UserPreference[] {
    const allPreferences = this.userPreferences.get(userId) || [];
    if (module) {
      return allPreferences.filter((p) => p.module === module);
    }
    return allPreferences;
  }

  /**
   * Get user action history
   */
  getUserActionHistory(userId: string, module?: string): UserActionHistory[] {
    const allHistory = this.userActionHistory.get(userId) || [];
    if (module) {
      return allHistory.filter((a) => a.module === module);
    }
    return allHistory;
  }

  /**
   * Start preference learning process
   */
  private startPreferenceLearning(): void {
    // Periodic preference learning and refinement
    setInterval(() => {
      this.refinePreferences();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * Refine preferences based on accumulated data
   */
  private refinePreferences(): void {
    // Update confidence scores based on accumulated actions
    for (const [userId, preferences] of this.userPreferences.entries()) {
      const history = this.userActionHistory.get(userId) || [];

      for (const preference of preferences) {
        // Increase confidence if actions consistently match preference
        const matchingActions = history.filter((a) =>
          this.actionMatchesPreference(a, preference)
        );

        if (matchingActions.length > 10) {
          preference.confidence = Math.min(1.0, preference.confidence + 0.05);
        }
      }
    }

    logger.info("[Personalization] Preferences refined");
  }

  /**
   * Check if action matches preference
   */
  private actionMatchesPreference(
    action: UserActionHistory,
    preference: UserPreference
  ): boolean {
    // Simplified matching - in production, use proper matching logic
    return action.module === preference.module;
  }
}

// Singleton instance
let personalizationInstance: PersonalizationService | null = null;

export function getPersonalizationService(): PersonalizationService {
  if (!personalizationInstance) {
    personalizationInstance = new PersonalizationService();
  }
  return personalizationInstance;
}

export default PersonalizationService;
