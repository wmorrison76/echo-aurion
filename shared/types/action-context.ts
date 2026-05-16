/**
 * Action Context (shared)
 * Single envelope used at all EchoAi³ entry points: orgId, actor, sessionId, traceId.
 * Used by client and server; fail-closed when org/actor missing.
 */

export interface ActionContext {
  orgId: string;
  actor: { userId: string; role: string };
  sessionId: string;
  traceId: string;
}
