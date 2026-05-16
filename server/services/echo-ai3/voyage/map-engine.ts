/**
 * ===========================================================================
 * Map engine — opinionated map view per guest
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED (Phase 2 deterministic compose; live map provider is Phase 3+ extension)
 * Phase:    2
 *
 * Purpose:  Per master doc §6.1.3: "Not Google Maps. An opinionated map
 *           filtered by the guest's interests and current schedule. Pins
 *           are relevant to the Living Plan, not exhaustive of the
 *           geography. Every pin has an Aurion-written one-line note in
 *           the guest's voice."
 *
 *           Phase 2 implementation: composes a MapView from the venues
 *           table + the trip's Living Plan. Highlighted pins are venues
 *           whose category is plausibly relevant to current Living Plan
 *           gaps.
 *
 *           Phase 3+ extension: live external map provider (MapLibre /
 *           Mapbox / Google) plugs in here. Echo-Deep also replaces the
 *           templated voiceNote with LLM-composed copy in the guest's tone.
 *
 * Aligned to: shared/types/voyage/map.ts (MapView, MapPin)
 *             server/database/migrations/020_venues.sql
 *             server/services/echo-ai3/voyage/plan-engine.ts
 *
 * Tenet alignment:
 *   - Silent Service: pins are relevant to the guest's plan, not
 *     exhaustive. The "do less" doctrine applies to map UI.
 * ===========================================================================
 */

import type { MapView, MapPin } from '../../../../shared/types/voyage';
import type { UUID } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';
import { planEngine } from './plan-engine';
import { tripEngine } from './trip-engine';

interface VenueRow {
  id: string;
  property_id: string;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  walking_minutes_from_base: number | null;
  is_on_property: boolean;
}

const VOICE_NOTE_TEMPLATES: Record<string, string> = {
  dining: 'kitchen the chef trusts; {walking}',
  spa: 'quiet hours hold here; {walking}',
  activity: 'guides who actually know the water; {walking}',
  shopping: 'small shop, owner usually on the floor; {walking}',
  culture: 'a small museum that punches above its weight; {walking}',
  nature: 'the trail that opens up after the first half-mile; {walking}',
};

function formatWalkingNote(minutes: number | null): string {
  if (!minutes || minutes <= 0) return 'on the property';
  if (minutes < 5) return `${minutes} min walk`;
  if (minutes < 15) return `${minutes} min on foot`;
  return `${minutes} min — short ride or a long walk`;
}

/**
 * Compose a one-line voice note. Pure helper, exported for tests.
 * Phase 3 swaps body with Echo-Deep LLM composition.
 */
export function composeVoiceNote(
  category: string,
  walkingMinutes: number | null,
): string {
  const template = VOICE_NOTE_TEMPLATES[category] ?? VOICE_NOTE_TEMPLATES.dining;
  return template.replace('{walking}', formatWalkingNote(walkingMinutes));
}

const CATEGORY_MAP: Record<string, MapPin['category']> = {
  'fine-dining': 'dining',
  'casual-dining': 'dining',
  bar: 'dining',
  breakfast: 'dining',
  spa: 'spa',
  pool: 'activity',
  'beach-club': 'activity',
  marina: 'activity',
  'kids-club': 'activity',
  banquet: 'culture',
};

function rowToPin(row: VenueRow): MapPin {
  const cat = CATEGORY_MAP[row.category] ?? 'culture';
  return {
    id: row.id,
    venueId: row.id,
    lat: row.latitude ?? 0,
    lng: row.longitude ?? 0,
    category: cat,
    voiceNote: composeVoiceNote(cat, row.walking_minutes_from_base),
    walkingMinutesFromBase: row.walking_minutes_from_base ?? undefined,
    isOnPropertyResource: row.is_on_property,
  };
}

export class MapEngine {
  /**
   * Composed map view for a trip. Pins are venues at the trip's property.
   * Highlighted pins are venues whose category fits an open Living Plan
   * gap (the guest has empty time and this category fits).
   */
  async getView(tripId: UUID): Promise<MapView> {
    try {
      const trip = await tripEngine.get(tripId);
      if (!trip) {
        throw new Error(`map-engine: trip ${tripId} not found`);
      }

      const result = await query<VenueRow>(
        `SELECT id, property_id, name, category, latitude, longitude,
                walking_minutes_from_base, is_on_property
         FROM venues
         WHERE property_id = $1`,
        [trip.propertyId],
      );

      const pins = result.rows.map(rowToPin);

      // Highlight: dining + spa pins when the plan is sparse (>50% empty).
      // Phase 3 uses suggestion-ranker output for richer matching.
      const plan = await planEngine.getPlan(tripId);
      const totalDurationMinutes = plan.blocks.reduce(
        (sum, b) =>
          sum + (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 60_000,
        0,
      );
      const tripWindowMinutes =
        (new Date(trip.expectedDeparture).getTime() -
          new Date(trip.expectedArrival).getTime()) /
        60_000;
      const planSparse =
        tripWindowMinutes > 0 && totalDurationMinutes < tripWindowMinutes * 0.5;

      const highlightedPinIds = planSparse
        ? pins
            .filter((p) => p.category === 'dining' || p.category === 'spa')
            .map((p) => p.id)
        : [];

      // Center: arithmetic mean of pin coords (Phase 2 placeholder)
      const validCoords = pins.filter((p) => p.lat !== 0 || p.lng !== 0);
      const centerLat =
        validCoords.length > 0
          ? validCoords.reduce((s, p) => s + p.lat, 0) / validCoords.length
          : 0;
      const centerLng =
        validCoords.length > 0
          ? validCoords.reduce((s, p) => s + p.lng, 0) / validCoords.length
          : 0;

      return { tripId, centerLat, centerLng, pins, highlightedPinIds };
    } catch (err) {
      logger.error('[MapEngine] getView failed', {
        tripId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async getPin(pinId: UUID): Promise<MapPin | null> {
    try {
      const result = await query<VenueRow>(
        `SELECT id, property_id, name, category, latitude, longitude,
                walking_minutes_from_base, is_on_property
         FROM venues WHERE id = $1`,
        [pinId],
      );
      if (result.rows.length === 0) return null;
      return rowToPin(result.rows[0]);
    } catch (err) {
      logger.error('[MapEngine] getPin failed', {
        pinId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const mapEngine = new MapEngine();
