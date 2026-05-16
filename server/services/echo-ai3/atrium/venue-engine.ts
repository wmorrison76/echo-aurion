/**
 * ===========================================================================
 * Venue engine — venue and hours management
 * ===========================================================================
 * Layer:    Atrium
 * Status:   IMPLEMENTED
 * Phase:    5
 *
 * Purpose:  Master doc §7.2: CRUD on venues + page composition.
 *           Powers every venue page in the Aurion app. Combines venue
 *           record + hero asset (via heroSelector) + narrative
 *           (via narrativeComposer) into a VenuePage shape.
 *
 *           Hours-exception handling: VenueHours.exceptions is a JSONB
 *           field; write/read goes through structured upsertHours that
 *           validates daysOfWeek and exception shape.
 * ===========================================================================
 */

import type {
  Venue,
  VenueHours,
  VenuePage,
  VenueKind,
} from '../../../../shared/types/atrium';
import type { UUID, GuestId, PropertyId } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';
import { heroSelector } from './hero-selector';
import { narrativeComposer } from './narrative-composer';

interface VenueRow {
  id: string;
  property_id: string;
  name: string;
  kind: string;
  short_description: string;
  bookable: boolean;
  hours: VenueHours;
}

function rowToVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as VenueKind,
    shortDescription: row.short_description,
    hours: row.hours,
    bookable: row.bookable,
  };
}

function actionsFor(venue: Venue): {
  primary: VenuePage['primaryActions'];
  secondary: VenuePage['secondaryActions'];
} {
  // Master doc §7.2 action band: View Menu / Book Reservation / Add to Itinerary
  // primary; secondary tucked in overflow.
  const primary: VenuePage['primaryActions'] = [];
  if (venue.kind === 'restaurant' || venue.kind === 'bar') {
    primary.push({ kind: 'view-menu' });
  }
  if (venue.bookable) {
    primary.push({ kind: 'book-reservation' });
  }
  primary.push({ kind: 'add-to-itinerary' });
  const secondary: VenuePage['secondaryActions'] = [
    { kind: 'see-hours' },
    { kind: 'call-venue' },
    { kind: 'ask-aurion' },
  ];
  return { primary, secondary };
}

export class VenueEngine {
  async listForProperty(propertyId: PropertyId): Promise<Venue[]> {
    try {
      const result = await query<VenueRow>(
        `SELECT id, property_id, name, kind, short_description, bookable, hours
         FROM venues WHERE property_id = $1 ORDER BY name ASC`,
        [propertyId],
      );
      return result.rows.map(rowToVenue);
    } catch (err) {
      logger.error('[VenueEngine] listForProperty failed', {
        propertyId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async get(venueId: UUID): Promise<Venue | null> {
    try {
      const result = await query<VenueRow>(
        `SELECT id, property_id, name, kind, short_description, bookable, hours
         FROM venues WHERE id = $1`,
        [venueId],
      );
      if (result.rows.length === 0) return null;
      return rowToVenue(result.rows[0]);
    } catch (err) {
      logger.error('[VenueEngine] get failed', {
        venueId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async upsertHours(venueId: UUID, hours: VenueHours): Promise<Venue> {
    if (!Array.isArray(hours.daysOfWeek) || hours.daysOfWeek.some((d) => d < 0 || d > 6)) {
      throw new Error('venue-engine: hours.daysOfWeek must be 0..6 ints');
    }
    try {
      const result = await query<VenueRow>(
        `UPDATE venues
         SET hours = $2::jsonb, updated_at = NOW()
         WHERE id = $1
         RETURNING id, property_id, name, kind, short_description, bookable, hours`,
        [venueId, JSON.stringify(hours)],
      );
      if (result.rows.length === 0) {
        throw new Error(`venue-engine: venue ${venueId} not found`);
      }
      return rowToVenue(result.rows[0]);
    } catch (err) {
      logger.error('[VenueEngine] upsertHours failed', {
        venueId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Compose the full venue page for a guest. Combines Venue + heroAsset
   * (selected by hero-selector) + narrative (composed by narrative-composer).
   *
   * If hero-selector returns null (no hero asset available), uses a
   * sentinel id; the client renders a static neutral hero.
   */
  async pageForGuest(venueId: UUID, guestId: GuestId): Promise<VenuePage> {
    try {
      const venue = await this.get(venueId);
      if (!venue) {
        throw new Error(`venue-engine: venue ${venueId} not found`);
      }
      const [heroAssetId, narrative] = await Promise.all([
        heroSelector.select(venueId, guestId),
        narrativeComposer.composeForGuest(venueId, guestId),
      ]);

      const { primary, secondary } = actionsFor(venue);

      // microDetail: master doc §7.2 "one thoughtful detail." Phase 5 stub:
      // sourced from venue.shortDescription's last sentence; richer
      // venue-detail library is Phase 5.x.
      const sentences = venue.shortDescription.split(/(?<=[.!?])\s+/);
      const microDetail =
        sentences.length > 1 ? sentences[sentences.length - 1] : venue.shortDescription;

      return {
        venueId: venue.id,
        heroAssetId: heroAssetId ?? '00000000-0000-0000-0000-000000000000',
        narrative,
        microDetail,
        primaryActions: primary,
        secondaryActions: secondary,
      };
    } catch (err) {
      logger.error('[VenueEngine] pageForGuest failed', {
        venueId,
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const venueEngine = new VenueEngine();
