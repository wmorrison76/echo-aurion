/**
 * Automated Action Execution Service
 * -----------------------------------
 * EchoAI³ can execute actions automatically with approval workflows
 * Example: "Auto-generate purchase order when inventory drops below par level"
 */

import { logger } from "../lib/logger";

export interface ActionDefinition {
  id: string;
  name: string;
  type: string; // "inventory_reorder", "schedule_creation", "cost_adjustment", etc.
  trigger: ActionTrigger;
  execution: ActionExecution;
  approval?: ApprovalWorkflow;
}

export interface ActionTrigger {
  type: "threshold" | "schedule" | "event" | "manual";
  condition: string; // e.g., "inventory_quantity < par_level"
  parameters?: Record<string, any>;
}

export interface ActionExecution {
  module: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  payload?: Record<string, any>;
  timeout?: number;
}

export interface ApprovalWorkflow {
  required: boolean;
  approvers?: string[]; // User IDs
  autoApprove?: {
    enabled: boolean;
    conditions?: string[]; // e.g., ["amount < 1000"]
  };
  notifyOnApproval?: boolean;
}

export interface ActionExecutionRequest {
  actionId: string;
  parameters?: Record<string, any>;
  userId?: string;
  orgId: string;
  requiresApproval?: boolean;
}

export interface ActionExecutionResult {
  actionId: string;
  status: "pending_approval" | "approved" | "executing" | "completed" | "failed" | "rejected";
  executionId?: string;
  result?: any;
  error?: string;
  timestamp: string;
}

/**
 * Automated Actions Service
 * Manages automated action definitions and execution
 */
export class AutomatedActionsService {
  private actionDefinitions: Map<string, ActionDefinition> = new Map();
  private executionQueue: ActionExecutionRequest[] = [];
  private executionHistory: Map<string, ActionExecutionResult> = new Map();

  constructor() {
    this.initializeDefaultActions();
    this.startExecutionProcessor();
  }

  /**
   * Register action definition
   */
  registerAction(action: ActionDefinition): void {
    this.actionDefinitions.set(action.id, action);
    logger.info("[AutomatedActions] Action registered", {
      actionId: action.id,
      type: action.type,
    });
  }

  /**
   * Execute action
   */
  async executeAction(request: ActionExecutionRequest): Promise<ActionExecutionResult> {
    const definition = this.actionDefinitions.get(request.actionId);

    if (!definition) {
      throw new Error(`Action definition not found: ${request.actionId}`);
    }

    // Check if approval is required
    const requiresApproval =
      request.requiresApproval !== undefined
        ? request.requiresApproval
        : definition.approval?.required || false;

    // Check auto-approval conditions
    if (
      requiresApproval &&
      definition.approval?.autoApprove?.enabled &&
      this.checkAutoApproveConditions(definition, request)
    ) {
      requiresApproval = false;
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (requiresApproval) {
      // Queue for approval
      const result: ActionExecutionResult = {
        actionId: request.actionId,
        status: "pending_approval",
        executionId,
        timestamp: new Date().toISOString(),
      };

      this.executionHistory.set(executionId, result);

      // Notify approvers
      await this.notifyApprovers(definition, request, executionId);

      logger.info("[AutomatedActions] Action queued for approval", {
        actionId: request.actionId,
        executionId,
      });

      return result;
    }

    // Execute immediately
    return await this.performExecution(definition, request, executionId);
  }

  /**
   * Approve action execution
   */
  async approveAction(
    executionId: string,
    approverId: string
  ): Promise<ActionExecutionResult> {
    const result = this.executionHistory.get(executionId);

    if (!result) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (result.status !== "pending_approval") {
      throw new Error(`Execution is not pending approval: ${result.status}`);
    }

    const definition = this.actionDefinitions.get(result.actionId);

    if (!definition) {
      throw new Error(`Action definition not found: ${result.actionId}`);
    }

    // Update status and execute
    result.status = "approved";
    this.executionHistory.set(executionId, result);

    // Find original request (would be stored in production)
    const request: ActionExecutionRequest = {
      actionId: result.actionId,
      orgId: "unknown", // Would be stored
      requiresApproval: false,
    };

    logger.info("[AutomatedActions] Action approved", {
      executionId,
      approverId,
    });

    // Execute
    return await this.performExecution(definition, request, executionId);
  }

  /**
   * Reject action execution
   */
  async rejectAction(
    executionId: string,
    approverId: string,
    reason?: string
  ): Promise<void> {
    const result = this.executionHistory.get(executionId);

    if (!result) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (result.status !== "pending_approval") {
      throw new Error(`Execution is not pending approval: ${result.status}`);
    }

    result.status = "rejected";
    result.error = reason || "Rejected by approver";
    this.executionHistory.set(executionId, result);

    logger.info("[AutomatedActions] Action rejected", {
      executionId,
      approverId,
      reason,
    });
  }

  /**
   * Perform actual execution
   */
  private async performExecution(
    definition: ActionDefinition,
    request: ActionExecutionRequest,
    executionId: string
  ): Promise<ActionExecutionResult> {
    const result: ActionExecutionResult = {
      actionId: definition.id,
      status: "executing",
      executionId,
      timestamp: new Date().toISOString(),
    };

    this.executionHistory.set(executionId, result);

    try {
      // Execute action based on definition
      const executionResult = await this.executeActionDefinition(
        definition,
        request
      );

      result.status = "completed";
      result.result = executionResult;

      logger.info("[AutomatedActions] Action executed successfully", {
        actionId: definition.id,
        executionId,
      });
    } catch (error) {
      result.status = "failed";
      result.error = (error as Error).message;

      logger.error("[AutomatedActions] Action execution failed", {
        actionId: definition.id,
        executionId,
        error: result.error,
      });
    }

    this.executionHistory.set(executionId, result);
    return result;
  }

  /**
   * Execute action definition
   */
  private async executeActionDefinition(
    definition: ActionDefinition,
    request: ActionExecutionRequest
  ): Promise<any> {
    const { execution } = definition;

    // In production, this would make actual API calls to modules
    // For now, mock execution based on action type

    switch (definition.type) {
      case "inventory_reorder":
        return await this.executeInventoryReorder(execution, request);

      case "schedule_creation":
        return await this.executeScheduleCreation(execution, request);

      case "cost_adjustment":
        return await this.executeCostAdjustment(execution, request);

      default:
        return {
          message: `Action ${definition.type} executed`,
          parameters: request.parameters,
        };
    }
  }

  /**
   * Execute inventory reorder
   */
  private async executeInventoryReorder(
    execution: ActionExecution,
    request: ActionExecutionRequest
  ): Promise<any> {
    // Mock implementation - in production, call actual inventory API
    return {
      type: "inventory_reorder",
      status: "order_created",
      message: "Purchase order created for low stock items",
    };
  }

  /**
   * Execute schedule creation
   */
  private async executeScheduleCreation(
    execution: ActionExecution,
    request: ActionExecutionRequest
  ): Promise<any> {
    // Mock implementation - in production, call actual schedule API
    return {
      type: "schedule_creation",
      status: "schedule_created",
      message: "Schedule created based on demand forecast",
    };
  }

  /**
   * Execute cost adjustment
   */
  private async executeCostAdjustment(
    execution: ActionExecution,
    request: ActionExecutionRequest
  ): Promise<any> {
    // Mock implementation - in production, call actual finance API
    return {
      type: "cost_adjustment",
      status: "cost_adjusted",
      message: "Recipe costs adjusted based on latest invoice data",
    };
  }

  /**
   * Check auto-approval conditions
   */
  private checkAutoApproveConditions(
    definition: ActionDefinition,
    request: ActionExecutionRequest
  ): boolean {
    const autoApprove = definition.approval?.autoApprove;

    if (!autoApprove?.enabled || !autoApprove.conditions) {
      return false;
    }

    // Check each condition
    for (const condition of autoApprove.conditions) {
      // Simplified condition checking - in production, use proper expression evaluator
      if (condition.includes("amount <")) {
        const threshold = parseFloat(condition.match(/amount < (\d+)/)?.[1] || "0");
        const amount = request.parameters?.amount || 0;
        if (amount < threshold) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Notify approvers
   */
  private async notifyApprovers(
    definition: ActionDefinition,
    request: ActionExecutionRequest,
    executionId: string
  ): Promise<void> {
    // Mock implementation - in production, send notifications via email/SMS/push
    const approvers = definition.approval?.approvers || [];

    logger.info("[AutomatedActions] Approvers notified", {
      actionId: definition.id,
      executionId,
      approvers,
    });
  }

  /**
   * Initialize default actions
   */
  private initializeDefaultActions(): void {
    // Inventory reorder action
    this.registerAction({
      id: "inventory_auto_reorder",
      name: "Auto Reorder Inventory",
      type: "inventory_reorder",
      trigger: {
        type: "threshold",
        condition: "inventory_quantity < par_level",
      },
      execution: {
        module: "inventory",
        endpoint: "/api/inventory/reorder",
        method: "POST",
      },
      approval: {
        required: true,
        autoApprove: {
          enabled: true,
          conditions: ["amount < 1000"],
        },
      },
    });

    // Schedule creation action
    this.registerAction({
      id: "schedule_auto_create",
      name: "Auto Create Schedule",
      type: "schedule_creation",
      trigger: {
        type: "schedule",
        condition: "weekly_schedule_creation",
        parameters: { dayOfWeek: "monday" },
      },
      execution: {
        module: "schedule",
        endpoint: "/api/schedule/create",
        method: "POST",
      },
      approval: {
        required: false,
      },
    });

    // Cost adjustment action
    this.registerAction({
      id: "cost_auto_adjust",
      name: "Auto Adjust Costs",
      type: "cost_adjustment",
      trigger: {
        type: "event",
        condition: "invoice_matched",
      },
      execution: {
        module: "finance",
        endpoint: "/api/finance/adjust-costs",
        method: "POST",
      },
      approval: {
        required: true,
        autoApprove: {
          enabled: true,
          conditions: ["variance < 5"],
        },
      },
    });
  }

  /**
   * Start execution processor
   */
  private startExecutionProcessor(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processExecutionQueue();
    }, 30000);
  }

  /**
   * Process execution queue
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.executionQueue.length === 0) return;

    const request = this.executionQueue.shift();
    if (!request) return;

    try {
      await this.executeAction(request);
    } catch (error) {
      logger.error("[AutomatedActions] Queue processing error", { error });
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 100): ActionExecutionResult[] {
    return Array.from(this.executionHistory.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get action definition
   */
  getActionDefinition(actionId: string): ActionDefinition | undefined {
    return this.actionDefinitions.get(actionId);
  }

  /**
   * List all action definitions
   */
  listActionDefinitions(): ActionDefinition[] {
    return Array.from(this.actionDefinitions.values());
  }
}

// Singleton instance
let automatedActionsInstance: AutomatedActionsService | null = null;

export function getAutomatedActionsService(): AutomatedActionsService {
  if (!automatedActionsInstance) {
    automatedActionsInstance = new AutomatedActionsService();
  }
  return automatedActionsInstance;
}

export default AutomatedActionsService;
