/**
 * ===========================================================================
 * Map view - the opinionated map UI
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Renders pins filtered by guest interest. Highlights pins relevant to current Living Plan gaps.
 *
 * Pending implementation:
 *   - [ ] Choose mapping library (MapLibre, Mapbox, etc.) - match existing repo choice if any
 *   - [ ] Pin clustering at low zoom
 *   - [ ] Walking route overlay between current location and selected pin
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { MapView as MapViewType } from '../../../shared/types/voyage';

export interface MapViewProps {
  view: MapViewType;
  onPinTap?: (pinId: string) => void;
}

export const MapViewComponent: React.FC<MapViewProps> = (props) => {
  return null;
};
