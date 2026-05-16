/**
 * ===========================================================================
 * Hero loop component - the silent ambient video
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  8-12 second silent video loop at the top of every venue page. Functions as both loading state and ambient hero.
 *
 * Pending implementation:
 *   - [ ] Wraps HeroVideoPlayer with React lifecycle
 *   - [ ] Shows loading shimmer until first frame
 *   - [ ] Audio toggle button (subtle, bottom-right of video)
 *   - [ ] Definition of Done: smooth transition from poster to looping video, no flicker, no audio surprise
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';

export interface HeroLoopProps {
  assetUrl: string;
  posterUrl?: string;
  silentByDefault: boolean;
  onView?: (durationMs: number) => void;
}

export const HeroLoop: React.FC<HeroLoopProps> = (props) => {
  return null;
};
