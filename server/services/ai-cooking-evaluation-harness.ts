/**
 * AI Cooking Assistant Evaluation Harness
 * Provides accuracy testing, confidence scoring, and performance evaluation
 * 
 * Features:
 * - Accuracy evaluation harness
 * - Confidence scoring
 * - Performance metrics tracking
 * - Fine-tuning recommendations
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Evaluation Types
 */
export interface CookingEvaluation {
  id: string;
  orgId: string;
  query: string;
  expectedAnswer: string;
  actualAnswer: string;
  confidence: number; // 0-1
  accuracy: number; // 0-1
  metrics: {
    exactMatch: boolean;
    semanticSimilarity: number; // 0-1
    relevance: number; // 0-1
    completeness: number; // 0-1
  };
  evaluatedAt: string;
}

export interface ModelPerformance {
  modelId: string;
  totalEvaluations: number;
  averageAccuracy: number;
  averageConfidence: number;
  averageRelevance: number;
  averageCompleteness: number;
  exactMatchRate: number;
  semanticSimilarityScore: number;
  evaluatedAt: string;
}

export interface ConfidenceScore {
  answer: string;
  confidence: number; // 0-1
  factors: {
    contextMatch: number; // How well answer matches context
    knowledgeBaseMatch: number; // How well answer matches knowledge base
    consistency: number; // How consistent answer is with similar queries
    sourceQuality: number; // Quality of source material
  };
  metadata?: Record<string, any>;
}

/**
 * AI Cooking Evaluation Harness
 */
export class AICookingEvaluationHarness {
  /**
   * Evaluate AI cooking assistant answer
   */
  async evaluateAnswer(
    orgId: string,
    query: string,
    actualAnswer: string,
    expectedAnswer: string,
  ): Promise<CookingEvaluation> {
    try {
      // Calculate accuracy metrics
      const exactMatch = actualAnswer.toLowerCase().trim() === expectedAnswer.toLowerCase().trim();
      const semanticSimilarity = await this.calculateSemanticSimilarity(actualAnswer, expectedAnswer);
      const relevance = await this.calculateRelevance(actualAnswer, query);
      const completeness = await this.calculateCompleteness(actualAnswer, expectedAnswer);

      // Calculate overall accuracy
      const accuracy =
        (semanticSimilarity * 0.4 + relevance * 0.3 + completeness * 0.3) * (exactMatch ? 1.0 : 0.95);

      // Calculate confidence (based on metrics)
      const confidence = (semanticSimilarity + relevance + completeness) / 3;

      const evaluation: CookingEvaluation = {
        id: crypto.randomUUID(),
        orgId,
        query,
        expectedAnswer,
        actualAnswer,
        confidence,
        accuracy,
        metrics: {
          exactMatch,
          semanticSimilarity,
          relevance,
          completeness,
        },
        evaluatedAt: new Date().toISOString(),
      };

      // Store evaluation
      await this.storeEvaluation(evaluation);

      logger.info("[AICookingEvaluation] Answer evaluated", {
        orgId,
        accuracy: accuracy.toFixed(2),
        confidence: confidence.toFixed(2),
      });

      return evaluation;
    } catch (error) {
      logger.error("[AICookingEvaluation] Evaluation failed", { error, orgId, query });
      throw error;
    }
  }

  /**
   * Calculate semantic similarity between two answers
   */
  private async calculateSemanticSimilarity(answer1: string, answer2: string): Promise<number> {
    // Simplified semantic similarity calculation
    // In production, use a proper embedding-based similarity (OpenAI, etc.)
    const words1 = new Set(answer1.toLowerCase().split(/\s+/));
    const words2 = new Set(answer2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Calculate relevance to query
   */
  private async calculateRelevance(answer: string, query: string): Promise<number> {
    // Check if answer contains key terms from query
    const queryTerms = new Set(query.toLowerCase().split(/\s+/));
    const answerTerms = new Set(answer.toLowerCase().split(/\s+/));

    const matchingTerms = [...queryTerms].filter((term) => answerTerms.has(term));
    return matchingTerms.length / Math.max(queryTerms.size, 1);
  }

  /**
   * Calculate completeness compared to expected answer
   */
  private async calculateCompleteness(actual: string, expected: string): Promise<number> {
    // Check if actual answer covers key concepts from expected answer
    const expectedConcepts = this.extractConcepts(expected);
    const actualConcepts = this.extractConcepts(actual);

    const coveredConcepts = expectedConcepts.filter((concept) =>
      actualConcepts.some((a) => a.includes(concept) || concept.includes(a)),
    );

    return expectedConcepts.length > 0 ? coveredConcepts.length / expectedConcepts.length : 0;
  }

  /**
   * Extract key concepts from text (simplified)
   */
  private extractConcepts(text: string): string[] {
    // Simplified concept extraction
    // In production, use NLP libraries or ML models
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Top 10 concepts
  }

  /**
   * Calculate confidence score for an answer
   */
  async calculateConfidence(
    answer: string,
    context: string,
    knowledgeBaseMatches: string[],
  ): Promise<ConfidenceScore> {
    try {
      // Calculate confidence factors
      const contextMatch = await this.calculateContextMatch(answer, context);
      const knowledgeBaseMatch = this.calculateKnowledgeBaseMatch(answer, knowledgeBaseMatches);
      const consistency = await this.calculateConsistency(answer, knowledgeBaseMatches);
      const sourceQuality = this.calculateSourceQuality(knowledgeBaseMatches);

      // Overall confidence (weighted average)
      const confidence =
        contextMatch * 0.3 + knowledgeBaseMatch * 0.3 + consistency * 0.2 + sourceQuality * 0.2;

      return {
        answer,
        confidence,
        factors: {
          contextMatch,
          knowledgeBaseMatch,
          consistency,
          sourceQuality,
        },
      };
    } catch (error) {
      logger.error("[AICookingEvaluation] Confidence calculation failed", { error, answer });
      throw error;
    }
  }

  /**
   * Calculate context match
   */
  private async calculateContextMatch(answer: string, context: string): Promise<number> {
    return this.calculateSemanticSimilarity(answer, context);
  }

  /**
   * Calculate knowledge base match
   */
  private calculateKnowledgeBaseMatch(answer: string, matches: string[]): number {
    if (matches.length === 0) return 0;

    const similarities = matches.map((match) => this.calculateSemanticSimilarity(answer, match));
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  /**
   * Calculate consistency with knowledge base
   */
  private async calculateConsistency(answer: string, matches: string[]): Promise<number> {
    if (matches.length < 2) return 1.0; // Not enough data for consistency check

    // Check how consistent answer is with multiple knowledge base entries
    const similarities = matches.map((match) => this.calculateSemanticSimilarity(answer, match));
    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    const variance =
      similarities.reduce((sum, sim) => sum + Math.pow(sim - avgSimilarity, 2), 0) / similarities.length;

    // Lower variance = higher consistency
    return Math.max(0, 1 - variance);
  }

  /**
   * Calculate source quality
   */
  private calculateSourceQuality(matches: string[]): number {
    // Simplified - in production, check source metadata (authority, recency, etc.)
    return matches.length > 0 ? Math.min(1, matches.length / 5) : 0; // More sources = higher quality
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(orgId: string, modelId: string): Promise<ModelPerformance | null> {
    try {
      const { data, error } = await supabase
        .from("ai_cooking_evaluations")
        .select("*")
        .eq("org_id", orgId)
        .eq("model_id", modelId)
        .order("evaluated_at", { ascending: false })
        .limit(1000);

      if (error || !data || data.length === 0) return null;

      const totalEvaluations = data.length;
      const averageAccuracy =
        data.reduce((sum, e) => sum + parseFloat(e.accuracy || 0), 0) / totalEvaluations;
      const averageConfidence =
        data.reduce((sum, e) => sum + parseFloat(e.confidence || 0), 0) / totalEvaluations;
      const averageRelevance =
        data.reduce((sum, e) => sum + parseFloat(e.metrics?.relevance || 0), 0) / totalEvaluations;
      const averageCompleteness =
        data.reduce((sum, e) => sum + parseFloat(e.metrics?.completeness || 0), 0) / totalEvaluations;
      const exactMatchRate =
        data.filter((e) => e.metrics?.exact_match === true).length / totalEvaluations;
      const semanticSimilarityScore =
        data.reduce((sum, e) => sum + parseFloat(e.metrics?.semantic_similarity || 0), 0) /
        totalEvaluations;

      return {
        modelId,
        totalEvaluations,
        averageAccuracy,
        averageConfidence,
        averageRelevance,
        averageCompleteness,
        exactMatchRate,
        semanticSimilarityScore,
        evaluatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("[AICookingEvaluation] Failed to get model performance", { error, orgId, modelId });
      return null;
    }
  }

  /**
   * Store evaluation in database
   */
  private async storeEvaluation(evaluation: CookingEvaluation): Promise<void> {
    try {
      await supabase.from("ai_cooking_evaluations").insert({
        id: evaluation.id,
        org_id: evaluation.orgId,
        query: evaluation.query,
        expected_answer: evaluation.expectedAnswer,
        actual_answer: evaluation.actualAnswer,
        confidence: evaluation.confidence,
        accuracy: evaluation.accuracy,
        metrics: evaluation.metrics,
        evaluated_at: evaluation.evaluatedAt,
      });
    } catch (error) {
      logger.warn("[AICookingEvaluation] Failed to store evaluation", { error, evaluationId: evaluation.id });
      // Don't throw - evaluation can still be returned
    }
  }

  /**
   * Generate fine-tuning recommendations
   */
  async generateFineTuningRecommendations(
    orgId: string,
    modelId: string,
  ): Promise<Array<{ issue: string; recommendation: string; priority: "high" | "medium" | "low" }>> {
    try {
      const performance = await this.getModelPerformance(orgId, modelId);
      if (!performance) {
        return [];
      }

      const recommendations: Array<{
        issue: string;
        recommendation: string;
        priority: "high" | "medium" | "low";
      }> = [];

      // Low accuracy recommendation
      if (performance.averageAccuracy < 0.7) {
        recommendations.push({
          issue: "Low accuracy (<70%)",
          recommendation:
            "Fine-tune model with more high-quality training data. Focus on improving semantic understanding.",
          priority: "high",
        });
      }

      // Low confidence recommendation
      if (performance.averageConfidence < 0.6) {
        recommendations.push({
          issue: "Low confidence (<60%)",
          recommendation:
            "Improve context matching and knowledge base coverage. Add more domain-specific examples.",
          priority: "high",
        });
      }

      // Low relevance recommendation
      if (performance.averageRelevance < 0.7) {
        recommendations.push({
          issue: "Low relevance (<70%)",
          recommendation: "Improve query understanding. Add query-to-context mapping training examples.",
          priority: "medium",
        });
      }

      // Low completeness recommendation
      if (performance.averageCompleteness < 0.7) {
        recommendations.push({
          issue: "Incomplete answers (<70% completeness)",
          recommendation: "Improve answer generation. Ensure model covers all key concepts from expected answers.",
          priority: "medium",
        });
      }

      // Low exact match rate
      if (performance.exactMatchRate < 0.3) {
        recommendations.push({
          issue: "Low exact match rate (<30%)",
          recommendation:
            "Improve precision. Focus on exact terminology and measurement units in training data.",
          priority: "low",
        });
      }

      return recommendations;
    } catch (error) {
      logger.error("[AICookingEvaluation] Failed to generate recommendations", { error, orgId, modelId });
      return [];
    }
  }
}

// Export singleton instance
export const aiCookingEvaluationHarness = new AICookingEvaluationHarness();
