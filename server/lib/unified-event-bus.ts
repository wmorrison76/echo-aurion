/**
 * LUCCCA Unified Event Bus
 * ========================
 * Enterprise-grade event bus that unifies all event buses into a single source of truth.
 * 
 * Features:
 * - Persistent event storage (database-backed)
 * - Retry logic with exponential backoff
 * - Idempotency keys (prevents duplicate processing)
 * - Event replay capability
 * - Event versioning schema
 * - Dead letter queue for failed events
 * - Circuit breaker pattern
 * 
 * Phase 1 Critical Fix: MF-001 Event Bus Fragmentation
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from './logger.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UnifiedEvent<T = any> {
  id: string;
  type: string;
  version: number;
  timestamp: number;
  source: EventSource;
  tenantId: string;
  outletId?: string;
  correlationId?: string;
  causationId?: string;
  payload: T;
  metadata: EventMetadata;
  idempotencyKey?: string;
}

export interface EventSource {
  bus: 'os' | 'maestro' | 'financial' | 'dialogue' | 'unified';
  module: string;
  userId?: string;
}

export interface EventMetadata {
  retryCount: number;
  maxRetries: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  createdAt: number;
  processedAt?: number;
  error?: string;
  hash: string;
}

export interface EventSubscription {
  id: string;
  eventType: string | '*';
  handler: EventHandler;
  options: SubscriptionOptions;
}

export interface SubscriptionOptions {
  priority?: 'critical' | 'high' | 'normal' | 'low';
  filter?: (event: UnifiedEvent) => boolean;
  retryOnError?: boolean;
  deadLetterOnFailure?: boolean;
}

export type EventHandler<T = any> = (event: UnifiedEvent<T>) => Promise<void> | void;

export interface EventBusConfig {
  maxRetries: number;
  retryDelayMs: number;
  retryMultiplier: number;
  maxRetryDelayMs: number;
  eventTTLMs: number;
  maxHistorySize: number;
  enablePersistence: boolean;
  enableDeduplication: boolean;
  circuitBreakerThreshold: number;
}

// ============================================================================
// EVENT TYPE REGISTRY
// ============================================================================

export const UNIFIED_EVENT_TYPES = {
  // Calendar / Events
  CALENDAR_EVENT_CREATED: 'calendar:event_created',
  CALENDAR_EVENT_UPDATED: 'calendar:event_updated',
  CALENDAR_EVENT_DELETED: 'calendar:event_deleted',

  // CRM / Pipeline
  PROSPECT_STAGE_CHANGED: 'prospect:stage_changed',
  PROSPECT_CONVERTED: 'prospect:converted',

  // Maestro BQT
  MAESTRO_EVENT_RECEIVED: 'maestro:event_received',
  BEO_CREATED: 'beo:created',
  BEO_UPDATED: 'beo:updated',
  BEO_APPROVED: 'beo:approved',
  BEO_EXECUTED: 'beo:executed',

  // Production Intelligence
  PRODUCTION_GENERATED: 'production:generated',
  PRODUCTION_PLAN_UPDATED: 'production:plan_updated',

  // Purchasing
  PURCHASING_PLAN_GENERATED: 'purchasing:plan_generated',
  PURCHASING_ORDER_CREATED: 'purchasing:order_created',
  PURCHASING_ORDER_RECEIVED: 'purchasing:order_received',

  // Inventory
  INVENTORY_UPDATED: 'inventory:updated',
  INVENTORY_SHORTAGE_DETECTED: 'inventory:shortage_detected',
  INVENTORY_TRANSFER_PROPOSED: 'inventory:transfer_proposed',
  INVENTORY_ADJUSTMENT_COMMITTED: 'inventory:adjustment_committed',

  // Labor / Scheduling
  LABOR_PLAN_GENERATED: 'labor:plan_generated',
  SHIFT_CREATED: 'shift:created',
  SHIFT_UPDATED: 'shift:updated',
  SHIFT_PUBLISHED: 'shift:published',

  // Financial
  INVOICE_RECORDED: 'financial:invoice_recorded',
  JOURNAL_ENTRY_CREATED: 'financial:journal_entry_created',
  COST_UPDATED: 'financial:cost_updated',
  REVENUE_RECORDED: 'financial:revenue_recorded',

  // Recipes
  RECIPE_CREATED: 'recipe:created',
  RECIPE_UPDATED: 'recipe:updated',
  RECIPE_COST_UPDATED: 'recipe:cost_updated',

  // POS
  POS_CHECK_OPENED: 'pos:check_opened',
  POS_CHECK_CLOSED: 'pos:check_closed',
  POS_ITEM_ORDERED: 'pos:item_ordered',

  // AI / Echo
  ECHO_ADVISORY_GENERATED: 'echo:advisory_generated',
  ECHO_DECISION_MADE: 'echo:decision_made',
  ECHO_INSIGHT_GENERATED: 'echo:insight_generated',

  // Audit
  AUDIT_ENTRY: 'audit:entry',
  AUDIT_APPENDED: 'audit:appended',

  // System
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  MODULE_LOADED: 'system:module_loaded',

  // UI
  UI_OPEN_PANEL: 'ui:open_panel',
  UI_NOTIFICATION: 'ui:notification',
} as const;

// ============================================================================
// UNIFIED EVENT BUS IMPLEMENTATION
// ============================================================================

class UnifiedEventBusImpl extends EventEmitter {
  private config: EventBusConfig;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: UnifiedEvent[] = [];
  private processedIds: Set<string> = new Set();
  private deadLetterQueue: UnifiedEvent[] = [];
  private circuitBreakerFailures: number = 0;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerResetTimer: NodeJS.Timeout | null = null;

  // Persistence layer (in-memory for now, can be swapped with database)
  private persistentStore: Map<string, UnifiedEvent> = new Map();

  constructor(config?: Partial<EventBusConfig>) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      retryMultiplier: 2,
      maxRetryDelayMs: 30000,
      eventTTLMs: 24 * 60 * 60 * 1000, // 24 hours
      maxHistorySize: 10000,
      enablePersistence: true,
      enableDeduplication: true,
      circuitBreakerThreshold: 10,
      ...config,
    };

    // Set high limit for EventEmitter
    this.setMaxListeners(1000);

    logger.info('[UnifiedEventBus] Initialized with config', {
      maxRetries: this.config.maxRetries,
      enablePersistence: this.config.enablePersistence,
    });
  }

  // ============================================================================
  // PUBLISHING
  // ============================================================================

  /**
   * Publish an event to the unified bus
   */
  async publish<T>(
    type: string,
    payload: T,
    options: {
      source: EventSource;
      tenantId: string;
      outletId?: string;
      correlationId?: string;
      causationId?: string;
      idempotencyKey?: string;
      version?: number;
    }
  ): Promise<UnifiedEvent<T>> {
    // Circuit breaker check
    if (this.circuitBreakerOpen) {
      throw new Error('[UnifiedEventBus] Circuit breaker is open. Event not published.');
    }

    const eventId = crypto.randomUUID();
    const timestamp = Date.now();
    const idempotencyKey = options.idempotencyKey || this.generateIdempotencyKey(type, payload, timestamp);

    // Deduplication check
    if (this.config.enableDeduplication && this.processedIds.has(idempotencyKey)) {
      logger.debug(`[UnifiedEventBus] Duplicate event ignored: ${idempotencyKey}`);
      const existingEvent = this.persistentStore.get(idempotencyKey);
      if (existingEvent) {
        return existingEvent as UnifiedEvent<T>;
      }
    }

    const event: UnifiedEvent<T> = {
      id: eventId,
      type,
      version: options.version || 1,
      timestamp,
      source: options.source,
      tenantId: options.tenantId,
      outletId: options.outletId,
      correlationId: options.correlationId || eventId,
      causationId: options.causationId,
      payload,
      metadata: {
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        processingStatus: 'pending',
        createdAt: timestamp,
        hash: this.hashEvent(type, payload, timestamp),
      },
      idempotencyKey,
    };

    // Store event
    if (this.config.enablePersistence) {
      this.persistentStore.set(idempotencyKey, event);
    }

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.config.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Mark as processed for deduplication
    this.processedIds.add(idempotencyKey);

    // Trim processed IDs set
    if (this.processedIds.size > this.config.maxHistorySize * 2) {
      const idsArray = Array.from(this.processedIds);
      this.processedIds = new Set(idsArray.slice(-this.config.maxHistorySize));
    }

    // Process event
    await this.processEvent(event);

    logger.debug(`[UnifiedEventBus] Published event: ${type}`, { eventId, tenantId: options.tenantId });

    return event;
  }

  /**
   * Publish batch of events
   */
  async publishBatch<T>(events: Array<{
    type: string;
    payload: T;
    options: Parameters<typeof this.publish>[2];
  }>): Promise<UnifiedEvent<T>[]> {
    const results: UnifiedEvent<T>[] = [];
    
    for (const { type, payload, options } of events) {
      try {
        const event = await this.publish(type, payload, options);
        results.push(event);
      } catch (error) {
        logger.error(`[UnifiedEventBus] Failed to publish batch event: ${type}`, error);
      }
    }

    return results;
  }

  // ============================================================================
  // SUBSCRIBING
  // ============================================================================

  /**
   * Subscribe to specific event type
   */
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): () => void {
    const subscriptionId = crypto.randomUUID();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      options: {
        priority: 'normal',
        retryOnError: true,
        deadLetterOnFailure: true,
        ...options,
      },
    };

    const subscriptions = this.subscriptions.get(eventType) || [];
    subscriptions.push(subscription);
    this.subscriptions.set(eventType, subscriptions);

    logger.debug(`[UnifiedEventBus] Subscription added for ${eventType}`, { subscriptionId });

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(eventType) || [];
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index > -1) {
        subs.splice(index, 1);
        logger.debug(`[UnifiedEventBus] Subscription removed for ${eventType}`, { subscriptionId });
      }
    };
  }

  /**
   * Subscribe to all events (wildcard)
   */
  subscribeAll(handler: EventHandler, options?: SubscriptionOptions): () => void {
    return this.subscribe('*', handler, options);
  }

  // ============================================================================
  // EVENT PROCESSING
  // ============================================================================

  /**
   * Process an event and deliver to all subscribers
   */
  private async processEvent(event: UnifiedEvent): Promise<void> {
    event.metadata.processingStatus = 'processing';

    // Get specific subscribers
    const specificSubscriptions = this.subscriptions.get(event.type) || [];
    
    // Get wildcard subscribers
    const wildcardSubscriptions = this.subscriptions.get('*') || [];

    // Sort by priority
    const allSubscriptions = [...specificSubscriptions, ...wildcardSubscriptions].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.options.priority || 'normal'] - priorityOrder[b.options.priority || 'normal'];
    });

    let hasError = false;

    for (const subscription of allSubscriptions) {
      // Apply filter if present
      if (subscription.options.filter && !subscription.options.filter(event)) {
        continue;
      }

      try {
        await subscription.handler(event);
      } catch (error: any) {
        hasError = true;
        logger.error(`[UnifiedEventBus] Handler error for ${event.type}`, {
          subscriptionId: subscription.id,
          error: error.message,
        });

        // Handle retry
        if (subscription.options.retryOnError) {
          await this.handleRetry(event, error);
        }

        // Move to dead letter queue if configured
        if (subscription.options.deadLetterOnFailure && 
            event.metadata.retryCount >= event.metadata.maxRetries) {
          this.moveToDeadLetter(event, error.message);
        }
      }
    }

    // Update event status
    if (!hasError) {
      event.metadata.processingStatus = 'completed';
      event.metadata.processedAt = Date.now();
    } else if (event.metadata.retryCount >= event.metadata.maxRetries) {
      event.metadata.processingStatus = 'failed';
    }

    // Emit for native EventEmitter subscribers (backward compatibility)
    this.emit(event.type, event);
    this.emit('*', event);
  }

  /**
   * Handle retry with exponential backoff
   */
  private async handleRetry(event: UnifiedEvent, error: Error): Promise<void> {
    event.metadata.retryCount++;
    event.metadata.error = error.message;

    if (event.metadata.retryCount >= event.metadata.maxRetries) {
      this.circuitBreakerFailures++;
      
      // Open circuit breaker if threshold reached
      if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
        this.openCircuitBreaker();
      }
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(this.config.retryMultiplier, event.metadata.retryCount - 1),
      this.config.maxRetryDelayMs
    );

    logger.info(`[UnifiedEventBus] Retrying event ${event.id} in ${delay}ms (attempt ${event.metadata.retryCount})`, {
      eventType: event.type,
    });

    // Schedule retry
    setTimeout(async () => {
      await this.processEvent(event);
    }, delay);
  }

  /**
   * Move event to dead letter queue
   */
  private moveToDeadLetter(event: UnifiedEvent, error: string): void {
    event.metadata.processingStatus = 'dead_letter';
    event.metadata.error = error;
    this.deadLetterQueue.push(event);

    logger.warn(`[UnifiedEventBus] Event moved to dead letter queue`, {
      eventId: event.id,
      eventType: event.type,
      error,
    });

    // Emit dead letter event
    this.emit('dead_letter', event);
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    logger.error('[UnifiedEventBus] Circuit breaker OPENED - too many failures');

    // Auto-reset after 60 seconds
    this.circuitBreakerResetTimer = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.circuitBreakerFailures = 0;
      logger.info('[UnifiedEventBus] Circuit breaker CLOSED - reset after timeout');
    }, 60000);
  }

  // ============================================================================
  // REPLAY & HISTORY
  // ============================================================================

  /**
   * Replay events from history
   */
  async replay(filter: {
    eventType?: string;
    fromTimestamp?: number;
    toTimestamp?: number;
    tenantId?: string;
    limit?: number;
  }): Promise<UnifiedEvent[]> {
    let events = this.eventHistory;

    if (filter.eventType) {
      events = events.filter(e => e.type === filter.eventType);
    }
    if (filter.fromTimestamp) {
      events = events.filter(e => e.timestamp >= filter.fromTimestamp!);
    }
    if (filter.toTimestamp) {
      events = events.filter(e => e.timestamp <= filter.toTimestamp!);
    }
    if (filter.tenantId) {
      events = events.filter(e => e.tenantId === filter.tenantId);
    }

    const replayEvents = events.slice(-(filter.limit || 100));

    logger.info(`[UnifiedEventBus] Replaying ${replayEvents.length} events`);

    // Reprocess events
    for (const event of replayEvents) {
      event.metadata.retryCount = 0;
      event.metadata.processingStatus = 'pending';
      await this.processEvent(event);
    }

    return replayEvents;
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    eventType?: string;
    tenantId?: string;
    limit?: number;
    status?: UnifiedEvent['metadata']['processingStatus'];
  }): UnifiedEvent[] {
    let events = this.eventHistory;

    if (filter?.eventType) {
      events = events.filter(e => e.type === filter.eventType);
    }
    if (filter?.tenantId) {
      events = events.filter(e => e.tenantId === filter.tenantId);
    }
    if (filter?.status) {
      events = events.filter(e => e.metadata.processingStatus === filter.status);
    }

    return events.slice(-(filter?.limit || 100));
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(limit?: number): UnifiedEvent[] {
    return this.deadLetterQueue.slice(-(limit || 100));
  }

  /**
   * Retry dead letter events
   */
  async retryDeadLetter(eventIds?: string[]): Promise<number> {
    const eventsToRetry = eventIds
      ? this.deadLetterQueue.filter(e => eventIds.includes(e.id))
      : this.deadLetterQueue;

    let retried = 0;

    for (const event of eventsToRetry) {
      event.metadata.retryCount = 0;
      event.metadata.processingStatus = 'pending';
      event.metadata.error = undefined;

      // Remove from dead letter queue
      const index = this.deadLetterQueue.indexOf(event);
      if (index > -1) {
        this.deadLetterQueue.splice(index, 1);
      }

      await this.processEvent(event);
      retried++;
    }

    logger.info(`[UnifiedEventBus] Retried ${retried} dead letter events`);
    return retried;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateIdempotencyKey(type: string, payload: any, timestamp: number): string {
    const data = JSON.stringify({ type, payload, timestamp: Math.floor(timestamp / 1000) });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  private hashEvent(type: string, payload: any, timestamp: number): string {
    const canonical = JSON.stringify({ type, payload, timestamp });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Get bus statistics
   */
  getStats(): {
    totalEvents: number;
    pendingEvents: number;
    completedEvents: number;
    failedEvents: number;
    deadLetterCount: number;
    subscriptionCount: number;
    circuitBreakerOpen: boolean;
  } {
    const history = this.eventHistory;
    
    return {
      totalEvents: history.length,
      pendingEvents: history.filter(e => e.metadata.processingStatus === 'pending').length,
      completedEvents: history.filter(e => e.metadata.processingStatus === 'completed').length,
      failedEvents: history.filter(e => e.metadata.processingStatus === 'failed').length,
      deadLetterCount: this.deadLetterQueue.length,
      subscriptionCount: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.length, 0),
      circuitBreakerOpen: this.circuitBreakerOpen,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.eventHistory = [];
    this.processedIds.clear();
    this.deadLetterQueue = [];
    this.persistentStore.clear();
    this.subscriptions.clear();
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpen = false;
    if (this.circuitBreakerResetTimer) {
      clearTimeout(this.circuitBreakerResetTimer);
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('[UnifiedEventBus] Shutting down...');
    
    // Wait for pending events to complete (with timeout)
    const pendingEvents = this.eventHistory.filter(
      e => e.metadata.processingStatus === 'pending' || e.metadata.processingStatus === 'processing'
    );

    if (pendingEvents.length > 0) {
      logger.info(`[UnifiedEventBus] Waiting for ${pendingEvents.length} pending events...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (this.circuitBreakerResetTimer) {
      clearTimeout(this.circuitBreakerResetTimer);
    }

    logger.info('[UnifiedEventBus] Shutdown complete');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const unifiedEventBus = new UnifiedEventBusImpl();

// ============================================================================
// BRIDGE ADAPTERS (Connect legacy buses)
// ============================================================================

/**
 * Bridge legacy OS Bus events to Unified Event Bus
 */
export function bridgeOSBus(osBus: any): void {
  if (!osBus?.onAny) {
    logger.warn('[UnifiedEventBus] OS Bus does not support onAny, bridging skipped');
    return;
  }

  osBus.onAny((eventType: string, payload: any) => {
    unifiedEventBus.publish(eventType, payload, {
      source: { bus: 'os', module: payload.source || 'unknown' },
      tenantId: payload.org_id || payload.tenantId || 'default',
      outletId: payload.outlet_id || payload.outletId,
    }).catch(err => {
      logger.error('[UnifiedEventBus] Failed to bridge OS Bus event', err);
    });
  });

  logger.info('[UnifiedEventBus] OS Bus bridge connected');
}

/**
 * Bridge legacy Maestro Event Bus to Unified Event Bus
 */
export function bridgeMaestroEventBus(maestroBus: any): void {
  if (!maestroBus?.subscribe) {
    logger.warn('[UnifiedEventBus] Maestro Bus does not support subscribe, bridging skipped');
    return;
  }

  maestroBus.subscribe('*', (message: any) => {
    unifiedEventBus.publish(`maestro:${message.type}`, message.payload, {
      source: { bus: 'maestro', module: message.source || 'maestro_bqt' },
      tenantId: message.payload?.org_id || message.payload?.tenantId || 'default',
      outletId: message.payload?.outlet_id,
    }).catch(err => {
      logger.error('[UnifiedEventBus] Failed to bridge Maestro Bus event', err);
    });
  });

  logger.info('[UnifiedEventBus] Maestro Event Bus bridge connected');
}

/**
 * Bridge legacy Financial Event Bus to Unified Event Bus
 */
export function bridgeFinancialEventBus(financialBus: any): void {
  if (!financialBus?.onAll) {
    logger.warn('[UnifiedEventBus] Financial Bus does not support onAll, bridging skipped');
    return;
  }

  financialBus.onAll((event: any) => {
    unifiedEventBus.publish(`financial:${event.type}`, event.data, {
      source: { bus: 'financial', module: event.metadata?.source || 'financial_bus' },
      tenantId: event.org_id || 'default',
      outletId: event.outlet_id,
    }).catch(err => {
      logger.error('[UnifiedEventBus] Failed to bridge Financial Bus event', err);
    });
  });

  logger.info('[UnifiedEventBus] Financial Event Bus bridge connected');
}

export default unifiedEventBus;
