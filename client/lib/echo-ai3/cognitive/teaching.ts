/**
 * EchoAi³ Teaching & Demonstration Modes
 * Teach users dynamically using the live system; demonstrate workflows autonomously (audit-safe).
 * All teaching content is trace-backed; demonstrations emit trace and use guardrails only.
 */

import { observeFromTrace } from "./perception";
import { orchestrate } from "./orchestration";
import { toExecutiveSegments } from "./narrative";
import { traceLedgerClient } from "@/lib/trace-ledger-client";
import type { TeachingContext, DemoStep } from "./types";

/**
 * Build teaching context from live TraceLedger (no inferred state).
 */
export function buildTeachingContext(
  orgId: string,
  options?: { entityType?: string; entityId?: string; sourceRef?: string; limit?: number },
): TeachingContext {
  const perceptionSlice = observeFromTrace(orgId, {
    entityType: options?.entityType,
    entityId: options?.entityId,
    sourceRef: options?.sourceRef,
    limit: options?.limit ?? 50,
  });
  const segments = toExecutiveSegments(perceptionSlice.entries);
  const narrativeSummary =
    segments.length > 0
      ? segments
          .slice(0, 5)
          .map((s) => `${s.source}: ${s.summary}`)
          .join("; ")
      : "No recent trace activity for this scope.";
  return {
    perceptionSlice,
    narrativeSummary,
  };
}

/**
 * Run a single demonstration step (orchestration + trace); audit-safe.
 */
export function runDemoStep(
  step: DemoStep,
  orgId: string,
): { ok: boolean; reason: string; traceRef?: string } {
  const result = orchestrate(step.orchestration, { emitTrace: true });
  if (!result.ok) return result;
  if (typeof window !== "undefined") {
    try {
      const entry = traceLedgerClient.append({
        orgId,
        entityType: step.traceEntityType,
        entityId: step.traceEntityId,
        sourceRef: "echo-ai3-demo",
        payload: {
          label: step.label,
          action: step.orchestration.action,
          panelKey: step.orchestration.panelKey,
          source: "cognitive-layer-demo",
        },
      });
      return { ...result, traceRef: entry.id };
    } catch {
      return result;
    }
  }
  return result;
}