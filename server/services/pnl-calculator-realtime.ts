/**
 * Real-Time P&L Calculator
 * Subscribes to financial events and updates P&L snapshots in real-time
 * Recalculates health grades and broadcasts updates via WebSocket
 */

import { logger } from "../lib/logger";
import { TypedFinancialEvent } from "../lib/types";
import {
  HealthGradingEngine,
  PnLSnapshot,
  HealthGradeResult,
} from "./health-grading-engine";
import {
  financialEventEmitter,
  FinancialEventPayload,
} from "../lib/financial-event-emitter";

/**
 * Current period P&L state (in-memory, can be backed by cache/DB)
 */
interface PnLState {
  outlet_id: string;
  org_id: string;
  period: string; // YYYY-MM
  revenue: number;
  cogs: number;
  /**
   * Scheduled labor (from shifts) for this period. Used when payroll actuals are not present.
   */
  scheduled_labor_cost: number;
  /**
   * Payroll actuals (posted per pay run) for this period.
   */
  payroll_wages: number;
  payroll_taxes: number;
  payroll_benefits: number;
  payroll_deductions: number;
  payroll_employee_count?: number;
  last_payroll_run_id?: string;
  /**
   * Effective labor cost used for health grade and P&L calculations.
   * Prefers payroll actuals if present; falls back to scheduled labor.
   */
  labor_cost: number;
  overhead_cost: number;
  net_profit: number;
  transaction_count: number;
  last_updated: number;
  health_grade?: HealthGradeResult;
}

/**
 * Type definitions for financial events
 */
export interface ShiftEvent extends TypedFinancialEvent {
  type: "shift:created" | "shift:updated";
  data: {
    shift_id: string;
    labor_cost: number;
    delta?: number;
  };
}

export interface InventoryEvent extends TypedFinancialEvent {
  type: "inventory:consumed" | "inventory:waste-logged";
  data: {
    item_id: string;
    total_cost: number;
  };
}

export interface PurchaseEvent extends TypedFinancialEvent {
  type: "purchase:invoice-recorded";
  data: {
    invoice_id: string;
    amount: number;
    gl_code: string;
  };
}

export interface PayrollRunPostedEvent extends TypedFinancialEvent {
  type: "payroll:run-posted";
  data: {
    payroll_run_id: string;
    period_start: string;
    period_end: string;
    wages: number;
    taxes: number;
    benefits: number;
    deductions?: number;
    employee_count?: number;
    provider?: string;
  };
}

/**
 * Real-Time P&L Calculator
 */
export class PnLCalculatorRealtime {
  // In-memory store of current P&L states keyed by "outlet_id:period"
  private static pnlStates = new Map<string, PnLState>();
  private static updateCallbacks: Set<(state: PnLState) => void> = new Set();
  private static isInitialized = false;

  /**
   * Initialize P&L Calculator with financial event subscriptions
   * Call this once at server startup
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to all financial events
    financialEventEmitter.onAllEvents(async (event: FinancialEventPayload) => {
      try {
        await this.processEvent(event as any);
      } catch (error) {
        logger.error("[PnLCalculator] Failed to process financial event", {
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.isInitialized = true;

    logger.info(
      "[PnLCalculator] Initialized with financial event subscriptions",
    );
  }

  /**
   * Initialize P&L state for outlet/period
   */
  static initializePnL(
    outlet_id: string,
    org_id: string,
    period: string,
    initialData?: Partial<PnLState>,
  ): PnLState {
    const key = `${outlet_id}:${period}`;

    const state: PnLState = {
      outlet_id,
      org_id,
      period,
      revenue: initialData?.revenue ?? 0,
      cogs: initialData?.cogs ?? 0,
      scheduled_labor_cost:
        (initialData as any)?.scheduled_labor_cost ??
        initialData?.labor_cost ??
        0,
      payroll_wages: (initialData as any)?.payroll_wages ?? 0,
      payroll_taxes: (initialData as any)?.payroll_taxes ?? 0,
      payroll_benefits: (initialData as any)?.payroll_benefits ?? 0,
      payroll_deductions: (initialData as any)?.payroll_deductions ?? 0,
      payroll_employee_count: (initialData as any)?.payroll_employee_count,
      last_payroll_run_id: (initialData as any)?.last_payroll_run_id,
      labor_cost: initialData?.labor_cost ?? 0,
      overhead_cost: initialData?.overhead_cost ?? 0,
      net_profit: 0,
      transaction_count: 0,
      last_updated: Date.now(),
    };

    this.pnlStates.set(key, state);
    this.recalculateMetrics(state);

    logger.debug("[PnLCalculator] Initialized P&L", {
      outlet_id,
      period,
      revenue: state.revenue,
    });

    return state;
  }

  /**
   * Get or create P&L state for outlet/period
   */
  static getPnLState(outlet_id: string, period: string): PnLState {
    const key = `${outlet_id}:${period}`;
    if (!this.pnlStates.has(key)) {
      return this.initializePnL(outlet_id, "", period);
    }
    return this.pnlStates.get(key)!;
  }

  /**
   * Process incoming financial event and update P&L
   */
  static async processEvent(
    event: TypedFinancialEvent | FinancialEventPayload,
  ): Promise<PnLState> {
    const { outlet_id, org_id, data } = event;

    // Derive period from timestamp (YYYY-MM)
    const date = new Date(event.timestamp);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // Get or init P&L state
    const state = this.getPnLState(outlet_id, period);
    state.org_id = org_id;

    try {
      // Process based on event type
      switch (event.type) {
        case "shift:created":
        case "shift:updated":
          this.processShiftEvent(state, event as ShiftEvent);
          break;

        case "inventory:consumed":
        case "inventory:waste-logged":
          this.processInventoryEvent(state, event as InventoryEvent);
          break;

        case "purchase:invoice-recorded":
          this.processPurchaseEvent(state, event as PurchaseEvent);
          break;

        case "payroll:run-posted":
          this.processPayrollRunEvent(state, event as PayrollRunPostedEvent);
          break;

        case "recipe:cost-updated":
        case "plate:sold":
        case "purchase:invoice-updated":
        case "event:cost-finalized":
        case "event:budget-updated":
          // Additional event types to be handled
          logger.debug(
            `[PnLCalculator] Event type not yet implemented: ${event.type}`,
          );
          break;
      }

      // Recalculate metrics
      this.recalculateMetrics(state);

      // Update timestamp
      state.last_updated = Date.now();
      state.transaction_count++;

      // Notify subscribers
      this.notifySubscribers(state);

      logger.debug("[PnLCalculator] Event processed", {
        eventType: event.type,
        outlet_id,
        period,
        revenue: state.revenue,
        netProfit: state.net_profit,
      });

      return state;
    } catch (error) {
      logger.error("[PnLCalculator] Error processing event", {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process shift-related events
   */
  private static processShiftEvent(state: PnLState, event: ShiftEvent): void {
    const { data } = event;

    if (event.type === "shift:created") {
      state.scheduled_labor_cost += data.labor_cost;
    } else if (event.type === "shift:updated" && data.delta) {
      state.scheduled_labor_cost += data.delta;
    }
  }

  /**
   * Process inventory-related events
   */
  private static processInventoryEvent(
    state: PnLState,
    event: InventoryEvent,
  ): void {
    const { data } = event;

    if (event.type === "inventory:consumed") {
      state.cogs += data.total_cost;
    } else if (event.type === "inventory:waste-logged") {
      state.cogs += data.total_cost; // Waste is part of COGS
    }
  }

  /**
   * Process purchase-related events
   */
  private static processPurchaseEvent(
    state: PnLState,
    event: PurchaseEvent,
  ): void {
    const { data } = event;

    // Map GL codes to expense categories
    if (data.gl_code.startsWith("50")) {
      // 5xxx codes typically COGS
      state.cogs += data.amount;
    } else if (data.gl_code.startsWith("60")) {
      // 6xxx codes typically operating expenses
      state.overhead_cost += data.amount;
    } else {
      // Default to overhead
      state.overhead_cost += data.amount;
    }
  }

  /**
   * Process payroll run event (actual payroll cost by period)
   */
  private static processPayrollRunEvent(
    state: PnLState,
    event: PayrollRunPostedEvent,
  ): void {
    const { data } = event;

    state.payroll_wages = Number.isFinite(data.wages) ? data.wages : 0;
    state.payroll_taxes = Number.isFinite(data.taxes) ? data.taxes : 0;
    state.payroll_benefits = Number.isFinite(data.benefits) ? data.benefits : 0;
    state.payroll_deductions = Number.isFinite(data.deductions ?? 0)
      ? (data.deductions ?? 0)
      : 0;
    state.payroll_employee_count = data.employee_count;
    state.last_payroll_run_id = data.payroll_run_id;
  }

  /**
   * Recalculate derived metrics
   */
  private static recalculateMetrics(state: PnLState): void {
    const payrollTotal =
      (state.payroll_wages || 0) +
      (state.payroll_taxes || 0) +
      (state.payroll_benefits || 0);

    state.labor_cost =
      payrollTotal > 0 ? payrollTotal : state.scheduled_labor_cost;

    // Calculate net profit
    state.net_profit =
      state.revenue - state.cogs - state.labor_cost - state.overhead_cost;

    // Calculate health grade
    if (state.revenue > 0) {
      const pnlSnapshot: PnLSnapshot = {
        revenue: state.revenue,
        cogs: state.cogs,
        cogs_percentage: (state.cogs / state.revenue) * 100,
        labor_cost: state.labor_cost,
        labor_percentage: (state.labor_cost / state.revenue) * 100,
        overhead_cost: state.overhead_cost,
        overhead_percentage: (state.overhead_cost / state.revenue) * 100,
        net_profit: state.net_profit,
        net_margin_percentage: (state.net_profit / state.revenue) * 100,
      };

      state.health_grade =
        HealthGradingEngine.calculateHealthGrade(pnlSnapshot);
    }
  }

  /**
   * Subscribe to P&L updates
   */
  static subscribe(callback: (state: PnLState) => void): () => void {
    this.updateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of P&L update
   */
  private static notifySubscribers(state: PnLState): void {
    for (const callback of this.updateCallbacks) {
      try {
        callback(state);
      } catch (error) {
        logger.error("[PnLCalculator] Subscriber error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get all current P&L states
   */
  static getAllStates(): PnLState[] {
    return Array.from(this.pnlStates.values());
  }

  /**
   * Get P&L states for specific outlet
   */
  static getOutletStates(outlet_id: string): PnLState[] {
    return Array.from(this.pnlStates.values()).filter(
      (state) => state.outlet_id === outlet_id,
    );
  }

  /**
   * Clear all states (for testing)
   */
  static clear(): void {
    this.pnlStates.clear();
    this.updateCallbacks.clear();
  }

  /**
   * Get summary for outlet/period
   */
  static getSummary(
    outlet_id: string,
    period: string,
  ): {
    state: PnLState;
    summary: string;
  } | null {
    const state = this.getPnLState(outlet_id, period);

    if (!state.health_grade) {
      return null;
    }

    return {
      state,
      summary: HealthGradingEngine.getSummary(state.health_grade),
    };
  }
}

/**
 * Global P&L state type for exports
 */
export { PnLState };
