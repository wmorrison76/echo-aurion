/**
 * LaborSentinelAgent (shadow)
 * Agent that consumes overtime sentinel output and suggests shift swaps / staffing changes.
 * Shadow mode: suggestions only; no auto-execute; emits trace with explanation links.
 */

import { runOvertimeSentinel } from "./overtime-sentinel";
import type { ScheduleSnapshot } from "./overtime-sentinel";

export interface LaborSentinelAgentInput {
  orgId: string;
  schedules: ScheduleSnapshot[];
  emitTrace: (eventType: string, payload: Record<string, unknown>) => Promise<string | null>;
}

/**
 * Shadow agent: run overtime sentinel and return risks + suggestions; no side effects beyond trace.
 */
export async function runLaborSentinelAgent(input: LaborSentinelAgentInput): Promise<{
  risks: Awaited<ReturnType<typeof runOvertimeSentinel>>;
  traceIds: string[];
}> {
  const risks = await runOvertimeSentinel(input.schedules, input.emitTrace);
  const traceIds = risks.map((r) => r.explanationTraceId).filter(Boolean) as string[];
  return { risks, traceIds };
}
