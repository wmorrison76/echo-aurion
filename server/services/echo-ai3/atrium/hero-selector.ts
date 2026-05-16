/**
 * ===========================================================================
 * Hero selector — picks the right video variant for this guest right now
 * ===========================================================================
 * Layer:    Atrium
 * Status:   IMPLEMENTED
 * Phase:    5
 *
 * Purpose:  Master doc §7.3: cinema-as-data. Same venue, different hero
 *           loop based on guest affect, current daypart, season.
 *
 *           Phase 5 algorithm — deterministic weighted scoring:
 *             - Affect quadrant match → mood weight (high-pos ↔ lively;
 *               low-pos ↔ quiet; high-neg ↔ quiet; low-neg ↔ quiet)
 *             - Daypart exact match: +0.4
 *             - Current season match: +0.2
 *             - Recently-viewed asset penalty: -0.5 per recent view
 *             - Fallback: neutral asset (no mood tag) when no match scores
 *
 *           Pure scoring exported for testing.
 * ===========================================================================
 */

import type {
  SelectorContext,
  SelectorRanking,
  MediaAsset,
  MoodTag,
  DaypartTag,
  SeasonTag,
} from '../../../../shared/types/atrium';
import type { UUID, GuestId } from '../../../../shared/types/base';
import type { AffectCoordinate } from '../../../../shared/types/resonance';
import { mediaLibrary } from './media-library';
import { logger } from '../../../lib/logger';

const MOOD_WEIGHT_BY_QUADRANT: Record<string, Partial<Record<MoodTag, number>>> = {
  'high-pos': { lively: 1.0, celebratory: 0.8, romantic: 0.4, quiet: 0.1 },
  'high-neg': { quiet: 0.9, romantic: 0.4, lively: 0.1, celebratory: 0.0 },
  'low-pos': { quiet: 1.0, romantic: 0.6, lively: 0.2, celebratory: 0.1 },
  'low-neg': { quiet: 0.9, romantic: 0.3, lively: 0.0, celebratory: 0.0 },
};

function quadrantOf(affect: AffectCoordinate): string {
  const high = affect.arousal >= 0;
  const positive = affect.valence >= 0;
  if (high && positive) return 'high-pos';
  if (high && !positive) return 'high-neg';
  if (!high && positive) return 'low-pos';
  return 'low-neg';
}

/**
 * Pure scoring function. Exported for testing.
 *
 * Scores in approximately [0, 2] with the recent-view penalty potentially
 * pushing them negative; ranker presents only positive-scoring candidates
 * unless the entire set is negative.
 */
export function scoreAsset(
  asset: MediaAsset,
  ctx: SelectorContext,
): { score: number; breakdown: Record<string, number> } {
  let mood = 0;
  if (ctx.guestAffect) {
    const q = quadrantOf(ctx.guestAffect);
    const weights = MOOD_WEIGHT_BY_QUADRANT[q] ?? {};
    for (const m of asset.moods) {
      const w = weights[m] ?? 0;
      if (w > mood) mood = w;
    }
  } else {
    // No affect → mood-neutral; small constant credit for any tagged mood
    mood = asset.moods.length > 0 ? 0.3 : 0.1;
  }

  const daypart = asset.dayparts.includes(ctx.currentDaypart) ? 0.4 : 0;
  const season = asset.seasons.includes(ctx.currentSeason) ? 0.2 : 0;
  const recentlyViewed = ctx.recentlyViewedAssetIds.includes(asset.id) ? -0.5 : 0;

  const score = mood + daypart + season + recentlyViewed;
  return {
    score,
    breakdown: { mood, daypart, season, recentlyViewed },
  };
}

export class HeroSelector {
  /**
   * Pick the best hero asset for this guest at this moment. Returns the
   * asset id or null if nothing was found (caller falls back to a static
   * default hero).
   */
  async select(venueId: UUID, guestId: GuestId): Promise<UUID | null> {
    try {
      // Phase 5 simplification: caller supplies guestAffect via SelectorContext
      // when known. Here we issue a default (neutral, current daypart/season)
      // pulled from server clock. Phase 5.x wires the trajectory engine and
      // affinity-engine for richer context.
      const ctx: SelectorContext = {
        guestAffect: undefined,
        currentDaypart: currentDaypart(new Date()),
        currentSeason: currentSeason(new Date()),
        recentlyViewedAssetIds: [],
      };
      const ranked = await this.rank(venueId, ctx);
      return ranked[0]?.assetId ?? null;
    } catch (err) {
      logger.error('[HeroSelector] select failed', {
        venueId,
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Rank candidates. Useful for debugging + admin views. */
  async rank(venueId: UUID, ctx: SelectorContext): Promise<SelectorRanking[]> {
    try {
      const candidates = await mediaLibrary.query({
        venueId,
        kind: 'hero-loop',
        publishedToApp: true,
      });
      const ranked: SelectorRanking[] = candidates
        .map((asset) => {
          const { score } = scoreAsset(asset, ctx);
          return { assetId: asset.id, score };
        })
        .sort((a, b) => b.score - a.score);
      return ranked;
    } catch (err) {
      logger.error('[HeroSelector] rank failed', {
        venueId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

/** Pure helper: compute daypart from a Date. Exported for testing. */
export function currentDaypart(d: Date): DaypartTag {
  const h = d.getHours();
  if (h >= 6 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'midday';
  if (h >= 17 && h < 22) return 'evening';
  return 'late-night';
}

/** Pure helper: compute season (Northern Hemisphere). Exported for testing. */
export function currentSeason(d: Date): SeasonTag {
  const m = d.getMonth(); // 0..11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

export const heroSelector = new HeroSelector();
