/**
 * Pattern Recognition Engine for EchoStratus
 * 
 * Detects operational patterns from event streams and twin state
 * - Recurring patterns (daily, weekly, seasonal)
 * - Anomaly detection (deviations from normal)
 * - Operational change attribution (what caused revenue/wait/ticket changes?)
 * - Implicit decision auto-creation from detected patterns
 * 
 * Enterprise-grade: Real-time pattern detection with configurable thresholds
 */

import { logger } from '../../utils/logger.js';
import { supabase } from '../../lib/supabase.js';
import type { TwinState } from './twin-materialization-service.js';
import type { IngestedEvent } from './event-ingestion-service.js';
import { decisionRegistryService } from './decision-registry.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface OperationalPattern {
  id: string;
  tenant_id: string;
  pattern_type: 'recurring' | 'trend' | 'anomaly' | 'correlation' | 'causal';
  pattern_name: string;
  description: string;
  entities_involved: string[]; // Entity IDs
  metric_affected: 'revenue' | 'cost' | 'labor' | 'experience' | 'throughput' | 'wait_time';
  direction: 'increase' | 'decrease' | 'spike' | 'drop' | 'stability';
  confidence: number; // 0-1
  frequency?: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'one_time';
  detected_at: string;
  window_start: string;
  window_end: string;
  metadata: Record<string, any>;
}

export interface ChangeAttribution {
  change_type: 'revenue' | 'wait_time' | 'ticket_time' | 'cost' | 'guest_satisfaction';
  change_magnitude: number; // Percentage change
  change_start: string;
  change_end: string;
  attributed_to: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    contribution_percentage: number; // How much this entity contributed to the change
    confidence: number;
    relationship_type: string;
  }>;
  confidence: number;
}

export interface PatternDetectionConfig {
  minPatternConfidence: number; // Default: 0.7
  anomalyThreshold: number; // Standard deviations from mean (Default: 2.5)
  correlationMinStrength: number; // Default: 0.6
  lookbackWindowDays: number; // Default: 30
  minSamplesForPattern: number; // Default: 5
}

// ============================================================================
// PATTERN RECOGNITION ENGINE
// ============================================================================

export class PatternRecognitionEngine {
  private config: PatternDetectionConfig;
  private patternCache: Map<string, OperationalPattern[]> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<PatternDetectionConfig>) {
    this.config = {
      minPatternConfidence: config?.minPatternConfidence || 0.7,
      anomalyThreshold: config?.anomalyThreshold || 2.5,
      correlationMinStrength: config?.correlationMinStrength || 0.6,
      lookbackWindowDays: config?.lookbackWindowDays || 30,
      minSamplesForPattern: config?.minSamplesForPattern || 5,
    };

    logger.info('[Pattern Recognition Engine] Initialized', { config: this.config });
  }

  /**
   * Detect patterns from events and twin state
   */
  async detectPatterns(tenantId: string, twin: TwinState, recentEvents: IngestedEvent[]): Promise<OperationalPattern[]> {
    try {
      const patterns: OperationalPattern[] = [];

      // Detect recurring patterns
      const recurring = await this.detectRecurringPatterns(tenantId, twin, recentEvents);
      patterns.push(...recurring);

      // Detect anomalies
      const anomalies = await this.detectAnomalies(tenantId, twin, recentEvents);
      patterns.push(...anomalies);

      // Detect correlations
      const correlations = await this.detectCorrelations(tenantId, twin, recentEvents);
      patterns.push(...correlations);

      // Store patterns
      if (patterns.length > 0) {
        await this.storePatterns(tenantId, patterns);
        
        // Auto-create implicit decisions from high-confidence patterns
        await this.autoCreateDecisionsFromPatterns(tenantId, patterns);
      }

      return patterns;
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to detect patterns:', error);
      return [];
    }
  }

  /**
   * Detect recurring patterns (daily, weekly, seasonal)
   */
  private async detectRecurringPatterns(
    tenantId: string,
    twin: TwinState,
    events: IngestedEvent[]
  ): Promise<OperationalPattern[]> {
    const patterns: OperationalPattern[] = [];

    try {
      // Get historical revenue data
      const { data: historicalData } = await supabase
        .from('stratus_events')
        .select('event_type, payload, occurred_at')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'pos.check.closed.v1')
        .gte('occurred_at', new Date(Date.now() - this.config.lookbackWindowDays * 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: true });

      if (!historicalData || historicalData.length < this.config.minSamplesForPattern) {
        return patterns;
      }

      // Group by day of week
      const byDayOfWeek: Record<number, number[]> = {};
      const byHourOfDay: Record<number, number[]> = {};

      for (const event of historicalData) {
        const date = new Date(event.occurred_at);
        const dayOfWeek = date.getDay();
        const hourOfDay = date.getHours();
        const revenue = event.payload?.total_amount || 0;

        if (!byDayOfWeek[dayOfWeek]) {
          byDayOfWeek[dayOfWeek] = [];
        }
        if (!byHourOfDay[hourOfDay]) {
          byHourOfDay[hourOfDay] = [];
        }

        byDayOfWeek[dayOfWeek].push(revenue);
        byHourOfDay[hourOfDay].push(revenue);
      }

      // Detect weekly patterns
      for (const [dayOfWeek, revenues] of Object.entries(byDayOfWeek)) {
        if (revenues.length >= this.config.minSamplesForPattern) {
          const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
          const stdDev = this.calculateStdDev(revenues);
          const coefficientOfVariation = stdDev / avgRevenue;

          // Low coefficient of variation indicates consistent pattern
          if (coefficientOfVariation < 0.3) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            patterns.push({
              id: `pattern-${Date.now()}-${dayOfWeek}`,
              tenant_id: tenantId,
              pattern_type: 'recurring',
              pattern_name: `Weekly Revenue Pattern: ${dayNames[parseInt(dayOfWeek)]}`,
              description: `Consistent revenue pattern observed on ${dayNames[parseInt(dayOfWeek)]}s with average revenue of $${avgRevenue.toFixed(2)}`,
              entities_involved: [],
              metric_affected: 'revenue',
              direction: 'stability',
              confidence: 1 - coefficientOfVariation,
              frequency: 'weekly',
              detected_at: new Date().toISOString(),
              window_start: new Date(Date.now() - this.config.lookbackWindowDays * 24 * 60 * 60 * 1000).toISOString(),
              window_end: new Date().toISOString(),
              metadata: {
                day_of_week: parseInt(dayOfWeek),
                average_revenue: avgRevenue,
                standard_deviation: stdDev,
                sample_count: revenues.length,
              },
            });
          }
        }
      }

      // Detect hourly patterns
      for (const [hour, revenues] of Object.entries(byHourOfDay)) {
        if (revenues.length >= this.config.minSamplesForPattern) {
          const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
          const stdDev = this.calculateStdDev(revenues);
          const coefficientOfVariation = stdDev / avgRevenue;

          if (coefficientOfVariation < 0.3) {
            patterns.push({
              id: `pattern-${Date.now()}-hour-${hour}`,
              tenant_id: tenantId,
              pattern_type: 'recurring',
              pattern_name: `Daily Revenue Pattern: ${hour}:00`,
              description: `Consistent revenue pattern observed at ${hour}:00 with average revenue of $${avgRevenue.toFixed(2)}`,
              entities_involved: [],
              metric_affected: 'revenue',
              direction: 'stability',
              confidence: 1 - coefficientOfVariation,
              frequency: 'daily',
              detected_at: new Date().toISOString(),
              window_start: new Date(Date.now() - this.config.lookbackWindowDays * 24 * 60 * 60 * 1000).toISOString(),
              window_end: new Date().toISOString(),
              metadata: {
                hour_of_day: parseInt(hour),
                average_revenue: avgRevenue,
                standard_deviation: stdDev,
                sample_count: revenues.length,
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to detect recurring patterns:', error);
    }

    return patterns.filter(p => p.confidence >= this.config.minPatternConfidence);
  }

  /**
   * Detect anomalies (deviations from normal patterns)
   */
  private async detectAnomalies(
    tenantId: string,
    twin: TwinState,
    events: IngestedEvent[]
  ): Promise<OperationalPattern[]> {
    const patterns: OperationalPattern[] = [];

    try {
      // Get baseline metrics from twin state
      const outlets = Object.keys(twin.revenue.outlets);
      
      for (const outletId of outlets) {
        const outletRevenue = twin.revenue.outlets[outletId];
        const avgCheck = outletRevenue.avgCheck;
        const recentChecks = events
          .filter(e => e.event_type === 'pos.check.closed.v1' && e.payload?.outlet_id === outletId)
          .slice(-50); // Last 50 checks

        if (recentChecks.length < 10) {
          continue;
        }

        const checkAmounts = recentChecks.map(e => e.payload?.total_amount || 0);
        const mean = checkAmounts.reduce((a, b) => a + b, 0) / checkAmounts.length;
        const stdDev = this.calculateStdDev(checkAmounts);

        // Detect spikes (above threshold)
        for (const check of recentChecks) {
          const amount = check.payload?.total_amount || 0;
          const zScore = (amount - mean) / (stdDev || 1);

          if (Math.abs(zScore) > this.config.anomalyThreshold) {
            patterns.push({
              id: `anomaly-${Date.now()}-${check.aggregate_id}`,
              tenant_id: tenantId,
              pattern_type: 'anomaly',
              pattern_name: `Revenue Anomaly: ${zScore > 0 ? 'Spike' : 'Drop'}`,
              description: `Unusual ${zScore > 0 ? 'spike' : 'drop'} in check amount: $${amount} (${zScore.toFixed(2)} standard deviations from mean)`,
              entities_involved: [outletId, check.aggregate_id],
              metric_affected: 'revenue',
              direction: zScore > 0 ? 'spike' : 'drop',
              confidence: Math.min(1, Math.abs(zScore) / (this.config.anomalyThreshold * 2)),
              detected_at: new Date().toISOString(),
              window_start: check.occurred_at,
              window_end: check.occurred_at,
              metadata: {
                check_id: check.aggregate_id,
                amount: amount,
                mean: mean,
                std_dev: stdDev,
                z_score: zScore,
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to detect anomalies:', error);
    }

    return patterns.filter(p => p.confidence >= this.config.minPatternConfidence);
  }

  /**
   * Detect correlations between events and metrics
   */
  private async detectCorrelations(
    tenantId: string,
    twin: TwinState,
    events: IngestedEvent[]
  ): Promise<OperationalPattern[]> {
    const patterns: OperationalPattern[] = [];

    try {
      // Example: Correlate labor shifts with revenue
      const shiftEvents = events.filter(e => e.event_type === 'labor.shift.published.v1');
      const revenueEvents = events.filter(e => e.event_type === 'pos.check.closed.v1');

      if (shiftEvents.length >= this.config.minSamplesForPattern && revenueEvents.length >= this.config.minSamplesForPattern) {
        // Group by day
        const dailyData: Record<string, { shifts: number; revenue: number }> = {};

        for (const shift of shiftEvents) {
          const date = new Date(shift.occurred_at).toISOString().split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = { shifts: 0, revenue: 0 };
          }
          dailyData[date].shifts++;
        }

        for (const revenue of revenueEvents) {
          const date = new Date(revenue.occurred_at).toISOString().split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = { shifts: 0, revenue: 0 };
          }
          dailyData[date].revenue += revenue.payload?.total_amount || 0;
        }

        // Calculate correlation
        const shifts = Object.values(dailyData).map(d => d.shifts);
        const revenues = Object.values(dailyData).map(d => d.revenue);
        const correlation = this.calculateCorrelation(shifts, revenues);

        if (Math.abs(correlation) >= this.config.correlationMinStrength) {
          patterns.push({
            id: `correlation-${Date.now()}`,
            tenant_id: tenantId,
            pattern_type: 'correlation',
            pattern_name: `Labor-Revenue Correlation`,
            description: `Strong ${correlation > 0 ? 'positive' : 'negative'} correlation (${correlation.toFixed(2)}) between labor shifts and daily revenue`,
            entities_involved: [],
            metric_affected: 'revenue',
            direction: correlation > 0 ? 'increase' : 'decrease',
            confidence: Math.abs(correlation),
            detected_at: new Date().toISOString(),
            window_start: new Date(Date.now() - this.config.lookbackWindowDays * 24 * 60 * 60 * 1000).toISOString(),
            window_end: new Date().toISOString(),
            metadata: {
              correlation_coefficient: correlation,
              sample_count: Object.keys(dailyData).length,
            },
          });
        }
      }
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to detect correlations:', error);
    }

    return patterns.filter(p => p.confidence >= this.config.minPatternConfidence);
  }

  /**
   * Attribute operational changes to causes
   */
  async attributeChange(
    tenantId: string,
    changeType: ChangeAttribution['change_type'],
    changeStart: string,
    changeEnd: string,
    events: IngestedEvent[]
  ): Promise<ChangeAttribution> {
    try {
      const attribution: ChangeAttribution = {
        change_type: changeType,
        change_magnitude: 0,
        change_start: changeStart,
        change_end: changeEnd,
        attributed_to: [],
        confidence: 0,
      };

      // Get events in the time window
      const windowEvents = events.filter(
        e => e.occurred_at >= changeStart && e.occurred_at <= changeEnd
      );

      // Calculate change magnitude (simplified - would compare before/after metrics)
      // For now, use a placeholder calculation

      // Find contributing events/entities
      const contributingEvents: Map<string, number> = new Map();

      for (const event of windowEvents) {
        const eventType = event.event_type;
        
        // Weight events by relevance to change type
        let weight = 0;
        if (changeType === 'revenue' && eventType.includes('pos')) {
          weight = 1.0;
        } else if (changeType === 'labor' && eventType.includes('labor')) {
          weight = 1.0;
        } else if (changeType === 'cost' && eventType.includes('inventory') || eventType.includes('purchase')) {
          weight = 1.0;
        } else if (changeType === 'wait_time' && eventType.includes('kds') || eventType.includes('ticket')) {
          weight = 1.0;
        }

        if (weight > 0) {
          const entityId = event.aggregate_id || event.payload?.outlet_id || 'unknown';
          const currentWeight = contributingEvents.get(entityId) || 0;
          contributingEvents.set(entityId, currentWeight + weight);
        }
      }

      // Convert to attribution list
      const totalWeight = Array.from(contributingEvents.values()).reduce((a, b) => a + b, 0);
      
      for (const [entityId, weight] of contributingEvents.entries()) {
        attribution.attributed_to.push({
          entity_type: 'event',
          entity_id: entityId,
          contribution_percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
          confidence: Math.min(1, weight / 10), // Normalize confidence
          relationship_type: 'caused_change',
        });
      }

      attribution.confidence = attribution.attributed_to.length > 0
        ? attribution.attributed_to.reduce((max, a) => Math.max(max, a.confidence), 0)
        : 0;

      // Store attribution
      await supabase
        .from('stratus_change_attributions')
        .insert({
          tenant_id: tenantId,
          change_type: changeType,
          change_magnitude: attribution.change_magnitude,
          change_start: changeStart,
          change_end: changeEnd,
          attributed_to: attribution.attributed_to,
          confidence: attribution.confidence,
          created_at: new Date().toISOString(),
        });

      return attribution;
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to attribute change:', error);
      throw error;
    }
  }

  /**
   * Auto-create implicit decisions from high-confidence patterns
   */
  private async autoCreateDecisionsFromPatterns(
    tenantId: string,
    patterns: OperationalPattern[]
  ): Promise<void> {
    try {
      const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.8);

      for (const pattern of highConfidencePatterns) {
        // Create decision based on pattern type
        let decisionType: any = 'unknown';
        let title = `Action based on pattern: ${pattern.pattern_name}`;
        let description = pattern.description;

        if (pattern.pattern_type === 'anomaly' && pattern.direction === 'spike') {
          decisionType = 'pricing_change';
          title = `Investigate revenue spike pattern`;
          description = `Revenue spike detected. Consider investigating cause and potential optimization.`;
        } else if (pattern.pattern_type === 'correlation' && pattern.direction === 'increase') {
          decisionType = 'staffing_change';
          title = `Optimize staffing based on revenue pattern`;
          description = `Strong correlation detected. Consider adjusting staffing to match revenue patterns.`;
        }

        if (decisionType !== 'unknown') {
          await decisionRegistryService.createDecision({
            tenant_id: tenantId,
            decision_type: decisionType,
            title,
            description,
            proposed_by_system: true,
            trigger_event_ids: [],
            target_entity_ids: pattern.entities_involved,
            metadata: {
              pattern_id: pattern.id,
              pattern_type: pattern.pattern_type,
              pattern_confidence: pattern.confidence,
              auto_created: true,
            },
          });

          logger.info('[Pattern Recognition Engine] Auto-created decision from pattern', {
            patternId: pattern.id,
            decisionType,
          });
        }
      }
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to auto-create decisions:', error);
    }
  }

  /**
   * Store patterns in database
   */
  private async storePatterns(tenantId: string, patterns: OperationalPattern[]): Promise<void> {
    try {
      const records = patterns.map(p => ({
        tenant_id: tenantId,
        pattern_type: p.pattern_type,
        pattern_name: p.pattern_name,
        description: p.description,
        entities_involved: p.entities_involved,
        metric_affected: p.metric_affected,
        direction: p.direction,
        confidence: p.confidence,
        frequency: p.frequency,
        detected_at: p.detected_at,
        window_start: p.window_start,
        window_end: p.window_end,
        metadata: p.metadata,
      }));

      const { error } = await supabase
        .from('stratus_operational_patterns')
        .insert(records);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('[Pattern Recognition Engine] Failed to store patterns:', error);
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate correlation coefficient (Pearson)
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Export singleton instance
export const patternRecognitionEngine = new PatternRecognitionEngine({
  minPatternConfidence: 0.7,
  anomalyThreshold: 2.5,
  correlationMinStrength: 0.6,
  lookbackWindowDays: 30,
  minSamplesForPattern: 5,
});