/**
 * EchoAi³ Perception Layer
 * Observe the entire system via TraceLedger and Control Plane binding only.
 * Does NOT introduce new authority. Does NOT infer state. Does NOT bypass audit.
 */

import { traceLedgerClient } from "@/lib/trace-ledger-client";
import type { TraceLedgerEntry } from "@shared/types/trace-ledger";
import type { ObserveOptions, PerceptionSlice } from "./types";

const DEFAULT_LIMIT = 100;

/**
 * Observe system state from TraceLedger only (client-side store).
 * All data is trace-anchored; no inference.
 */
export function observeFromTrace(
  orgId: string,
  options: ObserveOptions = {},
): PerceptionSlice {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const observedAt = new Date().toISOString();

  let entries: TraceLedgerEntry[] = [];

  if (options.sourceRef) {
    entries = traceLedgerClient.listBySourceRef(
      orgId,
      options.sourceRef,
      limit,
    );
  } else if (options.entityType && options.entityId) {
    entries = traceLedgerClient.listByEntity(
      orgId,
      options.entityType,
      options.entityId,
      limit,
    );
  } else if (options.entityType) {
    entries = traceLedgerClient.listByEntityType(
      orgId,
      options.entityType,
      limit,
    );
  } else {
    entries = traceLedgerClient.listByEntityType(orgId, "trace", limit);
  }

  return {
    entries,
    observedAt,
    scope: options,
  };
}

/**
 * Fetch trace records from server (when auth provides org).
 * Uses existing /api/trace-ledger; no new authority.
 */
export async function observeFromServer(
  orgId: string,
  options: ObserveOptions = {},
): Promise<PerceptionSlice> {
  const params = new URLSearchParams();
  if (options.sourceRef) params.set("sourceRef", options.sourceRef);
  if (options.entityType) params.set("entity", options.entityType);
  if (options.entityId) params.set("entityId", options.entityId);
  const limit = options.limit ?? DEFAULT_LIMIT;
  params.set("limit", String(limit));

  const res = await fetch(`/api/trace-ledger?${params.toString()}`, {
    credentials: "include",
    headers: { "X-Org-ID": orgId },
  });

  if (!res.ok) {
    return {
      entries: [],
      observedAt: new Date().toISOString(),
      scope: options,
    };
  }

  const data = await res.json().catch(() => ({}));
  const records = Array.isArray(data.records) ? data.records : [];
  const entries: TraceLedgerEntry[] = records.map((r: Record<string, unknown>) => ({
    id: String(r.id ?? ""),
    orgId,
    entityType: String(r.entityType ?? r.entity_type ?? "unknown"),
    entityId: String(r.entityId ?? r.entity_id ?? ""),
    sourceRef: (r.sourceRef != null ? String(r.sourceRef) : r.source_ref != null ? String(r.source_ref) : null) as string | null,
    payload: (r.payload as Record<string, unknown>) ?? { summary: r.summary, source: r.source, chain: r.chain ?? [] },
    createdAt: String(r.timestamp ?? r.createdAt ?? r.created_at ?? new Date().toISOString()),
  }));

  return {
    entries,
    observedAt: new Date().toISOString(),
    scope: options,
  };
}

/**
 * Control Plane binding: observe agent-related trace only (no new authority).
 * Reads TraceLedger entity types emitted by agent-supervisor (agent-proposal, agent-action).
 */
export function observeAgentTrace(
  orgId: string,
  limit = 50,
): PerceptionSlice {
  const byProposal = traceLedgerClient.listByEntityType(
    orgId,
    "agent-proposal",
    limit,
  );
  const byAction = traceLedgerClient.listByEntityType(
    orgId,
    "agent-action",
    limit,
  );
  const entries: TraceLedgerEntry[] = [...byProposal, ...byAction].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    entries: entries.slice(0, limit),
    observedAt: new Date().toISOString(),
    scope: { limit },
  };
}
