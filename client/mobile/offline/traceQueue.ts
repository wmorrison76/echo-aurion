/**
 * Mobile offline trace queue
 * Records actions locally with trace envelopes: ActionContext + action payload + local timestamp + deviceId.
 * When online: flush to POST /api/trace and/or POST /api/echo-ai3/actions/execute with traceId idempotency.
 * Rules: cannot execute privileged actions offline unless policy allows; all offline actions marked OFFLINE_ORIGIN with deviceId.
 */

import type { ActionContext } from "@shared/types/action-context";
import type { TraceEvent } from "@shared/types/trace-ledger";

const STORE_KEY = "mobile_trace_queue";
const MAX_QUEUE = 200;
const PRIVILEGED_ACTIONS = new Set([
  "approve_purchase",
  "approve_workflow",
  "approve_agent_proposal",
  "delete_entity",
  "bulk_export",
  "admin_config",
]);

export interface QueuedTraceEnvelope {
  id: string;
  actionContext: ActionContext;
  actionPayload: {
    domain: string;
    sourcePanel: string;
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    eventType?: string;
  };
  localTimestamp: string;
  deviceId: string;
  status: "pending" | "flushed_trace" | "flushed_both" | "failed";
  traceId: string;
  retryCount: number;
  lastError?: string;
}

let cachedDeviceId: string = "";

function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  if (typeof window !== "undefined" && window.navigator) {
    const n = window.navigator;
    cachedDeviceId = [n.userAgent, n.language, n.hardwareConcurrency, screen?.width, screen?.height]
      .filter(Boolean)
      .join("|");
    try {
      const stored = localStorage.getItem("mobile_device_id");
      if (stored) cachedDeviceId = stored;
      else localStorage.setItem("mobile_device_id", cachedDeviceId);
    } catch {
      cachedDeviceId = cachedDeviceId || `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  } else {
    cachedDeviceId = cachedDeviceId || `node-${Date.now()}`;
  }
  return cachedDeviceId;
}

function generateTraceId(): string {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function loadQueue(): QueuedTraceEnvelope[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedTraceEnvelope[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedTraceEnvelope[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = queue.slice(-MAX_QUEUE);
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

/**
 * Check if action is allowed offline (policy: privileged actions require online).
 */
export function isPrivilegedAction(actionType: string): boolean {
  return PRIVILEGED_ACTIONS.has(actionType);
}

/**
 * Enqueue an action with trace envelope. Fails for privileged actions when offline.
 */
export function enqueueTrace(
  actionContext: ActionContext,
  actionPayload: QueuedTraceEnvelope["actionPayload"],
  isOnline: boolean
): { queued: boolean; traceId: string; error?: string } {
  const traceId = generateTraceId();
  const actionType = (actionPayload.inputs?.actionType as string) || actionPayload.eventType || "unknown";
  if (!isOnline && isPrivilegedAction(actionType)) {
    return {
      queued: false,
      traceId,
      error: "Privileged actions are not allowed offline",
    };
  }

  const envelope: QueuedTraceEnvelope = {
    id: `env-${traceId}`,
    actionContext,
    actionPayload,
    localTimestamp: new Date().toISOString(),
    deviceId: getDeviceId(),
    status: "pending",
    traceId,
    retryCount: 0,
  };

  const queue = loadQueue();
  queue.push(envelope);
  saveQueue(queue);
  return { queued: true, traceId };
}

/**
 * Build TraceEvent for POST /api/trace (OFFLINE_ORIGIN + deviceId in actor.system).
 */
function toTraceEventBody(envelope: QueuedTraceEnvelope): {
  event: TraceEvent;
  entityType: string;
  entityId: string;
  sourceRef?: string;
} {
  const { actionContext, actionPayload, localTimestamp, deviceId: devId, traceId } = envelope;
  const entityId = (actionPayload.inputs?.entityId as string) || envelope.id;
  const entityType = (actionPayload.inputs?.entityType as string) || "mobile_action";

  const event: TraceEvent = {
    actor: {
      userId: actionContext.actor.userId,
      role: actionContext.actor.role,
      system: `OFFLINE_ORIGIN:${devId}`,
    },
    sourcePanel: actionPayload.sourcePanel,
    domain: actionPayload.domain,
    inputs: { ...actionPayload.inputs, deviceId: devId, localTimestamp },
    outputs: actionPayload.outputs ?? {},
    timestamp: localTimestamp,
    traceId,
  };

  return {
    event,
    entityType,
    entityId,
    sourceRef: `mobile-offline:${devId}`,
  };
}

/**
 * Flush pending envelopes to POST /api/trace and optionally POST /api/echo-ai3/actions/execute.
 * Idempotency: traceId is sent so server can dedupe.
 */
export async function flushTraceQueue(
  baseUrl: string = "",
  authToken?: string,
  alsoExecute: boolean = false
): Promise<{ flushed: number; failed: number; errors: Array<{ id: string; error: string }> }> {
  const queue = loadQueue();
  const pending = queue.filter((e) => e.status === "pending");
  const result = { flushed: 0, failed: 0, errors: [] as Array<{ id: string; error: string }> };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  for (const envelope of pending) {
    try {
      const body = toTraceEventBody(envelope);
      const traceRes = await fetch(`${baseUrl}/api/trace`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!traceRes.ok) {
        const errText = await traceRes.text();
        envelope.status = "failed";
        envelope.retryCount += 1;
        envelope.lastError = errText;
        result.failed += 1;
        result.errors.push({ id: envelope.id, error: errText });
        continue;
      }

      if (alsoExecute && envelope.actionPayload.inputs?.actionType) {
        const execRes = await fetch(`${baseUrl}/api/echo-ai3/actions/execute`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            actionType: envelope.actionPayload.inputs.actionType,
            module: envelope.actionPayload.inputs.module ?? "mobile",
            parameters: envelope.actionPayload.inputs,
            confidence: 1,
            organizationId: envelope.actionContext.orgId,
            traceId: envelope.traceId,
            orgId: envelope.actionContext.orgId,
            actor: envelope.actionContext.actor,
            sessionId: envelope.actionContext.sessionId,
          }),
        });
        if (execRes.ok) envelope.status = "flushed_both";
        else envelope.status = "flushed_trace";
      } else {
        envelope.status = "flushed_trace";
      }

      result.flushed += 1;
    } catch (err) {
      envelope.status = "failed";
      envelope.retryCount += 1;
      envelope.lastError = err instanceof Error ? err.message : String(err);
      result.failed += 1;
      result.errors.push({ id: envelope.id, error: envelope.lastError! });
    }
  }

  const stillPending = queue.filter((e) => e.status === "pending");
  const completed = queue.filter((e) => e.status !== "pending");
  saveQueue([...stillPending, ...completed.filter((e) => e.status === "failed")]);
  return result;
}

/**
 * Get queue status (for UI).
 */
export function getTraceQueueStatus(): {
  pending: number;
  failed: number;
  deviceId: string;
  envelopes: QueuedTraceEnvelope[];
} {
  const queue = loadQueue();
  return {
    pending: queue.filter((e) => e.status === "pending").length,
    failed: queue.filter((e) => e.status === "failed").length,
    deviceId: getDeviceId(),
    envelopes: queue,
  };
}
