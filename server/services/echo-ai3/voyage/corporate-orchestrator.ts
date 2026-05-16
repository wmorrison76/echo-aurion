/**
 * ===========================================================================
 * Corporate orchestrator — conference-aware planning
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED (Phase 2 iCal parser; Google/Outlook native APIs Phase 5)
 * Phase:    2 (advanced from nominal Phase 5; corporate trips are demo-relevant)
 *
 * Purpose:  Per master doc §6.3 (Corporate Lane): "The 8 p.m. gap between
 *           conference dinner and bed is not a gap — it is the moment they
 *           decide whether this property gets their leisure dollar in six
 *           months."
 *
 *           Operations:
 *             - Calendar import: minimal RFC 5545 iCal parser handles
 *               iCal payload directly. Google Calendar + Outlook export
 *               iCal feeds via shareable links — same parser. Phase 5
 *               wires per-provider OAuth flows.
 *             - Auto-fill: conference sessions become confirmed blocks.
 *               Mandatory sessions = 'meeting' kind; catered sessions =
 *               'meal' kind (gap-finder won't suggest into them).
 *               Non-mandatory free time stays open for gap-finder.
 *             - Departure seeding: per master doc, Aurion's last message
 *               is the leisure-return invitation. Phase 2 stores the
 *               seed; Phase 3 Aurion delivers it.
 *
 *           Group coordination (master doc §6.3 "soft group booking") is
 *           a Phase 2.x extension — detection logic isn't yet wired.
 *           Filed in the file header pending requirements review.
 *
 * Aligned to: server/database/migrations/019_corporate_blocks.sql
 *             shared/types/voyage/corporate.ts
 *             server/services/echo-ai3/voyage/plan-engine.ts
 *
 * Tenet alignment:
 *   - Tenet 5: leisure-return seed is opt-in; cascades to deletion via
 *     Tenet 5 delete-everything path.
 *   - Silent Service: leisure return is an invitation, not a marketing
 *     form. "No need to do anything, just a thought for later" register.
 * ===========================================================================
 */

import type {
  CorporateBlock,
  ConferenceSession,
  CorporateLeisureSeed,
} from '../../../../shared/types/voyage';
import type { UUID, GuestId, ISODateTime } from '../../../../shared/types/base';
import { query, transaction } from '../../../database/connection';
import { logger } from '../../../lib/logger';
import { planEngine } from './plan-engine';
import { tripEngine } from './trip-engine';

interface BlockRow {
  id: string;
  conference_name: string;
  organizer_name: string;
  starts_at: Date | string;
  ends_at: Date | string;
  attendee_guest_ids: string[];
  created_at: Date | string;
}

interface SessionRow {
  id: string;
  block_id: string;
  title: string;
  starts_at: Date | string;
  ends_at: Date | string;
  is_mandatory: boolean;
  catering_provided: boolean;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`corporate-orchestrator: unexpected date value: ${typeof value}`);
}

function rowToBlock(row: BlockRow): CorporateBlock {
  return {
    id: row.id,
    conferenceName: row.conference_name,
    organizerName: row.organizer_name,
    startsAt: dateToIso(row.starts_at),
    endsAt: dateToIso(row.ends_at),
    attendeeGuestIds: row.attendee_guest_ids ?? [],
  };
}

function rowToSession(row: SessionRow): ConferenceSession {
  return {
    id: row.id,
    blockId: row.block_id,
    title: row.title,
    startsAt: dateToIso(row.starts_at),
    endsAt: dateToIso(row.ends_at),
    isMandatory: row.is_mandatory,
    cateringProvided: row.catering_provided,
  };
}

// ---------------------------------------------------------------------------
// iCal parser — minimal RFC 5545 subset
// ---------------------------------------------------------------------------

interface ParsedICalEvent {
  summary: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  description?: string;
  cateringProvided: boolean;
  isMandatory: boolean;
}

/**
 * Parse a minimal iCal payload. Supports VEVENT blocks with SUMMARY,
 * DTSTART, DTEND, DESCRIPTION, X-CATERING, X-MANDATORY. Sufficient for
 * Phase 2 Google Calendar / Outlook shareable-feed compatibility.
 *
 * Exported for testing.
 */
export function parseICal(payload: string): ParsedICalEvent[] {
  const events: ParsedICalEvent[] = [];
  const lines = payload.replace(/\r\n/g, '\n').split('\n');
  let current: Partial<ParsedICalEvent> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') {
      current = { cateringProvided: false, isMandatory: false };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && current.summary && current.startsAt && current.endsAt) {
        if (
          !current.isMandatory &&
          /\b(keynote|mandatory|all hands|all-hands)\b/i.test(current.summary)
        ) {
          current.isMandatory = true;
        }
        events.push({
          summary: current.summary,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          description: current.description,
          cateringProvided: current.cateringProvided ?? false,
          isMandatory: current.isMandatory ?? false,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).split(';')[0].toUpperCase();
    const value = line.slice(colon + 1);

    switch (key) {
      case 'SUMMARY':
        current.summary = value;
        break;
      case 'DTSTART':
        current.startsAt = parseICalDate(value);
        break;
      case 'DTEND':
        current.endsAt = parseICalDate(value);
        break;
      case 'DESCRIPTION':
        current.description = value;
        break;
      case 'X-CATERING':
        current.cateringProvided = /^(true|yes|1)$/i.test(value);
        break;
      case 'X-MANDATORY':
        current.isMandatory = /^(true|yes|1)$/i.test(value);
        break;
    }
  }
  return events;
}

function parseICalDate(s: string): ISODateTime {
  const trimmed = s.trim().replace(/Z$/, '');
  const m = trimmed.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/);
  if (!m) throw new Error(`corporate-orchestrator: cannot parse iCal date "${s}"`);
  const [, y, mo, d, h = '00', mi = '00', se = '00'] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${se}.000Z`;
}

export class CorporateOrchestrator {
  /**
   * Import a conference schedule. iCal-format payload required.
   * Google + Outlook export iCal-compatible feeds via shareable links;
   * the route layer (Phase 5) wires native OAuth flows.
   */
  async importSchedule(
    blockId: UUID,
    source: { kind: 'ical' | 'google' | 'outlook'; payload: string },
  ): Promise<ConferenceSession[]> {
    let parsed: ParsedICalEvent[];
    try {
      parsed = parseICal(source.payload);
    } catch (err) {
      logger.error('[CorporateOrchestrator] parse failed', {
        blockId,
        kind: source.kind,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    if (parsed.length === 0) {
      logger.warn('[CorporateOrchestrator] no events parsed', {
        blockId,
        kind: source.kind,
      });
      return [];
    }

    try {
      const inserted: ConferenceSession[] = [];
      await transaction(async (client) => {
        for (const event of parsed) {
          const result = await client.query<SessionRow>(
            `INSERT INTO conference_sessions (
               id, block_id, title, starts_at, ends_at,
               is_mandatory, catering_provided
             ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              blockId,
              event.summary,
              event.startsAt,
              event.endsAt,
              event.isMandatory,
              event.cateringProvided,
            ],
          );
          if (result.rows.length > 0) inserted.push(rowToSession(result.rows[0]));
        }
      });
      return inserted;
    } catch (err) {
      logger.error('[CorporateOrchestrator] importSchedule insert failed', {
        blockId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Pre-fill a guest's Living Plan with confirmed blocks from their
   * conference schedule. Mandatory sessions become 'meeting'; catered
   * become 'meal'; non-mandatory free sessions are skipped (gap-finder
   * suggests into them per master doc §6.3 "Suggestions are short,
   * defaults are restful").
   */
  async populateGuestPlan(blockId: UUID, guestId: GuestId): Promise<void> {
    try {
      const [trips, sessionsResult] = await Promise.all([
        tripEngine.getByGuest(guestId, false),
        query<SessionRow>(
          `SELECT * FROM conference_sessions WHERE block_id = $1 ORDER BY starts_at ASC`,
          [blockId],
        ),
      ]);
      const trip = trips.find((t) => t.corporateBlockId === blockId) ?? trips[0];
      if (!trip) {
        throw new Error(
          `corporate-orchestrator: no active trip found for guest ${guestId}`,
        );
      }
      const sessions = sessionsResult.rows.map(rowToSession);

      for (const session of sessions) {
        if (!session.isMandatory && !session.cateringProvided) continue;
        const kind = session.cateringProvided ? 'meal' : 'meeting';
        await planEngine.addBlock({
          tripId: trip.id,
          block: {
            tripId: trip.id,
            class: 'confirmed',
            kind,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            title: session.title,
            source: 'corporate-import',
          },
        });
      }
    } catch (err) {
      logger.error('[CorporateOrchestrator] populateGuestPlan failed', {
        blockId,
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Seed a leisure-return invitation per master doc §6.3 "Departure seeding."
   * Phase 2 returns the seed structure; persistence + delivery is Phase 3
   * (Aurion in-room) plus a small dedicated migration when storage shape
   * is final.
   */
  async seedLeisureReturn(guestId: GuestId): Promise<CorporateLeisureSeed> {
    return {
      guestId,
      seededAt: new Date().toISOString(),
    };
  }

  /** Read a corporate block by id. Convenience for routes. */
  async getBlock(blockId: UUID): Promise<CorporateBlock | null> {
    try {
      const result = await query<BlockRow>(
        'SELECT * FROM corporate_blocks WHERE id = $1',
        [blockId],
      );
      if (result.rows.length === 0) return null;
      return rowToBlock(result.rows[0]);
    } catch (err) {
      logger.error('[CorporateOrchestrator] getBlock failed', {
        blockId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const corporateOrchestrator = new CorporateOrchestrator();
