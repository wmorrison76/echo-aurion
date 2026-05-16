/**
 * Employee History Service
 * 
 * Manages encrypted employee history with evaluations, performance, and sensitive data
 * Provides secure access with role-based permissions
 */

import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';
import type { StaffEvaluation } from './post-event-evaluation.js';

export interface EmployeeHistoryEntry {
  id: string;
  employeeId: string;
  entryType: 'evaluation' | 'performance_review' | 'training' | 'incident' | 'achievement' | 'promotion';
  eventId?: string;
  date: string;
  title: string;
  description: string; // Encrypted
  data: Record<string, any>; // Encrypted
  createdBy: string;
  encrypted: boolean;
  createdAt: string;
}

export interface EmployeeHistorySummary {
  employeeId: string;
  totalEntries: number;
  evaluations: number;
  performanceReviews: number;
  training: number;
  incidents: number;
  achievements: number;
  promotions: number;
  lastUpdated: string;
  averageRating: number;
  trend: 'improving' | 'stable' | 'declining';
}

class EmployeeHistoryService {
  private history: Map<string, EmployeeHistoryEntry[]> = new Map();

  /**
   * Add evaluation to employee history
   */
  async addEvaluationToHistory(evaluation: StaffEvaluation): Promise<void> {
    try {
      logger.info(`[EmployeeHistory] Adding evaluation ${evaluation.id} to history for ${evaluation.employeeId}`);

      const entry: EmployeeHistoryEntry = {
        id: `history_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        employeeId: evaluation.employeeId,
        entryType: 'evaluation',
        eventId: evaluation.eventId,
        date: evaluation.evaluationDate,
        title: `Event Evaluation - ${evaluation.aiTrainingData.eventType}`,
        description: this.encryptField(
          `Performance rating: ${evaluation.performance.overallRating}/5. ` +
          `Strengths: ${evaluation.strengths.join(', ')}. ` +
          `Areas for improvement: ${evaluation.areasForImprovement.join(', ')}.`
        ),
        data: {
          performance: evaluation.performance,
          roleSpecific: evaluation.roleSpecific,
          strengths: evaluation.strengths,
          improvements: evaluation.areasForImprovement,
          eventContext: evaluation.aiTrainingData,
        },
        createdBy: evaluation.evaluatedBy,
        encrypted: true,
        createdAt: new Date().toISOString(),
      };

      // Encrypt data
      entry.data = this.encryptObject(entry.data);

      // Add to history
      const existing = this.history.get(evaluation.employeeId) || [];
      existing.push(entry);
      this.history.set(evaluation.employeeId, existing);

      logger.info(`[EmployeeHistory] Evaluation added to history`);
    } catch (error) {
      logger.error('[EmployeeHistory] Error adding evaluation:', error);
      throw error;
    }
  }

  /**
   * Get employee history (with decryption for authorized users)
   */
  async getEmployeeHistory(
    employeeId: string,
    requesterId: string,
    includeSensitive = false
  ): Promise<EmployeeHistoryEntry[]> {
    const entries = this.history.get(employeeId) || [];

    // Check permissions
    if (!includeSensitive && employeeId !== requesterId) {
      // Return without sensitive data
      return entries.map(e => ({
        ...e,
        description: '[Encrypted]',
        data: {},
      }));
    }

    // Decrypt for authorized users
    return entries.map(e => ({
      ...e,
      description: this.decryptField(e.description),
      data: this.decryptObject(e.data),
    }));
  }

  /**
   * Get history summary
   */
  async getHistorySummary(employeeId: string): Promise<EmployeeHistorySummary | null> {
    const entries = this.history.get(employeeId) || [];
    if (entries.length === 0) return null;

    const evaluations = entries.filter(e => e.entryType === 'evaluation');
    const performanceReviews = entries.filter(e => e.entryType === 'performance_review');
    const training = entries.filter(e => e.entryType === 'training');
    const incidents = entries.filter(e => e.entryType === 'incident');
    const achievements = entries.filter(e => e.entryType === 'achievement');
    const promotions = entries.filter(e => e.entryType === 'promotion');

    // Calculate average rating from evaluations
    let averageRating = 0;
    if (evaluations.length > 0) {
      // In production, decrypt and calculate from actual ratings
      averageRating = 4.0; // Placeholder
    }

    // Analyze trend
    const recent = entries.slice(0, 5);
    const older = entries.slice(5, 10);
    const trend = recent.length > 0 && older.length > 0 ? 'stable' : 'stable'; // Placeholder

    return {
      employeeId,
      totalEntries: entries.length,
      evaluations: evaluations.length,
      performanceReviews: performanceReviews.length,
      training: training.length,
      incidents: incidents.length,
      achievements: achievements.length,
      promotions: promotions.length,
      lastUpdated: entries[0].createdAt,
      averageRating,
      trend,
    };
  }

  /**
   * Add custom history entry
   */
  async addHistoryEntry(
    employeeId: string,
    entryType: EmployeeHistoryEntry['entryType'],
    title: string,
    description: string,
    data: Record<string, any>,
    createdBy: string
  ): Promise<EmployeeHistoryEntry> {
    const entry: EmployeeHistoryEntry = {
      id: `history_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      employeeId,
      entryType,
      date: new Date().toISOString(),
      title,
      description: this.encryptField(description),
      data: this.encryptObject(data),
      createdBy,
      encrypted: true,
      createdAt: new Date().toISOString(),
    };

    const existing = this.history.get(employeeId) || [];
    existing.push(entry);
    this.history.set(employeeId, existing);

    return entry;
  }

  /**
   * Encryption methods
   */

  private encryptField(value: string): string {
    // Use same encryption as post-event-evaluation
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptField(encryptedValue: string): string {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const parts = encryptedValue.split(':');

    if (parts.length !== 3) return '[Decryption Error]';

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private encryptObject(obj: Record<string, any>): Record<string, any> {
    const encrypted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        encrypted[key] = this.encryptField(value);
      } else if (typeof value === 'object' && value !== null) {
        encrypted[key] = this.encryptObject(value as Record<string, any>);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  private decryptObject(obj: Record<string, any>): Record<string, any> {
    const decrypted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.includes(':')) {
        try {
          decrypted[key] = this.decryptField(value);
        } catch {
          decrypted[key] = value; // Not encrypted or error
        }
      } else if (typeof value === 'object' && value !== null) {
        decrypted[key] = this.decryptObject(value as Record<string, any>);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
}

export const employeeHistoryService = new EmployeeHistoryService();
