/**
 * EchoStratus Outcome Measurement Service
 * 
 * Measures decision outcomes and tracks wins/losses/draws
 * - Automatic outcome tracking (T+1d, T+7d, T+30d, T+90d)
 * - Forecast vs actual comparison
 * - Delta calculations
 * - Attribution analysis
 * - Confidence updates
 * 
 * Enterprise-grade: Continuous measurement, learning from outcomes
 * 
 * All text is i18n-ready
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../../lib/supabase.js';
import { decisionRegistryService } from './decision-registry.js';
import { twinMaterializationService } from './twin-materialization-service.js';
import type { Decision } from './decision-registry.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DecisionOutcome {
  id: string;
  decision_id: string;
  tenant_id: string;
  measurement_time: Date; // T+1d, T+7d, T+30d, T+90d
  days_since_implementation: number;
  metric_type: 'revenue' | 'cost' | 'wait_time' | 'satisfaction' | 'throughput' | 'labor';
  forecast_value: number;
  actual_value: number;
  delta: number;
  delta_percentage: number;
  attribution: string[]; // What contributed to the outcome
  confidence: number; // 0-1
  status: 'win' | 'loss' | 'draw';
}

export interface OutcomeAggregation {
  decision_id: string;
  total_measurements: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_delta_percentage: number;
  best_metric: string;
  worst_metric: string;
  overall_status: 'win' | 'loss' | 'draw';
}

// ============================================================================
// OUTCOME MEASUREMENT SERVICE
// ============================================================================

export class OutcomeMeasurementService {
  private measurementSchedule: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule outcome measurements for a decision
   */
  async scheduleMeasurements(decision: Decision): Promise<void> {
    if (decision.status !== 'implemented') {
      return; // Only measure implemented decisions
    }

    const implementedAt = decision.implemented_at || decision.created_at;
    const measurementTimes = [
      { days: 1, label: 'T+1d' },
      { days: 7, label: 'T+7d' },
      { days: 30, label: 'T+30d' },
      { days: 90, label: 'T+90d' },
    ];

    for (const { days, label } of measurementTimes) {
      const measurementTime = new Date(implementedAt);
      measurementTime.setDate(measurementTime.getDate() + days);

      // Schedule measurement
      const delay = measurementTime.getTime() - Date.now();
      if (delay > 0) {
        const timeout = setTimeout(async () => {
          await this.measureOutcome(decision.id, days, label);
        }, delay);

        this.measurementSchedule.set(`${decision.id}:${days}`, timeout);
      } else {
        // Already past, measure immediately
        await this.measureOutcome(decision.id, days, label);
      }
    }
  }

  /**
   * Measure outcome for a decision
   */
  async measureOutcome(decisionId: string, daysSinceImplementation: number, label: string): Promise<DecisionOutcome | null> {
    try {
      const decision = await decisionRegistryService.getDecision(decisionId);
      if (!decision) {
        logger.warn(`[Stratus Outcome] Decision not found: ${decisionId}`);
        return null;
      }

      if (decision.status !== 'implemented' && decision.status !== 'measuring') {
        return null; // Not implemented yet
      }

      // Update decision status to measuring
      if (decision.status === 'implemented') {
        await decisionRegistryService.updateDecisionStatus(decisionId, 'measuring');
      }

      // Get forecast (from simulation results)
      const forecast = await this.getForecast(decisionId);

      // Get actual (from twin state)
      const actual = await this.getActual(decision, daysSinceImplementation);

      // Calculate delta
      const delta = actual.value - forecast.value;
      const deltaPercentage = forecast.value !== 0 ? (delta / forecast.value) * 100 : 0;

      // Determine status
      const status = this.determineStatus(deltaPercentage, decision.decision_type);

      // Create outcome
      const outcome: DecisionOutcome = {
        id: crypto.randomUUID(),
        decision_id: decisionId,
        tenant_id: decision.tenant_id,
        measurement_time: new Date(),
        days_since_implementation: daysSinceImplementation,
        metric_type: forecast.metric_type,
        forecast_value: forecast.value,
        actual_value: actual.value,
        delta,
        delta_percentage: deltaPercentage,
        attribution: await this.attributeOutcome(decision, delta, daysSinceImplementation),
        confidence: this.calculateConfidence(forecast, actual),
        status,
      };

      // Store outcome
      await this.storeOutcome(outcome);

      logger.info(`[Stratus Outcome] Measured outcome for decision ${decisionId} (${label}): ${status}`);

      return outcome;
    } catch (error: any) {
      logger.error(`[Stratus Outcome] Failed to measure outcome:`, error);
      return null;
    }
  }

  /**
   * Get forecast value
   */
  private async getForecast(decisionId: string): Promise<{ metric_type: string; value: number }> {
    // Get simulation results for this decision
    const { data: simulation } = await supabase
      .from('stratus_decision_simulations')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (simulation) {
      // Extract forecast from simulation results
      const results = simulation.results || {};
      return {
        metric_type: simulation.metric_type || 'revenue',
        value: results.forecast_value || results.expected_value || 0,
      };
    }

    // Default forecast
    return {
      metric_type: 'revenue',
      value: 0,
    };
  }

  /**
   * Get actual value from twin state
   */
  private async getActual(decision: Decision, daysSinceImplementation: number): Promise<{ metric_type: string; value: number }> {
    // Get twin state for outlet(s)
    const outletIds = decision.target_entity_ids.filter((id) => id.startsWith('outlet_') || !id.includes('_'));

    if (outletIds.length === 0) {
      return { metric_type: 'revenue', value: 0 };
    }

    const outletId = outletIds[0];
    const twin = await twinMaterializationService.getTwinForOutlet(decision.tenant_id, outletId);

    // Determine metric type based on decision type
    let metricType = 'revenue';
    let value = 0;

    switch (decision.decision_type) {
      case 'add_table':
      case 'change_hours':
        metricType = 'revenue';
        value = twin.revenue?.outlets[outletId]?.revenuePerDay || 0;
        break;

      case 'menu_change':
      case 'recipe_change':
        metricType = 'revenue';
        value = twin.revenue?.outlets[outletId]?.revenuePerDay || 0;
        break;

      case 'staffing_change':
        metricType = 'labor';
        value = twin.cost?.outlets[outletId]?.laborCost.current || 0;
        break;

      case 'pricing_change':
        metricType = 'revenue';
        value = twin.revenue?.outlets[outletId]?.revenuePerDay || 0;
        break;

      default:
        metricType = 'revenue';
        value = twin.revenue?.outlets[outletId]?.revenuePerDay || 0;
    }

    return { metric_type: metricType, value };
  }

  /**
   * Determine outcome status
   */
  private determineStatus(deltaPercentage: number, decisionType: string): 'win' | 'loss' | 'draw' {
    // Thresholds vary by decision type
    const thresholds: Record<string, { win: number; loss: number }> = {
      revenue: { win: 5, loss: -5 }, // 5% increase = win, 5% decrease = loss
      cost: { win: -5, loss: 5 }, // 5% decrease = win, 5% increase = loss
      wait_time: { win: -10, loss: 10 },
      satisfaction: { win: 5, loss: -5 },
    };

    const threshold = thresholds[decisionType] || thresholds.revenue;

    if (deltaPercentage >= threshold.win) return 'win';
    if (deltaPercentage <= threshold.loss) return 'loss';
    return 'draw';
  }

  /**
   * Attribute outcome to causes
   */
  private async attributeOutcome(decision: Decision, delta: number, daysSinceImplementation: number): Promise<string[]> {
    const attribution: string[] = [];

    // Check for related decisions
    if (decision.related_decision_ids.length > 0) {
      attribution.push(`${decision.related_decision_ids.length} related decisions`);
    }

    // Check for external factors (would need external layer data)
    // Simplified for now

    // Check decision type
    attribution.push(`Decision type: ${decision.decision_type}`);

    return attribution.length > 0 ? attribution : ['Unknown attribution'];
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(forecast: { metric_type: string; value: number }, actual: { metric_type: string; value: number }): number {
    // Confidence based on how close forecast was to actual
    if (forecast.value === 0) return 0.5;

    const error = Math.abs(actual.value - forecast.value) / Math.abs(forecast.value);
    const confidence = Math.max(0, Math.min(1, 1 - error));

    return confidence;
  }

  /**
   * Store outcome
   */
  private async storeOutcome(outcome: DecisionOutcome): Promise<void> {
    const { error } = await supabase
      .from('stratus_decision_outcomes')
      .insert({
        id: outcome.id,
        decision_id: outcome.decision_id,
        tenant_id: outcome.tenant_id,
        measurement_time: outcome.measurement_time.toISOString(),
        days_since_implementation: outcome.days_since_implementation,
        metric_type: outcome.metric_type,
        forecast_value: outcome.forecast_value,
        actual_value: outcome.actual_value,
        delta: outcome.delta,
        delta_percentage: outcome.delta_percentage,
        attribution: outcome.attribution,
        confidence: outcome.confidence,
        status: outcome.status,
      });

    if (error) {
      logger.error(`[Stratus Outcome] Failed to store outcome:`, error);
      throw error;
    }
  }

  /**
   * Aggregate outcomes for a decision
   */
  async aggregateOutcomes(decisionId: string): Promise<OutcomeAggregation> {
    const { data: outcomes } = await supabase
      .from('stratus_decision_outcomes')
      .select('*')
      .eq('decision_id', decisionId)
      .order('measurement_time', { ascending: true });

    if (!outcomes || outcomes.length === 0) {
      return {
        decision_id: decisionId,
        total_measurements: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        win_rate: 0,
        avg_delta_percentage: 0,
        best_metric: '',
        worst_metric: '',
        overall_status: 'draw',
      };
    }

    const wins = outcomes.filter((o) => o.status === 'win').length;
    const losses = outcomes.filter((o) => o.status === 'loss').length;
    const draws = outcomes.filter((o) => o.status === 'draw').length;

    const avgDeltaPercentage = outcomes.reduce((sum, o) => sum + o.delta_percentage, 0) / outcomes.length;

    // Find best and worst metrics
    const bestOutcome = outcomes.reduce((best, o) => (o.delta_percentage > best.delta_percentage ? o : best), outcomes[0]);
    const worstOutcome = outcomes.reduce((worst, o) => (o.delta_percentage < worst.delta_percentage ? o : worst), outcomes[0]);

    // Determine overall status
    let overallStatus: 'win' | 'loss' | 'draw' = 'draw';
    if (wins > losses) overallStatus = 'win';
    else if (losses > wins) overallStatus = 'loss';

    return {
      decision_id: decisionId,
      total_measurements: outcomes.length,
      wins,
      losses,
      draws,
      win_rate: wins / outcomes.length,
      avg_delta_percentage: avgDeltaPercentage,
      best_metric: bestOutcome.metric_type,
      worst_metric: worstOutcome.metric_type,
      overall_status: overallStatus,
    };
  }

  /**
   * Get decision statistics over time
   */
  async getDecisionStatsOverTime(tenantId: string, from?: Date, to?: Date): Promise<{
    total_decisions: number;
    wins: number;
    losses: number;
    draws: number;
    win_rate: number;
    avg_delta_percentage: number;
    by_decision_type: Record<string, { wins: number; losses: number; draws: number }>;
  }> {
    const decisions = await decisionRegistryService.getDecisions(tenantId, { from, to });

    const stats = {
      total_decisions: decisions.length,
      wins: 0,
      losses: 0,
      draws: 0,
      win_rate: 0,
      avg_delta_percentage: 0,
      by_decision_type: {} as Record<string, { wins: number; losses: number; draws: number }>,
    };

    for (const decision of decisions) {
      const aggregation = await this.aggregateOutcomes(decision.id);

      stats.wins += aggregation.wins;
      stats.losses += aggregation.losses;
      stats.draws += aggregation.draws;

      if (!stats.by_decision_type[decision.decision_type]) {
        stats.by_decision_type[decision.decision_type] = { wins: 0, losses: 0, draws: 0 };
      }

      stats.by_decision_type[decision.decision_type].wins += aggregation.wins;
      stats.by_decision_type[decision.decision_type].losses += aggregation.losses;
      stats.by_decision_type[decision.decision_type].draws += aggregation.draws;
    }

    const totalOutcomes = stats.wins + stats.losses + stats.draws;
    stats.win_rate = totalOutcomes > 0 ? stats.wins / totalOutcomes : 0;

    return stats;
  }
}

// Export singleton instance
export const outcomeMeasurementService = new OutcomeMeasurementService();
