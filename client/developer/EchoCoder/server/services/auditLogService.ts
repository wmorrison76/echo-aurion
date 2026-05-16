import { Request } from "express";
import { createClient } from "@supabase/supabase-js";
import { RBACContext, AuditedOperation } from "../middleware/rbac";

/**
 * Audit Logging Service
 * Tracks all sensitive operations for compliance and debugging
 */

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuditLogEntry {
  id?: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  result: "success" | "failure";
  error_message?: string;
  created_at?: Date;
}

/**
 * Log an operation to audit trail
 */
export async function logAuditOperation(
  operation: AuditedOperation,
): Promise<void> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        "Audit logging disabled - Supabase credentials not configured",
      );
      return;
    }

    const logEntry: AuditLogEntry = {
      workspace_id: operation.workspaceId,
      user_id: operation.userId,
      action: operation.action,
      resource_type: operation.resourceType,
      resource_id: operation.resourceId,
      changes: operation.changes,
      ip_address: operation.ipAddress,
      user_agent: operation.userAgent,
      result: operation.result,
      error_message: operation.errorMessage,
      created_at: operation.timestamp,
    };

    // Log to database
    const { error } = await supabase
      .from("workspace_audit_logs")
      .insert([logEntry]);

    if (error) {
      console.error("Failed to log audit entry:", error);
      // Don't throw - audit logging should never block operations
    }

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("[AUDIT]", JSON.stringify(logEntry, null, 2));
    }
  } catch (error) {
    console.error("Error in audit logging:", error);
  }
}

/**
 * Log code generation operation
 */
export async function logCodeGeneration(
  context: RBACContext,
  req: Request,
  prompt: string,
  result: string,
  success: boolean = true,
  errorMessage?: string,
): Promise<void> {
  const operation: AuditedOperation = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action: "generate_code",
    resourceType: "code_generation",
    changes: {
      promptLength: prompt.length,
      resultLength: result.length,
      model: req.body?.model || "gpt-4",
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: success ? "success" : "failure",
    errorMessage,
  };

  await logAuditOperation(operation);
}

/**
 * Log user/role modification
 */
export async function logRoleChange(
  context: RBACContext,
  req: Request,
  userId: string,
  oldRole: string,
  newRole: string,
): Promise<void> {
  const operation: AuditedOperation = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action: "update_user_role",
    resourceType: "user",
    resourceId: userId,
    changes: {
      oldRole,
      newRole,
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: "success",
  };

  await logAuditOperation(operation);
}

/**
 * Log webhook creation/modification
 */
export async function logWebhookChange(
  context: RBACContext,
  req: Request,
  webhookId: string,
  action: "create" | "update" | "delete",
  changes?: Record<string, any>,
): Promise<void> {
  const operation: AuditedOperation = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action: `${action}_webhook`,
    resourceType: "webhook",
    resourceId: webhookId,
    changes,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: "success",
  };

  await logAuditOperation(operation);
}

/**
 * Log feature flag change
 */
export async function logFeatureFlagChange(
  context: RBACContext,
  req: Request,
  flagId: string,
  flagKey: string,
  oldValue: any,
  newValue: any,
): Promise<void> {
  const operation: AuditedOperation = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action: "update_feature_flag",
    resourceType: "feature_flag",
    resourceId: flagId,
    changes: {
      key: flagKey,
      oldValue,
      newValue,
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: "success",
  };

  await logAuditOperation(operation);
}

/**
 * Log deployment/release event
 */
export async function logDeployment(
  context: RBACContext,
  req: Request,
  environment: string,
  status: "success" | "failure",
  changes?: Record<string, any>,
  errorMessage?: string,
): Promise<void> {
  const operation: AuditedOperation = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action: "deploy",
    resourceType: "deployment",
    changes: {
      environment,
      ...changes,
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: status,
    errorMessage,
  };

  await logAuditOperation(operation);
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string,
  workspaceId: string,
  req: Request,
  action: "login" | "logout" | "failed_login" | "2fa_enabled" | "2fa_disabled",
  success: boolean = true,
  errorMessage?: string,
): Promise<void> {
  const operation: AuditedOperation = {
    userId,
    workspaceId,
    action,
    resourceType: "authentication",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: success ? "success" : "failure",
    errorMessage,
  };

  await logAuditOperation(operation);
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  context: RBACContext,
  req: Request,
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  description: string,
  details?: Record<string, any>,
): Promise<void> {
  const operation: AuditedOperation = {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action: "security_event",
    resourceType: `security_${eventType}`,
    changes: {
      severity,
      description,
      ...details,
    },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result: "success",
  };

  await logAuditOperation(operation);
}

/**
 * Get audit logs for workspace
 */
export async function getAuditLogs(
  workspaceId: string,
  filters?: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  },
): Promise<AuditLogEntry[]> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return [];
    }

    let query = supabase
      .from("workspace_audit_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    if (filters?.action) {
      query = query.eq("action", filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq("resource_type", filters.resourceType);
    }

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate.toISOString());
    }

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch audit logs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}

/**
 * Export audit logs (for compliance/reporting)
 */
export async function exportAuditLogs(
  workspaceId: string,
  format: "json" | "csv" = "json",
  filters?: Record<string, any>,
): Promise<string> {
  const logs = await getAuditLogs(workspaceId, filters);

  if (format === "csv") {
    return convertToCsv(logs);
  }

  return JSON.stringify(logs, null, 2);
}

/**
 * Convert logs to CSV format
 */
function convertToCsv(logs: AuditLogEntry[]): string {
  if (logs.length === 0) {
    return "No audit logs found";
  }

  const headers = [
    "Timestamp",
    "User ID",
    "Action",
    "Resource Type",
    "Resource ID",
    "Result",
    "IP Address",
    "Changes",
  ];

  const rows = logs.map((log) => [
    log.created_at?.toString() || "",
    log.user_id,
    log.action,
    log.resource_type,
    log.resource_id || "",
    log.result,
    log.ip_address || "",
    JSON.stringify(log.changes || {}),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(","),
    ),
  ].join("\n");

  return csv;
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function purgeOldAuditLogs(
  workspaceId: string,
  retentionDays: number = 90,
): Promise<number> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data: deletedData, error } = await supabase
      .from("workspace_audit_logs")
      .delete()
      .eq("workspace_id", workspaceId)
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      console.error("Failed to purge audit logs:", error);
      return 0;
    }

    return deletedData?.length || 0;
  } catch (error) {
    console.error("Error purging audit logs:", error);
    return 0;
  }
}
