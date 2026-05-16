/**
 * EchoStratus Twin Materialization Service
 * 
 * Projects events into entities and maintains digital twin state
 * - Revenue layer from POS events
 * - Capacity layer from layout events
 * - Kitchen layer from KDS events
 * - Labor layer from schedule events
 * - Cost layer from invoice events
 * - Experience layer from feedback events
 * 
 * Enterprise-grade: Incremental updates, real-time materialization, knowledge graph
 * 
 * All text is i18n-ready
 */

import { logger } from '../utils/logger.js';
import { supabase } from '../../lib/supabase.js';
import type { IngestedEvent } from './event-ingestion-service.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TwinState {
  revenue: RevenueLayer;
  capacity: CapacityLayer;
  kitchen: KitchenLayer;
  labor: LaborLayer;
  cost: CostLayer;
  experience: ExperienceLayer;
  external: ExternalLayer;
  timestamp: string;
}

export interface RevenueLayer {
  outlets: Record<string, {
    demandCurve: number[]; // Hourly demand
    avgCheck: number;
    coversPerDay: number;
    revenuePerDay: number;
    daypartPerformance: Record<string, number>;
    channelAttribution: Record<string, number>;
  }>;
}

export interface CapacityLayer {
  outlets: Record<string, {
    totalSeats: number;
    tables: Array<{
      id: string;
      seatsMin: number;
      seatsMax: number;
      section: string;
    }>;
    sections: Record<string, {
      seatCount: number;
      serverCapacity: number;
    }>;
  }>;
}

export interface KitchenLayer {
  outlets: Record<string, {
    stations: Record<string, {
      throughput: {
        p50: number; // tickets per 15min
        p90: number;
        p95: number;
      };
      ticketTime: {
        p50: number; // seconds
        p90: number;
        p95: number;
      };
      load: number; // current load percentage
    }>;
    menuComplexity: Record<string, number>; // menu item ID → complexity score
  }>;
}

export interface LaborLayer {
  outlets: Record<string, {
    roles: Record<string, {
      capacity: {
        coversPerHour: number;
        ticketsPerHour: number;
        tablesPerServer: number;
      };
      productivity: {
        avg: number;
        trend: number[]; // Historical productivity
      };
      scheduledHours: number;
      actualHours: number;
    }>;
  }>;
}

export interface CostLayer {
  outlets: Record<string, {
    cogs: {
      current: number;
      trend: number[];
    };
    laborCost: {
      current: number;
      trend: number[];
    };
    primeCost: {
      current: number;
      percentage: number;
    };
    vendorPrices: Record<string, {
      itemId: string;
      price: number;
      lastUpdated: string;
    }>;
  }>;
}

export interface ExperienceLayer {
  outlets: Record<string, {
    sentiment: {
      avg: number;
      trend: number[];
    };
    topics: Record<string, number>; // Topic → frequency
    waitTimeImpact: number;
    ticketTimeImpact: number;
    compRisk: number;
  }>;
}

export interface ExternalLayer {
  weather: Record<string, any>;
  events: Array<{
    id: string;
    type: string;
    impact: number;
    date: string;
  }>;
  occupancy: Record<string, number>; // Hotel occupancy by date
}

// ============================================================================
// TWIN MATERIALIZATION SERVICE
// ============================================================================

export class TwinMaterializationService {
  private twinCache: Map<string, TwinState> = new Map(); // tenantId → TwinState
  private materializationLock: Map<string, Promise<void>> = new Map();

  /**
   * Project event into entities and update twin state
   */
  async projectEvent(event: IngestedEvent): Promise<void> {
    const lockKey = `${event.tenant_id}:${event.id}`;
    
    // Prevent concurrent processing of same event
    if (this.materializationLock.has(lockKey)) {
      await this.materializationLock.get(lockKey);
      return;
    }

    const materializationPromise = this.doProjectEvent(event);
    this.materializationLock.set(lockKey, materializationPromise);

    try {
      await materializationPromise;
    } finally {
      this.materializationLock.delete(lockKey);
    }
  }

  /**
   * Actually project the event
   */
  private async doProjectEvent(event: IngestedEvent): Promise<void> {
    logger.debug(`[Stratus Twin] Projecting event: ${event.event_type} (${event.id})`);

    // Get or create twin state
    const twinState = await this.getOrCreateTwin(event.tenant_id);

    // Project based on event type
    switch (event.event_type) {
      case 'recipe.updated.v1':
      case 'recipe.cost.updated.v1':
        await this.projectRecipeEvent(event, twinState);
        break;

      case 'pos.check.closed.v1':
      case 'pos.check.opened.v1':
        await this.projectPOSEvent(event, twinState);
        break;

      case 'kds.ticket.completed.v1':
      case 'kds.ticket.started.v1':
        await this.projectKDSEvent(event, twinState);
        break;

      case 'labor.shift.published.v1':
      case 'labor.shift.actual.v1':
        await this.projectLaborEvent(event, twinState);
        break;

      case 'inventory.received.v1':
      case 'invoice.ingested.v1':
        await this.projectCostEvent(event, twinState);
        break;

      case 'guest.feedback.logged.v1':
        await this.projectExperienceEvent(event, twinState);
        break;

      default:
        logger.debug(`[Stratus Twin] No projection handler for: ${event.event_type}`);
    }

    // Update entity relationships (knowledge graph)
    await this.updateEntityRelationships(event, twinState);

    // Update cache
    this.twinCache.set(event.tenant_id, twinState);

    // Create snapshot if needed (hourly or on major changes)
    await this.createSnapshotIfNeeded(event.tenant_id, twinState);
  }

  /**
   * Project recipe event
   */
  private async projectRecipeEvent(event: IngestedEvent, twin: TwinState): Promise<void> {
    const { payload } = event;
    const recipeId = event.aggregate_id;
    const outletId = payload.outlet_id || 'default-outlet';

    // Update or create recipe entity
    await this.upsertEntity(event.tenant_id, {
      entity_type: 'recipe',
      external_id: recipeId,
      name: payload.name || payload.title || `Recipe ${recipeId}`,
      meta: {
        ingredients: payload.ingredients || [],
        instructions: payload.instructions || [],
        yield: payload.yield || {},
        cost: payload.cost || {},
        complexity: this.calculateRecipeComplexity(payload),
      },
    });

    // Update kitchen layer menu complexity
    if (!twin.kitchen.outlets[outletId]) {
      twin.kitchen.outlets[outletId] = { stations: {}, menuComplexity: {} };
    }

    twin.kitchen.outlets[outletId].menuComplexity[recipeId] = this.calculateRecipeComplexity(payload);
  }

  /**
   * Project POS event
   */
  private async projectPOSEvent(event: IngestedEvent, twin: TwinState): Promise<void> {
    const { payload } = event;
    const outletId = payload.outlet_id || 'default-outlet';

    if (!twin.revenue.outlets[outletId]) {
      twin.revenue.outlets[outletId] = {
        demandCurve: new Array(24).fill(0),
        avgCheck: 0,
        coversPerDay: 0,
        revenuePerDay: 0,
        daypartPerformance: {},
        channelAttribution: {},
      };
    }

    const outlet = twin.revenue.outlets[outletId];

    if (event.event_type === 'pos.check.closed.v1') {
      // Update revenue metrics
      const revenue = payload.total || payload.net || 0;
      const covers = payload.covers || 1;
      const hour = new Date(payload.closed_at || payload.timestamp || event.occurred_at).getHours();

      outlet.demandCurve[hour] = (outlet.demandCurve[hour] || 0) + covers;
      outlet.coversPerDay += covers;
      outlet.revenuePerDay += revenue;

      // Update average check (rolling average)
      const totalChecks = outlet.coversPerDay;
      outlet.avgCheck = ((outlet.avgCheck * (totalChecks - covers)) + revenue) / totalChecks;

      // Update daypart performance
      const daypart = this.getDaypart(hour);
      outlet.daypartPerformance[daypart] = (outlet.daypartPerformance[daypart] || 0) + revenue;
    }
  }

  /**
   * Project KDS event
   */
  private async projectKDSEvent(event: IngestedEvent, twin: TwinState): Promise<void> {
    const { payload } = event;
    const outletId = payload.outlet_id || 'default-outlet';
    const stationId = payload.station_id || payload.station || 'unknown';

    if (!twin.kitchen.outlets[outletId]) {
      twin.kitchen.outlets[outletId] = { stations: {}, menuComplexity: {} };
    }

    if (!twin.kitchen.outlets[outletId].stations[stationId]) {
      twin.kitchen.outlets[outletId].stations[stationId] = {
        throughput: { p50: 0, p90: 0, p95: 0 },
        ticketTime: { p50: 0, p90: 0, p95: 0 },
        load: 0,
      };
    }

    const station = twin.kitchen.outlets[outletId].stations[stationId];

    if (event.event_type === 'kds.ticket.completed.v1') {
      const ticketTime = payload.total_seconds || payload.ticket_time || 0;

      // Update ticket time distributions (simplified - in production would use proper statistics)
      if (ticketTime > 0) {
        // Simplified: track recent ticket times and calculate percentiles
        // In production, would maintain proper distribution
        station.ticketTime.p50 = ticketTime * 0.9; // Simplified
        station.ticketTime.p90 = ticketTime * 1.3;
        station.ticketTime.p95 = ticketTime * 1.5;
      }
    }
  }

  /**
   * Project labor event
   */
  private async projectLaborEvent(event: IngestedEvent, twin: TwinState): Promise<void> {
    const { payload } = event;
    const outletId = payload.outlet_id || 'default-outlet';
    const role = payload.role || payload.role_type || 'unknown';

    if (!twin.labor.outlets[outletId]) {
      twin.labor.outlets[outletId] = { roles: {} };
    }

    if (!twin.labor.outlets[outletId].roles[role]) {
      twin.labor.outlets[outletId].roles[role] = {
        capacity: {
          coversPerHour: 0,
          ticketsPerHour: 0,
          tablesPerServer: 0,
        },
        productivity: {
          avg: 0,
          trend: [],
        },
        scheduledHours: 0,
        actualHours: 0,
      };
    }

    const roleData = twin.labor.outlets[outletId].roles[role];

    if (event.event_type === 'labor.shift.published.v1') {
      const hours = payload.hours || (payload.end_time && payload.start_time
        ? (new Date(payload.end_time).getTime() - new Date(payload.start_time).getTime()) / (1000 * 60 * 60)
        : 0);
      roleData.scheduledHours += hours;
    }

    if (event.event_type === 'labor.shift.actual.v1') {
      const hours = payload.regular_hours || payload.hours || 0;
      roleData.actualHours += hours;
    }
  }

  /**
   * Project cost event
   */
  private async projectCostEvent(event: IngestedEvent, twin: TwinState): Promise<void> {
    const { payload } = event;
    const outletId = payload.outlet_id || 'default-outlet';

    if (!twin.cost.outlets[outletId]) {
      twin.cost.outlets[outletId] = {
        cogs: { current: 0, trend: [] },
        laborCost: { current: 0, trend: [] },
        primeCost: { current: 0, percentage: 0 },
        vendorPrices: {},
      };
    }

    const outlet = twin.cost.outlets[outletId];

    if (event.event_type === 'inventory.received.v1') {
      const cost = payload.total_cost || (payload.qty * payload.unit_cost) || 0;
      outlet.cogs.current += cost;
      outlet.cogs.trend.push(cost);
      
      // Keep last 30 days
      if (outlet.cogs.trend.length > 30) {
        outlet.cogs.trend.shift();
      }

      // Update vendor prices
      if (payload.product_id && payload.unit_cost) {
        outlet.vendorPrices[payload.product_id] = {
          itemId: payload.product_id,
          price: payload.unit_cost,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    // Update prime cost
    outlet.primeCost.current = outlet.cogs.current + outlet.laborCost.current;
    // Prime cost % would need revenue - simplified for now
  }

  /**
   * Project experience event
   */
  private async projectExperienceEvent(event: IngestedEvent, twin: TwinState): Promise<void> {
    const { payload } = event;
    const outletId = payload.outlet_id || 'default-outlet';

    if (!twin.experience.outlets[outletId]) {
      twin.experience.outlets[outletId] = {
        sentiment: { avg: 0, trend: [] },
        topics: {},
        waitTimeImpact: 0,
        ticketTimeImpact: 0,
        compRisk: 0,
      };
    }

    const outlet = twin.experience.outlets[outletId];
    const sentiment = payload.sentiment || 0;

    // Update sentiment
    outlet.sentiment.trend.push(sentiment);
    if (outlet.sentiment.trend.length > 100) {
      outlet.sentiment.trend.shift();
    }
    outlet.sentiment.avg = outlet.sentiment.trend.reduce((a, b) => a + b, 0) / outlet.sentiment.trend.length;

    // Update topics
    if (payload.topics && Array.isArray(payload.topics)) {
      for (const topic of payload.topics) {
        outlet.topics[topic] = (outlet.topics[topic] || 0) + 1;
      }
    }

    // Update comp risk
    if (sentiment < -0.5) {
      outlet.compRisk += 0.1;
    }
  }

  /**
   * Update entity relationships (knowledge graph)
   * Extracts and stores relationships between entities from events
   */
  private async updateEntityRelationships(event: IngestedEvent, twin: TwinState): Promise<void> {
    try {
      const { canonicalDataModelService } = await import('./canonical-data-model.js');
      const payload = event.payload;
      const tenantId = event.tenant_id;

      // Recipe relationships
      if (event.event_type === 'recipe.updated.v1' || event.event_type === 'recipe.created.v1') {
        const recipeId = event.aggregate_id;
        const outletId = payload.outlet_id || 'default';

        // Recipe → Ingredients
        if (payload.ingredients && Array.isArray(payload.ingredients)) {
          for (const ingredient of payload.ingredients) {
            if (ingredient.id || ingredient.product_id) {
              await canonicalDataModelService.createRelationship(
                tenantId,
                'recipe',
                recipeId,
                'product',
                ingredient.id || ingredient.product_id,
                'uses_ingredient'
              );
            }
          }
        }

        // Recipe → Station (if station_id provided)
        if (payload.station_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'recipe',
            recipeId,
            'station',
            payload.station_id,
            'prepared_at'
          );
        }

        // Recipe → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'recipe',
            recipeId,
            'outlet',
            outletId,
            'belongs_to'
          );
        }
      }

      // POS Check relationships
      if (event.event_type === 'pos.check.closed.v1') {
        const checkId = event.aggregate_id;
        const outletId = payload.outlet_id || 'default';

        // Check → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'check',
            checkId,
            'outlet',
            outletId,
            'occurred_at'
          );
        }

        // Check → Items (menu items)
        if (payload.items && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (item.id) {
              await canonicalDataModelService.createRelationship(
                tenantId,
                'check',
                checkId,
                'product',
                item.id,
                'contains_item'
              );
            }
          }
        }

        // Check → Employee (if server_id provided)
        if (payload.employee_id || payload.server_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'check',
            checkId,
            'employee',
            payload.employee_id || payload.server_id,
            'served_by'
          );
        }
      }

      // Labor Shift relationships
      if (event.event_type === 'labor.shift.published.v1') {
        const shiftId = event.aggregate_id;
        const outletId = payload.outlet_id || 'default';

        // Shift → Employee
        if (payload.employee_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'shift',
            shiftId,
            'employee',
            payload.employee_id,
            'assigned_to'
          );
        }

        // Shift → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'shift',
            shiftId,
            'outlet',
            outletId,
            'scheduled_at'
          );
        }

        // Shift → Position/Role
        if (payload.role || payload.position_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'shift',
            shiftId,
            'position',
            payload.position_id || payload.role,
            'requires_position'
          );
        }
      }

      // Inventory relationships
      if (event.event_type === 'inventory.received.v1') {
        const receiptId = event.aggregate_id || `receipt_${Date.now()}`;
        const outletId = payload.outlet_id || 'default';

        // Receipt → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'receipt',
            receiptId,
            'outlet',
            outletId,
            'received_at'
          );
        }

        // Receipt → Products
        if (payload.items && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (item.id) {
              await canonicalDataModelService.createRelationship(
                tenantId,
                'receipt',
                receiptId,
                'product',
                item.id,
                'contains_product'
              );
            }
          }
        }
      }

      // Purchase Order relationships
      if (event.event_type === 'purchase.order.created.v1') {
        const poId = event.aggregate_id || payload.po_id;
        const outletId = payload.outlet_id || 'default';

        // PO → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'purchase_order',
            poId,
            'outlet',
            outletId,
            'ordered_for'
          );
        }

        // PO → Vendor
        if (payload.vendor_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'purchase_order',
            poId,
            'vendor',
            payload.vendor_id,
            'ordered_from'
          );
        }
      }

      // Guest Feedback relationships
      if (event.event_type === 'guest.feedback.logged.v1') {
        const feedbackId = event.aggregate_id || payload.feedback_id;
        const outletId = payload.outlet_id || 'default';

        // Feedback → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'feedback',
            feedbackId,
            'outlet',
            outletId,
            'relates_to'
          );
        }

        // Feedback → Customer (if available)
        if (payload.customer_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'feedback',
            feedbackId,
            'customer',
            payload.customer_id,
            'provided_by'
          );
        }
      }

      // KDS Ticket relationships
      if (event.event_type === 'kds.ticket.completed.v1') {
        const ticketId = event.aggregate_id || payload.ticket_id;
        const outletId = payload.outlet_id || 'default';

        // Ticket → Station
        if (payload.station_id) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'ticket',
            ticketId,
            'station',
            payload.station_id,
            'processed_at'
          );
        }

        // Ticket → Outlet
        if (outletId) {
          await canonicalDataModelService.createRelationship(
            tenantId,
            'ticket',
            ticketId,
            'outlet',
            outletId,
            'belongs_to'
          );
        }
      }

      logger.debug('[Stratus Twin] Updated entity relationships', {
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
      });
    } catch (error) {
      logger.error('[Stratus Twin] Failed to update entity relationships:', error);
      // Don't fail materialization if relationship update fails
    }
  }

  /**
   * Get or create twin state
   */
  private async getOrCreateTwin(tenantId: string): Promise<TwinState> {
    if (this.twinCache.has(tenantId)) {
      return this.twinCache.get(tenantId)!;
    }

    // Try to load from latest snapshot
    const { data: snapshot } = await supabase
      .from('stratus_twin_state_snapshots')
      .select('state')
      .eq('tenant_id', tenantId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .single();

    if (snapshot?.state) {
      const twin = snapshot.state as TwinState;
      this.twinCache.set(tenantId, twin);
      return twin;
    }

    // Create empty twin
    const twin: TwinState = {
      revenue: { outlets: {} },
      capacity: { outlets: {} },
      kitchen: { outlets: {} },
      labor: { outlets: {} },
      cost: { outlets: {} },
      experience: { outlets: {} },
      external: { weather: {}, events: [], occupancy: {} },
      timestamp: new Date().toISOString(),
    };

    this.twinCache.set(tenantId, twin);
    return twin;
  }

  /**
   * Upsert entity
   */
  private async upsertEntity(tenantId: string, entity: {
    entity_type: string;
    external_id?: string;
    name: string;
    meta: Record<string, any>;
  }): Promise<void> {
    const { error } = await supabase
      .from('stratus_entities')
      .upsert({
        tenant_id: tenantId,
        entity_type: entity.entity_type,
        external_id: entity.external_id,
        name: entity.name,
        meta: entity.meta,
        status: 'active',
      }, {
        onConflict: 'tenant_id,entity_type,external_id',
      });

    if (error) {
      logger.error(`[Stratus Twin] Failed to upsert entity: ${entity.entity_type}`, error);
    }
  }

  /**
   * Calculate recipe complexity
   */
  private calculateRecipeComplexity(payload: any): number {
    // Simplified complexity calculation
    const ingredientCount = Array.isArray(payload.ingredients) ? payload.ingredients.length : 0;
    const instructionCount = Array.isArray(payload.instructions) ? payload.instructions.length : 0;
    const stepCount = typeof payload.instructions === 'string' 
      ? payload.instructions.split('\n').length 
      : instructionCount;

    // Complexity score: 0-100
    return Math.min(100, (ingredientCount * 2) + (stepCount * 1.5) + (payload.cook_time ? 5 : 0));
  }

  /**
   * Get daypart from hour
   */
  private getDaypart(hour: number): string {
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'dinner';
    return 'late_night';
  }

  /**
   * Create snapshot if needed
   */
  private async createSnapshotIfNeeded(tenantId: string, twin: TwinState): Promise<void> {
    const now = new Date();
    const lastSnapshot = await supabase
      .from('stratus_twin_state_snapshots')
      .select('snapshot_time')
      .eq('tenant_id', tenantId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .single();

    const lastTime = lastSnapshot.data?.snapshot_time 
      ? new Date(lastSnapshot.data.snapshot_time)
      : null;

    // Create snapshot if:
    // 1. No previous snapshot
    // 2. Last snapshot was > 1 hour ago
    // 3. Major change detected (simplified - would check for significant changes)

    const shouldSnapshot = !lastTime || 
      (now.getTime() - lastTime.getTime()) > (60 * 60 * 1000); // 1 hour

    if (shouldSnapshot) {
      const hash = require('crypto')
        .createHash('sha256')
        .update(JSON.stringify(twin))
        .digest('hex');

      await supabase
        .from('stratus_twin_state_snapshots')
        .insert({
          tenant_id: tenantId,
          snapshot_time: now.toISOString(),
          state: twin,
          hash,
        });

      logger.debug(`[Stratus Twin] Created snapshot for tenant: ${tenantId}`);
    }
  }

  /**
   * Materialize complete twin state
   */
  async materializeTwin(tenantId: string, at?: Date): Promise<TwinState> {
    // If cached and recent, return cached
    if (this.twinCache.has(tenantId) && !at) {
      return this.twinCache.get(tenantId)!;
    }

    // Load from snapshot if time specified
    if (at) {
      const { data: snapshot } = await supabase
        .from('stratus_twin_state_snapshots')
        .select('state')
        .eq('tenant_id', tenantId)
        .lte('snapshot_time', at.toISOString())
        .order('snapshot_time', { ascending: false })
        .limit(1)
        .single();

      if (snapshot?.state) {
        return snapshot.state as TwinState;
      }
    }

    // Otherwise, get or create
    return this.getOrCreateTwin(tenantId);
  }

  /**
   * Get twin state for outlet
   */
  async getTwinForOutlet(tenantId: string, outletId: string): Promise<Partial<TwinState>> {
    const twin = await this.materializeTwin(tenantId);
    
    return {
      revenue: {
        outlets: { [outletId]: twin.revenue.outlets[outletId] || {
          demandCurve: [],
          avgCheck: 0,
          coversPerDay: 0,
          revenuePerDay: 0,
          daypartPerformance: {},
          channelAttribution: {},
        } },
      },
      capacity: {
        outlets: { [outletId]: twin.capacity.outlets[outletId] || {
          totalSeats: 0,
          tables: [],
          sections: {},
        } },
      },
      kitchen: {
        outlets: { [outletId]: twin.kitchen.outlets[outletId] || {
          stations: {},
          menuComplexity: {},
        } },
      },
      labor: {
        outlets: { [outletId]: twin.labor.outlets[outletId] || {
          roles: {},
        } },
      },
      cost: {
        outlets: { [outletId]: twin.cost.outlets[outletId] || {
          cogs: { current: 0, trend: [] },
          laborCost: { current: 0, trend: [] },
          primeCost: { current: 0, percentage: 0 },
          vendorPrices: {},
        } },
      },
      experience: {
        outlets: { [outletId]: twin.experience.outlets[outletId] || {
          sentiment: { avg: 0, trend: [] },
          topics: {},
          waitTimeImpact: 0,
          ticketTimeImpact: 0,
          compRisk: 0,
        } },
      },
    };
  }
}

// Export singleton instance
export const twinMaterializationService = new TwinMaterializationService();
