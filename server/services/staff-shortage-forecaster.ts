/**
 * Staff Shortage Forecaster
 * 
 * Forecasts staff shortages weeks/months in advance
 * Proposes job share postings and other solutions
 * 
 * Features:
 * - Multi-week forecasting
 * - Role-specific shortage prediction
 - Job share recommendations
 * - Proactive staffing solutions
 */

import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';
import { beoREOStaffingAnalyzer } from './beo-reo-staffing-analyzer.js';

export interface ShortageForecast {
  forecastId: string;
  forecastDate: string; // Date of forecast
  forecastPeriod: {
    start: string;
    end: string;
  };
  shortages: Array<{
    date: string;
    role: string;
    roleName: string;
    needed: number;
    available: number;
    shortage: number;
    confidence: number; // 0-100
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendedActions: string[];
    jobShareOpportunities: number;
  }>;
  summary: {
    totalShortageDays: number;
    criticalShortages: number;
    highShortages: number;
    totalJobShareOpportunities: number;
    estimatedCost: number;
  };
  recommendations: Array<{
    type: 'job_share' | 'hiring' | 'cross_training' | 'overtime' | 'agency';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedRoles: string[];
    estimatedCost?: number;
    timeline: string;
  }>;
}

export interface JobShareOpportunity {
  id: string;
  date: string;
  role: string;
  roleName: string;
  shiftStart: string;
  shiftEnd: string;
  duration: number; // hours (2-4 hours)
  guestCount: number;
  eventType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'posted' | 'filled' | 'cancelled';
  postedAt?: string;
  filledBy?: string;
  chefApproved: boolean;
  chefApprovedBy?: string;
  chefApprovedAt?: string;
}

class StaffShortageForecaster {
  /**
   * Forecast shortages for a future period
   */
  async forecastShortages(
    startDate: string,
    endDate: string,
    orgId: string,
    lookAheadWeeks: number = 4
  ): Promise<ShortageForecast> {
    try {
      logger.info(`[ShortageForecaster] Forecasting shortages from ${startDate} to ${endDate}`);

      const forecastId = `forecast_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const shortages: ShortageForecast['shortages'] = [];

      // Get all BEOs for the period
      const beos = await this.fetchBEOsForPeriod(startDate, endDate, orgId);

      // Group by date and analyze staffing needs
      const needsByDate = new Map<string, Map<string, number>>();
      for (const beo of beos) {
        const date = beo.eventDate.split('T')[0];
        const analysis = await this.analyzeBEOStaffing(beo.eventId, beo.beoId, orgId);

        if (!needsByDate.has(date)) {
          needsByDate.set(date, new Map());
        }

        const dateNeeds = needsByDate.get(date)!;
        for (const need of analysis.staffingNeeds) {
          const existing = dateNeeds.get(need.roleCode) || 0;
          dateNeeds.set(need.roleCode, existing + need.count);
        }
      }

      // Check availability and identify shortages
      for (const [date, roleNeeds] of needsByDate.entries()) {
        for (const [roleCode, needed] of roleNeeds.entries()) {
          const available = await this.getAvailableStaffCount(date, roleCode, orgId);
          const shortage = needed - available;

          if (shortage > 0) {
            const confidence = this.calculateConfidence(date, roleCode, orgId);
            const severity = this.calculateSeverity(shortage, needed);
            const roleName = await this.getRoleName(roleCode);

            shortages.push({
              date,
              role: roleCode,
              roleName,
              needed,
              available,
              shortage,
              confidence,
              severity,
              recommendedActions: this.generateRecommendations(shortage, roleCode, date),
              jobShareOpportunities: this.calculateJobShareOpportunities(shortage, roleCode),
            });
          }
        }
      }

      // Generate summary
      const summary = this.generateSummary(shortages);

      // Generate recommendations
      const recommendations = this.generateForecastRecommendations(shortages, orgId);

      return {
        forecastId,
        forecastDate: new Date().toISOString(),
        forecastPeriod: { start: startDate, end: endDate },
        shortages,
        summary,
        recommendations,
      };
    } catch (error) {
      logger.error('[ShortageForecaster] Error forecasting shortages:', error);
      throw error;
    }
  }

  /**
   * Generate job share opportunities from forecast
   */
  async generateJobShareOpportunities(
    forecast: ShortageForecast,
    orgId: string
  ): Promise<JobShareOpportunity[]> {
    const opportunities: JobShareOpportunity[] = [];

    // Group shortages by date and role
    const byDateRole = new Map<string, ShortageForecast['shortages'][0][]>();
    for (const shortage of forecast.shortages) {
      const key = `${shortage.date}_${shortage.role}`;
      const existing = byDateRole.get(key) || [];
      existing.push(shortage);
      byDateRole.set(key, existing);
    }

    // Create job share opportunities for peak times
    for (const [key, shortages] of byDateRole.entries()) {
      const [date, role] = key.split('_');
      const totalShortage = shortages.reduce((sum, s) => sum + s.shortage, 0);

      if (totalShortage > 0) {
        // Determine peak times (typically lunch 11am-2pm, dinner 5pm-9pm)
        const peakTimes = this.identifyPeakTimes(date, role, orgId);

        for (const peakTime of peakTimes) {
          opportunities.push({
            id: `jobshare_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
            date,
            role,
            roleName: shortages[0].roleName,
            shiftStart: peakTime.start,
            shiftEnd: peakTime.end,
            duration: peakTime.duration,
            guestCount: peakTime.estimatedGuestCount,
            eventType: peakTime.eventType || 'outlet_service',
            priority: this.calculatePriority(totalShortage),
            status: 'draft',
            chefApproved: false,
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Propose job share to Chef
   */
  async proposeJobShareToChef(
    opportunity: JobShareOpportunity,
    orgId: string,
    chefId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`[ShortageForecaster] Proposing job share ${opportunity.id} to chef ${chefId}`);

      // In production, send notification to chef
      // For now, mark as proposed
      opportunity.status = 'posted';
      opportunity.postedAt = new Date().toISOString();

      return {
        success: true,
        message: `Job share opportunity posted for ${opportunity.roleName} on ${opportunity.date}`,
      };
    } catch (error) {
      logger.error('[ShortageForecaster] Error proposing job share:', error);
      return {
        success: false,
        message: `Failed to propose job share: ${error}`,
      };
    }
  }

  /**
   * Identify peak times for a date and role
   */
  private identifyPeakTimes(
    date: string,
    role: string,
    orgId: string
  ): Array<{ start: string; end: string; duration: number; estimatedGuestCount: number; eventType?: string }> {
    // In production, analyze historical data and BEOs
    // For now, return standard peak times
    const peakTimes: Array<{ start: string; end: string; duration: number; estimatedGuestCount: number; eventType?: string }> = [];

    // Lunch peak: 11am-2pm (3 hours, but job share could be 2-4 hours)
    const lunchStart = new Date(date);
    lunchStart.setHours(11, 0, 0, 0);
    const lunchEnd = new Date(date);
    lunchEnd.setHours(14, 0, 0, 0);

    peakTimes.push({
      start: lunchStart.toISOString(),
      end: lunchEnd.toISOString(),
      duration: 3,
      estimatedGuestCount: 150, // Estimate based on outlet capacity
      eventType: 'outlet_lunch',
    });

    // Dinner peak: 5pm-9pm (4 hours)
    const dinnerStart = new Date(date);
    dinnerStart.setHours(17, 0, 0, 0);
    const dinnerEnd = new Date(date);
    dinnerEnd.setHours(21, 0, 0, 0);

    peakTimes.push({
      start: dinnerStart.toISOString(),
      end: dinnerEnd.toISOString(),
      duration: 4,
      estimatedGuestCount: 200,
      eventType: 'outlet_dinner',
    });

    return peakTimes;
  }

  /**
   * Helper methods
   */

  private async fetchBEOsForPeriod(startDate: string, endDate: string, orgId: string): Promise<any[]> {
    // In production, query database
    return [];
  }

  private async analyzeBEOStaffing(eventId: string, beoId: string, orgId: string): Promise<any> {
    // In production, use beoREOStaffingAnalyzer
    return { staffingNeeds: [] };
  }

  private async getAvailableStaffCount(date: string, roleCode: string, orgId: string): Promise<number> {
    // In production, query available staff
    return 0;
  }

  private calculateConfidence(date: string, roleCode: string, orgId: string): number {
    // In production, calculate based on historical data accuracy
    return 85; // Default confidence
  }

  private calculateSeverity(shortage: number, needed: number): 'critical' | 'high' | 'medium' | 'low' {
    const percentage = (shortage / needed) * 100;
    if (percentage >= 50) return 'critical';
    if (percentage >= 30) return 'high';
    if (percentage >= 15) return 'medium';
    return 'low';
  }

  private async getRoleName(roleCode: string): Promise<string> {
    // In production, query role names
    const roleMap: Record<string, string> = {
      'banquet_server': 'Banquet Server',
      'service_captain': 'Service Captain',
      'food_runner': 'Food Runner',
      'prep_chef': 'Prep Chef',
      'line_cook': 'Line Cook',
    };
    return roleMap[roleCode] || roleCode;
  }

  private generateRecommendations(shortage: number, roleCode: string, date: string): string[] {
    const recommendations: string[] = [];

    if (shortage <= 2) {
      recommendations.push(`Post 1-2 job share positions for ${date}`);
      recommendations.push('Offer overtime to existing staff');
    } else if (shortage <= 5) {
      recommendations.push(`Post 2-3 job share positions for ${date}`);
      recommendations.push('Contact staffing agency');
      recommendations.push('Consider cross-training');
    } else {
      recommendations.push(`CRITICAL: Post 3+ job share positions for ${date}`);
      recommendations.push('Contact staffing agency immediately');
      recommendations.push('Consider postponing non-critical events');
    }

    return recommendations;
  }

  private calculateJobShareOpportunities(shortage: number, roleCode: string): number {
    // Each job share can cover 1-2 positions (2-4 hour shifts)
    return Math.ceil(shortage / 1.5);
  }

  private generateSummary(shortages: ShortageForecast['shortages']): ShortageForecast['summary'] {
    const totalShortageDays = new Set(shortages.map(s => s.date)).size;
    const criticalShortages = shortages.filter(s => s.severity === 'critical').length;
    const highShortages = shortages.filter(s => s.severity === 'high').length;
    const totalJobShareOpportunities = shortages.reduce((sum, s) => sum + s.jobShareOpportunities, 0);
    const estimatedCost = totalJobShareOpportunities * 25 * 3; // $25/hr * 3 hours average

    return {
      totalShortageDays,
      criticalShortages,
      highShortages,
      totalJobShareOpportunities,
      estimatedCost,
    };
  }

  private generateForecastRecommendations(
    shortages: ShortageForecast['shortages'],
    orgId: string
  ): ShortageForecast['recommendations'] {
    const recommendations: ShortageForecast['recommendations'] = [];

    // Group by role
    const byRole = new Map<string, ShortageForecast['shortages'][0]>();
    for (const shortage of shortages) {
      const existing = byRole.get(shortage.role);
      if (!existing || shortage.shortage > existing.shortage) {
        byRole.set(shortage.role, shortage);
      }
    }

    // Generate recommendations
    for (const [role, shortage] of byRole.entries()) {
      if (shortage.severity === 'critical' || shortage.severity === 'high') {
        recommendations.push({
          type: 'job_share',
          priority: shortage.severity,
          description: `Post ${shortage.jobShareOpportunities} job share positions for ${shortage.roleName}`,
          affectedRoles: [role],
          estimatedCost: shortage.jobShareOpportunities * 25 * 3,
          timeline: 'Immediate',
        });
      }
    }

    return recommendations;
  }

  private calculatePriority(shortage: number): 'critical' | 'high' | 'medium' | 'low' {
    if (shortage >= 5) return 'critical';
    if (shortage >= 3) return 'high';
    if (shortage >= 1) return 'medium';
    return 'low';
  }
}

export const staffShortageForecaster = new StaffShortageForecaster();
