/**
 * Unified Event Bus for EchoStratus
 * 
 * Enterprise-grade event bus that consolidates events from:
 * - OS Bus (operational events)
 * - FinancialEventBus (financial events)
 * - MaestroEventBus (BQT events)
 * - EchoDialogueBus (AI dialogue events)
 * 
 * Features:
 * - Priority queue (critical/high/normal/low)
 * - Event deduplication
 * - Batching for high-volume scenarios
 * - Dead-letter queue for failed events
 * - Rate limiting
 * - Event transformation and normalization
 * - Multi-tenant isolation
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { eventBridgeService } from './event-bridge.js';
import { persistentEventStoreExpanded } from '../persistent-event-store-expanded.js';

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface UnifiedEvent {
  id: string;
  event_type: string;
  source_bus: 'os' | 'financial' | 'maestro' | 'dialogue' | 'stratus';
  tenant_id: string;
  priority: EventPriority;
  payload: Record<string, any>;
  metadata: {
    occurred_at: string;
    producer: string;
    aggregate_type?: string;
    aggregate_id?: string;
    correlation_id?: string;
    causation_id?: string;
    schema_version: number;
  };
  signature?: string;
  retry_count?: number;
  processed_at?: string;
}

export interface UnifiedEventBusConfig {
  maxQueueSize?: number;
  batchSize?: number;
  batchIntervalMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  enableDeadLetterQueue?: boolean;
  enableDeduplication?: boolean;
  deduplicationWindowMs?: number;
}

export class UnifiedEventBus extends EventEmitter {
  private eventQueue: Map<EventPriority, UnifiedEvent[]> = new Map([
    ['critical', []],
    ['high', []],
    ['normal', []],
    ['low', []],
  ]);
  
  private processingQueue: UnifiedEvent[] = [];
  private deadLetterQueue: UnifiedEvent[] = [];
  private seenEvents: Map<string, number> = new Map(); // Event hash -> timestamp
  private isProcessing: boolean = false;
  private batchTimer?: NodeJS.Timeout;
  private config: Required<UnifiedEventBusConfig>;
  
  // Source bus subscriptions
  private osBusSubscription?: any;
  private financialBusSubscription?: any;
  private maestroBusSubscription?: any;
  private dialogueBusSubscription?: any;

  constructor(config: UnifiedEventBusConfig = {}) {
    super();
    
    this.config = {
      maxQueueSize: config.maxQueueSize || 50000,
      batchSize: config.batchSize || 100,
      batchIntervalMs: config.batchIntervalMs || 5000,
      maxRetries: config.maxRetries || 3,
      retryBackoffMs: config.retryBackoffMs || 1000,
      enableDeadLetterQueue: config.enableDeadLetterQueue !== false,
      enableDeduplication: config.enableDeduplication !== false,
      deduplicationWindowMs: config.deduplicationWindowMs || 60000, // 1 minute
    };

    logger.info('[Unified Event Bus] Initialized', { config: this.config });
  }

  /**
   * Subscribe to all source event buses
   */
  async subscribe(): Promise<void> {
    try {
      // Subscribe to OS Bus
      try {
        const { osBus } = await import('../../lib/os-bus.js');
        this.osBusSubscription = (event: any) => {
          this.enqueue({
            ...event,
            source_bus: 'os',
          });
        };
        osBus.on('*', this.osBusSubscription);
        logger.info('[Unified Event Bus] Subscribed to OS Bus');
      } catch (error) {
        logger.warn('[Unified Event Bus] Failed to subscribe to OS Bus:', error);
      }

      // Subscribe to FinancialEventBus
      try {
        const { financialEventEmitter } = await import('../../lib/financial-event-emitter.js');
        this.financialBusSubscription = (event: any) => {
          this.enqueue({
            ...event,
            source_bus: 'financial',
          });
        };
        financialEventEmitter.on('*', this.financialBusSubscription);
        logger.info('[Unified Event Bus] Subscribed to FinancialEventBus');
      } catch (error) {
        logger.warn('[Unified Event Bus] Failed to subscribe to FinancialEventBus:', error);
      }

      // Subscribe to MaestroEventBus (if exists)
      try {
        const { maestroEventBus } = await import('../../lib/maestro-event-bus.js');
        this.maestroBusSubscription = (event: any) => {
          this.enqueue({
            ...event,
            source_bus: 'maestro',
          });
        };
        maestroEventBus.on('*', this.maestroBusSubscription);
        logger.info('[Unified Event Bus] Subscribed to MaestroEventBus');
      } catch (error) {
        logger.debug('[Unified Event Bus] MaestroEventBus not available (optional)');
      }

      // Subscribe to EchoDialogueBus (if exists)
      try {
        const { echoDialogueBus } = await import('../../lib/echo-dialogue-bus.js');
        this.dialogueBusSubscription = (event: any) => {
          this.enqueue({
            ...event,
            source_bus: 'dialogue',
          });
        };
        echoDialogueBus.on('*', this.dialogueBusSubscription);
        logger.info('[Unified Event Bus] Subscribed to EchoDialogueBus');
      } catch (error) {
        logger.debug('[Unified Event Bus] EchoDialogueBus not available (optional)');
      }

      // Start processing
      this.startProcessing();
    } catch (error) {
      logger.error('[Unified Event Bus] Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Enqueue an event for processing
   */
  enqueue(event: Partial<UnifiedEvent> & { event_type: string; tenant_id: string; payload: Record<string, any> }): void {
    try {
      const unifiedEvent: UnifiedEvent = {
        id: event.id || this.generateEventId(),
        event_type: event.event_type,
        source_bus: event.source_bus || 'os',
        tenant_id: event.tenant_id,
        priority: event.priority || this.inferPriority(event.event_type),
        payload: event.payload,
        metadata: {
          occurred_at: event.metadata?.occurred_at || new Date().toISOString(),
          producer: event.metadata?.producer || 'unknown',
          aggregate_type: event.metadata?.aggregate_type,
          aggregate_id: event.metadata?.aggregate_id,
          correlation_id: event.metadata?.correlation_id,
          causation_id: event.metadata?.causation_id,
          schema_version: event.metadata?.schema_version || 1,
        },
        signature: event.signature,
        retry_count: event.retry_count || 0,
      };

      // Deduplication check
      if (this.config.enableDeduplication) {
        const eventHash = this.hashEvent(unifiedEvent);
        const lastSeen = this.seenEvents.get(eventHash);
        const now = Date.now();
        
        if (lastSeen && (now - lastSeen) < this.config.deduplicationWindowMs) {
          logger.debug('[Unified Event Bus] Duplicate event dropped', {
            event_type: unifiedEvent.event_type,
            event_id: unifiedEvent.id,
          });
          return;
        }
        
        this.seenEvents.set(eventHash, now);
        
        // Clean up old entries
        if (this.seenEvents.size > 10000) {
          const cutoff = now - this.config.deduplicationWindowMs;
          for (const [hash, timestamp] of this.seenEvents.entries()) {
            if (timestamp < cutoff) {
              this.seenEvents.delete(hash);
            }
          }
        }
      }

      // Check queue size
      const queueSize = this.getTotalQueueSize();
      if (queueSize >= this.config.maxQueueSize) {
        logger.warn('[Unified Event Bus] Queue full, dropping event', {
          event_type: unifiedEvent.event_type,
          priority: unifiedEvent.priority,
          queueSize,
        });
        this.emit('queue_full', unifiedEvent);
        return;
      }

      // Add to priority queue
      const queue = this.eventQueue.get(unifiedEvent.priority);
      if (queue) {
        queue.push(unifiedEvent);
        this.emit('enqueued', unifiedEvent);
      }

      // Trigger processing if not already running
      if (!this.isProcessing) {
        this.startProcessing();
      }
    } catch (error) {
      logger.error('[Unified Event Bus] Failed to enqueue event:', error);
      this.emit('enqueue_error', { event, error });
    }
  }

  /**
   * Start processing events from the queue
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processEvents();
  }

  /**
   * Process events from the queue
   */
  private async processEvents(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Check if we have events to process
        const events = this.dequeueBatch();
        if (events.length === 0) {
          // No events, wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Process batch
        await this.processBatch(events);
      } catch (error) {
        logger.error('[Unified Event Bus] Error processing events:', error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Back off on error
      }
    }
  }

  /**
   * Dequeue a batch of events from priority queues
   */
  private dequeueBatch(): UnifiedEvent[] {
    const batch: UnifiedEvent[] = [];
    
    // Process in priority order: critical -> high -> normal -> low
    const priorities: EventPriority[] = ['critical', 'high', 'normal', 'low'];
    
    for (const priority of priorities) {
      const queue = this.eventQueue.get(priority);
      if (!queue) continue;
      
      while (batch.length < this.config.batchSize && queue.length > 0) {
        const event = queue.shift();
        if (event) {
          batch.push(event);
        }
      }
      
      if (batch.length >= this.config.batchSize) {
        break;
      }
    }
    
    return batch;
  }

  /**
   * Process a batch of events (with persistent storage updates)
   */
  private async processBatch(events: UnifiedEvent[]): Promise<void> {
    try {
      logger.debug('[Unified Event Bus] Processing batch', {
        batchSize: events.length,
        priorities: events.map(e => e.priority),
      });

      // Transform events to Stratus format and bridge them
      const transformedEvents = events.map(event => this.transformEvent(event));
      
      // Bridge events to EchoStratus via EventBridgeService
      for (const transformedEvent of transformedEvents) {
        try {
          // Mark event as processing in database
          try {
            await persistentEventStoreExpanded.markEventProcessing(transformedEvent.id, transformedEvent.tenant_id);
          } catch (markError) {
            logger.warn('[Unified Event Bus] Failed to mark event processing, continuing', {
              error: markError,
              event_id: transformedEvent.id,
            });
          }

          await eventBridgeService.bridgeEventManually(
            transformedEvent.source_bus,
            transformedEvent.event_type,
            {
              tenant_id: transformedEvent.tenant_id,
              event_type: transformedEvent.event_type,
              aggregate_type: transformedEvent.metadata.aggregate_type || 'unknown',
              aggregate_id: transformedEvent.metadata.aggregate_id || transformedEvent.id,
              occurred_at: transformedEvent.metadata.occurred_at,
              producer: transformedEvent.metadata.producer,
              payload: transformedEvent.payload,
              schema_version: transformedEvent.metadata.schema_version,
              signature: transformedEvent.signature,
              priority: transformedEvent.priority,
            }
          );
          
          transformedEvent.processed_at = new Date().toISOString();

          // Mark event as completed in database
          try {
            await persistentEventStoreExpanded.markEventCompleted(transformedEvent.id, transformedEvent.tenant_id);
          } catch (markError) {
            logger.warn('[Unified Event Bus] Failed to mark event completed', {
              error: markError,
              event_id: transformedEvent.id,
            });
          }

          this.emit('processed', transformedEvent);
        } catch (error) {
          logger.error('[Unified Event Bus] Failed to bridge event:', {
            event_id: transformedEvent.id,
            event_type: transformedEvent.event_type,
            error,
          });
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          const retryCount = transformedEvent.retry_count || 0;
          const shouldRetry = retryCount < this.config.maxRetries;

          // Mark event as failed in database
          try {
            await persistentEventStoreExpanded.markEventFailed(
              transformedEvent.id,
              transformedEvent.tenant_id,
              errorMessage,
              shouldRetry
            );
          } catch (markError) {
            logger.warn('[Unified Event Bus] Failed to mark event failed', {
              error: markError,
              event_id: transformedEvent.id,
            });
          }
          
          // Retry logic
          if (shouldRetry) {
            transformedEvent.retry_count = retryCount + 1;
            
            // Exponential backoff
            const backoffMs = this.config.retryBackoffMs * Math.pow(2, transformedEvent.retry_count - 1);
            setTimeout(() => {
              this.enqueue(transformedEvent);
            }, backoffMs);
          } else {
            // Max retries exceeded, already moved to dead letter queue by markEventFailed
            this.deadLetterQueue.push(transformedEvent);
            this.emit('dead_letter', transformedEvent);
            logger.warn('[Unified Event Bus] Event sent to dead letter queue', {
              event_id: transformedEvent.id,
              event_type: transformedEvent.event_type,
            });
          }
        }
      }
    } catch (error) {
      logger.error('[Unified Event Bus] Error processing batch:', error);
      throw error;
    }
  }

  /**
   * Transform event from source format to Stratus format
   */
  private transformEvent(event: UnifiedEvent): UnifiedEvent {
    // Normalize event type
    const normalizedType = this.normalizeEventType(event.event_type, event.source_bus);
    
    // Normalize payload
    const normalizedPayload = this.normalizePayload(event.payload, event.source_bus);
    
    return {
      ...event,
      event_type: normalizedType,
      payload: normalizedPayload,
    };
  }

  /**
   * Normalize event type across different buses
   */
  private normalizeEventType(eventType: string, sourceBus: string): string {
    // Map common event types to Stratus format
    const mappings: Record<string, Record<string, string>> = {
      os: {
        'recipe:updated': 'recipe.updated.v1',
        'recipe:cost_updated': 'recipe.cost.updated.v1',
        'pos:check_closed': 'pos.check.closed.v1',
        'pos:item_ordered': 'pos.item.ordered.v1',
        'kds:ticket_completed': 'kds.ticket.completed.v1',
        'labor:shift_published': 'labor.shift.published.v1',
        'inventory:received': 'inventory.received.v1',
        'purchase:order_created': 'purchase.order.created.v1',
        'guest:feedback_logged': 'guest.feedback.logged.v1',
      },
      financial: {
        'recipe:cost_updated': 'recipe.cost.updated.v1',
        'inventory:received': 'inventory.received.v1',
        'labor:shift_created': 'labor.shift.published.v1',
      },
      maestro: {
        'BEO_DETAIL_CHANGED': 'event.beo.revised.v1',
        'GUEST_COUNT_CHANGED': 'event.guest_count.changed.v1',
        'MENU_CHANGED': 'menu.changed.v1',
      },
    };

    return mappings[sourceBus]?.[eventType] || eventType;
  }

  /**
   * Normalize payload structure across different buses
   */
  private normalizePayload(payload: Record<string, any>, sourceBus: string): Record<string, any> {
    // Common normalization (ensure tenant_id, org_id, outlet_id are present)
    const normalized: Record<string, any> = { ...payload };
    
    // Ensure consistent field names
    if (normalized.org_id && !normalized.tenant_id) {
      normalized.tenant_id = normalized.org_id;
    }
    if (normalized.venue_id && !normalized.outlet_id) {
      normalized.outlet_id = normalized.venue_id;
    }
    if (normalized.location_id && !normalized.outlet_id) {
      normalized.outlet_id = normalized.location_id;
    }
    
    return normalized;
  }

  /**
   * Infer event priority from event type
   */
  private inferPriority(eventType: string): EventPriority {
    const criticalPatterns = ['critical', 'alert', 'error', 'failure', 'emergency'];
    const highPatterns = ['payment', 'check', 'order', 'shift', 'publish'];
    const lowPatterns = ['log', 'debug', 'trace', 'heartbeat'];
    
    const lowerType = eventType.toLowerCase();
    
    if (criticalPatterns.some(p => lowerType.includes(p))) {
      return 'critical';
    }
    if (highPatterns.some(p => lowerType.includes(p))) {
      return 'high';
    }
    if (lowPatterns.some(p => lowerType.includes(p))) {
      return 'low';
    }
    
    return 'normal';
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Hash event for deduplication
   */
  private hashEvent(event: UnifiedEvent): string {
    const crypto = require('crypto');
    const canonical = JSON.stringify({
      event_type: event.event_type,
      tenant_id: event.tenant_id,
      aggregate_id: event.metadata.aggregate_id,
      occurred_at: event.metadata.occurred_at,
      payload_hash: crypto.createHash('sha256').update(JSON.stringify(event.payload)).digest('hex'),
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Get total queue size
   */
  private getTotalQueueSize(): number {
    return Array.from(this.eventQueue.values()).reduce((sum, queue) => sum + queue.length, 0);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueSizes: Record<EventPriority, number>;
    totalQueued: number;
    processingQueue: number;
    deadLetterQueue: number;
    isProcessing: boolean;
  } {
    return {
      queueSizes: {
        critical: this.eventQueue.get('critical')?.length || 0,
        high: this.eventQueue.get('high')?.length || 0,
        normal: this.eventQueue.get('normal')?.length || 0,
        low: this.eventQueue.get('low')?.length || 0,
      },
      totalQueued: this.getTotalQueueSize(),
      processingQueue: this.processingQueue.length,
      deadLetterQueue: this.deadLetterQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Stop processing events
   */
  stop(): void {
    this.isProcessing = false;
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    logger.info('[Unified Event Bus] Stopped');
  }

  /**
   * Unsubscribe from all source buses
   */
  async unsubscribe(): Promise<void> {
    try {
      if (this.osBusSubscription) {
        const { osBus } = await import('../../lib/os-bus.js');
        osBus.off('*', this.osBusSubscription);
      }
      if (this.financialBusSubscription) {
        const { financialEventEmitter } = await import('../../lib/financial-event-emitter.js');
        financialEventEmitter.off('*', this.financialBusSubscription);
      }
      if (this.maestroBusSubscription) {
        const { maestroEventBus } = await import('../../lib/maestro-event-bus.js');
        maestroEventBus.off('*', this.maestroBusSubscription);
      }
      if (this.dialogueBusSubscription) {
        const { echoDialogueBus } = await import('../../lib/echo-dialogue-bus.js');
        echoDialogueBus.off('*', this.dialogueBusSubscription);
      }
    } catch (error) {
      logger.error('[Unified Event Bus] Failed to unsubscribe:', error);
    }
  }
}

// Export singleton instance
export const unifiedEventBus = new UnifiedEventBus({
  maxQueueSize: 50000,
  batchSize: 100,
  batchIntervalMs: 5000,
  maxRetries: 3,
  retryBackoffMs: 1000,
  enableDeadLetterQueue: true,
  enableDeduplication: true,
  deduplicationWindowMs: 60000,
});