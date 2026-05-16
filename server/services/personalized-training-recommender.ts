/**
 * Personalized Training Recommender
 * 
 * EchoAI^3-powered training module recommendations
 * Personalized to each employee based on evaluations
 * Not one-size-fits-all - tailored to individual needs
 * 
 * Features:
 * - AI-powered training recommendations
 * - Personalized learning paths
 * - Progress-based adjustments
 * - Skill gap analysis
 */

import { logger } from '../utils/logger.js';
import { postEventEvaluationService } from './post-event-evaluation.js';
import { employeeProgressTracker } from './employee-progress-tracker.js';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'soft_skill' | 'safety' | 'compliance' | 'leadership';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number; // minutes
  prerequisites: string[]; // Module IDs
  learningObjectives: string[];
  estimatedImprovement: {
    metric: string; // e.g., 'quality', 'communication'
    expectedIncrease: number; // 0-100 percentage
  };
}

export interface PersonalizedTrainingPlan {
  employeeId: string;
  employeeName: string;
  generatedAt: string;
  currentLevel: {
    overall: number; // 0-100
    skills: Record<string, number>; // skill -> level
    gaps: string[]; // Identified skill gaps
  };
  recommendedModules: Array<{
    module: TrainingModule;
    priority: 'critical' | 'high' | 'medium' | 'low';
    reason: string; // Why this module is recommended
    expectedImpact: string; // What improvement is expected
    estimatedCompletion: string; // When to complete
    aiConfidence: number; // 0-100
  }>;
  learningPath: {
    phase: number;
    modules: string[]; // Module IDs in order
    estimatedDuration: number; // days
    expectedOutcome: string;
  }[];
  timeline: {
    startDate: string;
    milestones: Array<{
      date: string;
      module: string;
      expectedImprovement: string;
    }>;
    completionDate: string;
  };
  aiInsights: {
    learningStyle: string; // e.g., "Visual learner, benefits from hands-on practice"
    bestApproach: string; // e.g., "One-on-one coaching recommended"
    motivationFactors: string[]; // What motivates this employee
    challenges: string[]; // Potential learning challenges
  };
}

export interface TrainingProgress {
  employeeId: string;
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  score?: number; // 0-100
  timeSpent: number; // minutes
  impact: {
    beforeRating: number;
    afterRating: number;
    improvement: number;
  };
}

class PersonalizedTrainingRecommender {
  /**
   * Generate personalized training plan for an employee
   */
  async generateTrainingPlan(
    employeeId: string,
    orgId: string,
    focusAreas?: string[]
  ): Promise<PersonalizedTrainingPlan> {
    try {
      logger.info(`[TrainingRecommender] Generating personalized training plan for ${employeeId}`);

      // Get employee progress
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      const progressChart = await employeeProgressTracker.getProgressChart(
        employeeId,
        startDate.toISOString().split('T')[0],
        endDate.split('T')[0],
        orgId
      );

      // Get recent evaluations
      const evaluations = await postEventEvaluationService.getEmployeeEvaluations(
        employeeId,
        'system',
        true
      );
      const recentEvaluations = evaluations.slice(0, 10);

      // Analyze current level and gaps
      const currentLevel = this.analyzeCurrentLevel(recentEvaluations, progressChart);

      // Get available training modules
      const availableModules = await this.getAvailableModules(orgId);

      // AI-powered recommendation
      const recommendedModules = await this.recommendModules(
        currentLevel,
        recentEvaluations,
        progressChart,
        availableModules,
        focusAreas
      );

      // Build learning path
      const learningPath = this.buildLearningPath(recommendedModules, availableModules);

      // Generate timeline
      const timeline = this.generateTimeline(learningPath, recommendedModules);

      // Get AI insights
      const aiInsights = await this.generateAIInsights(
        employeeId,
        recentEvaluations,
        progressChart
      );

      return {
        employeeId,
        employeeName: progressChart.employeeName,
        generatedAt: new Date().toISOString(),
        currentLevel,
        recommendedModules,
        learningPath,
        timeline,
        aiInsights,
      };
    } catch (error) {
      logger.error('[TrainingRecommender] Error generating training plan:', error);
      throw error;
    }
  }

  /**
   * Track training progress and impact
   */
  async trackTrainingProgress(
    employeeId: string,
    moduleId: string,
    progress: Partial<TrainingProgress>
  ): Promise<TrainingProgress> {
    try {
      // In production, save to database
      const trainingProgress: TrainingProgress = {
        employeeId,
        moduleId,
        status: progress.status || 'not_started',
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        score: progress.score,
        timeSpent: progress.timeSpent || 0,
        impact: progress.impact || {
          beforeRating: 0,
          afterRating: 0,
          improvement: 0,
        },
      };

      // If completed, measure impact
      if (trainingProgress.status === 'completed' && trainingProgress.completedAt) {
        await this.measureTrainingImpact(employeeId, moduleId, trainingProgress);
      }

      return trainingProgress;
    } catch (error) {
      logger.error('[TrainingRecommender] Error tracking progress:', error);
      throw error;
    }
  }

  /**
   * Analyze current level and identify gaps
   */
  private analyzeCurrentLevel(
    evaluations: any[],
    progressChart: any
  ): PersonalizedTrainingPlan['currentLevel'] {
    if (evaluations.length === 0) {
      return {
        overall: 50,
        skills: {},
        gaps: [],
      };
    }

    // Calculate overall level
    const overall = evaluations.reduce((sum, e) => sum + e.performance.overallRating, 0) / evaluations.length * 20;

    // Analyze skills
    const skills: Record<string, number> = {};
    const skillMetrics = ['punctuality', 'quality', 'teamwork', 'communication', 'problemSolving'];
    
    for (const metric of skillMetrics) {
      const values = evaluations.map(e => e.performance[metric]).filter(v => v > 0);
      if (values.length > 0) {
        skills[metric] = (values.reduce((a, b) => a + b, 0) / values.length) * 20;
      }
    }

    // Identify gaps (skills below 70/100)
    const gaps = Object.entries(skills)
      .filter(([_, level]) => level < 70)
      .map(([skill]) => skill);

    // Add gaps from evaluation feedback
    const improvementAreas = new Set<string>();
    for (const evaluation of evaluations) {
      evaluation.areasForImprovement?.forEach((area: string) =>
        improvementAreas.add(area),
      );
    }
    gaps.push(...Array.from(improvementAreas));

    return {
      overall,
      skills,
      gaps: Array.from(new Set(gaps)),
    };
  }

  /**
   * AI-powered module recommendation
   */
  private async recommendModules(
    currentLevel: PersonalizedTrainingPlan['currentLevel'],
    evaluations: any[],
    progressChart: any,
    availableModules: TrainingModule[],
    focusAreas?: string[]
  ): Promise<PersonalizedTrainingPlan['recommendedModules']> {
    const recommendations: PersonalizedTrainingPlan['recommendedModules'] = [];

    // Prioritize based on gaps
    for (const gap of currentLevel.gaps) {
      const relevantModules = availableModules.filter(m =>
        m.learningObjectives.some(obj => obj.toLowerCase().includes(gap.toLowerCase())) ||
        m.title.toLowerCase().includes(gap.toLowerCase())
      );

      for (const module of relevantModules) {
        const priority = this.calculatePriority(gap, currentLevel, module);
        const reason = this.generateReason(gap, currentLevel, module);
        const expectedImpact = this.calculateExpectedImpact(module, currentLevel);
        const aiConfidence = this.calculateAIConfidence(gap, currentLevel, evaluations);

        recommendations.push({
          module,
          priority,
          reason,
          expectedImpact,
          estimatedCompletion: this.estimateCompletion(module),
          aiConfidence,
        });
      }
    }

    // Add focus area modules if specified
    if (focusAreas && focusAreas.length > 0) {
      for (const area of focusAreas) {
        const relevantModules = availableModules.filter(m =>
          m.title.toLowerCase().includes(area.toLowerCase()) ||
          m.description.toLowerCase().includes(area.toLowerCase())
        );

        for (const module of relevantModules) {
          if (!recommendations.find(r => r.module.id === module.id)) {
            recommendations.push({
              module,
              priority: 'high',
              reason: `Focus area: ${area}`,
              expectedImpact: this.calculateExpectedImpact(module, currentLevel),
              estimatedCompletion: this.estimateCompletion(module),
              aiConfidence: 75,
            });
          }
        }
      }
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.aiConfidence - a.aiConfidence;
    });
  }

  /**
   * Build learning path
   */
  private buildLearningPath(
    recommendations: PersonalizedTrainingPlan['recommendedModules'],
    availableModules: TrainingModule[]
  ): PersonalizedTrainingPlan['learningPath'] {
    const path: PersonalizedTrainingPlan['learningPath'] = [];

    // Group by priority
    const critical = recommendations.filter(r => r.priority === 'critical');
    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');

    // Phase 1: Critical modules
    if (critical.length > 0) {
      path.push({
        phase: 1,
        modules: critical.map(r => r.module.id),
        estimatedDuration: Math.ceil(critical.reduce((sum, r) => sum + r.module.duration, 0) / 60), // Convert to days
        expectedOutcome: 'Address critical skill gaps',
      });
    }

    // Phase 2: High priority
    if (high.length > 0) {
      path.push({
        phase: 2,
        modules: high.map(r => r.module.id),
        estimatedDuration: Math.ceil(high.reduce((sum, r) => sum + r.module.duration, 0) / 60),
        expectedOutcome: 'Improve high-priority skills',
      });
    }

    // Phase 3: Medium priority
    if (medium.length > 0) {
      path.push({
        phase: 3,
        modules: medium.map(r => r.module.id),
        estimatedDuration: Math.ceil(medium.reduce((sum, r) => sum + r.module.duration, 0) / 60),
        expectedOutcome: 'Enhance overall performance',
      });
    }

    return path;
  }

  /**
   * Generate timeline
   */
  private generateTimeline(
    learningPath: PersonalizedTrainingPlan['learningPath'],
    recommendations: PersonalizedTrainingPlan['recommendedModules']
  ): PersonalizedTrainingPlan['timeline'] {
    const startDate = new Date();
    const milestones: PersonalizedTrainingPlan['timeline']['milestones'] = [];
    let currentDate = new Date(startDate);

    for (const phase of learningPath) {
      for (const moduleId of phase.modules) {
        const recommendation = recommendations.find(r => r.module.id === moduleId);
        if (recommendation) {
          const moduleDuration = Math.ceil(recommendation.module.duration / 60); // Convert to hours, assume 1 hour per day
          currentDate.setDate(currentDate.getDate() + moduleDuration);

          milestones.push({
            date: currentDate.toISOString().split('T')[0],
            module: recommendation.module.title,
            expectedImprovement: recommendation.expectedImpact,
          });
        }
      }
    }

    const completionDate = currentDate.toISOString().split('T')[0];

    return {
      startDate: startDate.toISOString().split('T')[0],
      milestones,
      completionDate,
    };
  }

  /**
   * Generate AI insights
   */
  private async generateAIInsights(
    employeeId: string,
    evaluations: any[],
    progressChart: any
  ): Promise<PersonalizedTrainingPlan['aiInsights']> {
    // Analyze learning style from performance patterns
    const learningStyle = this.inferLearningStyle(evaluations, progressChart);
    const bestApproach = this.determineBestApproach(evaluations, progressChart);
    const motivationFactors = this.identifyMotivationFactors(evaluations);
    const challenges = this.identifyChallenges(evaluations, progressChart);

    return {
      learningStyle,
      bestApproach,
      motivationFactors,
      challenges,
    };
  }

  /**
   * Helper methods
   */

  private async getAvailableModules(orgId: string): Promise<TrainingModule[]> {
    // In production, query training modules database
    // For now, return sample modules
    return [
      {
        id: 'comm-101',
        title: 'Effective Communication',
        description: 'Improve communication skills for better teamwork',
        category: 'soft_skill',
        difficulty: 'intermediate',
        duration: 60,
        prerequisites: [],
        learningObjectives: ['Active listening', 'Clear messaging', 'Conflict resolution'],
        estimatedImprovement: { metric: 'communication', expectedIncrease: 15 },
      },
      {
        id: 'quality-201',
        title: 'Quality Excellence',
        description: 'Master quality standards and consistency',
        category: 'skill',
        difficulty: 'advanced',
        duration: 90,
        prerequisites: ['comm-101'],
        learningObjectives: ['Quality standards', 'Attention to detail', 'Consistency'],
        estimatedImprovement: { metric: 'quality', expectedIncrease: 20 },
      },
      // Add more modules...
    ];
  }

  private calculatePriority(
    gap: string,
    currentLevel: PersonalizedTrainingPlan['currentLevel'],
    module: TrainingModule
  ): 'critical' | 'high' | 'medium' | 'low' {
    const skillLevel = currentLevel.skills[gap] || 0;
    if (skillLevel < 50) return 'critical';
    if (skillLevel < 70) return 'high';
    if (skillLevel < 80) return 'medium';
    return 'low';
  }

  private generateReason(
    gap: string,
    currentLevel: PersonalizedTrainingPlan['currentLevel'],
    module: TrainingModule
  ): string {
    const skillLevel = currentLevel.skills[gap] || 0;
    return `Current ${gap} level is ${skillLevel.toFixed(0)}/100. This module addresses the gap and is expected to improve ${gap} by ${module.estimatedImprovement.expectedIncrease}%.`;
  }

  private calculateExpectedImpact(
    module: TrainingModule,
    currentLevel: PersonalizedTrainingPlan['currentLevel']
  ): string {
    const metric = module.estimatedImprovement.metric;
    const current = currentLevel.skills[metric] || 0;
    const expected = Math.min(100, current + module.estimatedImprovement.expectedIncrease);
    return `Expected to improve ${metric} from ${current.toFixed(0)}/100 to ${expected.toFixed(0)}/100`;
  }

  private calculateAIConfidence(
    gap: string,
    currentLevel: PersonalizedTrainingPlan['currentLevel'],
    evaluations: any[]
  ): number {
    // More evaluations = higher confidence
    const dataPoints = evaluations.length;
    const baseConfidence = Math.min(90, 50 + (dataPoints * 5));
    
    // If gap is clearly identified, higher confidence
    const skillLevel = currentLevel.skills[gap] || 0;
    if (skillLevel < 60) return Math.min(100, baseConfidence + 10);
    
    return baseConfidence;
  }

  private estimateCompletion(module: TrainingModule): string {
    const days = Math.ceil(module.duration / 60); // Assume 1 hour per day
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + days);
    return completionDate.toISOString().split('T')[0];
  }

  private inferLearningStyle(evaluations: any[], progressChart: any): string {
    // Analyze patterns to infer learning style
    const hasHandsOn = evaluations.some(e => e.roleSpecific.roleCode.includes('chef') || e.roleSpecific.roleCode.includes('cook'));
    const hasService = evaluations.some(e => e.roleSpecific.roleCode.includes('server'));
    
    if (hasHandsOn && hasService) {
      return 'Versatile learner - benefits from both hands-on practice and interactive scenarios';
    } else if (hasHandsOn) {
      return 'Hands-on learner - learns best through practice and demonstration';
    } else {
      return 'Interactive learner - benefits from role-playing and real-world scenarios';
    }
  }

  private determineBestApproach(evaluations: any[], progressChart: any): string {
    const trends = progressChart.trends;
    const improvingCount = Object.values(trends).filter(t => t === 'improving').length;
    
    if (improvingCount >= 4) {
      return 'Self-paced learning with periodic check-ins';
    } else if (improvingCount >= 2) {
      return 'Structured learning with mentor support';
    } else {
      return 'One-on-one coaching recommended for personalized attention';
    }
  }

  private identifyMotivationFactors(evaluations: any[]): string[] {
    const factors: string[] = [];
    
    // Analyze strengths to identify what motivates
    const strengths = new Set<string>();
    evaluations.forEach(e => e.strengths?.forEach((s: string) => strengths.add(s)));
    
    if (strengths.has('Teamwork') || strengths.has('Collaboration')) {
      factors.push('Team recognition and collaboration');
    }
    if (strengths.has('Quality') || strengths.has('Attention to detail')) {
      factors.push('Quality achievement and excellence');
    }
    if (strengths.has('Leadership') || strengths.has('Initiative')) {
      factors.push('Growth opportunities and advancement');
    }
    
    return factors.length > 0 ? factors : ['Performance improvement and skill development'];
  }

  private identifyChallenges(evaluations: any[], progressChart: any): string[] {
    const challenges: string[] = [];
    
    const decliningMetrics = Object.entries(progressChart.trends)
      .filter(([_, trend]) => trend === 'declining')
      .map(([metric]) => metric);
    
    if (decliningMetrics.length > 0) {
      challenges.push(`Struggling with: ${decliningMetrics.join(', ')}`);
    }
    
    const gaps = progressChart.trajectory.currentLevel < 70
      ? ['Overall performance below target']
      : [];
    challenges.push(...gaps);
    
    return challenges.length > 0 ? challenges : ['No significant challenges identified'];
  }

  private async measureTrainingImpact(
    employeeId: string,
    moduleId: string,
    progress: TrainingProgress
  ): Promise<void> {
    // In production, compare pre-training vs post-training performance
    // For now, log the completion
    logger.info(`[TrainingRecommender] Training impact measured for ${employeeId}, module ${moduleId}`);
  }
}

export const personalizedTrainingRecommender = new PersonalizedTrainingRecommender();
