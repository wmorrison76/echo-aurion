/**
 * ===========================================================================
 * Map and venue pin types
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Opinionated map. Pins filtered by guest interest and current schedule.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID } from '../base';

export interface MapPin {
  id: UUID;
  venueId: UUID;
  lat: number;
  lng: number;
  category: 'dining' | 'spa' | 'activity' | 'shopping' | 'culture' | 'nature';
  voiceNote: string;
  walkingMinutesFromBase?: number;
  isOnPropertyResource: boolean;
}

export interface MapView {
  tripId: UUID;
  centerLat: number;
  centerLng: number;
  pins: MapPin[];
  highlightedPinIds: UUID[];
}
