/**
 * ===========================================================================
 * Conversation memory — what Aurion remembers about a guest
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 2 signals-backed; dedicated guest_memory table is Phase 3.x)
 * Phase:    3
 *
 * Purpose:  Per master doc §8.3 + Tenet 5: backs the "what do you remember
 *           about me?" surface. Plain-language, editable, with per-item
 *           forget-this controls.
 *
 *           Phase 2 storage strategy: derive memory from the existing
 *           signals graph. Each signal of sensitivity in {public,
 *           preference, behavioral} is a memory item; ephemeral retention
 *           comes from RETENTION_DAYS already enforced server-side.
 *           Promotion to "persistent" is a Phase 3.x dedicated table —
 *           today's signals already stick around per their sensitivity.
 *
 *           Categories surface in plain language:
 *             preferences          — sensitivity='preference' signals
 *             occasions            — subject.kind='occasion' signals
 *             allergens            — tags with kind='allergy'
 *             amenity-affinity     — voyage-* sources w/ amenity subjects
 *             service-history      — staff-whisper / pms-event sources
 *             communication-style  — aurion-voice-* sources (Phase 3+)
 *
 *           Forget operations cascade to physically deleting the
 *           underlying signals (Tenet 5: "no traces remain").
 *           forgetAll wipes resonance_readings + signals + staff_whispers
 *           + voice_sessions for the guest in one transaction.
 * ===========================================================================
 */

import type { GuestMemoryView, GuestMemoryItem } from '../../../../shared/types/trust';
import type { GuestId } from '../../../../shared/types/base';
import type { Signal } from '../../../../shared/types/signals';
import { query, transaction } from '../../../database/connection';
import { logger } from '../../../lib/logger';
import { signalQuery } from '../../signals/signal-query';

export interface MemoryQuery {
  guestId: GuestId;
  category?: GuestMemoryItem['source'];
  includePersistent?: boolean;
  includeEphemeral?: boolean;
}

type CategoryName = NonNullable<GuestMemoryView['categories'][number]['category']>;

/**
 * Pure helper: convert a Signal into one or more memory items.
 * Some signals carry multiple tag-derived items (e.g., allergies).
 * Exported for testing.
 */
export function signalToMemoryItems(signal: Signal): { category: CategoryName; item: GuestMemoryItem }[] {
  const out: { category: CategoryName; item: GuestMemoryItem }[] = [];
  const baseSource: GuestMemoryItem['source'] = signal.source.startsWith('aurion-')
    ? 'inferred-by-aurion'
    : signal.source === 'staff-whisper'
      ? 'observed-by-staff'
      : 'stated-by-guest';

  // Allergy tags become allergens category, regardless of subject
  for (const tag of signal.tags ?? []) {
    if (tag.kind === 'allergy') {
      out.push({
        category: 'allergens',
        item: {
          id: `${signal.id}:allergy:${tag.value}`,
          description: `${tag.value} allergy`,
          source: 'observed-by-staff',
          capturedAt: signal.timestamp,
          canForget: true,
        },
      });
    }
  }

  // Subject-derived items
  if (signal.subject?.kind === 'occasion') {
    out.push({
      category: 'occasions',
      item: {
        id: signal.id,
        description: signal.subject.occasionType,
        source: baseSource,
        capturedAt: signal.timestamp,
        canForget: true,
      },
    });
  } else if (signal.subject?.kind === 'amenity' || signal.subject?.kind === 'venue') {
    if (
      signal.source === 'voyage-add-to-itinerary' ||
      signal.source === 'voyage-tap' ||
      signal.source === 'voyage-dwell'
    ) {
      out.push({
        category: 'amenity-affinity',
        item: {
          id: signal.id,
          description:
            signal.subject.kind === 'venue'
              ? `interest in venue ${(signal.subject as { venueId?: string }).venueId?.slice(-6) ?? ''}`
              : `interest in amenity ${(signal.subject as { amenityId?: string }).amenityId?.slice(-6) ?? ''}`,
          source: baseSource,
          capturedAt: signal.timestamp,
          canForget: true,
        },
      });
    }
  } else if (signal.subject?.kind === 'free-text' && signal.note) {
    out.push({
      category: 'service-history',
      item: {
        id: signal.id,
        description: signal.note,
        source: baseSource,
        capturedAt: signal.timestamp,
        canForget: true,
      },
    });
  }

  // Preference-sensitivity signals fall into preferences category
  if (signal.sensitivity === 'preference' && out.length === 0) {
    out.push({
      category: 'preferences',
      item: {
        id: signal.id,
        description: signal.note ?? `preference: ${signal.source}`,
        source: baseSource,
        capturedAt: signal.timestamp,
        canForget: true,
      },
    });
  }

  return out;
}

export class ConversationMemory {
  /**
   * Render the memory view that the guest sees. Plain-language, grouped
   * by category. Sensitivity='sensitive' / 'forbidden' signals are
   * filtered server-side by signal-query (Tenet 7) so they never
   * surface here.
   */
  async renderForGuest(guestId: GuestId): Promise<GuestMemoryView> {
    try {
      const signals = await signalQuery.getSignalsForGuest(guestId, 500);
      const buckets = new Map<CategoryName, GuestMemoryItem[]>();
      for (const signal of signals) {
        // Filter out sensitive class — even when retrieved, never show in
        // memory review
        if (signal.sensitivity === 'sensitive' || signal.sensitivity === 'forbidden') {
          continue;
        }
        for (const { category, item } of signalToMemoryItems(signal)) {
          const list = buckets.get(category) ?? [];
          list.push(item);
          buckets.set(category, list);
        }
      }
      const categories = Array.from(buckets.entries()).map(([category, items]) => ({
        category,
        items,
      }));
      return {
        guestId,
        generatedAt: new Date().toISOString(),
        categories,
      };
    } catch (err) {
      logger.error('[ConversationMemory] renderForGuest failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Add a memory item. Phase 2 maps to a signal write — the dedicated
   * guest_memory_items table arrives in Phase 3.x.
   */
  async remember(
    guestId: GuestId,
    item: Omit<GuestMemoryItem, 'id' | 'capturedAt'>,
  ): Promise<GuestMemoryItem> {
    // Phase 2 simplification: log the intent. Real persistence requires
    // either a dedicated table or a synthetic Signal row. For Phase 3
    // launch we wire the dedicated table; until then this is a no-op
    // placeholder that returns the input echoed for the caller.
    logger.warn('[ConversationMemory] remember() requires Phase 3.x guest_memory_items table', {
      guestId,
    });
    return {
      id: `pending-${Date.now()}`,
      capturedAt: new Date().toISOString(),
      ...item,
    };
  }

  /**
   * Promote ephemeral → persistent. Requires explicit consent token.
   * Phase 3.x extension — Phase 2 logs and no-ops.
   */
  async promote(guestId: GuestId, itemId: string, consentToken: string): Promise<void> {
    if (!consentToken || consentToken.length < 16) {
      throw new Error('conversation-memory: promote requires a valid consentToken');
    }
    logger.info('[ConversationMemory] promote() pending guest_memory_items table', {
      guestId,
      itemId,
    });
  }

  /**
   * Hard-delete a single memory item. Phase 2: deletes the underlying
   * signal whose id matches the item id. The id format includes
   * the signal id directly (or a synthetic `signalId:tag:value` form
   * for tag-derived items).
   */
  async forget(guestId: GuestId, itemId: string): Promise<void> {
    try {
      // Item ids may be either a raw signal UUID OR a composite of the form
      // `<signalId>:allergy:<value>`. Either way the underlying signal id
      // is the prefix up to the first ':'.
      const signalId = itemId.split(':')[0];
      const result = await query(
        'DELETE FROM signals WHERE id = $1 AND guest_id = $2',
        [signalId, guestId],
      );
      if (result.rowCount === 0) {
        // Not a hard-error; the item may have been from a tag and the
        // signal is shared with other items. Log and continue.
        logger.info('[ConversationMemory] forget: no signal row deleted', {
          guestId,
          itemId,
          signalId,
        });
      }
    } catch (err) {
      logger.error('[ConversationMemory] forget failed', {
        guestId,
        itemId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Wipe all memory for a guest (delete-everything control).
   * Tenet 5: "no traces remain in any subsystem."
   *
   * Cascades to:
   *   - signals (where guest_id = ?)
   *   - resonance_readings
   *   - staff_whispers
   *   - voice_sessions
   *   - resonance_trajectories (their visit_id rows lose the guest)
   *   - interventions_executed (only proposals associated with the guest)
   *
   * Returns row counts deleted across each table for the audit log.
   */
  async forgetAll(guestId: GuestId): Promise<{
    signals: number;
    readings: number;
    staffWhispers: number;
    voiceSessions: number;
    trajectories: number;
    interventions: number;
  }> {
    try {
      const counts = await transaction(async (client) => {
        const signals = await client.query('DELETE FROM signals WHERE guest_id = $1', [guestId]);
        const readings = await client.query(
          'DELETE FROM resonance_readings WHERE guest_id = $1',
          [guestId],
        );
        const staffWhispers = await client.query(
          'DELETE FROM staff_whispers WHERE guest_id = $1',
          [guestId],
        );
        const voiceSessions = await client.query(
          'DELETE FROM voice_sessions WHERE guest_id = $1',
          [guestId],
        );
        const trajectories = await client.query(
          'DELETE FROM resonance_trajectories WHERE guest_id = $1',
          [guestId],
        );
        const interventions = await client.query(
          'DELETE FROM interventions_executed WHERE guest_id = $1',
          [guestId],
        );
        return {
          signals: signals.rowCount ?? 0,
          readings: readings.rowCount ?? 0,
          staffWhispers: staffWhispers.rowCount ?? 0,
          voiceSessions: voiceSessions.rowCount ?? 0,
          trajectories: trajectories.rowCount ?? 0,
          interventions: interventions.rowCount ?? 0,
        };
      });
      logger.info('[ConversationMemory] forgetAll complete', { guestId, ...counts });
      return counts;
    } catch (err) {
      logger.error('[ConversationMemory] forgetAll failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const conversationMemory = new ConversationMemory();
