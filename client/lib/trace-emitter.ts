/**
 * Trace Emitter - Client-side utility
 * 
 * Extracts user context from AuthContext, sends trace events to server endpoint.
 * Handles offline/error scenarios gracefully (queues for retry).
 */

import type { TraceEvent, TraceDownstreamImplication } from "@shared/trace-ledger";

const TRACE_QUEUE_KEY = "trace_queue";
const MAX_QUEUE_SIZE = 100;

/**
 * Default actor when user context is missing
 */
const DEFAULT_ACTOR = {
  userId: "anonymous",
  role: "guest",
  system: "client-trace-emitter",
};

/**
 * Get user context from localStorage (fallback when AuthContext unavailable)
 */
function getUserContextFromStorage(): { userId: string; role: string; orgId?: string } {
  if (typeof window === "undefined") {
    return { userId: DEFAULT_ACTOR.userId, role: DEFAULT_ACTOR.role };
  }

  try {
    const rawUser = localStorage.getItem("auth_user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      return {
        userId: user.id || DEFAULT_ACTOR.userId,
        role: user.role || DEFAULT_ACTOR.role,
        orgId: user.org_id,
      };
    }
  } catch {
    // Ignore parse errors
  }

  return { userId: DEFAULT_ACTOR.userId, role: DEFAULT_ACTOR.role };
}

/**
 * Create a trace event with user context
 */
export function createTraceEvent(
  sourcePanel: string,
  domain: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
  options?: {
    downstreamImplications?: TraceDownstreamImplication[];
    confidence?: number;
    assumptions?: string[];
    traceId?: string;
    userId?: string;
    role?: string;
    orgId?: string;
  }
): TraceEvent {
  const userContext = options?.userId && options?.role
    ? { userId: options.userId, role: options.role }
    : getUserContextFromStorage();

  const actor = {
    userId: userContext.userId,
    role: userContext.role,
    system: "client",
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
    traceId: options?.traceId || crypto.randomUUID(),
  };
}

/**
 * Queue trace event for retry (when offline or error)
 */
function queueTraceEvent(event: TraceEvent, entityType: string, entityId: string, sourceRef?: string): void {
  if (typeof window === "undefined") return;

  try {
    const queueRaw = localStorage.getItem(TRACE_QUEUE_KEY);
    const queue: Array<{ event: TraceEvent; entityType: string; entityId: string; sourceRef?: string }> = queueRaw
      ? JSON.parse(queueRaw)
      : [];

    // Limit queue size
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest
    }

    queue.push({ event, entityType, entityId, sourceRef });
    localStorage.setItem(TRACE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn("[TraceEmitter] Failed to queue trace event", error);
  }
}

/**
 * Process queued trace events
 */
async function processTraceQueue(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const queueRaw = localStorage.getItem(TRACE_QUEUE_KEY);
    if (!queueRaw) return;

    const queue: Array<{ event: TraceEvent; entityType: string; entityId: string; sourceRef?: string }> = JSON.parse(queueRaw);
    if (queue.length === 0) return;

    const processed: number[] = [];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const response = await fetch("/api/trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: item.event,
            entityType: item.entityType,
            entityId: item.entityId,
            sourceRef: item.sourceRef,
          }),
        });

        if (response.ok) {
          processed.push(i);
        }
      } catch {
        // Network error - keep in queue
      }
    }

    // Remove processed items
    if (processed.length > 0) {
      const remaining = queue.filter((_, i) => !processed.includes(i));
      if (remaining.length > 0) {
        localStorage.setItem(TRACE_QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(TRACE_QUEUE_KEY);
      }
    }
  } catch (error) {
    console.warn("[TraceEmitter] Failed to process trace queue", error);
  }
}

/**
 * Emit a trace event to server
 * 
 * @param entityType Entity type (e.g., "menu", "forecast", "inventory")
 * @param entityId Entity ID
 * @param sourcePanel Source panel identifier
 * @param domain Domain identifier
 * @param inputs Input data
 * @param outputs Output data
 * @param options Optional fields (downstreamImplications, confidence, assumptions, traceId, sourceRef, userId, role, orgId)
 * @returns Promise resolving to traceId or null if failed
 */
export async function emitTrace(
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
    userId?: string;
    role?: string;
    orgId?: string;
  }
): Promise<string | null> {
  try {
    const traceEvent = createTraceEvent(
      sourcePanel,
      domain,
      inputs,
      outputs,
      options
    );

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options?.orgId) {
      headers["x-org-id"] = options.orgId;
    }
    if (traceEvent.actor?.userId) {
      headers["x-user-id"] = traceEvent.actor.userId;
    }
    if (traceEvent.actor?.role) {
      headers["x-user-role"] = traceEvent.actor.role;
    }

    const response = await fetch("/api/trace", {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: traceEvent,
        entityType,
        entityId,
        sourceRef: options?.sourceRef,
      }),
    });

    if (response.ok) {
      // Process any queued events
      processTraceQueue().catch(() => {
        // Ignore errors
      });
      return traceEvent.traceId;
    } else {
      // Queue for retry
      queueTraceEvent(traceEvent, entityType, entityId, options?.sourceRef);
      return traceEvent.traceId;
    }
  } catch (error) {
    // Network error or offline - queue for retry
    const traceEvent = createTraceEvent(
      sourcePanel,
      domain,
      inputs,
      outputs,
      options
    );
    queueTraceEvent(traceEvent, entityType, entityId, options?.sourceRef);
    return traceEvent.traceId;
  }
}

/**
 * React hook for emitting traces with AuthContext
 */
export function useTraceEmitter() {
  // Try to import useAuth, but handle gracefully if not available
  let useAuth: (() => { user: { id: string; role: string; org_id?: string } | null; organization: { id: string } | null }) | null = null;
  
  try {
    // Dynamic import to avoid circular dependencies
    const authModule = require("../contexts/AuthContext");
    useAuth = authModule.useAuth;
  } catch {
    // AuthContext not available - will use localStorage fallback
  }

  const emit = async (
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
    }
  ): Promise<string | null> => {
    let userId: string | undefined;
    let role: string | undefined;
    let orgId: string | undefined;

    if (useAuth) {
      try {
        const auth = useAuth();
        if (auth.user) {
          userId = auth.user.id;
          role = auth.user.role;
          orgId = auth.user.org_id;
        } else if (auth.organization) {
          orgId = auth.organization.id;
        }
      } catch {
        // AuthContext not available - use localStorage fallback
      }
    }

    return emitTrace(
      entityType,
      entityId,
      sourcePanel,
      domain,
      inputs,
      outputs,
      {
        ...options,
        userId,
        role,
        orgId,
      }
    );
  };

  return { emit };
}

// Process queue on page load
if (typeof window !== "undefined") {
  // Process queue after a short delay to allow page to load
  setTimeout(() => {
    processTraceQueue().catch(() => {
      // Ignore errors
    });
  }, 2000);
}