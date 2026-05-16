/**
 * ===========================================================================
 * Action band - the three primary venue actions
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  View Menu / Book a Reservation / Add to Itinerary. Lives directly under the hero loop on every venue page.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { VenueAction } from '../../../shared/types/atrium';

export interface ActionBandProps {
  primary: VenueAction[];
  secondary?: VenueAction[];
  onAction: (action: VenueAction) => void;
}

export const ActionBand: React.FC<ActionBandProps> = (props) => {
  return null;
};
