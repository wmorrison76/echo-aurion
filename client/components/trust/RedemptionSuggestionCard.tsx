/**
 * ===========================================================================
 * Redemption suggestion - "your unused points cover this"
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Ambient delight - dormant balance redemption surfacing as a favor not a sales pitch.
 *
 * Pending implementation:
 *   - [ ] Per master doc: this is a marketing pillar in itself
 *   - [ ] Copy in Aurion voice ("you have 12,000 points, that covers this")
 *   - [ ] One-tap apply
 *   - [ ] Never shown if it would feel pushy (e.g. multiple times in same session)
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { RedemptionSuggestion } from '../../../shared/types/trust';

export interface RedemptionSuggestionCardProps {
  suggestion: RedemptionSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}

export const RedemptionSuggestionCard: React.FC<RedemptionSuggestionCardProps> = (props) => {
  return null;
};
