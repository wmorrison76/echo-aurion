/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 3 Day 15
 * Decision Revaluation Job (Continuous Learning Loop)
 * 
 * Runs every 4 hours:
 * - Look at active decisions (created <10 days ago)
 * - Fetch latest available data (new shifts, cancellations, demand updates)
 * - Re-run optimizer with new data
 * - Compare to current decision
 * - Store new version if significantly different (>10% change)
 * - Alert manager if staffing recommendation changed
 */

import { logger } from '../lib/logger';
import { StaffingOptimizer } from '../lib/forecasting/staffingOptimizer';

interface ForecastDecision {
  id: string;
  orgId: string;
  locationId: string;
  version: number;
  parentDecisionId?: string;
  createdAt: Date;
  forecastDate: string;
  recommendedStaff: number;
  estimatedCost: number;
  status: 'active' | 'superseded' | 'implemented';
  notes: string;
}

interface RevaluationResult {
  decisionId: string;
  hasChanged: boolean;
  changePercentage: number;
  newRecommendation?: ForecastDecision;
  alerts: string[];
}

export class DecisionRevaluationJob {
  /**
   * Main job execution - runs every 4 hours
   */
  async execute(orgId: string): Promise<RevaluationResult[]> {
    const startTime = Date.now();
    logger.info('Decision revaluation job started', { orgId });

    try {
      // Step 1: Fetch active decisions (created <10 days ago)
      const activeDecisions = await this.fetchActiveDecisions(orgId);
      logger.debug('Active decisions fetched', { orgId, count: activeDecisions.length });

      if (activeDecisions.length === 0) {
        logger.info('No active decisions to revaluate', { orgId });
        return [];
      }

      // Step 2: Revaluate each decision
      const results: RevaluationResult[] = [];

      for (const decision of activeDecisions) {
        try {
          const result = await this.revaluateDecision(decision);
          results.push(result);

          // Alert manager if significant change
          if (result.hasChanged && result.changePercentage > 10) {
            await this.alertManager(orgId, decision, result);
          }
        } catch (error) {
          logger.error('Error revaluating decision', {
            orgId,
            decisionId: decision.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Step 3: Log summary
      const changedCount = results.filter((r) => r.hasChanged).length;
      const duration = Date.now() - startTime;

      logger.info('Decision revaluation completed', {
        orgId,
        decisionsRevaluated: activeDecisions.length,
        decisionsChanged: changedCount,
        duration,
      });

      return results;
    } catch (error) {
      logger.error('Decision revaluation job failed', {
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch active decisions
   */
  private async fetchActiveDecisions(orgId: string): Promise<ForecastDecision[]> {
    // Mock implementation - in production, query forecast_decisions table
    const decisions: ForecastDecision[] = [];
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Return mock decisions
    for (let i = 0; i < 3; i++) {
      const createdAt = new Date();
      createdAt.setHours(createdAt.getHours() - i * 2);

      decisions.push({
        id: `forecast-${i}`,
        orgId,
        locationId: 'loc-123',
        version: 1,
        createdAt,
        forecastDate: new Date().toISOString().split('T')[0],
        recommendedStaff: 10 + i,
        estimatedCost: 5000 + i * 200,
        status: 'active',
        notes: `Decision version 1`,
      });
    }

    return decisions.filter((d) => d.createdAt >= tenDaysAgo);
  }

  /**
   * Revaluate a single decision
   */
  private async revaluateDecision(decision: ForecastDecision): Promise<RevaluationResult> {
    logger.debug('Revaluating decision', { decisionId: decision.id });

    // Step 1: Fetch latest data
    const latestData = await this.fetchLatestData(decision.orgId, decision.locationId);

    // Step 2: Re-run optimizer
    const newRecommendation = StaffingOptimizer.optimize({
      demand: latestData.demandForecast,
      maxBudget: latestData.budgetConstraint,
      minStaff: latestData.minStaff,
      maxStaff: latestData.maxStaff,
      complianceRules: latestData.complianceRules,
    });

    // Step 3: Compare to original decision
    const staffChange = Math.abs(newRecommendation.recommendedStaff - decision.recommendedStaff);
    const changePercentage = (staffChange / decision.recommendedStaff) * 100;
    const costChange = Math.abs(newRecommendation.estimatedCost - decision.estimatedCost);

    const hasChanged = changePercentage > 5; // 5% threshold

    logger.debug('Decision revaluation result', {
      decisionId: decision.id,
      hasChanged,
      changePercentage: changePercentage.toFixed(2),
    });

    let newDecision: ForecastDecision | undefined;

    // Step 4: Create new version if changed
    if (hasChanged) {
      newDecision = {
        id: 'forecast-' + Date.now(),
        orgId: decision.orgId,
        locationId: decision.locationId,
        version: decision.version + 1,
        parentDecisionId: decision.id,
        createdAt: new Date(),
        forecastDate: new Date().toISOString().split('T')[0],
        recommendedStaff: newRecommendation.recommendedStaff,
        estimatedCost: newRecommendation.estimatedCost,
        status: 'active',
        notes: `Updated based on revaluation. Changes: Staff ${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%, Cost ${costChange > 0 ? '+' : ''}$${costChange.toFixed(0)}`,
      };

      // TODO: In production, save to forecast_decisions table
      // await db.insert('forecast_decisions').values(newDecision);

      // Mark original decision as superseded
      // await db.update('forecast_decisions').set({ status: 'superseded' }).where({ id: decision.id });
    }

    // Step 5: Generate alerts
    const alerts: string[] = [];

    if (changePercentage > 25) {
      alerts.push(`Critical: Staffing recommendation changed by ${changePercentage.toFixed(1)}%`);
    } else if (changePercentage > 10) {
      alerts.push(`Significant: Staffing recommendation changed by ${changePercentage.toFixed(1)}%`);
    }

    if (costChange > decision.estimatedCost * 0.2) {
      alerts.push(`Budget impact: Cost change of $${costChange.toFixed(0)}`);
    }

    if (latestData.demandTrendDetected) {
      alerts.push(`Demand trend detected: ${latestData.demandTrend}`);
    }

    return {
      decisionId: decision.id,
      hasChanged,
      changePercentage,
      newRecommendation: newDecision,
      alerts,
    };
  }

  /**
   * Fetch latest data (new shifts, cancellations, demand updates)
   */
  private async fetchLatestData(orgId: string, locationId: string): Promise<{
    demandForecast: any[];
    budgetConstraint: number;
    minStaff: number;
    maxStaff: number;
    complianceRules: any;
    demandTrendDetected: boolean;
    demandTrend?: string;
  }> {
    // Mock implementation - in production, query latest data from database
    return {
      demandForecast: Array.from({ length: 10 }).map(() => ({
        covers: Math.floor(100 + Math.random() * 100),
        confidence: 0.85 + Math.random() * 0.1,
      })),
      budgetConstraint: 5200, // Updated budget
      minStaff: 3,
      maxStaff: 12,
      complianceRules: {
        minBreakMinutes: 30,
        maxConsecutiveDays: 6,
        minHoursBetweenShifts: 12,
      },
      demandTrendDetected: Math.random() > 0.7,
      demandTrend: 'Slight increase in weekend demand',
    };
  }

  /**
   * Alert manager of significant changes
   */
  private async alertManager(
    orgId: string,
    decision: ForecastDecision,
    result: RevaluationResult
  ): Promise<void> {
    logger.info('Alerting manager of decision change', {
      orgId,
      decisionId: decision.id,
      changePercentage: result.changePercentage.toFixed(2),
    });

    // TODO: In production, send email/notification
    // const message = `Staffing recommendation changed by ${result.changePercentage.toFixed(1)}%. ` +
    //   `Previous: ${decision.recommendedStaff} staff, New: ${result.newRecommendation?.recommendedStaff} staff`;
    // await notificationService.sendAlert({
    //   orgId,
    //   title: 'Staffing Recommendation Updated',
    //   message,
    // });
  }
}

/**
 * Export job runner for scheduling
 */
export const runDecisionRevaluationJob = async (orgId: string) => {
  const job = new DecisionRevaluationJob();
  return job.execute(orgId);
};

/**
 * Schedule decision revaluation job to run every 4 hours
 */
export const scheduleJob = () => {
  // In production, integrate with job scheduler
  // Example with node-schedule:
  // const schedule = require('node-schedule');
  // schedule.scheduleJob('0 */4 * * *', async () => {
  //   const orgs = await getOrganizations();
  //   for (const org of orgs) {
  //     await runDecisionRevaluationJob(org.id);
  //   }
  // });

  logger.info('Decision revaluation job scheduler initialized (every 4 hours)');
};
