/**
 * ===========================================================================
 * Trip engine — the unit of guest engagement lifecycle
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Creates trips on booking. Manages status transitions
 *           (booked → pre-arrival → arriving → in-stay → departing →
 *           post-stay). Connects bookings → briefs → plans.
 *
 *           Idempotent on bookingId — the booking event from the existing
 *           PMS feed maps to exactly one trip row, even if the event is
 *           replayed.
 *
 *           Status-transition guards mirror intervention-library: each
 *           transition has a SQL WHERE clause that requires the source
 *           state, so out-of-order events (e.g., post-stay arriving from
 *           a stale message queue) reject cleanly with rowCount = 0.
 *
 * Aligned to: server/database/migrations/016_trips.sql
 *             shared/types/voyage/trip.ts
 *
 * Pending implementation (Phase 2.x extension points):
 *   - [x] createFromBooking (idempotent on bookingId)
 *   - [x] transitionStatus (state-machine guards in SQL)
 *   - [x] get / getByGuest / listActiveAtProperty
 *   - [DEFERRED] hook into existing PMS booking event stream
 *         (the integration writes to this engine, but the wire-up is
 *         a Phase 1.4-style routes ticket — same pattern as Resonance
 *         routes)
 *   - [DEFERRED] auto-fire pre-arrival voice + initial brief on
 *         status=pre-arrival (requires Aurion Phase 3 to be live)
 *
 * Tenet alignment:
 *   - Tenet 5 (privacy spine): trips reference guestId; guest controls
 *     (review/pause/delete) cascade to trip deletion via the existing
 *     LUCCCA delete-everything flow (Phase 3 routes).
 *
 * WARNING: This is the canonical entry point for trip writes. All
 * incoming bookings (PMS feed, manual entry, corporate-block import)
 * MUST route through createFromBooking so the bookingId idempotency
 * holds. Bypassing risks duplicate trip rows.
 * ===========================================================================
 */

import type { Trip, TripStatus, TripPurpose } from '../../../../shared/types/voyage';
import type { UUID, GuestId, PropertyId, ISODateTime } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';

export interface CreateFromBookingArgs {
  bookingId: UUID;
  guestId: GuestId;
  propertyId: PropertyId;
  expectedArrival: ISODateTime;
  expectedDeparture: ISODateTime;
  partyMemberIds?: GuestId[];
  corporateBlockId?: UUID | null;
  purpose?: TripPurpose;
}

interface TripRow {
  id: string;
  guest_id: string;
  property_id: string;
  status: string;
  purpose: string;
  booking_id: string | null;
  booked_at: Date | string;
  expected_arrival: Date | string;
  expected_departure: Date | string;
  party_member_ids: string[];
  primary_guest_id: string;
  corporate_block_id: string | null;
  current_brief_id: string | null;
  living_plan_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`trip-engine: unexpected date value type: ${typeof value}`);
}

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    guestId: row.primary_guest_id,
    propertyId: row.property_id,
    status: row.status as TripStatus,
    purpose: row.purpose as TripPurpose,
    bookedAt: dateToIso(row.booked_at),
    expectedArrival: dateToIso(row.expected_arrival),
    expectedDeparture: dateToIso(row.expected_departure),
    partyMemberIds: row.party_member_ids ?? [],
    primaryGuestId: row.primary_guest_id,
    corporateBlockId: row.corporate_block_id ?? undefined,
    currentBriefId: row.current_brief_id ?? undefined,
    livingPlanId: row.living_plan_id ?? undefined,
  };
}

// Allowed forward transitions. Cancelled is a terminal sink reachable from
// anywhere except post-stay (a completed visit cannot be retroactively
// cancelled — it would corrupt analytics and learning).
const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  booked: ['pre-arrival', 'cancelled'],
  'pre-arrival': ['arriving', 'cancelled'],
  arriving: ['in-stay', 'cancelled'],
  'in-stay': ['departing', 'cancelled'],
  departing: ['post-stay', 'cancelled'],
  'post-stay': [],
  cancelled: [],
};

export class TripEngine {
  /**
   * Create a trip from a booking event. Idempotent on bookingId.
   * If a trip with this bookingId already exists, returns the existing trip
   * unchanged (does NOT update fields — booking changes flow through other
   * paths so we don't accidentally mutate state on a replay).
   */
  async createFromBooking(args: CreateFromBookingArgs): Promise<Trip> {
    const purpose: TripPurpose = args.purpose ?? (args.corporateBlockId ? 'corporate' : 'leisure');
    const partyMembers = args.partyMemberIds ?? [args.guestId];

    try {
      const result = await query<TripRow>(
        `INSERT INTO trips (
           id, guest_id, property_id, status, purpose,
           booking_id, booked_at,
           expected_arrival, expected_departure,
           party_member_ids, primary_guest_id, corporate_block_id
         ) VALUES (
           gen_random_uuid(), $1, $2, 'booked', $3,
           $4, NOW(),
           $5, $6,
           $7::uuid[], $1, $8
         )
         ON CONFLICT (booking_id) DO UPDATE SET booking_id = EXCLUDED.booking_id
         RETURNING *`,
        [
          args.guestId,
          args.propertyId,
          purpose,
          args.bookingId,
          args.expectedArrival,
          args.expectedDeparture,
          partyMembers,
          args.corporateBlockId ?? null,
        ],
      );

      if (result.rows.length === 0) {
        throw new Error('trip-engine: createFromBooking returned no rows');
      }
      return rowToTrip(result.rows[0]);
    } catch (err) {
      logger.error('[TripEngine] createFromBooking failed', {
        bookingId: args.bookingId,
        guestId: args.guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Transition the trip status. Forward-only per ALLOWED_TRANSITIONS.
   * Out-of-order events (status drift from a stale message queue) reject
   * with rowCount = 0 and throw — the caller can choose to ignore or
   * escalate.
   */
  async transitionStatus(tripId: UUID, to: TripStatus): Promise<Trip> {
    try {
      // Read current status to validate the transition
      const existing = await query<TripRow>(
        'SELECT * FROM trips WHERE id = $1',
        [tripId],
      );
      if (existing.rows.length === 0) {
        throw new Error(`trip-engine: trip ${tripId} not found`);
      }

      const current = existing.rows[0].status as TripStatus;
      const allowed = ALLOWED_TRANSITIONS[current] ?? [];
      if (!allowed.includes(to)) {
        throw new Error(
          `trip-engine: invalid transition ${current} → ${to} (allowed: ${allowed.join(', ') || 'none'})`,
        );
      }

      const updated = await query<TripRow>(
        `UPDATE trips
         SET status = $2, updated_at = NOW()
         WHERE id = $1 AND status = $3
         RETURNING *`,
        [tripId, to, current],
      );

      if (updated.rows.length === 0) {
        // Race: someone else transitioned the trip between our read and write
        throw new Error(
          `trip-engine: concurrent transition on ${tripId} — re-fetch and retry`,
        );
      }
      return rowToTrip(updated.rows[0]);
    } catch (err) {
      logger.error('[TripEngine] transitionStatus failed', {
        tripId,
        to,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Single trip by id; null when not found. */
  async get(tripId: UUID): Promise<Trip | null> {
    try {
      const result = await query<TripRow>('SELECT * FROM trips WHERE id = $1', [tripId]);
      if (result.rows.length === 0) return null;
      return rowToTrip(result.rows[0]);
    } catch (err) {
      logger.error('[TripEngine] get failed', { tripId, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }

  /**
   * All trips for a guest. By default returns only active + future
   * (booked/pre-arrival/arriving/in-stay/departing); pass true to include
   * historical (post-stay/cancelled).
   */
  async getByGuest(guestId: GuestId, includeHistorical = false): Promise<Trip[]> {
    try {
      const sql = includeHistorical
        ? 'SELECT * FROM trips WHERE guest_id = $1 ORDER BY expected_arrival DESC'
        : `SELECT * FROM trips
           WHERE guest_id = $1
             AND status IN ('booked','pre-arrival','arriving','in-stay','departing')
           ORDER BY expected_arrival DESC`;
      const result = await query<TripRow>(sql, [guestId]);
      return result.rows.map(rowToTrip);
    } catch (err) {
      logger.error('[TripEngine] getByGuest failed', { guestId, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }

  /**
   * All currently-active trips at a property — for the GM dashboard's
   * "who is in the building right now" view (master doc §6 dashboard).
   * "Active" = pre-arrival through departing (excludes booked-but-future
   * and post-stay).
   */
  async listActiveAtProperty(propertyId: PropertyId): Promise<Trip[]> {
    try {
      const result = await query<TripRow>(
        `SELECT * FROM trips
         WHERE property_id = $1
           AND status IN ('pre-arrival','arriving','in-stay','departing')
         ORDER BY expected_arrival ASC`,
        [propertyId],
      );
      return result.rows.map(rowToTrip);
    } catch (err) {
      logger.error('[TripEngine] listActiveAtProperty failed', {
        propertyId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const tripEngine = new TripEngine();
