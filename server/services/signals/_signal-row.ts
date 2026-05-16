/**
 * ===========================================================================
 * Internal: signals row mapper
 * ===========================================================================
 * Layer:    Substrate: Signal Graph (internal)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Shared SQL row → Signal mapping helpers. Used by:
 *             - signal-recorder.ts (write side: INSERT … RETURNING * → Signal)
 *             - signal-query.ts    (read side:  SELECT * FROM signals → Signal[])
 *
 *           pg-node returns TIMESTAMPTZ as Date objects and JSONB columns as
 *           parsed values; we translate snake_case columns + Date timestamps
 *           into the canonical Signal shape from shared/types/signals/signal.ts.
 *
 *           Underscore prefix = internal to server/services/signals/. Consumers
 *           outside this directory must use the signalRecorder / signalQuery
 *           service interfaces.
 *
 * Aligned to: server/database/migrations/012_signals.sql
 *             shared/types/signals/signal.ts (TICKET_002 IMPLEMENTED)
 *
 * WARNING: This is internal infrastructure for the signal services. The
 * SignalRow shape here must stay in sync with the SQL schema and the
 * canonical Signal type. Modifications require TICKET-level authorization.
 * ===========================================================================
 */

import type { Signal } from '../../../shared/types/signals/signal';

/**
 * Raw shape of a row from `SELECT * FROM signals`.
 * pg-node returns TIMESTAMPTZ as Date object; JSONB columns return parsed values.
 */
export interface SignalRow {
  id: string;
  guest_id: string;
  visit_id: string | null;
  timestamp: Date | string;
  source: string;
  subject: unknown;
  tags: unknown;
  conversion: string | null;
  note: string | null;
  sensitivity: string;
  expires_at: Date | string;
  created_at: Date | string;
}

/**
 * Coerce a pg date value (Date object or ISO string) to ISO 8601 string.
 * Throws if the value is neither — defensive against unexpected pg config drift.
 */
export function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`signals/_signal-row: unexpected date value type: ${typeof value}`);
}

/**
 * Map a SQL row into the canonical Signal shape. Translates snake_case →
 * camelCase, Date → ISO string, JSONB unknowns → typed Signal fields.
 */
export function rowToSignal(row: SignalRow): Signal {
  return {
    id: row.id,
    guestId: row.guest_id,
    visitId: row.visit_id,
    timestamp: dateToIso(row.timestamp),
    source: row.source as Signal['source'],
    subject: row.subject as Signal['subject'],
    tags: (row.tags as Signal['tags']) ?? [],
    conversion: row.conversion as Signal['conversion'],
    note: row.note ?? undefined,
    sensitivity: row.sensitivity as Signal['sensitivity'],
    expiresAt: dateToIso(row.expires_at),
    createdAt: dateToIso(row.created_at),
  };
}
