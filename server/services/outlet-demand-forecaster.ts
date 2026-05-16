/**
 * Outlet Demand Forecaster
 * 
 * Forecasts guest counts and peak times for outlets/restaurants
 * Identifies job share opportunities for peak periods
 * 
 * Features:
 * - Historical data analysis
 * - Peak time identification
 * - Guest count forecasting
 * - Job share recommendations
 */

import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';
import type { JobShareOpportunity } from './staff-shortage-forecaster.js';

export interface OutletDemandForecast {
  outletId: string;
  outletName: string;
  forecastDate: string;
  forecastPeriod: {
    start: string;
    end: string;
  };
  dailyForecasts: Array<{
    date: string;
    dayOfWeek: string;
    expectedGuestCount: number;
    confidence: number;
    peakPeriods: Array<{
      period: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
      startTime: string;
      endTime: string;
      expectedGuestCount: number;
      peakIntensity: 'low' | 'medium' | 'high' | 'extreme';
      staffNeeded: number;
      currentStaff: number;
      shortage: number;
      jobShareOpportunities: number;
    }>;
    totalStaffNeeded: number;
    currentStaff: number;
    totalShortage: number;
  }>;
  summary: {
    totalExpectedGuests: number;
    averageDailyGuests: number;
    peakDays: number;
    totalJobShareOpportunities: number;
    estimatedRevenue: number;
  };
  recommendations: Array<{
    date: string;
    period: string;
    action: 'job_share' | 'overtime' | 'cross_train' | 'hire';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    estimatedCost: number;
  }>;
}

export interface HistoricalDataPoint {
  date: string;
  dayOfWeek: string;
  guestCount: number;
  weather?: string;
  holiday?: boolean;
  specialEvent?: boolean;
  peakPeriods: Array<{
    period: string;
    guestCount: number;
    startTime: string;
    endTime: string;
  }>;
}

class OutletDemandForecaster {
  /**
   * Forecast demand for an outlet
   */
  async forecastOutletDemand(
    outletId: string,
    startDate: string,
    endDate: string,
    orgId: string,
    lookBackDays: number = 90
  ): Promise<OutletDemandForecast> {
    try {
      logger.info(`[OutletDemandForecaster] Forecasting demand for outlet ${outletId} from ${startDate} to ${endDate}`);

      // Fetch historical data
      const historicalData = await this.fetchHistoricalData(
        outletId,
        startDate,
        lookBackDays,
        orgId
      );

      // Generate daily forecasts
      const dailyForecasts: OutletDemandForecast['dailyForecasts'] = [];
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

        // Forecast guest count
        const expectedGuestCount = this.forecastGuestCount(
          dateStr,
          dayOfWeek,
          historicalData,
          outletId
        );

        // Identify peak periods
        const peakPeriods = await this.identifyPeakPeriods(
          dateStr,
          dayOfWeek,
          historicalData,
          outletId,
          expectedGuestCount
        );

        // Calculate staffing needs
        const totalStaffNeeded = this.calculateStaffNeeded(expectedGuestCount, peakPeriods);
        const currentStaff = await this.getCurrentStaffCount(outletId, dateStr, orgId);
        const totalShortage = Math.max(0, totalStaffNeeded - currentStaff);

        dailyForecasts.push({
          date: dateStr,
          dayOfWeek,
          expectedGuestCount,
          confidence: this.calculateConfidence(historicalData.length, dateStr),
          peakPeriods,
          totalStaffNeeded,
          currentStaff,
          totalShortage,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Generate summary
      const summary = this.generateSummary(dailyForecasts, outletId);

      // Generate recommendations
      const recommendations = this.generateRecommendations(dailyForecasts, outletId);

      return {
        outletId,
        outletName: await this.getOutletName(outletId, orgId),
        forecastDate: new Date().toISOString(),
        forecastPeriod: { start: startDate, end: endDate },
        dailyForecasts,
        summary,
        recommendations,
      };
    } catch (error) {
      logger.error('[OutletDemandForecaster] Error forecasting demand:', error);
      throw error;
    }
  }

  /**
   * Generate job share opportunities from outlet forecast
   */
  async generateJobShareOpportunities(
    forecast: OutletDemandForecast
  ): Promise<JobShareOpportunity[]> {
    const opportunities: JobShareOpportunity[] = [];

    for (const daily of forecast.dailyForecasts) {
      for (const peak of daily.peakPeriods) {
        if (peak.shortage > 0 && peak.peakIntensity === 'high' || peak.peakIntensity === 'extreme') {
          // Create 2-4 hour job share opportunities
          const duration = peak.peakIntensity === 'extreme' ? 4 : 2;

          opportunities.push({
            id: `jobshare_outlet_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
            date: daily.date,
            role: this.getRoleForPeriod(peak.period),
            roleName: this.getRoleNameForPeriod(peak.period),
            shiftStart: peak.startTime,
            shiftEnd: peak.endTime,
            duration,
            guestCount: peak.expectedGuestCount,
            eventType: `outlet_${peak.period}`,
            priority: peak.peakIntensity === 'extreme' ? 'critical' : 'high',
            status: 'draft',
            chefApproved: false,
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Forecast guest count for a specific date
   */
  private forecastGuestCount(
    date: string,
    dayOfWeek: string,
    historicalData: HistoricalDataPoint[],
    outletId: string
  ): number {
    // Filter historical data for same day of week
    const sameDayData = historicalData.filter(d => d.dayOfWeek === dayOfWeek);

    if (sameDayData.length === 0) {
      // Fallback to average of all data
      const avg = historicalData.reduce((sum, d) => sum + d.guestCount, 0) / historicalData.length;
      return Math.round(avg);
    }

    // Calculate weighted average (more recent data weighted higher)
    let totalWeight = 0;
    let weightedSum = 0;

    for (let i = 0; i < sameDayData.length; i++) {
      const weight = 1 / (sameDayData.length - i); // More recent = higher weight
      weightedSum += sameDayData[i].guestCount * weight;
      totalWeight += weight;
    }

    const baseForecast = weightedSum / totalWeight;

    // Adjust for holidays, weather, etc.
    const adjustments = this.calculateAdjustments(date, historicalData);

    return Math.round(baseForecast * adjustments);
  }

  /**
   * Identify peak periods for a day
   */
  private async identifyPeakPeriods(
    date: string,
    dayOfWeek: string,
    historicalData: HistoricalDataPoint[],
    outletId: string,
    expectedGuestCount: number
  ): Promise<OutletDemandForecast['dailyForecasts'][0]['peakPeriods']> {
    const periods: OutletDemandForecast['dailyForecasts'][0]['peakPeriods'] = [];

    // Standard peak periods
    const standardPeriods = [
      {
        period: 'breakfast' as const,
        startTime: '07:00',
        endTime: '10:00',
        percentage: 0.15, // 15% of daily guests
      },
      {
        period: 'lunch' as const,
        startTime: '11:00',
        endTime: '14:00',
        percentage: 0.35, // 35% of daily guests
      },
      {
        period: 'dinner' as const,
        startTime: '17:00',
        endTime: '21:00',
        percentage: 0.45, // 45% of daily guests
      },
      {
        period: 'late_night' as const,
        startTime: '21:00',
        endTime: '23:00',
        percentage: 0.05, // 5% of daily guests
      },
    ];

    for (const stdPeriod of standardPeriods) {
      const expectedGuests = Math.round(expectedGuestCount * stdPeriod.percentage);
      const peakIntensity = this.calculatePeakIntensity(expectedGuests, outletId);
      const staffNeeded = this.calculatePeriodStaffNeeded(expectedGuests, stdPeriod.period);
      const currentStaff = await this.getCurrentPeriodStaff(outletId, date, stdPeriod.period);
      const shortage = Math.max(0, staffNeeded - currentStaff);

      periods.push({
        period: stdPeriod.period,
        startTime: `${date}T${stdPeriod.startTime}:00`,
        endTime: `${date}T${stdPeriod.endTime}:00`,
        expectedGuestCount: expectedGuests,
        peakIntensity,
        staffNeeded,
        currentStaff,
        shortage,
        jobShareOpportunities: shortage > 0 ? Math.ceil(shortage / 1.5) : 0,
      });
    }

    return periods;
  }

  /**
   * Helper methods
   */

  private async fetchHistoricalData(
    outletId: string,
    endDate: string,
    lookBackDays: number,
    orgId: string
  ): Promise<HistoricalDataPoint[]> {
    // In production, query historical POS/guest count data
    return [];
  }

  private calculateAdjustments(date: string, historicalData: HistoricalDataPoint[]): number {
    // Adjust for holidays, weather, special events
    // In production, use ML model or rules
    return 1.0; // No adjustment
  }

  private calculatePeakIntensity(guestCount: number, outletId: string): 'low' | 'medium' | 'high' | 'extreme' {
    // In production, use outlet capacity
    if (guestCount >= 200) return 'extreme';
    if (guestCount >= 150) return 'high';
    if (guestCount >= 100) return 'medium';
    return 'low';
  }

  private calculatePeriodStaffNeeded(guestCount: number, period: string): number {
    // Different ratios for different periods
    const ratios: Record<string, number> = {
      breakfast: 20, // 1 server per 20 guests
      lunch: 18,
      dinner: 15,
      late_night: 25,
    };

    const ratio = ratios[period] || 18;
    return Math.ceil(guestCount / ratio);
  }

  private async getCurrentPeriodStaff(
    outletId: string,
    date: string,
    period: string
  ): Promise<number> {
    // In production, query scheduled staff
    return 0;
  }

  private calculateStaffNeeded(
    guestCount: number,
    peakPeriods: OutletDemandForecast['dailyForecasts'][0]['peakPeriods']
  ): number {
    // Sum staff needed across all peak periods
    return peakPeriods.reduce((sum, p) => sum + p.staffNeeded, 0);
  }

  private async getCurrentStaffCount(outletId: string, date: string, orgId: string): Promise<number> {
    // In production, query scheduled staff
    return 0;
  }

  private calculateConfidence(dataPoints: number, date: string): number {
    // More historical data = higher confidence
    if (dataPoints >= 60) return 90;
    if (dataPoints >= 30) return 75;
    if (dataPoints >= 14) return 60;
    return 45;
  }

  private generateSummary(
    dailyForecasts: OutletDemandForecast['dailyForecasts'],
    outletId: string
  ): OutletDemandForecast['summary'] {
    const totalExpectedGuests = dailyForecasts.reduce((sum, d) => sum + d.expectedGuestCount, 0);
    const averageDailyGuests = totalExpectedGuests / dailyForecasts.length;
    const peakDays = dailyForecasts.filter(d => d.totalShortage > 0).length;
    const totalJobShareOpportunities = dailyForecasts.reduce(
      (sum, d) => sum + d.peakPeriods.reduce((s, p) => s + p.jobShareOpportunities, 0),
      0
    );
    const estimatedRevenue = totalExpectedGuests * 45; // $45 average per guest

    return {
      totalExpectedGuests,
      averageDailyGuests: Math.round(averageDailyGuests),
      peakDays,
      totalJobShareOpportunities,
      estimatedRevenue,
    };
  }

  private generateRecommendations(
    dailyForecasts: OutletDemandForecast['dailyForecasts'],
    outletId: string
  ): OutletDemandForecast['recommendations'] {
    const recommendations: OutletDemandForecast['recommendations'] = [];

    for (const daily of dailyForecasts) {
      for (const peak of daily.peakPeriods) {
        if (peak.shortage > 0) {
          recommendations.push({
            date: daily.date,
            period: peak.period,
            action: 'job_share',
            priority: peak.peakIntensity === 'extreme' ? 'critical' : peak.peakIntensity === 'high' ? 'high' : 'medium',
            description: `Post ${peak.jobShareOpportunities} job share positions for ${peak.period} on ${daily.date}`,
            estimatedCost: peak.jobShareOpportunities * 25 * 3, // $25/hr * 3 hours
          });
        }
      }
    }

    return recommendations;
  }

  private getRoleForPeriod(period: string): string {
    const roleMap: Record<string, string> = {
      breakfast: 'breakfast_server',
      lunch: 'lunch_server',
      dinner: 'dinner_server',
      late_night: 'server',
    };
    return roleMap[period] || 'server';
  }

  private getRoleNameForPeriod(period: string): string {
    return `${period.charAt(0).toUpperCase() + period.slice(1)} Server`;
  }

  private async getOutletName(outletId: string, orgId: string): Promise<string> {
    // In production, query outlet name
    return 'Main Restaurant';
  }
}

export const outletDemandForecaster = new OutletDemandForecaster();
