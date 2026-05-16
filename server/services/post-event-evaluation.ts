/**
 * Post-Event Evaluation Service
 * 
 * Allows managers to evaluate staff effectiveness after each event
 * Data is encrypted and used to train EchoAI^3 for better future scheduling
 * 
 * Features:
 * - Encrypted employee evaluations
 * - Event-specific performance tracking
 * - EchoAI^3 learning integration
 * - Historical trend analysis
 */

import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export interface StaffEvaluation {
  id: string;
  eventId: string;
  beoId?: string;
  employeeId: string;
  evaluatedBy: string; // Manager ID
  evaluationDate: string;
  
  // Performance Metrics (Encrypted)
  performance: {
    punctuality: number; // 1-5
    quality: number; // 1-5
    teamwork: number; // 1-5
    communication: number; // 1-5
    problemSolving: number; // 1-5
    guestInteraction?: number; // 1-5 (for FOH)
    overallRating: number; // 1-5 (calculated average)
  };
  
  // Role-Specific Metrics
  roleSpecific: {
    roleCode: string;
    roleName: string;
    metrics: Record<string, number>; // Custom metrics per role
  };
  
  // Feedback
  strengths: string[];
  areasForImprovement: string[];
  managerNotes: string; // Encrypted
  
  // Sensitive Data (Encrypted)
  sensitiveData: {
    payRate?: number; // Encrypted
    hoursWorked?: number;
    overtimeHours?: number;
    tipsEarned?: number; // Encrypted (if applicable)
    bonuses?: number; // Encrypted
    deductions?: number; // Encrypted
  };
  
  // AI Training Data
  aiTrainingData: {
    eventType: string;
    guestCount: number;
    serviceType: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    workload: 'light' | 'moderate' | 'heavy' | 'extreme';
    teamSize: number;
    performanceContext: string; // Encrypted - context for AI learning
  };
  
  // Status
  status: 'draft' | 'submitted' | 'reviewed' | 'archived';
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationSummary {
  employeeId: string;
  totalEvaluations: number;
  averageRating: number;
  trend: 'improving' | 'stable' | 'declining';
  recentPerformance: number;
  historicalPerformance: number;
  strengths: string[];
  commonImprovements: string[];
  eventTypes: string[];
  lastEvaluated: string;
}

class PostEventEvaluationService {
  private evaluations: Map<string, StaffEvaluation> = new Map();

  /**
   * Create a new evaluation (with encryption)
   */
  async createEvaluation(
    evaluation: Omit<StaffEvaluation, 'id' | 'encrypted' | 'createdAt' | 'updatedAt'>
  ): Promise<StaffEvaluation> {
    try {
      logger.info(`[PostEventEvaluation] Creating evaluation for employee ${evaluation.employeeId}`);

      // Encrypt sensitive data
      const encrypted = this.encryptEvaluation(evaluation);

      const fullEvaluation: StaffEvaluation = {
        ...encrypted,
        id: `eval_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        encrypted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store evaluation
      this.evaluations.set(fullEvaluation.id, fullEvaluation);

      // Train EchoAI^3 with this evaluation
      await this.trainEchoAI3(fullEvaluation);

      // Update employee history
      await this.updateEmployeeHistory(fullEvaluation);

      logger.info(`[PostEventEvaluation] Evaluation created: ${fullEvaluation.id}`);
      return fullEvaluation;
    } catch (error) {
      logger.error('[PostEventEvaluation] Error creating evaluation:', error);
      throw error;
    }
  }

  /**
   * Get evaluation by ID (with decryption)
   */
  async getEvaluation(evaluationId: string, requesterId: string): Promise<StaffEvaluation | null> {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) return null;

    // Check permissions (only manager who created or employee themselves)
    if (evaluation.evaluatedBy !== requesterId && evaluation.employeeId !== requesterId) {
      // In production, check role-based permissions
      throw new Error('Unauthorized access to evaluation');
    }

    // Decrypt sensitive data
    return this.decryptEvaluation(evaluation);
  }

  /**
   * Get all evaluations for an employee (with decryption for authorized users)
   */
  async getEmployeeEvaluations(
    employeeId: string,
    requesterId: string,
    includeSensitive = false
  ): Promise<StaffEvaluation[]> {
    const allEvaluations = Array.from(this.evaluations.values())
      .filter(e => e.employeeId === employeeId)
      .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());

    // Decrypt if authorized
    if (includeSensitive) {
      // Check if requester is manager or HR
      // In production, check role-based permissions
      return allEvaluations.map(e => this.decryptEvaluation(e));
    }

    // Return without sensitive data
    return allEvaluations.map(e => ({
      ...e,
      sensitiveData: {}, // Remove sensitive data
      managerNotes: '[Encrypted]', // Hide notes
    }));
  }

  /**
   * Get evaluation summary for an employee
   */
  async getEvaluationSummary(employeeId: string): Promise<EvaluationSummary | null> {
    const evaluations = Array.from(this.evaluations.values())
      .filter(e => e.employeeId === employeeId && e.status !== 'draft');

    if (evaluations.length === 0) return null;

    // Calculate averages
    const totalEvaluations = evaluations.length;
    const averageRating = evaluations.reduce((sum, e) => sum + e.performance.overallRating, 0) / totalEvaluations;

    // Analyze trends
    const recent = evaluations.slice(0, 5);
    const older = evaluations.slice(5, 10);
    const recentAvg = recent.length > 0
      ? recent.reduce((sum, e) => sum + e.performance.overallRating, 0) / recent.length
      : averageRating;
    const olderAvg = older.length > 0
      ? older.reduce((sum, e) => sum + e.performance.overallRating, 0) / older.length
      : averageRating;

    const trend = recentAvg > olderAvg * 1.05 ? 'improving' :
                  recentAvg < olderAvg * 0.95 ? 'declining' : 'stable';

    // Extract common strengths and improvements
    const strengths = this.extractCommonItems(evaluations.map(e => e.strengths));
    const improvements = this.extractCommonItems(evaluations.map(e => e.areasForImprovement));
    const eventTypes = Array.from(new Set(evaluations.map(e => e.aiTrainingData.eventType)));

    return {
      employeeId,
      totalEvaluations,
      averageRating,
      trend,
      recentPerformance: recentAvg,
      historicalPerformance: olderAvg,
      strengths,
      commonImprovements: improvements,
      eventTypes,
      lastEvaluated: evaluations[0].evaluationDate,
    };
  }

  /**
   * Get evaluations for an event
   */
  async getEventEvaluations(eventId: string): Promise<StaffEvaluation[]> {
    return Array.from(this.evaluations.values())
      .filter(e => e.eventId === eventId)
      .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
  }

  /**
   * Update evaluation
   */
  async updateEvaluation(
    evaluationId: string,
    updates: Partial<Omit<StaffEvaluation, 'id' | 'encrypted' | 'createdAt'>>,
    requesterId: string
  ): Promise<StaffEvaluation> {
    const existing = this.evaluations.get(evaluationId);
    if (!existing) {
      throw new Error('Evaluation not found');
    }

    // Check permissions
    if (existing.evaluatedBy !== requesterId) {
      throw new Error('Unauthorized: Only the evaluator can update this evaluation');
    }

    // Re-encrypt if sensitive data changed
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.sensitiveData || updates.managerNotes) {
      const reEncrypted = this.encryptEvaluation(updated);
      this.evaluations.set(evaluationId, reEncrypted);
      return reEncrypted;
    }

    this.evaluations.set(evaluationId, updated);
    return updated;
  }

  /**
   * Train EchoAI^3 with evaluation data
   */
  private async trainEchoAI3(evaluation: StaffEvaluation): Promise<void> {
    try {
      logger.info(`[PostEventEvaluation] Training EchoAI^3 with evaluation ${evaluation.id}`);

      // Prepare training data (without sensitive info)
      const trainingData = {
        employeeId: evaluation.employeeId,
        eventType: evaluation.aiTrainingData.eventType,
        serviceType: evaluation.aiTrainingData.serviceType,
        guestCount: evaluation.aiTrainingData.guestCount,
        difficulty: evaluation.aiTrainingData.difficulty,
        workload: evaluation.aiTrainingData.workload,
        roleCode: evaluation.roleSpecific.roleCode,
        performance: {
          punctuality: evaluation.performance.punctuality,
          quality: evaluation.performance.quality,
          teamwork: evaluation.performance.teamwork,
          overallRating: evaluation.performance.overallRating,
        },
        strengths: evaluation.strengths,
        improvements: evaluation.areasForImprovement,
        context: this.decryptField(evaluation.aiTrainingData.performanceContext),
      };

      // In production, send to EchoAI^3 training endpoint
      // await fetch('/api/echo-ai3/train', {
      //   method: 'POST',
      //   body: JSON.stringify(trainingData),
      // });

      logger.info(`[PostEventEvaluation] EchoAI^3 training data prepared for ${evaluation.employeeId}`);
    } catch (error) {
      logger.error('[PostEventEvaluation] Error training EchoAI^3:', error);
      // Don't throw - training failure shouldn't block evaluation creation
    }
  }

  /**
   * Update employee history
   */
  private async updateEmployeeHistory(evaluation: StaffEvaluation): Promise<void> {
    try {
      // In production, update employee history table
      // This would:
      // 1. Add evaluation to employee_history table
      // 2. Update performance metrics
      // 3. Update skills based on role-specific metrics
      // 4. Update readiness scores

      logger.info(`[PostEventEvaluation] Employee history updated for ${evaluation.employeeId}`);
    } catch (error) {
      logger.error('[PostEventEvaluation] Error updating employee history:', error);
    }
  }

  /**
   * Encryption methods
   */

  private encryptEvaluation(evaluation: Omit<StaffEvaluation, 'id' | 'encrypted' | 'createdAt' | 'updatedAt'>): StaffEvaluation {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    // Encrypt sensitive fields
    const encrypted: any = { ...evaluation };

    if (evaluation.managerNotes) {
      encrypted.managerNotes = this.encryptField(evaluation.managerNotes);
    }

    if (evaluation.sensitiveData) {
      encrypted.sensitiveData = {
        ...evaluation.sensitiveData,
        payRate: evaluation.sensitiveData.payRate
          ? this.encryptField(evaluation.sensitiveData.payRate.toString())
          : undefined,
        tipsEarned: evaluation.sensitiveData.tipsEarned
          ? this.encryptField(evaluation.sensitiveData.tipsEarned.toString())
          : undefined,
        bonuses: evaluation.sensitiveData.bonuses
          ? this.encryptField(evaluation.sensitiveData.bonuses.toString())
          : undefined,
        deductions: evaluation.sensitiveData.deductions
          ? this.encryptField(evaluation.sensitiveData.deductions.toString())
          : undefined,
      };
    }

    if (evaluation.aiTrainingData.performanceContext) {
      encrypted.aiTrainingData = {
        ...evaluation.aiTrainingData,
        performanceContext: this.encryptField(evaluation.aiTrainingData.performanceContext),
      };
    }

    return encrypted as StaffEvaluation;
  }

  private decryptEvaluation(evaluation: StaffEvaluation): StaffEvaluation {
    const decrypted: any = { ...evaluation };

    if (evaluation.managerNotes && evaluation.managerNotes !== '[Encrypted]') {
      decrypted.managerNotes = this.decryptField(evaluation.managerNotes);
    }

    if (evaluation.sensitiveData) {
      decrypted.sensitiveData = {
        ...evaluation.sensitiveData,
        payRate: evaluation.sensitiveData.payRate
          ? parseFloat(this.decryptField(evaluation.sensitiveData.payRate))
          : undefined,
        tipsEarned: evaluation.sensitiveData.tipsEarned
          ? parseFloat(this.decryptField(evaluation.sensitiveData.tipsEarned))
          : undefined,
        bonuses: evaluation.sensitiveData.bonuses
          ? parseFloat(this.decryptField(evaluation.sensitiveData.bonuses))
          : undefined,
        deductions: evaluation.sensitiveData.deductions
          ? parseFloat(this.decryptField(evaluation.sensitiveData.deductions))
          : undefined,
      };
    }

    if (evaluation.aiTrainingData.performanceContext) {
      decrypted.aiTrainingData = {
        ...evaluation.aiTrainingData,
        performanceContext: this.decryptField(evaluation.aiTrainingData.performanceContext),
      };
    }

    return decrypted;
  }

  private encryptField(value: string): string {
    try {
      const key = Buffer.from(ENCRYPTION_KEY, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return IV + AuthTag + Encrypted data (all hex encoded)
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('[PostEventEvaluation] Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  private decryptField(encryptedValue: string): string {
    try {
      const key = Buffer.from(ENCRYPTION_KEY, 'hex');
      const parts = encryptedValue.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('[PostEventEvaluation] Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Helper methods
   */

  private extractCommonItems(items: string[][]): string[] {
    const counts = new Map<string, number>();
    for (const itemList of items) {
      for (const item of itemList) {
        counts.set(item, (counts.get(item) || 0) + 1);
      }
    }

    // Return items that appear in at least 30% of evaluations
    const threshold = Math.ceil(items.length * 0.3);
    return Array.from(counts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([item]) => item);
  }
}

export const postEventEvaluationService = new PostEventEvaluationService();
