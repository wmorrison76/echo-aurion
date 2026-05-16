/**
 * Event Bus
 * Central pub/sub system for cross-module communication
 */

import type { EventBusMessage, EventBus } from "./types";

class MaestroEventBus implements EventBus {
  private subscribers: Map<string, Set<(msg: EventBusMessage) => void>> =
    new Map();
  private messageHistory: EventBusMessage[] = [];
  private maxHistorySize = 1000;

  subscribe(
    eventType: string,
    handler: (msg: EventBusMessage) => void,
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(handler);
    };
  }

  subscribeTo(eventType: string, callback: (data: any) => void): () => void {
    return this.subscribe(eventType, (msg) => {
      callback(msg.payload);
    });
  }

  publish(message: EventBusMessage): void {
    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Get subscribers for this event type
    const handlers = this.subscribers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(
            `[EventBus] Error in handler for ${message.type}:`,
            error,
          );
        }
      });
    }

    // Wildcard subscribers (*)
    const wildcardHandlers = this.subscribers.get("*");
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[EventBus] Error in wildcard handler:", error);
        }
      });
    }

    // Log all events in development (debug to reduce console noise)
    if (import.meta.env.DEV) {
      console.debug(
        `[EventBus] ${message.type} from ${message.source}`,
        message,
      );
    }
  }

  /**
   * Get recent messages of a specific type
   */
  getHistory(eventType?: string, limit = 50): EventBusMessage[] {
    let messages = this.messageHistory;

    if (eventType) {
      messages = messages.filter((m) => m.type === eventType);
    }

    return messages.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Get current subscriptions (for debugging)
   */
  getSubscriptions(): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    this.subscribers.forEach((handlers, eventType) => {
      result[eventType] = handlers.size;
    });
    return result;
  }
}

// Global event bus singleton
export const maestroEventBus = new MaestroEventBus();

// Event type constants
export const EVENT_TYPES = {
  // Event Management
  EVENT_CREATED: "EVENT_CREATED",
  EVENT_UPDATED: "EVENT_UPDATED",
  EVENT_DELETED: "EVENT_DELETED",
  EVENT_STATUS_CHANGED: "EVENT_STATUS_CHANGED",

  // Guest Management
  GUEST_COUNT_CHANGED: "GUEST_COUNT_CHANGED",
  GUEST_REQUIREMENT_UPDATED: "GUEST_REQUIREMENT_UPDATED",

  // Space Management
  SPACE_UPDATED: "SPACE_UPDATED",
  SPACE_AVAILABILITY_CHANGED: "SPACE_AVAILABILITY_CHANGED",
  SPACE_CONFLICT_DETECTED: "SPACE_CONFLICT_DETECTED",

  // Time Changes
  EVENT_TIME_CHANGED: "EVENT_TIME_CHANGED",
  SCHEDULE_CONFLICT_DETECTED: "SCHEDULE_CONFLICT_DETECTED",

  // Inventory
  SHORTAGE_DETECTED: "SHORTAGE_DETECTED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
  PURCHASING_ORDER_CREATED: "PURCHASING_ORDER_CREATED",

  // Labor
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  STAFFING_CONFLICT: "STAFFING_CONFLICT",

  // Production
  PREP_PLAN_UPDATED: "PREP_PLAN_UPDATED",
  PRODUCTION_CONFLICT: "PRODUCTION_CONFLICT",
  STATION_CAPACITY_WARNING: "STATION_CAPACITY_WARNING",

  // Financial
  MARGIN_RISK_DETECTED: "MARGIN_RISK_DETECTED",
  REVENUE_PROJECTION_UPDATED: "REVENUE_PROJECTION_UPDATED",
  COST_PROJECTION_UPDATED: "COST_PROJECTION_UPDATED",

  // Engineering/Facilities
  HVAC_CONFLICT_DETECTED: "HVAC_CONFLICT_DETECTED",
  AV_REQUIREMENT_UPDATED: "AV_REQUIREMENT_UPDATED",
  MAINTENANCE_WINDOW_CREATED: "MAINTENANCE_WINDOW_CREATED",

  // System
  MODULE_LOADED: "MODULE_LOADED",
  MODULE_ERROR: "MODULE_ERROR",
  DATA_SYNC_STARTED: "DATA_SYNC_STARTED",
  DATA_SYNC_COMPLETED: "DATA_SYNC_COMPLETED",
  CONFLICT_RESOLVED: "CONFLICT_RESOLVED",
} as const;

/**
 * Helper to publish an event with standard metadata
 */
export function publishEvent(
  type: string,
  payload: any,
  source: string,
  metadata?: any,
): void {
  maestroEventBus.publish({
    type,
    source,
    payload,
    timestamp: Date.now(),
    metadata,
  });
}

export default maestroEventBus;
