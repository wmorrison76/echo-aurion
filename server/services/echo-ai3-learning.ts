/**
 * EchoAI^3 Learning Service
 * 
 * Processes post-event evaluations to improve AI scheduling and recommendations
 * Continuously learns from manager feedback to improve future performance
 */

import { logger } from '../utils/logger.js';
import type { StaffEvaluation } from './post-event-evaluation.js';

export interface LearningPattern {
  employeeId: string;
  pattern: string; // e.g., "Excels in high-pressure plated service events"
  confidence: number; // 0-1
  evidenceCount: number;
  lastUpdated: string;
}

export interface PredictionAccuracy {
  predictionType: string; // e.g., "skill_match", "performance_forecast"
  accuracy: number; // 0-1
  sampleSize: number;
  improvements: string[];
}

class EchoAI3LearningService {
  private learningPatterns: Map<string, LearningPattern[]> = new Map();
  private predictionAccuracy: Map<string, PredictionAccuracy> = new Map();

  /**
   * Process evaluation for learning
   */
  async processEvaluationForLearning(evaluation: StaffEvaluation): Promise<void> {
    try {
      logger.info(`[EchoAI3Learning] Processing evaluation ${evaluation.id} for learning`);

      // Extract learning patterns
      const patterns = await this.extractPatterns(evaluation);
      this.updateLearningPatterns(evaluation.employeeId, patterns);

      // Update prediction accuracy
      await this.updatePredictionAccuracy(evaluation);

      // Generate insights
      const insights = await this.generateInsights(evaluation);
      await this.applyInsights(insights);

      logger.info(`[EchoAI3Learning] Learning complete for evaluation ${evaluation.id}`);
    } catch (error) {
      logger.error('[EchoAI3Learning] Error processing evaluation:', error);
    }
  }

  /**
   * Extract learning patterns from evaluation
   */
  private async extractPatterns(evaluation: StaffEvaluation): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Pattern: Event type performance
    const eventTypePattern = this.createPattern(
      evaluation.employeeId,
      `Performance in ${evaluation.aiTrainingData.eventType} events`,
      evaluation.performance.overallRating >= 4 ? 0.8 : 0.5,
      1
    );
    patterns.push(eventTypePattern);

    // Pattern: Service type performance
    const serviceTypePattern = this.createPattern(
      evaluation.employeeId,
      `Performance in ${evaluation.aiTrainingData.serviceType} service`,
      evaluation.performance.overallRating >= 4 ? 0.8 : 0.5,
      1
    );
    patterns.push(serviceTypePattern);

    // Pattern: Workload performance
    const workloadPattern = this.createPattern(
      evaluation.employeeId,
      `Performance under ${evaluation.aiTrainingData.workload} workload`,
      evaluation.performance.overallRating >= 4 ? 0.8 : 0.5,
      1
    );
    patterns.push(workloadPattern);

    // Pattern: Role performance
    const rolePattern = this.createPattern(
      evaluation.employeeId,
      `Performance as ${evaluation.roleSpecific.roleName}`,
      evaluation.performance.overallRating >= 4 ? 0.8 : 0.5,
      1
    );
    patterns.push(rolePattern);

    // Pattern: Strengths
    for (const strength of evaluation.strengths) {
      const strengthPattern = this.createPattern(
        evaluation.employeeId,
        `Strength: ${strength}`,
        0.9,
        1
      );
      patterns.push(strengthPattern);
    }

    return patterns;
  }

  /**
   * Update learning patterns for an employee
   */
  private updateLearningPatterns(employeeId: string, newPatterns: LearningPattern[]): void {
    const existing = this.learningPatterns.get(employeeId) || [];

    for (const newPattern of newPatterns) {
      const existingPattern = existing.find(p => p.pattern === newPattern.pattern);

      if (existingPattern) {
        // Update existing pattern
        existingPattern.evidenceCount += newPattern.evidenceCount;
        existingPattern.confidence = Math.min(1, existingPattern.confidence + 0.1);
        existingPattern.lastUpdated = new Date().toISOString();
      } else {
        // Add new pattern
        existing.push(newPattern);
      }
    }

    this.learningPatterns.set(employeeId, existing);
  }

  /**
   * Update prediction accuracy based on evaluation
   */
  private async updatePredictionAccuracy(evaluation: StaffEvaluation): Promise<void> {
    // In production, compare predicted performance vs actual
    // For now, track general accuracy metrics

    const key = 'performance_forecast';
    const existing = this.predictionAccuracy.get(key) || {
      predictionType: key,
      accuracy: 0.7,
      sampleSize: 0,
      improvements: [],
    };

    existing.sampleSize += 1;
    // In production, calculate actual accuracy based on predictions vs reality
    existing.lastUpdated = new Date().toISOString();

    this.predictionAccuracy.set(key, existing);
  }

  /**
   * Generate insights from evaluation
   */
  private async generateInsights(evaluation: StaffEvaluation): Promise<string[]> {
    const insights: string[] = [];

    // High performance insight
    if (evaluation.performance.overallRating >= 4.5) {
      insights.push(
        `${evaluation.employeeId} excels in ${evaluation.aiTrainingData.eventType} events with ${evaluation.aiTrainingData.serviceType} service`
      );
    }

    // Improvement area insight
    if (evaluation.areasForImprovement.length > 0) {
      insights.push(
        `${evaluation.employeeId} needs development in: ${evaluation.areasForImprovement.join(', ')}`
      );
    }

    // Workload insight
    if (evaluation.aiTrainingData.workload === 'heavy' && evaluation.performance.overallRating >= 4) {
      insights.push(
        `${evaluation.employeeId} handles heavy workloads well`
      );
    }

    return insights;
  }

  /**
   * Apply insights to improve future recommendations
   */
  private async applyInsights(insights: string[]): Promise<void> {
    // In production, update AI model weights and recommendations
    logger.info(`[EchoAI3Learning] Applying ${insights.length} insights`);
  }

  /**
   * Get learning patterns for an employee
   */
  getLearningPatterns(employeeId: string): LearningPattern[] {
    return this.learningPatterns.get(employeeId) || [];
  }

  /**
   * Get prediction accuracy metrics
   */
  getPredictionAccuracy(): PredictionAccuracy[] {
    return Array.from(this.predictionAccuracy.values());
  }

  /**
   * Get recommendations based on learned patterns
   */
  async getRecommendations(employeeId: string, eventContext: {
    eventType: string;
    serviceType: string;
    workload: string;
    roleCode: string;
  }): Promise<string[]> {
    const patterns = this.getLearningPatterns(employeeId);
    const recommendations: string[] = [];

    // Check for relevant patterns
    const eventPattern = patterns.find(p => p.pattern.includes(eventContext.eventType));
    if (eventPattern && eventPattern.confidence >= 0.7) {
      recommendations.push(`Strong historical performance in ${eventContext.eventType} events`);
    }

    const servicePattern = patterns.find(p => p.pattern.includes(eventContext.serviceType));
    if (servicePattern && servicePattern.confidence >= 0.7) {
      recommendations.push(`Proven track record with ${eventContext.serviceType} service`);
    }

    const workloadPattern = patterns.find(p => p.pattern.includes(eventContext.workload));
    if (workloadPattern && workloadPattern.confidence >= 0.7) {
      recommendations.push(`Handles ${eventContext.workload} workloads effectively`);
    }

    return recommendations;
  }

  /**
   * Helper methods
   */

  private createPattern(
    employeeId: string,
    pattern: string,
    confidence: number,
    evidenceCount: number
  ): LearningPattern {
    return {
      employeeId,
      pattern,
      confidence,
      evidenceCount,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const echoAI3LearningService = new EchoAI3LearningService();
