/**
 * Integration SDK — Adapter interface
 * Deterministic mapping rules (no AI-only mapping); standard trace events for ingestion.
 */

import type { TraceEvent } from "@shared/types/trace-ledger";

export interface AdapterConfig {
  orgId: string;
  connectorId: string;
  credentials?: Record<string, string>;
  options?: Record<string, unknown>;
}

/** Raw record from external system (POS, vendor, etc.) */
export interface SourceRecord {
  id: string;
  source: string;
  raw: Record<string, unknown>;
  fetchedAt: string;
}

/** Mapped LUCCCA-side entity (deterministic mapping only) */
export interface MappedEntity {
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  sourceId: string;
  sourceRecordId: string;
}

/** Result of reconcile: compare source vs LUCCCA */
export interface ReconcileResult {
  match: boolean;
  reasonCode: string;
  sourceId: string;
  luccaId?: string;
  diff?: Record<string, { source: unknown; lucca: unknown }>;
  at: string;
}

/** Standard trace event for ingestion (no AI-only fields) */
export interface IngestionTraceEvent {
  eventType: string;
  connectorId: string;
  sourceRecordId: string;
  entityType: string;
  entityId: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface Adapter {
  /** Fetch raw records from source (paginated if needed) */
  fetch(config: AdapterConfig, options?: { since?: string; limit?: number }): Promise<SourceRecord[]>;

  /** Deterministic map: source record → LUCCCA entity (no AI-only mapping) */
  map(record: SourceRecord, config: AdapterConfig): Promise<MappedEntity | null>;

  /** Validate mapped entity against schema / business rules */
  validate(mapped: MappedEntity, config: AdapterConfig): Promise<{ valid: boolean; errors: string[] }>;

  /** Emit standard trace for ingestion (calls trace ledger) */
  emitTrace(
    config: AdapterConfig,
    event: IngestionTraceEvent,
    request?: unknown
  ): Promise<{ traceId: string } | null>;

  /** Compare source vs LUCCCA records; return mismatches with reason codes */
  reconcile(
    config: AdapterConfig,
    sourceRecord: SourceRecord,
    luccaRecord: Record<string, unknown> | null
  ): Promise<ReconcileResult>;
}

/** Helper to build standard trace payload for connectors */
export function buildIngestionTrace(
  connectorId: string,
  eventType: string,
  sourceRecordId: string,
  entityType: string,
  entityId: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>
): TraceEvent {
  return {
    actor: { userId: "system", role: "integration", system: connectorId },
    sourcePanel: `integration-${connectorId}`,
    domain: "integration",
    inputs: { ...inputs, sourceRecordId, connectorId, eventType },
    outputs,
    timestamp: new Date().toISOString(),
    traceId: `ingest-${connectorId}-${sourceRecordId}-${Date.now()}`,
  };
}
