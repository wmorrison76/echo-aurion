/**
 * ===========================================================================
 * Media asset types - mood-tagged video library
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Tagged video assets the marketing team produces. Same content, two channels.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';

export type MoodTag = 'quiet' | 'lively' | 'celebratory' | 'romantic';
export type DaypartTag = 'morning' | 'midday' | 'evening' | 'late-night';
export type SeasonTag = 'spring' | 'summer' | 'fall' | 'winter';

export interface MediaAsset {
  id: UUID;
  venueId?: UUID;
  kind: 'hero-loop' | 'story' | 'reel' | 'photo';
  storageUrl: string;
  durationSeconds?: number;
  silentByDefault: boolean;
  moods: MoodTag[];
  dayparts: DaypartTag[];
  seasons: SeasonTag[];
  uploadedAt: ISODateTime;
  uploadedBy: UUID;
  publishedToInstagram: boolean;
  publishedToApp: boolean;
}
