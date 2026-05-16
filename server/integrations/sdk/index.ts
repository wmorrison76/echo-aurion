/**
 * Integration SDK
 * Adapter interface, deterministic mapping, standard trace events, reconciliation.
 */

export type {
  Adapter,
  AdapterConfig,
  SourceRecord,
  MappedEntity,
  ReconcileResult,
  IngestionTraceEvent,
} from "./adapter";
export { buildIngestionTrace } from "./adapter";
