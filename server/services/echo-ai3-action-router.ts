/**
 * EchoAI^3 Action Router
 * Routes AI actions to appropriate module APIs
 */

import { logger } from "../lib/logger";
import { getEchoAI3ActionExecutor } from "./echo-ai3-action-executor";

export interface ActionRoute {
  actionType: string;
  module: string;
  endpoint: string;
  method: string;
  requiresAuth: boolean;
  requiresConfirmation: boolean;
  confidenceThreshold: number;
}

export class EchoAI3ActionRouter {
  private routes: Map<string, ActionRoute> = new Map();

  constructor() {
    this.registerDefaultRoutes();
  }

  /**
   * Register default action routes
   */
  private registerDefaultRoutes(): void {
    // Inventory actions
    this.registerRoute({
      actionType: "create_order",
      module: "inventory",
      endpoint: "/api/inventory-echoai/order-decision",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: false,
      confidenceThreshold: 0.85,
    });

    this.registerRoute({
      actionType: "update_par_level",
      module: "inventory",
      endpoint: "/api/inventory/items/:itemId/par-level",
      method: "PATCH",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.90,
    });

    // Purchasing actions
    this.registerRoute({
      actionType: "create_po",
      module: "purchasing",
      endpoint: "/api/purchasing/purchase-orders",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.85,
    });

    this.registerRoute({
      actionType: "approve_po",
      module: "purchasing",
      endpoint: "/api/purchasing/approvals/:approvalId/approve",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.90,
    });

    // Schedule actions
    this.registerRoute({
      actionType: "create_shift",
      module: "schedule",
      endpoint: "/api/schedule/shifts",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: false,
      confidenceThreshold: 0.80,
    });

    this.registerRoute({
      actionType: "assign_staff",
      module: "schedule",
      endpoint: "/api/schedule/shifts/:shiftId/assign",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: false,
      confidenceThreshold: 0.85,
    });

    // Maestro actions
    this.registerRoute({
      actionType: "create_beo",
      module: "maestro",
      endpoint: "/api/maestro/beos",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.85,
    });

    this.registerRoute({
      actionType: "update_production",
      module: "maestro",
      endpoint: "/api/maestro/production/:productionId",
      method: "PATCH",
      requiresAuth: true,
      requiresConfirmation: false,
      confidenceThreshold: 0.80,
    });

    // Culinary actions
    this.registerRoute({
      actionType: "suggest_recipe",
      module: "culinary",
      endpoint: "/api/echo-chef/suggest",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: false,
      confidenceThreshold: 0.75,
    });

    this.registerRoute({
      actionType: "update_cost",
      module: "culinary",
      endpoint: "/api/recipes/:recipeId/cost",
      method: "PATCH",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.85,
    });

    // EchoAurum actions
    this.registerRoute({
      actionType: "post_gl",
      module: "echoaurum",
      endpoint: "/api/aurum/gl/post",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.95,
    });

    this.registerRoute({
      actionType: "approve_invoice",
      module: "echoaurum",
      endpoint: "/api/aurum/ap/invoices/:invoiceId/approve",
      method: "POST",
      requiresAuth: true,
      requiresConfirmation: true,
      confidenceThreshold: 0.90,
    });
  }

  /**
   * Register a new action route
   */
  registerRoute(route: ActionRoute): void {
    const key = `${route.module}:${route.actionType}`;
    this.routes.set(key, route);
    logger.debug("Action route registered", { key, route });
  }

  /**
   * Route an action to the appropriate endpoint
   */
  async routeAction(
    module: string,
    actionType: string,
    parameters: Record<string, any>,
    confidence: number,
    userId?: string,
    organizationId?: string,
    traceId?: string
  ): Promise<{ success: boolean; route?: ActionRoute; error?: string }> {
    const key = `${module}:${actionType}`;
    const route = this.routes.get(key);

    if (!route) {
      return {
        success: false,
        error: `No route found for ${key}`,
      };
    }

    // Check confidence threshold
    if (confidence < route.confidenceThreshold) {
      return {
        success: false,
        error: `Confidence ${confidence} below threshold ${route.confidenceThreshold}`,
        route,
      };
    }

    // Route to action executor (traceId is idempotency key when provided)
    const executor = getEchoAI3ActionExecutor();
    const result = await executor.executeAction({
      actionId: traceId ?? `${key}-${Date.now()}`,
      actionType,
      module,
      target: route.endpoint,
      parameters,
      confidence,
      requiresConfirmation: route.requiresConfirmation,
      userId,
      organizationId: organizationId || "",
    });

    if (result.success) {
      return { success: true, route };
    } else {
      return { success: false, route, error: result.error };
    }
  }

  /**
   * Get all registered routes
   */
  getRoutes(): ActionRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get routes for a specific module
   */
  getModuleRoutes(module: string): ActionRoute[] {
    return Array.from(this.routes.values()).filter((r) => r.module === module);
  }
}

let actionRouterInstance: EchoAI3ActionRouter | null = null;

export function getEchoAI3ActionRouter(): EchoAI3ActionRouter {
  if (!actionRouterInstance) {
    actionRouterInstance = new EchoAI3ActionRouter();
  }
  return actionRouterInstance;
}

export default EchoAI3ActionRouter;
