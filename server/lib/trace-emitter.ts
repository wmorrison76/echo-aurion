/**
 * Trace Emitter - Server-side utility
 * 
 * Extracts user context from requests, validates trace events,
 * generates traceIds, and emits to TraceLedgerService.
 * Handles missing links gracefully (logs as trace gaps, not errors).
 */

import { Request } from "express";
import { randomUUID } from "crypto";
import { getOrgContext, type OrgContext } from "./org-resolver";
import { TraceLedgerService } from "../services/trace-ledger-service";
import { logger } from "./logger";
import type { TraceEvent, TraceDownstreamImplication } from "../../shared/types/trace-ledger";

const traceLedgerService = new TraceLedgerService();

/**
 * Default actor when user context is missing
 */
const DEFAULT_ACTOR = {
  userId: "system",
  role: "system",
  system: "trace-emitter",
};

/**
 * Validate required trace event fields
 */
function validateTraceEvent(event: Partial<TraceEvent>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!event.actor || !event.actor.userId || !event.actor.role) {
    errors.push("Missing required actor (userId, role)");
  }

  if (!event.sourcePanel || typeof event.sourcePanel !== "string") {
    errors.push("Missing or invalid sourcePanel");
  }

  if (!event.domain || typeof event.domain !== "string") {
    errors.push("Missing or invalid domain");
  }

  if (!event.inputs || typeof event.inputs !== "object") {
    errors.push("Missing or invalid inputs");
  }

  if (!event.outputs || typeof event.outputs !== "object") {
    errors.push("Missing or invalid outputs");
  }

  if (!event.timestamp || typeof event.timestamp !== "string") {
    errors.push("Missing or invalid timestamp");
  }

  if (!event.traceId || typeof event.traceId !== "string") {
    errors.push("Missing or invalid traceId");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a trace event with user context from request
 */
export function createTraceEvent(
  req: Request | null,
  sourcePanel: string,
  domain: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
  options?: {
    downstreamImplications?: TraceDownstreamImplication[];
    confidence?: number;
    assumptions?: string[];
    traceId?: string;
    sourceRef?: string;
    system?: string;
  }
): TraceEvent {
  const orgContext: OrgContext = req ? getOrgContext(req) : {
    orgId: "default",
    userId: undefined,
    userRole: undefined,
    authenticated: false,
  };

  const actor = {
    userId: orgContext.userId || DEFAULT_ACTOR.userId,
    role: orgContext.userRole || DEFAULT_ACTOR.role,
    system: options?.system || DEFAULT_ACTOR.system,
  };

  return {
    actor,
    sourcePanel,
    domain,
    inputs,
    outputs,
    downstreamImplications: options?.downstreamImplications || [],
    confidence: options?.confidence,
    assumptions: options?.assumptions,
    timestamp: new Date().toISOString(),
    traceId: options?.traceId || randomUUID(),
  };
}

/**
 * Emit a trace event to TraceLedger
 * 
 * @param reqOrOrgId Express request (for user context) OR organization ID string
 * @param entityType Entity type (e.g., "menu", "forecast", "inventory")
 * @param entityId Entity ID
 * @param sourcePanel Source panel identifier
 * @param domain Domain identifier
 * @param inputs Input data
 * @param outputs Output data
 * @param options Optional fields (downstreamImplications, confidence, assumptions, traceId, sourceRef, userId, userRole)
 * @returns TraceLedgerEntry or null if emission failed
 */
export async function emitTrace(
  reqOrOrgId: Request | string | null,
  entityType: string,
  entityId: string,
  sourcePanel: string,
  domain: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
  options?: {
    downstreamImplications?: TraceDownstreamImplication[];
    confidence?: number;
    assumptions?: string[];
    traceId?: string;
    sourceRef?: string;
    system?: string;
    userId?: string;
    userRole?: string;
  }
): Promise<{ entry: any; traceId: string } | null> {
  try {
    let orgContext: OrgContext;
    if (typeof reqOrOrgId === "string") {
      // Direct orgId provided
      orgContext = {
        orgId: reqOrOrgId,
        userId: options?.userId,
        userRole: options?.userRole,
        authenticated: !!options?.userId,
      };
    } else if (reqOrOrgId) {
      // Request object provided
      orgContext = getOrgContext(reqOrOrgId);
    } else {
      // No context
      orgContext = {
        orgId: "default",
        userId: options?.userId,
        userRole: options?.userRole,
        authenticated: false,
      };
    }

    const traceEvent = createTraceEvent(
      typeof reqOrOrgId === "string" ? null : reqOrOrgId,
      sourcePanel,
      domain,
      inputs,
      outputs,
      options
    );

    // Validate required fields
    const validation = validateTraceEvent(traceEvent);
    if (!validation.valid) {
      logger.warn("[TraceEmitter] Validation failed, creating entry with partial data", {
        errors: validation.errors,
        traceEvent: {
          sourcePanel: traceEvent.sourcePanel,
          domain: traceEvent.domain,
          traceId: traceEvent.traceId,
        },
      });
      // Continue anyway - create entry with partial data
    }

    // Handle missing links gracefully - create gap entries instead of errors
    if (options?.downstreamImplications && options.downstreamImplications.length === 0) {
      // This is a gap - log it but don't fail
      logger.debug("[TraceEmitter] Trace event has no downstream implications (gap)", {
        traceId: traceEvent.traceId,
        sourcePanel,
        domain,
      });
    }

    // Emit via TraceLedgerService
    const entry = await traceLedgerService.emitTraceEvent(
      orgContext.orgId,
      traceEvent,
      entityType,
      entityId,
      options?.sourceRef
    );

    return { entry, traceId: traceEvent.traceId };
  } catch (error) {
    // Never throw - log error but don't block operations
    logger.error("[TraceEmitter] Failed to emit trace event", {
      error: error instanceof Error ? error.message : String(error),
      entityType,
      entityId,
      sourcePanel,
      domain,
    });
    return null;
  }
}

/**
 * Create a trace gap entry (for missing links)
 */
export async function emitTraceGap(
  req: Request | null,
  entityType: string,
  entityId: string,
  sourcePanel: string,
  domain: string,
  reason: string,
  traceId?: string
): Promise<{ entry: any; traceId: string } | null> {
  return emitTrace(
    req,
    entityType,
    entityId,
    sourcePanel,
    domain,
    { gap: true, reason },
    { gap: true },
    {
      downstreamImplications: [],
      traceId: traceId || undefined,
    }
  );
}

/**
 * Emit a permission denial trace event
 * 
 * Records when a user is denied access to a resource, panel, or action.
 * This is critical for audit and security compliance.
 * 
 * @param reqOrOrgId Express request (for user context) OR organization ID string
 * @param resourceType Type of resource being accessed (e.g., "panel", "api", "file")
 * @param resourceId Identifier of the resource
 * @param action Action attempted (e.g., "read", "edit", "approve", "open")
 * @param reason Reason for denial (e.g., "insufficient_role", "missing_permission")
 * @param sourcePanel Source panel where denial occurred
 * @param options Optional fields (traceId, sourceRef, userId, userRole)
 * @returns TraceLedgerEntry or null if emission failed
 */
export async function emitPermissionDenialTrace(
  reqOrOrgId: Request | string | null,
  resourceType: string,
  resourceId: string,
  action: string,
  reason: string,
  sourcePanel: string,
  options?: {
    traceId?: string;
    sourceRef?: string;
    userId?: string;
    userRole?: string;
    additionalContext?: Record<string, unknown>;
  }
): Promise<{ entry: any; traceId: string } | null> {
  return emitTrace(
    reqOrOrgId,
    resourceType,
    resourceId,
    sourcePanel,
    "permissions",
    {
      action,
      reason,
      denied: true,
      ...(options?.additionalContext || {}),
    },
    {
      denied: true,
      reason,
      timestamp: new Date().toISOString(),
    },
    {
      traceId: options?.traceId,
      sourceRef: options?.sourceRef,
      userId: options?.userId,
      userRole: options?.userRole,
      assumptions: [`Permission denial: ${reason}`],
      confidence: 1.0, // Permission denials are definitive
    }
  );
}