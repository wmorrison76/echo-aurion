/**
 * Maestro Event Bus
 *
 * Central pub/sub system for cross-module communication in Maestro.
 * Enables panels and services to subscribe to operational changes.
 *
 * Event Types:
 * - EVENT_SELECTED: User selected a different event
 * - EVENT_UPDATED: Event data changed
 * - CHANGELOG_ENTRY_CREATED: New change recorded
 * - CHANGELOG_APPLIED: Change executed with auto-actions
 * - CHANGE_REJECTED: Change was rejected
 * - RISK_DETECTED: New risk flag created
 * - RISK_RESOLVED: Risk flag resolved
 * - MENU_CHANGED: Menu items modified
 * - GUEST_COUNT_CHANGED: Guest count updated (triggers cascading updates)
 * - PRODUCTION_UPDATED: Production breakdown recalculated
 * - INVENTORY_DELTA: Inventory impact detected
 * - LABOR_REQUIREMENT_UPDATED: Staffing needs changed
 * - AUTO_ACTION_EXECUTED: System action completed
 * - AUTO_ACTION_FAILED: System action failed
 */

export const EVENT_TYPES = {
  EVENT_SELECTED: "event:selected",
  EVENT_UPDATED: "event:updated",
  CHANGELOG_ENTRY_CREATED: "changelog:entry_created",
  CHANGELOG_APPLIED: "changelog:applied",
  CHANGE_REJECTED: "changelog:rejected",
  RISK_DETECTED: "risk:detected",
  RISK_RESOLVED: "risk:resolved",
  MENU_CHANGED: "menu:changed",
  GUEST_COUNT_CHANGED: "guest_count:changed",
  PRODUCTION_UPDATED: "production:updated",
  INVENTORY_DELTA: "inventory:delta",
  LABOR_REQUIREMENT_UPDATED: "labor:requirement_updated",
  AUTO_ACTION_EXECUTED: "auto_action:executed",
  AUTO_ACTION_FAILED: "auto_action:failed",
  BEO_SELECTED: "beo:selected",
  BEO_DETAIL_CHANGED: "beo:detail_changed",
  BEO_MENU_CHANGED: "beo:menu_changed",
  BEO_AI_ORDER_UPDATED: "beo:ai_order_updated",
  BEO_AI_ORDER_APPROVED: "beo:ai_order_approved",
  BEO_AI_ORDER_REJECTED: "beo:ai_order_rejected",
  BEO_AI_FEEDBACK_SUBMITTED: "beo:ai_feedback_submitted",
  BEO_PURCHASE_ORDER_CREATED: "beo:purchase_order_created",
  OPEN_MODULE: "app:open_module",
  RECIPE_LINKED: "recipe:linked",
  RECIPE_ADDED: "recipe:added",
  AI_ORDER_UPDATED: "ai_order:updated",
} as const;

type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

interface EventListener<T = any> {
  (payload: T): void;
}

class MaestroEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe to an event type
   * @returns Unsubscribe function
   */
  public subscribeTo<T = any>(
    eventType: EventType,
    listener: EventListener<T>,
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)?.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  public emit<T = any>(eventType: EventType, payload: T): void {
    const listeners = this.listeners.get(eventType);
    if (!listeners) return;

    // Call all listeners asynchronously to avoid blocking
    listeners.forEach((listener) => {
      try {
        // Use Promise.resolve to defer execution
        Promise.resolve().then(() => {
          (listener as EventListener<T>)(payload);
        });
      } catch (err) {
        console.error(
          `[MAESTRO-EVENT-BUS] Error in listener for ${eventType}:`,
          err,
        );
      }
    });
  }

  /**
   * Subscribe to multiple event types
   */
  public subscribeToMultiple(
    eventTypes: EventType[],
    listener: (eventType: EventType, payload: any) => void,
  ): () => void {
    const unsubscribers = eventTypes.map((eventType) =>
      this.subscribeTo(eventType, (payload) => listener(eventType, payload)),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Clear all listeners (useful for cleanup/testing)
   */
  public clear(): void {
    this.listeners.clear();
  }

  /**
   * Get listener count for debugging
   */
  public getListenerCount(eventType?: EventType): number {
    if (!eventType) {
      return Array.from(this.listeners.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      );
    }
    return this.listeners.get(eventType)?.size ?? 0;
  }
}

// Singleton instance
export const maestroEventBus = new MaestroEventBus();

/**
 * Common event payloads
 */
export interface EventSelectedPayload {
  eventId: string;
  eventName: string;
}

export interface ChangelogEntryCreatedPayload {
  eventId: string;
  changelogId: string;
  field: string;
  oldValue: any;
  newValue: any;
  source: string;
}

export interface ChangelogAppliedPayload {
  eventId: string;
  changelogId: string;
  autoActionsExecuted: number;
}

export interface RiskDetectedPayload {
  eventId: string;
  riskId: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface GuestCountChangedPayload {
  eventId: string;
  previousCount: number;
  newCount: number;
  affectedSystems: string[];
}

export interface InventoryDeltaPayload {
  eventId: string;
  itemId: string;
  itemName: string;
  shortage: number;
  suggestedOrder: number;
}

export interface LaborRequirementUpdatedPayload {
  eventId: string;
  stationId: string;
  newHeadcount: number;
  gaps: number;
  overtimeRisk: boolean;
}

export interface AutoActionExecutedPayload {
  eventId: string;
  autoActionId: string;
  system: string;
  action: string;
  duration: number; // milliseconds
}

export interface AutoActionFailedPayload {
  eventId: string;
  autoActionId: string;
  system: string;
  action: string;
  error: string;
}
