import type { TraceLedgerAppendInput } from "../../shared/types/trace-ledger";
import { appendTraceEvent } from "./trace-ledger-fallback";
import { getDemandDeltasByTraceId } from "./inventory-implications-service";

export interface ActorContext {
  userId?: string;
  role?: string;
  system?: string;
}

/**
 * Simulate Menu Builder consuming demand deltas
 * This mirrors the client-side consumeDemandDeltas function
 */
export async function consumeDemandDeltasForMenu(
  orgId: string,
  menuId: string,
  traceId: string,
  actor?: ActorContext,
): Promise<{ traceId: string; deltas: Array<{ date: string; delta: number }> } | null> {
  if (!traceId) {
    return null;
  }

  // Get all demand deltas for this traceId
  const deltas = await getDemandDeltasByTraceId(orgId, traceId);

  if (deltas.length === 0) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const actorContext = actor || { system: "menu-builder" };

  // Log consumption to trace ledger
  await appendTraceEvent({
    orgId,
    entityType: "menu",
    entityId: menuId,
    sourceRef: traceId,
    payload: {
      action: "DEMAND_DELTA_CONSUMED",
      deltaCount: deltas.length,
      deltas,
      actor: actorContext,
      timestamp,
    },
  });

  return { traceId, deltas };
}
