/**
 * EchoAi³ Cognitive Layer – shared types.
 * No new authority; no inferred state; trace-anchored only.
 */

import type { TraceLedgerEntry } from "@shared/types/trace-ledger";

/** Observation scope: what to read from TraceLedger (no inference). */
export interface ObserveOptions {
  entityType?: string;
  entityId?: string;
  sourceRef?: string;
  limit?: number;
}

/** Result of observing the system via TraceLedger only. */
export interface PerceptionSlice {
  entries: TraceLedgerEntry[];
  observedAt: string;
  scope: ObserveOptions;
}

/** Panel/dock action request – must map to registry + guardrails only. */
export interface OrchestrationRequest {
  action: "open-panel" | "close-all" | "stack-grid" | "stack-cascade" | "minimize-all";
  panelKey?: string;
}

/** Result of dock/panel orchestration (audit-safe). */
export interface OrchestrationResult {
  ok: boolean;
  reason: string;
  traceRef?: string;
}

/** Teaching context: live system data only (trace-backed). */
export interface TeachingContext {
  perceptionSlice: PerceptionSlice;
  narrativeSummary?: string;
}

/** Demonstration step – audit-safe (emits trace). */
export interface DemoStep {
  label: string;
  orchestration: OrchestrationRequest;
  traceEntityType: string;
  traceEntityId: string;
}

/** Agent proposal/response – from existing agent-supervisor API. */
export interface AgentExplanation {
  proposalId: string;
  allowed: boolean;
  reason: string;
  evaluatedAt: string;
  mode: string;
}

/** Trace-anchored memory entry (references only; no inferred state). */
export interface TraceAnchoredMemory {
  sourceRef: string | null;
  entityType: string;
  entityId: string;
  traceId: string;
  createdAt: string;
  confidence: number;
}

/** Executive narrative segment (from TraceLedger payload only). */
export interface ExecutiveSegment {
  timestamp: string;
  source: string;
  summary: string;
  traceId: string;
}
