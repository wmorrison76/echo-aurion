/**
 * ===========================================================================
 * Trip Brief card - the personalized narrative artifact
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Renders the 2-3 paragraph Aurion narrative. Voice playback toggle. Soft CTA.
 *
 * Pending implementation:
 *   - [ ] Aurion-voice typography (serif headline, generous spacing)
 *   - [ ] Voice playback button - calls TTS endpoint on demand
 *   - [ ] Soft CTA at end - tone-matched to guest
 *   - [ ] Refresh indicator when brief is superseded
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { TripBrief } from '../../../shared/types/voyage';

export interface TripBriefCardProps {
  brief: TripBrief;
  voiceProfileId?: string;
  onCallToAction?: () => void;
}

export const TripBriefCard: React.FC<TripBriefCardProps> = (props) => {
  return null;
};
