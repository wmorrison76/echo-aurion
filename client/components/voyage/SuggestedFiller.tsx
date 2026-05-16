/**
 * ===========================================================================
 * Suggested gap-filler card
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Aurion-suggested filler shown for empty time. One-or-two suggestions max. Tap to hold, swipe to dismiss.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';

export interface SuggestedFillerProps {
  copy: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  onHold: () => void;
  onSeeOtherOptions?: () => void;
  onDismiss: () => void;
}

export const SuggestedFiller: React.FC<SuggestedFillerProps> = (props) => {
  return null;
};
