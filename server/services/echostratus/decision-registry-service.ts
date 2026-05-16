/**
 * EchoStratus Decision Registry Service
 * 
 * Continuous decision tracking system
 * - Auto-detect decisions from events
 * - Track explicit decisions (user-entered)
 * - Track implicit decisions (detected from patterns)
 * - Decision lifecycle management
 * - Decision relationships
 * 
 * Enterprise-grade with support for thousands of simultaneous decisions
 * 
 * All text is i18n-ready
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../../lib/supabase.js';
import type { IngestedEvent } from './event-ingestion-service.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DecisionStatus =
  | 'detected'
  | 'proposed'
  | 'simulating'
  | 'simulated'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'measuring'
  | 'completed'
  | 'archived';

export interface Decision {
  id: string;
  tenant_id: string;
  decision_type: string;
  status: DecisionStatus;
  title: string;
  description?: string;
  proposed_by_user_id?: string;
  proposed_by_system: boolean;
  trigger_event_ids: string[];
  assumption_set_id: string;
  target_entity_ids: string[];
  parent_decision_id?: string;
  related_decision_ids: string[];
  created_at: string;
  updated_at: string;
  approved_at?: string;
  implemented_at?: string;
  completed_at?: string;
}

export interface DetectedDecision {
  decision_type: string;
  title: string;
  description: string;
  confidence: number;
  trigger_events: IngestedEvent[];
  target_entities: string[];
  detected_at: string;
}

// ============================================================================
// DECISION REGISTRY SERVICE
// ============================================================================

export class DecisionRegistryService {
  private detectionRules: Map<string, (event: IngestedEvent) => DetectedDecision | null> = new Map();

  constructor() {
    this.registerDetectionRules();
  }

  /**
   * Register decision detection rules
   */
  private registerDetectionRules(): void {
    // Recipe change detection
    this.detectionRules.set('recipe.updated.v1', (event) => {
      const { recipeId, changes } = event.payload;
      if (!changes || Object.keys(changes).length === 0) return null;

      return {
        decision_type: 'menu_change',
        title: `Recipe Updated: ${event.payload.name || recipeId}`,
        description: `Recipe changes detected: ${JSON.stringify(changes)}`,
        confidence: 0.9,
        trigger_events: [event],
        target_entities: [recipeId],
        detected_at: event.occurred_at,
      };
    });

    // Menu item change detection
    this.detectionRules.set('menu.item.updated.v1', (event) => {
      const { menuItemId, changes } = event.payload;
      
      return {
        decision_type: 'menu_change',
        title: `Menu Item Updated: ${event.payload.name || menuItemId}`,
        description: `Menu item changes: ${JSON.stringify(changes)}`,
        confidence: 0.85,
        trigger_events: [event],
        target_entities: [menuItemId],
        detected_at: event.occurred_at,
      };
    });

    // Staffing change detection
    this.detectionRules.set('labor.shift.published.v1', (event) => {
      const { outletId, roleId, changes } = event.payload;
      
      // Detect if staffing level changed significantly
      if (changes?.staffingLevel) {
        return {
          decision_type: 'staffing_change',
          title: `Staffing Level Changed: ${roleId}`,
          description: `Staffing level changed to ${changes.staffingLevel}`,
          confidence: 0.8,
          trigger_events: [event],
          target_entities: [outletId, roleId],
          detected_at: event.occurred_at,
        };
      }
      
      return null;
    });

    // Operating hours change detection
    this.detectionRules.set('outlet.hours.updated.v1', (event) => {
      const { outletId, hours } = event.payload;
      
      return {
        decision_type: 'change_hours',
        title: `Operating Hours Changed: ${outletId}`,
        description: `New hours: ${JSON.stringify(hours)}`,
        confidence: 0.95,
        trigger_events: [event],
        target_entities: [outletId],
        detected_at: event.occurred_at,
      };
    });

    // Table/layout change detection
    this.detectionRules.set('layout.table.added.v1', (event) => {
      const { outletId, table } = event.payload;
      
      return {
        decision_type: 'add_table',
        title: `Table Added: ${outletId}`,
        description: `Added ${table.seatsMax}-top table`,
        confidence: 0.9,
        trigger_events: [event],
        target_entities: [outletId],
        detected_at: event.occurred_at,
      };
    });

    // Pricing change detection
    this.detectionRules.set('menu.item.price.updated.v1', (event) => {
      const { menuItemId, oldPrice, newPrice } = event.payload;
      
      return {
        decision_type: 'menu_change',
        title: `Price Changed: ${event.payload.name || menuItemId}`,
        description: `Price changed from $${oldPrice} to $${newPrice}`,
        confidence: 0.95,
        trigger_events: [event],
        target_entities: [menuItemId],
        detected_at: event.occurred_at,
      };
    });
  }

  /**
   * Detect decision from event
   */
  async detectDecisionFromEvent(event: IngestedEvent): Promise<DetectedDecision | null> {
    const rule = this.detectionRules.get(event.event_type);
    if (!rule) {
      return null;
    }

    try {
      const detected = rule(event);
      if (detected && detected.confidence > 0.7) {
        logger.info(`[Stratus DecisionRegistry] Detected decision: ${detected.decision_type} (confidence: ${detected.confidence})`);
        return detected;
      }
    } catch (error) {
      logger.error(`[Stratus DecisionRegistry] Error detecting decision from ${event.event_type}:`, error);
    }

    return null;
  }

  /**
   * Create decision record (explicit or detected)
   */
  async createDecision(
    tenantId: string,
    decisionType: string,
    title: string,
    options: {
      description?: string;
      userId?: string;
      isSystemDetected?: boolean;
      triggerEventIds?: string[];
      assumptionSetId?: string;
      targetEntityIds?: string[];
      parentDecisionId?: string;
    }
  ): Promise<Decision> {
    // Create assumption set if not provided
    let assumptionSetId = options.assumptionSetId;
    if (!assumptionSetId) {
      const { data: assumptionSet, error } = await supabase
        .from('stratus_decision_assumption_sets')
        .insert({
          tenant_id: tenantId,
          assumptions: {},
          constraints: {},
          scenario_count: 10000,
          time_horizon_days: 30,
          hash: crypto.createHash('sha256').update(JSON.stringify({})).digest('hex'),
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create assumption set: ${error.message}`);
      }

      assumptionSetId = assumptionSet.id;
    }

    // Create decision
    const { data: decision, error } = await supabase
      .from('stratus_decisions')
      .insert({
        tenant_id: tenantId,
        decision_type: decisionType,
        status: options.isSystemDetected ? 'detected' : 'proposed',
        title,
        description: options.description,
        proposed_by_user_id: options.userId,
        proposed_by_system: options.isSystemDetected || false,
        trigger_event_ids: options.triggerEventIds || [],
        assumption_set_id: assumptionSetId,
        target_entity_ids: options.targetEntityIds || [],
        related_decision_ids: [],
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create decision: ${error.message}`);
    }

    logger.info(`[Stratus DecisionRegistry] Decision created: ${decision.id} (${decisionType})`);

    return decision as Decision;
  }

  /**
   * Process event and auto-detect decisions
   */
  async processEventForDecisions(event: IngestedEvent): Promise<Decision | null> {
    const detected = await this.detectDecisionFromEvent(event);
    if (!detected) {
      return null;
    }

    // Check for duplicate decisions (same type, same entities, recent)
    const recent = await this.findRecentSimilarDecision(
      event.tenant_id,
      detected.decision_type,
      detected.target_entities,
      24 * 60 * 60 * 1000 // 24 hours
    );

    if (recent) {
      logger.debug(`[Stratus DecisionRegistry] Similar decision found, linking: ${recent.id}`);
      // Link events to existing decision
      await this.linkEventToDecision(recent.id, event.id);
      return recent;
    }

    // Create new decision
    const decision = await this.createDecision(
      event.tenant_id,
      detected.decision_type,
      detected.title,
      {
        description: detected.description,
        isSystemDetected: true,
        triggerEventIds: detected.trigger_events.map((e) => e.id),
        targetEntityIds: detected.target_entities,
      }
    );

    return decision;
  }

  /**
   * Find recent similar decision
   */
  private async findRecentSimilarDecision(
    tenantId: string,
    decisionType: string,
    targetEntities: string[],
    timeWindowMs: number
  ): Promise<Decision | null> {
    const since = new Date(Date.now() - timeWindowMs).toISOString();

    const { data: decisions } = await supabase
      .from('stratus_decisions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('decision_type', decisionType)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!decisions || decisions.length === 0) {
      return null;
    }

    // Find decision with matching target entities
    for (const decision of decisions) {
      const entities = decision.target_entity_ids || [];
      if (targetEntities.some((e) => entities.includes(e))) {
        return decision as Decision;
      }
    }

    return null;
  }

  /**
   * Link event to decision
   */
  private async linkEventToDecision(decisionId: string, eventId: string): Promise<void> {
    const { data: decision } = await supabase
      .from('stratus_decisions')
      .select('trigger_event_ids')
      .eq('id', decisionId)
      .single();

    if (decision) {
      const eventIds = new Set(decision.trigger_event_ids || []);
      eventIds.add(eventId);

      await supabase
        .from('stratus_decisions')
        .update({ trigger_event_ids: Array.from(eventIds) })
        .eq('id', decisionId);
    }
  }

  /**
   * Get decisions for tenant
   */
  async getDecisions(
    tenantId: string,
    options?: {
      status?: DecisionStatus;
      decisionType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Decision[]> {
    let query = supabase
      .from('stratus_decisions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.decisionType) {
      query = query.eq('decision_type', options.decisionType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get decisions: ${error.message}`);
    }

    return (data || []) as Decision[];
  }

  /**
   * Update decision status
   */
  async updateDecisionStatus(
    decisionId: string,
    tenantId: string,
    status: DecisionStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    const update: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      update.approved_at = new Date().toISOString();
    }

    if (status === 'implemented') {
      update.implemented_at = new Date().toISOString();
    }

    if (status === 'completed') {
      update.completed_at = new Date().toISOString();
    }

    if (metadata) {
      Object.assign(update, metadata);
    }

    const { error } = await supabase
      .from('stratus_decisions')
      .update(update)
      .eq('id', decisionId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update decision status: ${error.message}`);
    }

    logger.info(`[Stratus DecisionRegistry] Decision ${decisionId} status updated to ${status}`);
  }

  /**
   * Link related decisions
   */
  async linkDecisions(decisionId1: string, decisionId2: string, tenantId: string): Promise<void> {
    const { data: decision1 } = await supabase
      .from('stratus_decisions')
      .select('related_decision_ids')
      .eq('id', decisionId1)
      .eq('tenant_id', tenantId)
      .single();

    const { data: decision2 } = await supabase
      .from('stratus_decisions')
      .select('related_decision_ids')
      .eq('id', decisionId2)
      .eq('tenant_id', tenantId)
      .single();

    if (decision1 && decision2) {
      const related1 = new Set(decision1.related_decision_ids || []);
      const related2 = new Set(decision2.related_decision_ids || []);

      related1.add(decisionId2);
      related2.add(decisionId1);

      await supabase
        .from('stratus_decisions')
        .update({ related_decision_ids: Array.from(related1) })
        .eq('id', decisionId1);

      await supabase
        .from('stratus_decisions')
        .update({ related_decision_ids: Array.from(related2) })
        .eq('id', decisionId2);
    }
  }

  /**
   * Get decision statistics
   */
  async getDecisionStatistics(tenantId: string): Promise<{
    total: number;
    byStatus: Record<DecisionStatus, number>;
    byType: Record<string, number>;
    wins: number;
    losses: number;
    draws: number;
  }> {
    const { data: decisions } = await supabase
      .from('stratus_decisions')
      .select('status, decision_type')
      .eq('tenant_id', tenantId);

    const stats = {
      total: decisions?.length || 0,
      byStatus: {} as Record<DecisionStatus, number>,
      byType: {} as Record<string, number>,
      wins: 0,
      losses: 0,
      draws: 0,
    };

    // Get outcomes for win/loss/draw
    const { data: outcomes } = await supabase
      .from('stratus_decision_outcomes')
      .select('decision_id, delta_vs_forecast')
      .in('decision_id', (decisions || []).map((d: any) => d.id));

    for (const decision of decisions || []) {
      stats.byStatus[decision.status as DecisionStatus] = (stats.byStatus[decision.status as DecisionStatus] || 0) + 1;
      stats.byType[decision.decision_type] = (stats.byType[decision.decision_type] || 0) + 1;
    }

    // Calculate wins/losses/draws from outcomes
    for (const outcome of outcomes || []) {
      const delta = outcome.delta_vs_forecast;
      if (delta && typeof delta === 'object') {
        const profitDelta = (delta as any).profit || 0;
        if (profitDelta > 0.05) stats.wins++;
        else if (profitDelta < -0.05) stats.losses++;
        else stats.draws++;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const decisionRegistryService = new DecisionRegistryService();
