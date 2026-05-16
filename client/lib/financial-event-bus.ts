/**
 * Financial Event Bus
 * Central event emitter for broadcasting financial transactions across modules
 * Enables real-time data pipeline: Schedule, Culinary, Inventory, Purchasing, Events → Financial Aggregator
 */

export type FinancialEventType =
  | 'shift:created'
  | 'shift:updated'
  | 'shift:deleted'
  | 'recipe:cost-updated'
  | 'plate:sold'
  | 'inventory:consumed'
  | 'inventory:waste-logged'
  | 'purchase:invoice-recorded'
  | 'purchase:invoice-updated'
  | 'event:cost-finalized'
  | 'event:budget-updated';

/**
 * Base financial event structure
 */
export interface FinancialEvent {
  type: FinancialEventType;
  timestamp: number;
  outlet_id: string;
  org_id: string;
  data: Record<string, any>;
  metadata?: {
    source: string;
    user_id?: string;
    transaction_id?: string;
  };
}

/**
 * Specific event types for type safety
 */

export interface ShiftCreatedEvent extends FinancialEvent {
  type: 'shift:created';
  data: {
    shift_id: string;
    employee_id: string;
    start_time: number;
    end_time: number;
    hourly_rate: number;
    labor_cost: number;
  };
}

export interface ShiftUpdatedEvent extends FinancialEvent {
  type: 'shift:updated';
  data: {
    shift_id: string;
    previous_labor_cost: number;
    new_labor_cost: number;
    delta: number;
  };
}

export interface InventoryConsumedEvent extends FinancialEvent {
  type: 'inventory:consumed';
  data: {
    item_id: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  };
}

export interface InventoryWasteEvent extends FinancialEvent {
  type: 'inventory:waste-logged';
  data: {
    item_id: string;
    quantity_wasted: number;
    unit_cost: number;
    waste_value: number;
  };
}

export interface PurchaseInvoiceEvent extends FinancialEvent {
  type: 'purchase:invoice-recorded';
  data: {
    invoice_id: string;
    supplier_id: string;
    amount: number;
    gl_code: string;
    items: Array<{
      item_id: string;
      quantity: number;
      unit_cost: number;
    }>;
  };
}

export interface EventCostFinalizedEvent extends FinancialEvent {
  type: 'event:cost-finalized';
  data: {
    event_id: string;
    venue_cost: number;
    catering_cost: number;
    labor_cost: number;
    total_cost: number;
  };
}

export type TypedFinancialEvent =
  | ShiftCreatedEvent
  | ShiftUpdatedEvent
  | InventoryConsumedEvent
  | InventoryWasteEvent
  | PurchaseInvoiceEvent
  | EventCostFinalizedEvent;

/**
 * Event handler callback
 */
export type EventHandler = (event: TypedFinancialEvent) => void | Promise<void>;

/**
 * Financial Event Bus - singleton pattern
 * Manages event subscriptions and broadcasts
 */
class FinancialEventBusImpl {
  private listeners: Map<FinancialEventType, EventHandler[]> = new Map();
  private wildcardListeners: EventHandler[] = [];
  private eventHistory: TypedFinancialEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Subscribe to specific event type
   */
  on(eventType: FinancialEventType, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const handlers = this.listeners.get(eventType)!;
    handlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAll(handler: EventHandler): () => void {
    this.wildcardListeners.push(handler);

    return () => {
      const index = this.wildcardListeners.indexOf(handler);
      if (index > -1) {
        this.wildcardListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit event to all listeners
   */
  async emit(event: TypedFinancialEvent): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify type-specific listeners
    const handlers = this.listeners.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[FinancialEventBus] Error in handler for ${event.type}:`,
          error
        );
      }
    }

    // Notify wildcard listeners
    for (const handler of this.wildcardListeners) {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          '[FinancialEventBus] Error in wildcard handler:',
          error
        );
      }
    }
  }

  /**
   * Get recent event history
   */
  getHistory(type?: FinancialEventType, limit: number = 100): TypedFinancialEvent[] {
    let events = this.eventHistory;

    if (type) {
      events = events.filter((e) => e.type === type);
    }

    return events.slice(-limit);
  }

  /**
   * Clear all listeners (for testing)
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners = [];
    this.eventHistory = [];
  }

  /**
   * Get listener count
   */
  getListenerCount(type?: FinancialEventType): number {
    if (type) {
      return (this.listeners.get(type) || []).length;
    }
    let total = this.wildcardListeners.length;
    for (const handlers of this.listeners.values()) {
      total += handlers.length;
    }
    return total;
  }
}

// Export singleton instance
export const financialEventBus = new FinancialEventBusImpl();

/**
 * Helper to create base event structure
 */
export function createFinancialEvent<T extends FinancialEventType>(
  type: T,
  outlet_id: string,
  org_id: string,
  data: any,
  metadata?: FinancialEvent['metadata']
): TypedFinancialEvent {
  return {
    type,
    timestamp: Date.now(),
    outlet_id,
    org_id,
    data,
    metadata,
  } as TypedFinancialEvent;
}
