/**
 * ===========================================================================
 * Map pin - opinionated venue marker
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  A single pin on the map. Has Aurion-written one-line note in guest tone.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { MapPin as MapPinType } from '../../../shared/types/voyage';

export interface MapPinProps {
  pin: MapPinType;
  highlighted?: boolean;
  onTap?: () => void;
}

export const MapPin: React.FC<MapPinProps> = (props) => {
  return null;
};
