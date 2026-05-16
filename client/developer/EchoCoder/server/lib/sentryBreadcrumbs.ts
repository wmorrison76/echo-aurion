import * as Sentry from "@sentry/node";

/**
 * Add breadcrumbs for critical operations in production
 */

export interface BreadcrumbContext {
  operation: string;
  operationType: "create" | "update" | "delete" | "read" | "auth";
  resourceType: string;
  resourceId?: string;
  userId?: string;
  workspaceId?: string;
  status: "start" | "success" | "failure";
  details?: Record<string, any>;
}

/**
 * Log a critical operation breadcrumb
 */
export function logBreadcrumb(context: BreadcrumbContext) {
  try {
    Sentry.addBreadcrumb({
      category: `operation.${context.operationType}`,
      message: `${context.operation} on ${context.resourceType}`,
      level: context.status === "failure" ? "error" : "info",
      data: {
        operation: context.operation,
        operationType: context.operationType,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        status: context.status,
        ...context.details,
      },
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    // Silently fail - don't break if Sentry is not configured
    console.error("Failed to add breadcrumb:", error);
  }
}

/**
 * Log workspace operation
 */
export function logWorkspaceOperation(
  operation: string,
  operationType: "create" | "update" | "delete" | "read",
  workspaceId: string,
  userId: string,
  details?: Record<string, any>
) {
  logBreadcrumb({
    operation,
    operationType,
    resourceType: "workspace",
    resourceId: workspaceId,
    userId,
    workspaceId,
    status: "start",
    details,
  });
}

/**
 * Log webhook operation
 */
export function logWebhookOperation(
  operation: string,
  webhookId: string,
  userId: string,
  workspaceId: string,
  details?: Record<string, any>
) {
  logBreadcrumb({
    operation,
    operationType: operation.includes("create")
      ? "create"
      : operation.includes("delete")
        ? "delete"
        : "update",
    resourceType: "webhook",
    resourceId: webhookId,
    userId,
    workspaceId,
    status: "start",
    details,
  });
}

/**
 * Log auth operation
 */
export function logAuthOperation(
  operation: string,
  userId: string,
  status: "success" | "failure",
  details?: Record<string, any>
) {
  logBreadcrumb({
    operation,
    operationType: "auth",
    resourceType: "user",
    resourceId: userId,
    userId,
    status,
    details,
  });
}

/**
 * Log 2FA operation
 */
export function log2FAOperation(
  operation: string,
  userId: string,
  status: "success" | "failure",
  details?: Record<string, any>
) {
  logBreadcrumb({
    operation,
    operationType: operation.includes("disable") ? "delete" : "create",
    resourceType: "2fa",
    resourceId: userId,
    userId,
    status,
    details: {
      ...details,
      sensitive: true,
    },
  });
}

/**
 * Log compliance operation
 */
export function logComplianceOperation(
  operation: string,
  workspaceId: string,
  userId: string,
  status: "success" | "failure",
  details?: Record<string, any>
) {
  logBreadcrumb({
    operation,
    operationType: "update",
    resourceType: "compliance",
    workspaceId,
    userId,
    status,
    details: {
      ...details,
      sensitive: true,
    },
  });
}

/**
 * Log sensitive operation failure
 */
export function logSensitiveOperationFailure(
  operation: string,
  error: Error,
  context: Partial<BreadcrumbContext>
) {
  logBreadcrumb({
    operation,
    operationType: context.operationType || "create",
    resourceType: context.resourceType || "unknown",
    resourceId: context.resourceId,
    userId: context.userId,
    workspaceId: context.workspaceId,
    status: "failure",
    details: {
      error: error.message,
      errorStack: error.stack,
      ...context.details,
    },
  });

  // Also report to Sentry
  Sentry.captureException(error, {
    tags: {
      operation,
      resourceType: context.resourceType,
    },
    contexts: {
      operation: context as Record<string, any>,
    },
  });
}
