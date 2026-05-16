/**
 * ===========================================================================
 * Signal decay — cron-driven retention enforcement
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  The storage-layer enforcement of Tenet 7 (sensitive flags decay
 *           aggressively) and Tenet 8 (forbidden persists then immediately
 *           expires). Hard-deletes signals whose expires_at has passed.
 *
 *           Companion to signal-recorder (write side) and signal-query
 *           (read side, defense-in-depth filter). Together the three:
 *             - recorder sets expiresAt at write per RETENTION_DAYS
 *             - query filters expired rows even before sweep
 *             - decay physically deletes them on schedule
 *
 *           The decay function is a regular async callable. Cron WIRING
 *           (e.g., bullmq schedule, system cron, or platform scheduler) is
 *           a separate infrastructure concern — when wired, the cron simply
 *           imports + invokes signalDecay.purgeExpiredSignals() on its
 *           cadence. Hourly is the spec'd cadence per TICKET_003.
 *
 * Pending implementation:
 *   - [x] purgeExpiredSignals(): hard-DELETE expired rows, return count by sensitivity
 *   - [DEFERRED] cron wiring — separate infrastructure ticket; the function is
 *         fully callable now, scheduler picks it up when ready
 *   - [DEFERRED] persistent audit log table — present implementation logs to
 *         logger.info; durable audit-log persistence is a separate compliance
 *         ticket (Tenet 4 / Tenet 5 audit trail surface)
 *
 * Aligned to: server/database/migrations/012_signals.sql
 *             shared/types/signals/sensitivity.ts (RETENTION_DAYS)
 *
 * Tenet enforcement:
 *   - Tenet 7 (sensitive flags decay aggressively): every row past expires_at
 *     is hard-deleted on each pass. Per RETENTION_DAYS, `sensitive` and
 *     `emotional` rows have a 30-day budget.
 *   - Tenet 8 (forbidden uses): forbidden-sensitivity rows are written with
 *     expires_at = now() (per signal-recorder D2 contract); the very next
 *     decay pass hard-deletes them.
 *
 * WARNING: This is the canonical retention-enforcement path. Bypassing this
 * service to keep expired data risks Tenet 7 / 8 violations and audit
 * non-compliance. Modifications require TICKET-level authorization.
 * ===========================================================================
 */

import type { SensitivityLevel } from '../../../shared/types/signals/sensitivity';
import { query } from '../../database/connection';
import { logger } from '../../lib/logger';

export interface DecayPassResult {
  /** Total rows hard-deleted on this pass. */
  deleted: number;
  /** Rows deleted, broken out by sensitivity level (for observability). */
  bySensitivity: Record<SensitivityLevel, number>;
}

const SENSITIVITY_LEVELS: SensitivityLevel[] = [
  'public',
  'preference',
  'behavioral',
  'emotional',
  'sensitive',
  'forbidden',
];

function emptyBreakdown(): Record<SensitivityLevel, number> {
  return {
    public: 0,
    preference: 0,
    behavioral: 0,
    emotional: 0,
    sensitive: 0,
    forbidden: 0,
  };
}

export class SignalDecay {
  /**
   * Hard-deletes all signals where expires_at < now(). Returns total count
   * and per-sensitivity breakdown for observability and compliance logging.
   *
   * Idempotent: re-running immediately returns deleted=0 because the prior
   * pass already swept every row that was expired.
   *
   * Tenet 7 + Tenet 8 enforcement point.
   */
  async purgeExpiredSignals(): Promise<DecayPassResult> {
    try {
      const result = await query<{ sensitivity: string }>(
        `DELETE FROM signals
         WHERE expires_at < NOW()
         RETURNING sensitivity`,
      );

      const bySensitivity = emptyBreakdown();
      for (const row of result.rows) {
        const level = row.sensitivity as SensitivityLevel;
        if (SENSITIVITY_LEVELS.includes(level)) {
          bySensitivity[level] += 1;
        }
      }
      const deleted = result.rows.length;

      logger.info('[SignalDecay] purge complete', { deleted, bySensitivity });

      return { deleted, bySensitivity };
    } catch (err) {
      logger.error('[SignalDecay] purge failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const signalDecay = new SignalDecay();
