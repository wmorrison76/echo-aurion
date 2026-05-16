/**
 * EchoAI³ Enhanced Context Awareness Engine
 * -----------------------------------------
 * Understands current operational state deeply
 * Example: "We have a banquet tonight, low staffing, and inventory shortage - prioritize critical items"
 */

export interface OperationalState {
  timestamp: string;
  modules: Record<string, ModuleState>;
  alerts: Alert[];
  metrics: OperationalMetrics;
}

export interface ModuleState {
  module: string;
  status: "normal" | "warning" | "critical";
  data: Record<string, any>;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  module: string;
  timestamp: string;
}

export interface OperationalMetrics {
  inventoryLowItems: number;
  upcomingEvents: number;
  staffShortage: boolean;
  costVariance: number;
  demandForecast: number;
}

export interface ContextualQuery {
  query: string;
  context?: Record<string, any>;
  includeHistorical?: boolean;
}

export interface ContextualResponse {
  query: string;
  relevantContext: RelevantContext;
  enrichedQuery: string;
  suggestions: string[];
  timestamp: string;
}

export interface RelevantContext {
  operationalState: OperationalState;
  historicalPatterns: string[];
  relatedAlerts: Alert[];
  recommendedActions: string[];
}

/**
 * Context Awareness Engine
 * Aggregates operational state from all modules and enriches queries with context
 */
export class ContextAwarenessEngine {
  private stateStore: Map<string, OperationalState> = new Map();
  private stateUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startStateAggregation();
  }

  /**
   * Get current operational state
   */
  async getOperationalState(orgId: string): Promise<OperationalState> {
    // Check cache first
    const cachedState = this.stateStore.get(orgId);
    if (cachedState && this.isStateFresh(cachedState)) {
      return cachedState;
    }

    // Aggregated state from all modules
    const state = await this.aggregateOperationalState(orgId);
    this.stateStore.set(orgId, state);

    return state;
  }

  /**
   * Enrich query with relevant context
   */
  async enrichQuery(
    query: ContextualQuery,
    orgId: string,
  ): Promise<ContextualResponse> {
    // Get current operational state
    const operationalState = await this.getOperationalState(orgId);

    // Identify relevant context
    const relevantContext = this.identifyRelevantContext(
      query.query,
      operationalState,
      query.includeHistorical || false,
    );

    // Enrich query with context
    const enrichedQuery = this.buildEnrichedQuery(query.query, relevantContext);

    // Generate suggestions based on context
    const suggestions = this.generateContextualSuggestions(
      query.query,
      relevantContext,
    );

    return {
      query: query.query,
      relevantContext,
      enrichedQuery,
      suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Aggregate operational state from all modules
   */
  private async aggregateOperationalState(
    orgId: string,
  ): Promise<OperationalState> {
    const modules: Record<string, ModuleState> = {};

    // Aggregate state from each module
    // In production, these would be actual API calls or database queries

    // Inventory module state
    modules.inventory = await this.getInventoryState(orgId);

    // Schedule module state
    modules.schedule = await this.getScheduleState(orgId);

    // Finance module state
    modules.finance = await this.getFinanceState(orgId);

    // Culinary module state
    modules.culinary = await this.getCulinaryState(orgId);

    // Event/Banquet module state
    modules.events = await this.getEventsState(orgId);

    // Calculate metrics
    const metrics = this.calculateMetrics(modules);

    // Collect alerts
    const alerts = this.collectAlerts(modules);

    return {
      timestamp: new Date().toISOString(),
      modules,
      alerts,
      metrics,
    };
  }

  /**
   * Get inventory module state
   */
  private async getInventoryState(orgId: string): Promise<ModuleState> {
    // Mock implementation - in production, query actual inventory data
    return {
      module: "inventory",
      status: "warning", // Could be normal, warning, or critical
      data: {
        lowStockItems: 5,
        totalItems: 150,
        reorderNeeded: 3,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get schedule module state
   */
  private async getScheduleState(orgId: string): Promise<ModuleState> {
    // Mock implementation - in production, query actual schedule data
    return {
      module: "schedule",
      status: "normal",
      data: {
        scheduledHours: 120,
        requiredHours: 115,
        coverage: "adequate",
        upcomingShifts: 8,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get finance module state
   */
  private async getFinanceState(orgId: string): Promise<ModuleState> {
    // Mock implementation - in production, query actual financial data
    return {
      module: "finance",
      status: "normal",
      data: {
        currentMargin: 18.5,
        targetMargin: 20.0,
        costVariance: -2.5,
        revenue: 45000,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get culinary module state
   */
  private async getCulinaryState(orgId: string): Promise<ModuleState> {
    // Mock implementation - in production, query actual culinary data
    return {
      module: "culinary",
      status: "normal",
      data: {
        activeRecipes: 45,
        pendingOrders: 12,
        prepList: 8,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get events module state
   */
  private async getEventsState(orgId: string): Promise<ModuleState> {
    // Mock implementation - in production, query actual events data
    return {
      module: "events",
      status: "warning",
      data: {
        upcomingEvents: 2,
        todayEvents: 1,
        totalGuests: 150,
        requiredStaff: 8,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate operational metrics
   */
  private calculateMetrics(
    modules: Record<string, ModuleState>,
  ): OperationalMetrics {
    const inventoryState = modules.inventory?.data || {};
    const scheduleState = modules.schedule?.data || {};
    const financeState = modules.finance?.data || {};
    const eventsState = modules.events?.data || {};

    return {
      inventoryLowItems: inventoryState.lowStockItems || 0,
      upcomingEvents: eventsState.upcomingEvents || 0,
      staffShortage:
        (scheduleState.scheduledHours || 0) <
        (scheduleState.requiredHours || 0),
      costVariance: financeState.costVariance || 0,
      demandForecast: 0, // Would come from forecast module
    };
  }

  /**
   * Collect alerts from modules
   */
  private collectAlerts(modules: Record<string, ModuleState>): Alert[] {
    const alerts: Alert[] = [];

    for (const [moduleName, moduleState] of Object.entries(modules)) {
      if (moduleState.status === "critical") {
        alerts.push({
          id: `alert_${moduleName}_${Date.now()}`,
          type: "module_critical",
          severity: "critical",
          message: `${moduleName} module is in critical state`,
          module: moduleName,
          timestamp: moduleState.lastUpdated,
        });
      } else if (moduleState.status === "warning") {
        alerts.push({
          id: `alert_${moduleName}_${Date.now()}`,
          type: "module_warning",
          severity: "high",
          message: `${moduleName} module requires attention`,
          module: moduleName,
          timestamp: moduleState.lastUpdated,
        });
      }
    }

    return alerts;
  }

  /**
   * Identify relevant context for query
   */
  private identifyRelevantContext(
    query: string,
    operationalState: OperationalState,
    includeHistorical: boolean,
  ): RelevantContext {
    const lowerQuery = query.toLowerCase();
    const relevantContext: RelevantContext = {
      operationalState,
      historicalPatterns: [],
      relatedAlerts: [],
      recommendedActions: [],
    };

    // Identify relevant modules based on query
    if (lowerQuery.includes("inventory") || lowerQuery.includes("stock")) {
      relevantContext.relatedAlerts.push(
        ...operationalState.alerts.filter((a) => a.module === "inventory"),
      );

      if (operationalState.modules.inventory?.status === "warning") {
        relevantContext.recommendedActions.push(
          "Review low stock items and place reorders",
        );
      }
    }

    if (
      lowerQuery.includes("schedule") ||
      lowerQuery.includes("staff") ||
      lowerQuery.includes("labor")
    ) {
      relevantContext.relatedAlerts.push(
        ...operationalState.alerts.filter((a) => a.module === "schedule"),
      );

      if (operationalState.metrics.staffShortage) {
        relevantContext.recommendedActions.push(
          "Schedule additional staff to meet demand",
        );
      }
    }

    if (
      lowerQuery.includes("cost") ||
      lowerQuery.includes("price") ||
      lowerQuery.includes("margin") ||
      lowerQuery.includes("financial")
    ) {
      relevantContext.relatedAlerts.push(
        ...operationalState.alerts.filter((a) => a.module === "finance"),
      );

      if (operationalState.metrics.costVariance < -5) {
        relevantContext.recommendedActions.push(
          "Review cost controls and pricing strategy",
        );
      }
    }

    if (
      lowerQuery.includes("event") ||
      lowerQuery.includes("banquet") ||
      lowerQuery.includes("catering")
    ) {
      relevantContext.relatedAlerts.push(
        ...operationalState.alerts.filter((a) => a.module === "events"),
      );

      if (operationalState.metrics.upcomingEvents > 0) {
        relevantContext.recommendedActions.push(
          `Prepare for ${operationalState.metrics.upcomingEvents} upcoming event(s)`,
        );
      }
    }

    // Add historical patterns if requested
    if (includeHistorical) {
      relevantContext.historicalPatterns = this.getHistoricalPatterns(query);
    }

    return relevantContext;
  }

  /**
   * Get historical patterns relevant to query
   */
  private getHistoricalPatterns(query: string): string[] {
    // Mock implementation - in production, query historical data
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("inventory")) {
      return [
        "Inventory orders typically placed on Mondays",
        "Peak demand occurs on weekends",
      ];
    }

    if (lowerQuery.includes("schedule")) {
      return [
        "Weekend shifts require 20% more staff",
        "Evening shifts are busiest",
      ];
    }

    return [];
  }

  /**
   * Build enriched query with context
   */
  private buildEnrichedQuery(
    originalQuery: string,
    context: RelevantContext,
  ): string {
    let enrichedQuery = originalQuery;

    // Add context information
    const contextParts: string[] = [];

    // Add operational state context
    if (context.relatedAlerts.length > 0) {
      contextParts.push(
        `Current alerts: ${context.relatedAlerts.map((a) => a.message).join(", ")}`,
      );
    }

    // Add metrics context
    if (context.operationalState.metrics.inventoryLowItems > 0) {
      contextParts.push(
        `${context.operationalState.metrics.inventoryLowItems} items are low in stock`,
      );
    }

    if (context.operationalState.metrics.upcomingEvents > 0) {
      contextParts.push(
        `${context.operationalState.metrics.upcomingEvents} upcoming event(s)`,
      );
    }

    if (context.operationalState.metrics.staffShortage) {
      contextParts.push("Staff shortage detected");
    }

    // Combine enriched query
    if (contextParts.length > 0) {
      enrichedQuery = `${originalQuery}. Context: ${contextParts.join("; ")}`;
    }

    return enrichedQuery;
  }

  /**
   * Generate contextual suggestions
   */
  private generateContextualSuggestions(
    query: string,
    context: RelevantContext,
  ): string[] {
    const suggestions: string[] = [];

    // Add recommended actions
    suggestions.push(...context.recommendedActions);

    // Add context-specific suggestions
    if (context.operationalState.metrics.inventoryLowItems > 0) {
      suggestions.push(
        `Check inventory levels for ${context.operationalState.metrics.inventoryLowItems} low stock items`,
      );
    }

    if (context.operationalState.metrics.upcomingEvents > 0) {
      suggestions.push(
        `Review event details for ${context.operationalState.metrics.upcomingEvents} upcoming event(s)`,
      );
    }

    if (context.operationalState.metrics.staffShortage) {
      suggestions.push("Review staffing needs and schedule adjustments");
    }

    // Default suggestion if none provided
    if (suggestions.length === 0) {
      suggestions.push("System is operating normally. Continue monitoring.");
    }

    return suggestions;
  }

  /**
   * Check if state is fresh (within last 5 minutes)
   */
  private isStateFresh(state: OperationalState): boolean {
    const stateAge = Date.now() - new Date(state.timestamp).getTime();
    return stateAge < 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start periodic state aggregation
   */
  private startStateAggregation(): void {
    // Update state every 5 minutes
    this.stateUpdateInterval = setInterval(
      () => {
        // Clear cache to force refresh on next request
        this.stateStore.clear();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Stop state aggregation
   */
  stopStateAggregation(): void {
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
      this.stateUpdateInterval = null;
    }
  }
}

// Singleton instance
let contextAwarenessInstance: ContextAwarenessEngine | null = null;

export function getContextAwarenessEngine(): ContextAwarenessEngine {
  if (!contextAwarenessInstance) {
    contextAwarenessInstance = new ContextAwarenessEngine();
  }
  return contextAwarenessInstance;
}

export default ContextAwarenessEngine;
