/**
 * EchoAi³ Action Context (client)
 * Single envelope used at all entry points: orgId, actor, sessionId, traceId.
 * Fail-closed when org/actor context is missing.
 * Type from shared; helpers are client-only.
 */

import type { ActionContext } from "@shared/types/action-context";
export type { ActionContext } from "@shared/types/action-context";

const SESSION_STORAGE_KEY = "echo-ai3-session-id";

/**
 * Generate a new trace ID (one per logical action, reused for downstream calls).
 */
export function newTraceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Stable session ID per tab/session (persists for the browser session).
 */
export function defaultSessionId(): string {
  if (typeof window === "undefined") {
    return `session-${Date.now()}`;
  }
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = `session-${newTraceId()}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `session-${Date.now()}`;
  }
}

/**
 * Get orgId and actor from localStorage (auth_user) when no explicit context provided.
 * Used as fallback for requireActionContext.
 */
function getStoredOrgAndActor(): { orgId: string; actor: { userId: string; role: string } } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    const userId = user?.id ?? user?.user_id;
    const role = user?.role ?? "guest";
    const orgId = user?.org_id ?? user?.organization_id ?? "demo-org";
    if (!userId || !orgId) return null;
    return { orgId, actor: { userId: String(userId), role: String(role) } };
  } catch {
    return null;
  }
}

/**
 * Require a full ActionContext at command start. Fail-closed if org/actor missing.
 * If partial is provided, merge with generated sessionId/traceId and stored org/actor.
 * @param partial Optional partial context (e.g. from auth). orgId and actor required unless in partial or stored.
 * @returns ActionContext
 * @throws Error if orgId or actor cannot be determined (fail-closed).
 */
export function requireActionContext(partial?: Partial<ActionContext>): ActionContext {
  const stored = getStoredOrgAndActor();
  const orgId = partial?.orgId ?? stored?.orgId;
  const actor = partial?.actor ?? stored?.actor;
  if (!orgId || !actor?.userId || !actor?.role) {
    throw new Error(
      "[EchoAi³] Missing action context: orgId and actor (userId, role) are required. " +
        "Ensure user is authenticated or pass context explicitly (fail-closed)."
    );
  }
  return {
    orgId,
    actor: { userId: actor.userId, role: actor.role },
    sessionId: partial?.sessionId ?? defaultSessionId(),
    traceId: partial?.traceId ?? newTraceId(),
  };
}

/**
 * Create an ActionContext for a new logical action (new traceId, same session).
 */
export function createActionContext(
  base: Pick<ActionContext, "orgId" | "actor" | "sessionId">,
  traceId?: string
): ActionContext {
  return {
    ...base,
    traceId: traceId ?? newTraceId(),
  };
}
