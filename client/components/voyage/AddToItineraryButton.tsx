/**
 * ===========================================================================
 * Add-to-itinerary button
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  The primary conversion mechanic. Lives on every venue page. One tap = held block created.
 *
 * Pending implementation:
 *   - [ ] Per master doc: this is the simplest and most powerful conversion mechanic
 *   - [ ] Records the action as a signal even if the block later releases
 *   - [ ] Optimistic update; show held confirmation immediately
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';

export interface AddToItineraryButtonProps {
  tripId: string;
  venueId: string;
  suggestedStartsAt?: string;
  suggestedDurationMinutes?: number;
  onAdded?: (blockId: string) => void;
}

export const AddToItineraryButton: React.FC<AddToItineraryButtonProps> = (props) => {
  return null;
};
