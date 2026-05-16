/**
 * ===========================================================================
 * Signal query — the read path
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Read interface for the signal graph. Three filtered query methods
 *           covering the Phase 1.3 consumer needs:
 *             - getSignalsForGuest(guestId, limit?): per-guest history
 *             - getSignalsForVisit(visitId): per-visit timeline
 *             - getSignalsBySource(source, since): operational queries
 *               (e.g., "all flight-tracker signals since this morning's batch")
 *
 *           All methods filter out expired rows at read-time (WHERE
 *           expires_at >= NOW()) per Tenet 7 defense in depth. The
 *           signal-decay cron handles physical deletion on schedule; this
 *           filter ensures consumers never see expired rows even if the
 *           cron is late or skipped — load-bearing for forbidden-sensitivity
 *           rows that are expired-on-creation per the Tenet 8 contract.
 *
 * Pending implementation:
 *   - [x] getSignalsForGuest: paginated, ordered desc, expired filter
 *   - [x] getSignalsForVisit: ordered desc, expired filter
 *   - [x] getSignalsBySource: time-windowed, ordered desc, expired filter
 *   - [DROPPED per pass N1] general query() + cursor pagination — over-
 *         engineered for Phase 1.3, no consumer needs cursor yet; add
 *         when a consumer demands it
 *
 * Aligned to: server/database/migrations/012_signals.sql
 *             shared/types/signals/signal.ts (TICKET_002 IMPLEMENTED)
 *
 * Tenet enforcement:
 *   - Tenet 7 (sensitive flags decay aggressively): every read filters
 *     `WHERE expires_at >= NOW()`. Consumers never observe expired rows.
 *
 * WARNING: This is the canonical read path for the signal graph. All signal
 * reads SHOULD route through SignalQuery so the expired-filter invariant
 * applies uniformly. Direct SQL bypassing this service risks returning
 * expired rows. Modifications require TICKET-level authorization.
 * ===========================================================================
 */

import type { Signal, SignalSource } from '../../../shared/types/signals/signal';
import type { UUID, ISODate } from '../../../shared/types/base';
import { query } from '../../database/connection';
import { logger } from '../../lib/logger';
import { rowToSignal, type SignalRow } from './_signal-row';

const DEFAULT_GUEST_LIMIT = 50;

export class SignalQuery {
  /**
   * Signals for a single guest, ordered most-recent-first.
   * Filters out expired rows (Tenet 7 defense in depth).
   */
  async getSignalsForGuest(
    guestId: UUID,
    limit: number = DEFAULT_GUEST_LIMIT,
  ): Promise<Signal[]> {
    try {
      const result = await query<SignalRow>(
        `SELECT * FROM signals
         WHERE guest_id = $1
           AND expires_at >= NOW()
         ORDER BY timestamp DESC
         LIMIT $2`,
        [guestId, limit],
      );
      return result.rows.map(rowToSignal);
    } catch (err) {
      logger.error('[SignalQuery] getSignalsForGuest failed', {
        guestId,
        limit,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Signals attached to a specific visit, ordered most-recent-first.
   * Filters out expired rows. Visit-less signals (visit_id IS NULL) are
   * excluded by the equality predicate — they belong to the guest, not the visit.
   */
  async getSignalsForVisit(visitId: UUID): Promise<Signal[]> {
    try {
      const result = await query<SignalRow>(
        `SELECT * FROM signals
         WHERE visit_id = $1
           AND expires_at >= NOW()
         ORDER BY timestamp DESC`,
        [visitId],
      );
      return result.rows.map(rowToSignal);
    } catch (err) {
      logger.error('[SignalQuery] getSignalsForVisit failed', {
        visitId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Signals from a specific source emitted at or after `since`, ordered
   * most-recent-first. Filters out expired rows.
   */
  async getSignalsBySource(source: SignalSource, since: ISODate): Promise<Signal[]> {
    try {
      const result = await query<SignalRow>(
        `SELECT * FROM signals
         WHERE source = $1
           AND timestamp >= $2
           AND expires_at >= NOW()
         ORDER BY timestamp DESC`,
        [source, since],
      );
      return result.rows.map(rowToSignal);
    } catch (err) {
      logger.error('[SignalQuery] getSignalsBySource failed', {
        source,
        since,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const signalQuery = new SignalQuery();
