/**
 * Stratus Event Emitter Utility
 * 
 * Shared utility for modules to emit events to EchoStratus
 * Provides simple, consistent API for all modules
 * 
 * All text is i18n-ready
 */

import { eventBridgeService } from '../services/echostratus/event-bridge.js';
import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface StratusEventPayload {
  tenant_id?: string;
  org_id?: string;
  organization_id?: string;
  aggregate_id?: string;
  id?: string;
  eventId?: string;
  occurred_at?: string;
  timestamp?: string;
  [key: string]: any;
}

// ============================================================================
// STRATUS EVENT EMITTER
// ============================================================================

export class StratusEventEmitter {
  private signingKey: string;

  constructor() {
    this.signingKey = process.env.STRATUS_SIGNING_KEY || 'default-key-change-in-production';
  }

  /**
   * Emit event to Stratus
   * 
   * @param eventType - Stratus event type (e.g., 'recipe.updated.v1')
   * @param payload - Event payload
   * @param options - Additional options
   */
  async emit(
    eventType: string,
    payload: StratusEventPayload,
    options?: {
      priority?: 'critical' | 'high' | 'normal' | 'low';
      producer?: string;
      aggregateType?: string;
      aggregateId?: string;
    }
  ): Promise<void> {
    try {
      // Extract tenant ID
      const tenantId = payload.tenant_id || payload.org_id || payload.organization_id;
      if (!tenantId) {
        logger.warn(`[Stratus Event Emitter] Missing tenant_id for event: ${eventType}`);
        return;
      }

      // Extract aggregate ID
      const aggregateId = options?.aggregateId || payload.aggregate_id || payload.id || payload.eventId || crypto.randomUUID();

      // Extract occurred_at
      const occurredAt = payload.occurred_at || payload.timestamp || new Date().toISOString();

      // Infer aggregate type if not provided
      const aggregateType = options?.aggregateType || this.inferAggregateType(eventType);

      // Infer producer if not provided
      const producer = options?.producer || this.inferProducer();

      // Sign event
      const signature = this.signEvent(eventType, payload);

      // Bridge event
      await eventBridgeService.bridgeEventManually(
        'os', // Default to OS bus
        eventType,
        {
          tenant_id: tenantId,
          event_type: eventType,
          aggregate_type: aggregateType,
          aggregate_id: aggregateId,
          occurred_at: occurredAt,
          producer,
          payload: this.cleanPayload(payload),
          schema_version: 1,
          signature,
          priority: options?.priority || 'normal',
        }
      );

      logger.debug(`[Stratus Event Emitter] Emitted event: ${eventType} (${aggregateId})`);
    } catch (error: any) {
      logger.error(`[Stratus Event Emitter] Failed to emit event ${eventType}:`, error);
      // Don't throw - event emission should not break module operations
    }
  }

  /**
   * Infer aggregate type from event type
   */
  private inferAggregateType(eventType: string): string {
    if (eventType.includes('recipe')) return 'recipe';
    if (eventType.includes('check') || eventType.includes('pos')) return 'check';
    if (eventType.includes('ticket') || eventType.includes('kds')) return 'ticket';
    if (eventType.includes('shift') || eventType.includes('labor')) return 'shift';
    if (eventType.includes('inventory')) return 'inventory';
    if (eventType.includes('invoice') || eventType.includes('purchase')) return 'invoice';
    if (eventType.includes('event') || eventType.includes('beo')) return 'event';
    if (eventType.includes('guest') || eventType.includes('feedback')) return 'guest';
    return 'unknown';
  }

  /**
   * Infer producer from call stack
   */
  private inferProducer(): string {
    // Try to infer from module path
    const stack = new Error().stack;
    if (stack) {
      if (stack.includes('culinary') || stack.includes('recipe')) return 'kitchen_library';
      if (stack.includes('pos')) return 'pos_system';
      if (stack.includes('kds')) return 'kds_system';
      if (stack.includes('schedule') || stack.includes('labor')) return 'schedule_module';
      if (stack.includes('inventory')) return 'inventory_engine';
      if (stack.includes('purchasing')) return 'purchasing_receiving';
      if (stack.includes('maestro') || stack.includes('beo')) return 'maestro_bqt';
    }
    return 'unknown_module';
  }

  /**
   * Sign event
   */
  private signEvent(eventType: string, payload: any): string {
    const canonical = JSON.stringify({
      event_type: eventType,
      payload,
      timestamp: Date.now(),
    });

    return crypto.createHmac('sha256', this.signingKey).update(canonical).digest('hex');
  }

  /**
   * Clean payload (remove internal fields)
   */
  private cleanPayload(payload: StratusEventPayload): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
      // Skip internal/duplicate fields
      if (['tenant_id', 'org_id', 'organization_id', 'aggregate_id', 'id', 'eventId', 'occurred_at', 'timestamp', '_internal', '__meta'].includes(key)) {
        continue;
      }
      cleaned[key] = value;
    }

    return cleaned;
  }
}

// Export singleton instance
export const stratusEventEmitter = new StratusEventEmitter();

// Convenience function for modules
export async function emitStratusEvent(
  eventType: string,
  payload: StratusEventPayload,
  options?: {
    priority?: 'critical' | 'high' | 'normal' | 'low';
    producer?: string;
    aggregateType?: string;
    aggregateId?: string;
  }
): Promise<void> {
  return stratusEventEmitter.emit(eventType, payload, options);
}
