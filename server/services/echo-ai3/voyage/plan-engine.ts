/**
 * ===========================================================================
 * Plan engine — the Living Plan CRUD and lifecycle
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Per master doc §6.1.2: confirmed/held/suggested blocks composing
 *           a trip's timeline. Master doc §6.2: "every guest action becomes
 *           a structured signal" — dismissals are signals, not deletions.
 *
 *           Implements the existing stub API surface (getPlan, addBlock,
 *           setBlockClass, dismissBlock, editBlock, releaseExpiredHolds)
 *           plus the master doc's state-machine semantics: setBlockClass
 *           enforces forward-only transitions (suggested → held → confirmed)
 *           per §6.1.2.
 *
 * Aligned to: server/database/migrations/018_trip_blocks.sql
 *             shared/types/voyage/plan.ts
 *
 * Pending implementation:
 *   - [x] Block conversions: suggested → held → confirmed (state-guarded)
 *   - [x] Auto-release of held blocks past heldUntil
 *   - [x] Dismissal records as a signal (soft-delete with reason)
 *   - [DEFERRED to Phase 2.x] Conflict detection on overlapping blocks —
 *         schema allows; UI flags. Hard-rejection lands when the
 *         capacity-aware suggestion-ranker is wired into addBlock.
 *   - [DEFERRED] Travel-time computation between consecutive blocks —
 *         needs map-engine. Phase 2.x.
 * ===========================================================================
 */

import type {
  LivingPlan,
  PlanBlock,
  BlockClass,
} from '../../../../shared/types/voyage';
import type { UUID } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';

export interface AddBlockArgs {
  tripId: UUID;
  block: Omit<PlanBlock, 'id' | 'proposedAt'>;
}

interface BlockRow {
  id: string;
  trip_id: string;
  class: string;
  kind: string;
  starts_at: Date | string;
  ends_at: Date | string;
  title: string;
  venue_id: string | null;
  party_member_ids: string[] | null;
  source: string;
  proposed_at: Date | string;
  held_until: Date | string | null;
  suggestion_copy: string | null;
  dismissed_at: Date | string | null;
  dismissed_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`plan-engine: unexpected date value type: ${typeof value}`);
}

function maybeIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return dateToIso(value);
}

function rowToBlock(row: BlockRow): PlanBlock {
  return {
    id: row.id,
    tripId: row.trip_id,
    class: row.class as BlockClass,
    kind: row.kind as PlanBlock['kind'],
    startsAt: dateToIso(row.starts_at),
    endsAt: dateToIso(row.ends_at),
    title: row.title,
    venueId: row.venue_id ?? undefined,
    partyMemberIds: row.party_member_ids ?? undefined,
    source: row.source as PlanBlock['source'],
    proposedAt: dateToIso(row.proposed_at),
    heldUntil: maybeIso(row.held_until),
    suggestionCopy: row.suggestion_copy ?? undefined,
  };
}

// Forward-only state machine. Cancellation = dismissBlock (separate path).
const ALLOWED_TRANSITIONS: Record<BlockClass, BlockClass[]> = {
  suggested: ['held', 'confirmed'], // can also jump straight to confirmed (one-tap)
  held: ['confirmed'],
  confirmed: [], // terminal
};

const DEFAULT_HOLD_DURATION_MS = 4 * 3_600_000; // 4 hours

export class PlanEngine {
  /**
   * Full Living Plan for a trip. Excludes dismissed blocks. Sorted by
   * startsAt ascending. Returns an empty plan (no blocks) rather than null
   * when the trip has no blocks yet — matches LivingPlan type contract.
   */
  async getPlan(tripId: UUID): Promise<LivingPlan> {
    try {
      const result = await query<BlockRow>(
        `SELECT * FROM trip_blocks
         WHERE trip_id = $1 AND dismissed_at IS NULL
         ORDER BY starts_at ASC`,
        [tripId],
      );
      const blocks = result.rows.map(rowToBlock);
      const lastUpdatedAt =
        blocks.length === 0
          ? new Date(0).toISOString()
          : blocks
              .map((b) => b.proposedAt)
              .sort()
              .pop()!;
      return {
        id: tripId, // Phase 2: id == tripId; future schema split is fine
        tripId,
        lastUpdatedAt,
        blocks,
      };
    } catch (err) {
      logger.error('[PlanEngine] getPlan failed', {
        tripId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Insert a new block. */
  async addBlock(args: AddBlockArgs): Promise<PlanBlock> {
    const b = args.block;
    if (new Date(b.endsAt).getTime() <= new Date(b.startsAt).getTime()) {
      throw new Error('plan-engine: block endsAt must be strictly after startsAt');
    }
    try {
      const result = await query<BlockRow>(
        `INSERT INTO trip_blocks (
           id, trip_id, class, kind, starts_at, ends_at, title,
           venue_id, party_member_ids, source, proposed_at,
           held_until, suggestion_copy
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, $6,
           $7, $8::uuid[], $9, NOW(),
           $10, $11
         )
         RETURNING *`,
        [
          args.tripId,
          b.class,
          b.kind,
          b.startsAt,
          b.endsAt,
          b.title,
          b.venueId ?? null,
          b.partyMemberIds ?? null,
          b.source,
          b.heldUntil ?? null,
          b.suggestionCopy ?? null,
        ],
      );
      if (result.rows.length === 0) {
        throw new Error('plan-engine: addBlock returned no rows');
      }
      return rowToBlock(result.rows[0]);
    } catch (err) {
      logger.error('[PlanEngine] addBlock failed', {
        tripId: args.tripId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Class transition: suggested → held → confirmed. Forward-only.
   * Out-of-order transitions (e.g., confirmed → suggested) reject cleanly.
   *
   * When transitioning to 'held', a default heldUntil is set (4 hours
   * from now). When transitioning to 'confirmed', held_until is cleared.
   */
  async setBlockClass(blockId: UUID, klass: BlockClass): Promise<PlanBlock> {
    try {
      // Read current class for validation
      const existing = await query<BlockRow>(
        'SELECT class FROM trip_blocks WHERE id = $1 AND dismissed_at IS NULL',
        [blockId],
      );
      if (existing.rows.length === 0) {
        throw new Error(`plan-engine: setBlockClass — block ${blockId} not found or dismissed`);
      }
      const current = existing.rows[0].class as BlockClass;
      const allowed = ALLOWED_TRANSITIONS[current] ?? [];
      if (!allowed.includes(klass)) {
        throw new Error(
          `plan-engine: invalid block transition ${current} → ${klass} (allowed: ${allowed.join(', ') || 'none'})`,
        );
      }

      const heldUntilSet =
        klass === 'held'
          ? new Date(Date.now() + DEFAULT_HOLD_DURATION_MS).toISOString()
          : null;
      const updated = await query<BlockRow>(
        `UPDATE trip_blocks
         SET class = $2,
             held_until = $3,
             updated_at = NOW()
         WHERE id = $1 AND class = $4 AND dismissed_at IS NULL
         RETURNING *`,
        [blockId, klass, heldUntilSet, current],
      );
      if (updated.rows.length === 0) {
        throw new Error(`plan-engine: setBlockClass — concurrent transition on ${blockId}`);
      }
      return rowToBlock(updated.rows[0]);
    } catch (err) {
      logger.error('[PlanEngine] setBlockClass failed', {
        blockId,
        klass,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Dismissal records as a signal (master doc §6.2). Soft-delete with
   * reason; NEVER hard-deletes. The unconverted-ask-tracker mines these
   * later. Reason is encouraged but optional to match the existing stub
   * contract — if absent, we default to 'guest-dismissed' so the row
   * remains queryable.
   */
  async dismissBlock(blockId: UUID, reason?: string): Promise<void> {
    try {
      const result = await query<{ id: string }>(
        `UPDATE trip_blocks
         SET dismissed_at = NOW(),
             dismissed_reason = $2,
             updated_at = NOW()
         WHERE id = $1 AND dismissed_at IS NULL
         RETURNING id`,
        [blockId, reason?.trim() || 'guest-dismissed'],
      );
      if (result.rows.length === 0) {
        throw new Error(
          `plan-engine: dismissBlock — block ${blockId} not found or already dismissed`,
        );
      }
    } catch (err) {
      logger.error('[PlanEngine] dismissBlock failed', {
        blockId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Patch select fields on a block. Class transitions go through
   * setBlockClass (state-guarded); patch handles title, venue,
   * heldUntil, suggestionCopy, partyMemberIds, startsAt/endsAt.
   */
  async editBlock(blockId: UUID, patch: Partial<PlanBlock>): Promise<PlanBlock> {
    const updates: string[] = [];
    const values: unknown[] = [blockId];
    let i = 2;

    if (patch.title !== undefined) {
      updates.push(`title = $${i++}`);
      values.push(patch.title);
    }
    if (patch.venueId !== undefined) {
      updates.push(`venue_id = $${i++}`);
      values.push(patch.venueId);
    }
    if (patch.startsAt !== undefined) {
      updates.push(`starts_at = $${i++}`);
      values.push(patch.startsAt);
    }
    if (patch.endsAt !== undefined) {
      updates.push(`ends_at = $${i++}`);
      values.push(patch.endsAt);
    }
    if (patch.heldUntil !== undefined) {
      updates.push(`held_until = $${i++}`);
      values.push(patch.heldUntil);
    }
    if (patch.suggestionCopy !== undefined) {
      updates.push(`suggestion_copy = $${i++}`);
      values.push(patch.suggestionCopy);
    }
    if (patch.partyMemberIds !== undefined) {
      updates.push(`party_member_ids = $${i++}::uuid[]`);
      values.push(patch.partyMemberIds);
    }

    if (updates.length === 0) {
      // Nothing to update — return the current row
      const result = await query<BlockRow>(
        'SELECT * FROM trip_blocks WHERE id = $1 AND dismissed_at IS NULL',
        [blockId],
      );
      if (result.rows.length === 0) {
        throw new Error(`plan-engine: editBlock — block ${blockId} not found`);
      }
      return rowToBlock(result.rows[0]);
    }

    updates.push(`updated_at = NOW()`);
    try {
      const result = await query<BlockRow>(
        `UPDATE trip_blocks
         SET ${updates.join(', ')}
         WHERE id = $1 AND dismissed_at IS NULL
         RETURNING *`,
        values,
      );
      if (result.rows.length === 0) {
        throw new Error(`plan-engine: editBlock — block ${blockId} not found or dismissed`);
      }
      return rowToBlock(result.rows[0]);
    } catch (err) {
      logger.error('[PlanEngine] editBlock failed', {
        blockId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Sweep: held blocks whose held_until has passed revert to 'suggested'.
   * Idempotent — repeat runs are safe. Designed to be called from the
   * decay scheduler (or its own scheduler when traffic warrants).
   */
  async releaseExpiredHolds(): Promise<{ released: number }> {
    try {
      const result = await query<{ id: string }>(
        `UPDATE trip_blocks
         SET class = 'suggested',
             held_until = NULL,
             updated_at = NOW()
         WHERE class = 'held'
           AND held_until IS NOT NULL
           AND held_until < NOW()
           AND dismissed_at IS NULL
         RETURNING id`,
      );
      const released = result.rows.length;
      if (released > 0) {
        logger.info('[PlanEngine] released expired holds', { released });
      }
      return { released };
    } catch (err) {
      logger.error('[PlanEngine] releaseExpiredHolds failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const planEngine = new PlanEngine();
