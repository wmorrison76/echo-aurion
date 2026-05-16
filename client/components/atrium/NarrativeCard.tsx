/**
 * ===========================================================================
 * Narrative card - per-guest 2-3 sentence Aurion text
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Renders the personalized venue narrative composed by NarrativeComposer.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';

export interface NarrativeCardProps {
  narrative: string;
  microDetail?: string;
}

export const NarrativeCard: React.FC<NarrativeCardProps> = ({ narrative, microDetail }) => {
  return null;
};
