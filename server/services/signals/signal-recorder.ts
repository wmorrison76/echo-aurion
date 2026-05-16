/**
 * ===========================================================================
 * Signal recorder — the single write path
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Single point of entry for writing to the signal graph. Every
 *           signal-emitting layer (staff whisper, voice prosody, voyage taps,
 *           atrium engagement, integration webhooks, etc.) routes through
 *           SignalRecorder so the constitutional invariants land on every row.
 *
 * Pending implementation:
 *   - [x] recordSignal(): validates sensitivity is in the enum, sets expiresAt
 *         per RETENTION_DAYS, persists to signals table, returns full row
 *   - [DROPPED per TICKET_003 D3] recordBatch — out of TICKET_003 scope.
 *         Aurion prosody (the realistic high-volume source) is Phase 3;
 *         add then if needed.
 *   - [DEFERRED to a later ticket] in-process pub/sub emit for live
 *         consumers — Phase 1.4+ once routes wire WebSocket fan-out.
 *
 * Aligned to: server/database/migrations/012_signals.sql
 *             shared/types/signals/signal.ts (TICKET_002 IMPLEMENTED)
 *             shared/types/signals/sensitivity.ts (RETENTION_DAYS)
 *
 * Tenet enforcement:
 *   - Tenet 2 (score persists, audio evaporates): expiresAt is set on every
 *     write; the SQL column is NOT NULL so a missing value would be rejected
 *     at the DB layer too — defense in depth.
 *   - Tenet 7 (sensitive flags decay aggressively): per-row decay timing
 *     comes from RETENTION_DAYS[sensitivity]. The signal-decay cron is the
 *     consumer that actually sweeps expired rows.
 *   - Tenet 8 (forbidden uses): for sensitivity='forbidden', RETENTION_DAYS=0
 *     means expires_at = now() at write-time — the row is expired-on-creation
 *     and will be swept by the next decay tick. Tenet 8 (use, not storage)
 *     is enforced at the route boundary, not here. This service ensures
 *     storage swiftness.
 *
 * WARNING: This is the canonical write path for the signal graph. All signal
 * writes MUST route through SignalRecorder. Bypassing this service violates
 * Tenet 2 (expiresAt enforcement) and Tenet 7 (sensitivity-driven decay).
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type { Signal } from '../../../shared/types/signals/signal';
import type { SensitivityLevel } from '../../../shared/types/signals/sensitivity';
import { RETENTION_DAYS } from '../../../shared/types/signals/sensitivity';
import { query } from '../../database/connection';
import { logger } from '../../lib/logger';
import { rowToSignal, type SignalRow } from './_signal-row';

const MS_PER_DAY = 86_400_000;

/**
 * Caller-provided shape for recordSignal(). The service auto-fills id (uuid v4),
 * timestamp (now), expiresAt (per RETENTION_DAYS), and createdAt (now).
 *
 * Defined locally because shared/types/signals/ is OFF LIMITS per TICKET_003
 * dispatch. Mirrors the NewResonanceReading pattern from TICKET_002.
 */
export type NewSignalInput = Omit<Signal, 'id' | 'timestamp' | 'expiresAt' | 'createdAt'>;

/**
 * Pure helper — exported for unit tests. Computes expiresAt from sensitivity
 * per RETENTION_DAYS map (Tenet 7).
 *
 * For sensitivity='forbidden', returns base itself (RETENTION_DAYS = 0):
 * the row is expired-on-creation and will be swept by the next signal-decay
 * cron tick. Tenet 8 design contract — see file header.
 */
export function computeExpiresAt(
  sensitivity: SensitivityLevel,
  base: Date = new Date(),
): Date {
  const days = RETENTION_DAYS[sensitivity];
  return new Date(base.getTime() + days * MS_PER_DAY);
}

export class SignalRecorder {
  /**
   * Persist a signal to the unified signal graph.
   * Auto-fills: id (uuid v4), timestamp (now), expiresAt
   * (now + RETENTION_DAYS[sensitivity]), createdAt (now).
   *
   * Returns the persisted row including server-set fields.
   *
   * Optional `client` parameter: when called inside a transaction
   * (e.g., resonance-engine.createReading), pass the transaction's
   * PoolClient so the insert participates in the transaction. If
   * omitted, a new connection is acquired via the pooled query()
   * helper — original behavior preserved.
   *
   * Tenet 2 + Tenet 7 enforcement point: every write goes through here.
   */
  async recordSignal(input: NewSignalInput, client?: PoolClient): Promise<Signal> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = computeExpiresAt(input.sensitivity, now);

    const sql = `INSERT INTO signals (
         id, guest_id, visit_id, timestamp, source, subject, tags,
         conversion, note, sensitivity, expires_at, created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12
       )
       RETURNING *`;
    const params = [
      id,
      input.guestId,
      input.visitId,
      now.toISOString(),
      input.source,
      JSON.stringify(input.subject),
      JSON.stringify(input.tags),
      input.conversion,
      input.note ?? null,
      input.sensitivity,
      expiresAt.toISOString(),
      now.toISOString(),
    ];

    try {
      const result = client
        ? await client.query<SignalRow>(sql, params)
        : await query<SignalRow>(sql, params);

      if (result.rows.length === 0) {
        throw new Error('signal-recorder: INSERT ... RETURNING produced 0 rows');
      }

      return rowToSignal(result.rows[0]);
    } catch (err) {
      logger.error('[SignalRecorder] insert failed', {
        guestId: input.guestId,
        source: input.source,
        sensitivity: input.sensitivity,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const signalRecorder = new SignalRecorder();
