/**
 * TraceLedger
 * Append-only audit trail for cross-domain traceability.
 */

export interface TraceLedgerEntry {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  sourceRef?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface TraceLedgerAppendInput {
  orgId: string;
  entityType: string;
  entityId: string;
  sourceRef?: string | null;
  payload: Record<string, unknown>;
}

/**
 * Downstream implication from a trace event
 */
export interface TraceDownstreamImplication {
  type: string;
  entityType: string;
  entityId: string;
  impact: string;
}

/**
 * Required TRACE_EVENT structure for enterprise audit spine
 * All critical operations must emit structured trace events with these fields.
 */
export interface TraceEvent {
  // Required fields
  actor: {
    userId: string;
    role: string;
    system?: string; // Optional system identifier
  };
  sourcePanel: string; // e.g., "menu-builder", "forecast-hub", "inventory-service"
  domain: string; // e.g., "menu", "forecast", "inventory", "permissions", "export"
  inputs: Record<string, unknown>; // Input data/parameters
  outputs: Record<string, unknown>; // Output data/results
  downstreamImplications?: TraceDownstreamImplication[]; // Optional downstream impacts
  confidence?: number; // 0-1 scale
  assumptions?: string[]; // List of assumptions made
  timestamp: string; // ISO 8601
  traceId: string; // Unique trace identifier for linking
}
