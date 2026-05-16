/**
 * ===========================================================================
 * Mood matcher / selector
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Logic that picks which video variant to show based on guest state.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID } from '../base';
import type { MoodTag, DaypartTag, SeasonTag } from './media';
import type { AffectCoordinate } from '../resonance/reading';

export interface SelectorContext {
  guestAffect?: AffectCoordinate;
  currentDaypart: DaypartTag;
  currentSeason: SeasonTag;
  recentlyViewedAssetIds: UUID[];
}

export interface SelectorRanking {
  assetId: UUID;
  score: number;
  reasons: string[];
}
