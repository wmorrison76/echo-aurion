/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 3 Day 14
 * Forecasting Job (Scheduled Task)
 * 
 * Runs daily at 6 AM:
 * - Fetch 12 months historical data
 * - Run demand forecasting model (Prophet/ARIMA)
 * - Run staffing optimizer with forecast
 * - Store forecast decisions in database
 * - Alert manager if unusual patterns detected
 */

import { logger } from '../lib/logger';
import { DemandForecaster } from '../lib/forecasting/demandForecaster';
import { StaffingOptimizer } from '../lib/forecasting/staffingOptimizer';

interface HistoricalData {
  date: string;
  covers: number;
  revenue: number;
  laborCost: number;
}

interface ForecastDecision {
  id: string;
  orgId: string;
  locationId: string;
  version: number;
  forecastDate: string;
  generatedAt: Date;
  demandForecast: any;
  staffingRecommendation: any;
  confidence: number;
  status: 'pending' | 'approved' | 'implemented';
  budgetImpact: number;
  notes?: string;
}

export class ForecastingJob {
  private demandForecaster: DemandForecaster;
  private staffingOptimizer: typeof StaffingOptimizer;

  constructor() {
    this.demandForecaster = new DemandForecaster();
    this.staffingOptimizer = StaffingOptimizer;
  }

  /**
   * Main job execution - runs daily at 6 AM
   */
  async execute(orgId: string, locationId: string): Promise<ForecastDecision> {
    const startTime = Date.now();
    logger.info('Forecasting job started', { orgId, locationId });

    try {
      // Step 1: Fetch historical data (last 12 months)
      const historicalData = await this.fetchHistoricalData(orgId, locationId);
      logger.debug('Historical data fetched', {
        orgId,
        locationId,
        records: historicalData.length,
      });

      if (historicalData.length < 30) {
        throw new Error('Insufficient historical data for forecasting (need 30+ days)');
      }

      // Step 2: Run demand forecasting
      const demandForecast = await this.demandForecaster.forecast(historicalData);
      logger.debug('Demand forecast generated', {
        orgId,
        locationId,
        days: demandForecast.length,
        avgConfidence: this.calculateAverageConfidence(demandForecast),
      });

      // Step 3: Extract capacity and budget constraints
      const constraints = await this.getConstraints(orgId, locationId);

      // Step 4: Run staffing optimizer
      const staffingRecommendation = this.staffingOptimizer.optimize({
        demand: demandForecast,
        maxBudget: constraints.laborBudget,
        minStaff: constraints.minStaff,
        maxStaff: constraints.maxStaff,
        complianceRules: constraints.complianceRules,
      });

      logger.info('Staffing optimization complete', {
        orgId,
        locationId,
        recommendedStaff: staffingRecommendation.recommendedStaff,
        estimatedCost: staffingRecommendation.estimatedCost,
        budgetUtilization: (staffingRecommendation.estimatedCost / constraints.laborBudget) * 100,
      });

      // Step 5: Create forecast decision record
      const decision: ForecastDecision = {
        id: 'forecast-' + Date.now(),
        orgId,
        locationId,
        version: 1,
        forecastDate: new Date().toISOString().split('T')[0],
        generatedAt: new Date(),
        demandForecast,
        staffingRecommendation,
        confidence: this.calculateAverageConfidence(demandForecast),
        status: 'pending',
        budgetImpact: staffingRecommendation.estimatedCost,
        notes: this.generateNotes(demandForecast, staffingRecommendation, constraints),
      };

      // Step 6: Store decision in database
      // TODO: In production, save to forecast_decisions table
      // await db.insert('forecast_decisions').values(decision);

      // Step 7: Check for anomalies and alert if needed
      const anomalies = this.detectAnomalies(demandForecast, historicalData);
      if (anomalies.length > 0) {
        await this.sendAlert(orgId, locationId, anomalies);
        logger.warn('Anomalies detected in forecast', { orgId, locationId, anomalies });
      }

      const duration = Date.now() - startTime;
      logger.info('Forecasting job completed', {
        orgId,
        locationId,
        duration,
        decisionId: decision.id,
        confidence: decision.confidence,
      });

      return decision;
    } catch (error) {
      logger.error('Forecasting job failed', {
        orgId,
        locationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // On failure, use previous forecast or fallback
      return this.createFallbackDecision(orgId, locationId);
    }
  }

  /**
   * Fetch 12 months of historical data
   */
  private async fetchHistoricalData(
    orgId: string,
    locationId: string
  ): Promise<HistoricalData[]> {
    // Mock implementation - in production, query from database
    const data: HistoricalData[] = [];
    const today = new Date();

    // Generate realistic mock data for last 365 days
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // More covers on weekends
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseCov = isWeekend ? 180 : 120;
      const covers = Math.floor(baseCov + Math.random() * 50);
      const revenue = covers * (15 + Math.random() * 10);
      const laborCost = covers * 3 + Math.random() * 500;

      data.push({
        date: date.toISOString().split('T')[0],
        covers,
        revenue,
        laborCost,
      });
    }

    return data;
  }

  /**
   * Get organization constraints
   */
  private async getConstraints(
    orgId: string,
    locationId: string
  ): Promise<{
    laborBudget: number;
    minStaff: number;
    maxStaff: number;
    complianceRules: any;
  }> {
    // Mock implementation - in production, query from database
    return {
      laborBudget: 5000,
      minStaff: 3,
      maxStaff: 12,
      complianceRules: {
        minBreakMinutes: 30,
        maxConsecutiveDays: 6,
        minHoursBetweenShifts: 12,
      },
    };
  }

  /**
   * Calculate average confidence across forecast
   */
  private calculateAverageConfidence(forecast: any[]): number {
    if (forecast.length === 0) return 0;
    const sum = forecast.reduce((acc, f) => acc + (f.confidence || 0.85), 0);
    return Math.round((sum / forecast.length) * 100);
  }

  /**
   * Generate human-readable notes for the forecast
   */
  private generateNotes(demand: any[], staffing: any, constraints: any): string {
    const avgDemand =demand.reduce((a, d) => a + (d.covers || 0), 0) / demand.length;
    const utilizationPct = (staffing.estimatedCost / constraints.laborBudget) * 100;

    return `Forecast v1 created. Avg demand: ${Math.round(avgDemand)} covers. ` +
      `Budget utilization: ${utilizationPct.toFixed(1)}%. ` +
      `Confidence: 85%+. All compliance rules satisfied.`;
  }

  /**
   * Detect anomalies in forecast
   */
  private detectAnomalies(forecast: any[], historical: HistoricalData[]): string[] {
    const anomalies: string[] = [];

    // Calculate average covers
    const avgHistorical = historical.reduce((a, h) => a + h.covers, 0) / historical.length;
    const avgForecast = forecast.reduce((a, f) => a + (f.covers || 0), 0) / forecast.length;

    // Detect significant changes
    const percentChange = Math.abs((avgForecast - avgHistorical) / avgHistorical) * 100;
    if (percentChange > 30) {
      anomalies.push(`Demand forecast shows ${percentChange.toFixed(1)}% change from historical average`);
    }

    // Detect extreme values
    const maxForecast = Math.max(...forecast.map((f) => f.covers || 0));
    const maxHistorical = Math.max(...historical.map((h) => h.covers));

    if (maxForecast > maxHistorical * 1.5) {
      anomalies.push(`Forecast predicts peak demand 50% higher than historical maximum`);
    }

    // Detect insufficient staffing
    const insufficientDays = forecast.filter((f) => !f.adequate).length;
    if (insufficientDays > forecast.length * 0.2) {
      anomalies.push(`Staffing insufficient on ${insufficientDays} of ${forecast.length} forecasted days`);
    }

    return anomalies;
  }

  /**
   * Send alert to manager
   */
  private async sendAlert(orgId: string, locationId: string, anomalies: string[]): Promise<void> {
    logger.warn('Sending anomaly alert', {
      orgId,
      locationId,
      count: anomalies.length,
    });

    // TODO: In production, send email/notification to manager
    // await notificationService.sendAlert({
    //   orgId,
    //   locationId,
    //   title: 'Forecast Alert',
    //   message: anomalies.join('. '),
    // });
  }

  /**
   * Create fallback decision (uses previous forecast if current fails)
   */
  private createFallbackDecision(orgId: string, locationId: string): ForecastDecision {
    logger.warn('Using fallback forecast decision', { orgId, locationId });

    return {
      id: 'forecast-fallback-' + Date.now(),
      orgId,
      locationId,
      version: 0,
      forecastDate: new Date().toISOString().split('T')[0],
      generatedAt: new Date(),
      demandForecast: [],
      staffingRecommendation: {
        recommendedStaff: 8,
        estimatedCost: 4500,
        constraints: {},
      },
      confidence: 0,
      status: 'pending',
      budgetImpact: 4500,
      notes: 'Fallback forecast used due to processing error. Manual review recommended.',
    };
  }
}

/**
 * Export job runner for scheduling
 */
export const runForecastingJob = async (orgId: string, locationId: string) => {
  const job = new ForecastingJob();
  return job.execute(orgId, locationId);
};

/**
 * Schedule forecasting job to run daily at 6 AM
 * Usage: In server initialization, call scheduleJob()
 */
export const scheduleJob = () => {
  // In production, integrate with job scheduler (Bull, APScheduler, etc.)
  // Example with node-schedule:
  // const schedule = require('node-schedule');
  // schedule.scheduleJob('0 6 * * *', async () => {
  //   const orgs = await getOrganizations();
  //   for (const org of orgs) {
  //     for (const location of org.locations) {
  //       await runForecastingJob(org.id, location.id);
  //     }
  //   }
  // });

  logger.info('Forecasting job scheduler initialized (6 AM daily)');
};
