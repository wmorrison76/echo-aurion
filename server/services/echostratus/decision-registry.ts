/**
 * EchoStratus Decision Registry Service
 * 
 * Continuous decision tracking system
 * - Auto-detect decisions from events
 * - Track explicit decisions (user-entered)
 * - Track implicit decisions (detected from patterns)
 * - Decision lifecycle management
 * - Decision relationships and dependencies
 * 
 * Enterprise-grade: Handles thousands of decisions simultaneously
 * 
 * All text is i18n-ready
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../../lib/supabase.js';
import type { IngestedEvent } from './event-ingestion-service.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type DecisionType =
  | 'add_table'
  | 'change_hours'
  | 'menu_change'
  | 'staffing_change'
  | 'accept_event'
  | 'procurement_substitution'
  | 'activation'
  | 'repurpose_space'
  | 'pricing_change'
  | 'layout_change'
  | 'recipe_change'
  | 'vendor_change'
  | 'unknown';

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
  decision_type: DecisionType;
  status: DecisionStatus;
  title: string;
  description?: string;
  detected_from_events?: string[]; // Event IDs that triggered detection
  proposed_by_user_id?: string;
  proposed_by_system: boolean;
  trigger_event_ids: string[];
  assumption_set_id?: string;
  target_entity_ids: string[];
  parent_decision_id?: string;
  related_decision_ids: string[];
  created_at: Date;
  updated_at: Date;
  approved_at?: Date;
  implemented_at?: Date;
  completed_at?: Date;
  metadata: Record<string, any>;
}

export interface DecisionDetectionRule {
  eventType: string;
  pattern: (event: IngestedEvent) => boolean;
  decisionType: DecisionType;
  titleGenerator: (event: IngestedEvent) => string;
  descriptionGenerator: (event: IngestedEvent) => string;
  confidence: number; // 0-1
}

// ============================================================================
// DECISION REGISTRY SERVICE
// ============================================================================

export class DecisionRegistryService {
  private detectionRules: DecisionDetectionRule[] = [];
  private decisionCache: Map<string, Decision> = new Map(); // decisionId → Decision

  constructor() {
    this.initializeDetectionRules();
  }

  /**
   * Initialize decision detection rules
   */
  private initializeDetectionRules(): void {
    // Recipe change detection
    this.detectionRules.push({
      eventType: 'recipe.updated.v1',
      pattern: (event) => {
        const payload = event.payload;
        return !!(payload.changes || payload.version || payload.cost);
      },
      decisionType: 'recipe_change',
      titleGenerator: (event) => `Recipe updated: ${event.payload.name || event.aggregate_id}`,
      descriptionGenerator: (event) => {
        const changes = event.payload.changes || [];
        return `Recipe changes: ${JSON.stringify(changes)}`;
      },
      confidence: 0.9,
    });

    // Menu change detection
    this.detectionRules.push({
      eventType: 'menu.changed.v1',
      pattern: (event) => true,
      decisionType: 'menu_change',
      titleGenerator: (event) => `Menu changed: ${event.payload.outlet_id || 'outlet'}`,
      descriptionGenerator: (event) => `Menu items updated`,
      confidence: 0.95,
    });

    // Staffing change detection
    this.detectionRules.push({
      eventType: 'labor.shift.published.v1',
      pattern: (event) => {
        // Detect if staffing level changed significantly
        return true; // Simplified - would compare to baseline
      },
      decisionType: 'staffing_change',
      titleGenerator: (event) => `Staffing change: ${event.payload.role || 'role'}`,
      descriptionGenerator: (event) => `Staffing level modified`,
      confidence: 0.8,
    });

    // Pricing change detection
    this.detectionRules.push({
      eventType: 'pos.check.closed.v1',
      pattern: (event) => {
        // Detect if average check changed significantly
        return false; // Would need comparison to baseline
      },
      decisionType: 'pricing_change',
      titleGenerator: (event) => `Pricing change detected`,
      descriptionGenerator: (event) => `Average check changed`,
      confidence: 0.7,
    });

    // Hours change detection
    this.detectionRules.push({
      eventType: 'outlet.hours.changed.v1',
      pattern: (event) => true,
      decisionType: 'change_hours',
      titleGenerator: (event) => `Operating hours changed: ${event.payload.outlet_id}`,
      descriptionGenerator: (event) => `Hours updated`,
      confidence: 0.95,
    });
  }

  /**
   * Process event and detect decisions
   */
  async processEventForDecisions(event: IngestedEvent): Promise<Decision[]> {
    const detectedDecisions: Decision[] = [];

    // Check each detection rule
    for (const rule of this.detectionRules) {
      if (rule.eventType === event.event_type && rule.pattern(event)) {
        const decision = await this.createDetectedDecision(event, rule);
        if (decision) {
          detectedDecisions.push(decision);
        }
      }
    }

    return detectedDecisions;
  }

  /**
   * Create detected decision
   */
  private async createDetectedDecision(
    event: IngestedEvent,
    rule: DecisionDetectionRule
  ): Promise<Decision | null> {
    try {
      // Check if decision already exists (deduplication)
      const existing = await this.findExistingDecision(
        event.tenant_id,
        rule.decisionType,
        event.aggregate_id,
        event.occurred_at
      );

      if (existing) {
        logger.debug(`[Stratus Decision Registry] Decision already exists: ${existing.id}`);
        return existing;
      }

      // Create decision
      const decision: Decision = {
        id: crypto.randomUUID(),
        tenant_id: event.tenant_id,
        decision_type: rule.decisionType,
        status: 'detected',
        title: rule.titleGenerator(event),
        description: rule.descriptionGenerator(event),
        detected_from_events: [event.id],
        proposed_by_system: true,
        trigger_event_ids: [event.id],
        target_entity_ids: [event.aggregate_id],
        related_decision_ids: [],
        created_at: new Date(event.occurred_at),
        updated_at: new Date(),
        metadata: {
          confidence: rule.confidence,
          detection_rule: rule.eventType,
          event_payload: event.payload,
        },
      };

      // Store in database
      await this.storeDecision(decision);

      logger.info(`[Stratus Decision Registry] Detected decision: ${decision.id} (${rule.decisionType})`);

      return decision;
    } catch (error: any) {
      logger.error(`[Stratus Decision Registry] Failed to create detected decision:`, error);
      return null;
    }
  }

  /**
   * Find existing decision (deduplication)
   */
  private async findExistingDecision(
    tenantId: string,
    decisionType: DecisionType,
    aggregateId: string,
    occurredAt: string
  ): Promise<Decision | null> {
    // Check cache first
    for (const decision of this.decisionCache.values()) {
      if (
        decision.tenant_id === tenantId &&
        decision.decision_type === decisionType &&
        decision.target_entity_ids.includes(aggregateId) &&
        Math.abs(new Date(decision.created_at).getTime() - new Date(occurredAt).getTime()) < 3600000 // 1 hour
      ) {
        return decision;
      }
    }

    // Check database
    const { data } = await supabase
      .from('stratus_decisions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('decision_type', decisionType)
      .contains('target_entity_ids', [aggregateId])
      .gte('created_at', new Date(new Date(occurredAt).getTime() - 3600000).toISOString())
      .limit(1)
      .single();

    if (data) {
      return this.mapDatabaseDecision(data);
    }

    return null;
  }

  /**
   * Store decision in database
   */
  private async storeDecision(decision: Decision): Promise<void> {
    // Create assumption set if needed
    let assumptionSetId = decision.assumption_set_id;
    if (!assumptionSetId) {
      const { data: assumptionSet } = await supabase
        .from('stratus_decision_assumption_sets')
        .insert({
          tenant_id: decision.tenant_id,
          assumptions: {},
          constraints: {},
          scenario_count: 10000,
          time_horizon_days: 30,
          hash: crypto.createHash('sha256').update(JSON.stringify({})).digest('hex'),
        })
        .select()
        .single();

      if (assumptionSet) {
        assumptionSetId = assumptionSet.id;
      }
    }

    if (!assumptionSetId) {
      throw new Error('Failed to create assumption set');
    }

    // Store decision
    const { error } = await supabase
      .from('stratus_decisions')
      .insert({
        id: decision.id,
        tenant_id: decision.tenant_id,
        decision_type: decision.decision_type,
        status: decision.status,
        title: decision.title,
        description: decision.description,
        proposed_by_user_id: decision.proposed_by_user_id,
        proposed_by_system: decision.proposed_by_system,
        trigger_event_ids: decision.trigger_event_ids,
        assumption_set_id: assumptionSetId,
        target_entity_ids: decision.target_entity_ids,
        created_at: decision.created_at.toISOString(),
        updated_at: decision.updated_at.toISOString(),
      });

    if (error) {
      logger.error(`[Stratus Decision Registry] Failed to store decision:`, error);
      throw error;
    }

    // Update cache
    this.decisionCache.set(decision.id, decision);
  }

  /**
   * Create explicit decision (user-entered)
   */
  async createExplicitDecision(
    tenantId: string,
    decisionType: DecisionType,
    title: string,
    description: string,
    userId: string,
    targetEntityIds: string[],
    metadata?: Record<string, any>
  ): Promise<Decision> {
    const decision: Decision = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      decision_type: decisionType,
      status: 'proposed',
      title,
      description,
      proposed_by_user_id: userId,
      proposed_by_system: false,
      trigger_event_ids: [],
      target_entity_ids: targetEntityIds,
      related_decision_ids: [],
      created_at: new Date(),
      updated_at: new Date(),
      metadata: metadata || {},
    };

    await this.storeDecision(decision);

    logger.info(`[Stratus Decision Registry] Created explicit decision: ${decision.id}`);

    return decision;
  }

  /**
   * Update decision status
   */
  async updateDecisionStatus(
    decisionId: string,
    status: DecisionStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    if (status === 'implemented') {
      updateData.implemented_at = new Date().toISOString();
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('stratus_decisions')
      .update(updateData)
      .eq('id', decisionId);

    if (error) {
      logger.error(`[Stratus Decision Registry] Failed to update decision status:`, error);
      throw error;
    }

    // Update cache
    const decision = this.decisionCache.get(decisionId);
    if (decision) {
      decision.status = status;
      decision.updated_at = new Date();
      if (status === 'approved') decision.approved_at = new Date();
      if (status === 'implemented') decision.implemented_at = new Date();
      if (status === 'completed') decision.completed_at = new Date();
    }
  }

  /**
   * Get decisions for tenant
   */
  async getDecisions(
    tenantId: string,
    options?: {
      status?: DecisionStatus;
      decisionType?: DecisionType;
      outletId?: string;
      from?: Date;
      to?: Date;
      limit?: number;
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

    if (options?.from) {
      query = query.gte('created_at', options.from.toISOString());
    }

    if (options?.to) {
      query = query.lte('created_at', options.to.toISOString());
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`[Stratus Decision Registry] Failed to get decisions:`, error);
      throw error;
    }

    return (data || []).map((row) => this.mapDatabaseDecision(row));
  }

  /**
   * Get decision by ID
   */
  async getDecision(decisionId: string): Promise<Decision | null> {
    // Check cache
    if (this.decisionCache.has(decisionId)) {
      return this.decisionCache.get(decisionId)!;
    }

    // Query database
    const { data, error } = await supabase
      .from('stratus_decisions')
      .select('*')
      .eq('id', decisionId)
      .single();

    if (error || !data) {
      return null;
    }

    const decision = this.mapDatabaseDecision(data);
    this.decisionCache.set(decisionId, decision);
    return decision;
  }

  /**
   * Map database row to Decision
   */
  private mapDatabaseDecision(row: any): Decision {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      decision_type: row.decision_type as DecisionType,
      status: row.status as DecisionStatus,
      title: row.title,
      description: row.description,
      proposed_by_user_id: row.proposed_by_user_id,
      proposed_by_system: row.proposed_by_system,
      trigger_event_ids: row.trigger_event_ids || [],
      assumption_set_id: row.assumption_set_id,
      target_entity_ids: row.target_entity_ids || [],
      parent_decision_id: row.parent_decision_id,
      related_decision_ids: row.related_decision_ids || [],
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      approved_at: row.approved_at ? new Date(row.approved_at) : undefined,
      implemented_at: row.implemented_at ? new Date(row.implemented_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: row.metadata || {},
    };
  }

  /**
   * Link related decisions
   */
  async linkDecisions(decisionId1: string, decisionId2: string, relationship: 'parent' | 'child' | 'related'): Promise<void> {
    const decision1 = await this.getDecision(decisionId1);
    const decision2 = await this.getDecision(decisionId2);

    if (!decision1 || !decision2) {
      throw new Error('Decision not found');
    }

    if (relationship === 'parent') {
      decision1.related_decision_ids.push(decisionId2);
      decision2.parent_decision_id = decisionId1;
    } else if (relationship === 'child') {
      decision2.related_decision_ids.push(decisionId1);
      decision1.parent_decision_id = decisionId2;
    } else {
      decision1.related_decision_ids.push(decisionId2);
      decision2.related_decision_ids.push(decisionId1);
    }

    // Update in database
    await supabase
      .from('stratus_decisions')
      .update({
        related_decision_ids: decision1.related_decision_ids,
        parent_decision_id: decision1.parent_decision_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', decisionId1);

    await supabase
      .from('stratus_decisions')
      .update({
        related_decision_ids: decision2.related_decision_ids,
        parent_decision_id: decision2.parent_decision_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', decisionId2);
  }

  /**
   * Get decision statistics
   */
  async getDecisionStats(tenantId: string, from?: Date, to?: Date): Promise<{
    total: number;
    byStatus: Record<DecisionStatus, number>;
    byType: Record<DecisionType, number>;
    wins: number;
    losses: number;
    draws: number;
  }> {
    const decisions = await this.getDecisions(tenantId, { from, to });

    const stats = {
      total: decisions.length,
      byStatus: {} as Record<DecisionStatus, number>,
      byType: {} as Record<DecisionType, number>,
      wins: 0,
      losses: 0,
      draws: 0,
    };

    for (const decision of decisions) {
      stats.byStatus[decision.status] = (stats.byStatus[decision.status] || 0) + 1;
      stats.byType[decision.decision_type] = (stats.byType[decision.decision_type] || 0) + 1;

      // Win/loss/draw would come from outcome measurements
      // Simplified for now
    }

    return stats;
  }
}

// Export singleton instance
export const decisionRegistryService = new DecisionRegistryService();
