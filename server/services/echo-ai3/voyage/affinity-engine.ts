/**
 * ===========================================================================
 * Affinity engine — guest-resource preference graph
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Per master doc §6.4 ("affinity fit" axis of suggestion-ranker)
 *           and §1.2 ("operator wisdom captured at scale"). The affinity
 *           engine is where signals become preferences.
 *
 *           Phase 2 algorithm — deterministic time-decayed weighted mean:
 *
 *             For each (guest, category):
 *               score = Σ (signal_weight × decay(signal_age))
 *                       / Σ (|signal_weight| × decay(signal_age))
 *               then remap from [-1,1] to [0,1] via (x+1)/2
 *
 *             Signal weights:
 *               'voyage-add-to-itinerary'  +1.0  strong commit
 *               'voyage-tap'               +0.6  interest
 *               'voyage-dwell'             +0.4  consideration
 *               'voyage-edit'              +0.5  correction = signal
 *               'voyage-search'            +0.3  curiosity
 *               'atrium-video-watched'     +0.5  lean-in
 *               'atrium-action-tap'        +0.7
 *               'voyage-dismiss'           -0.5  negative signal
 *
 *             Decay: half-life 90 days. Older signals contribute less.
 *
 *           Stretch threshold: a category with score < 0.3 AND signalCount
 *           > 0 is in the guest's "stretch zone." The surprise-budget axis
 *           of suggestion-ranker uses this to occasionally surface
 *           candidates from these categories.
 *
 *           Empty-affinity case: a guest with NO signals on a category
 *           returns no AffinityScore row. The suggestion-ranker treats
 *           absence as 0.4 ("safe but not personalized").
 *
 *           Phase 3 extension: Echo-Deep replaces the linear weighting
 *           with a learned model. Same interface — score in [0, 1],
 *           signalCount integer, lastReinforced ISO timestamp.
 *
 * Aligned to: server/services/signals/signal-query.ts (read path; already
 *             filters expires_at >= NOW() so decayed Tenet 7 signals are
 *             physically unavailable here)
 *             shared/types/signals/signal.ts
 *
 * Tenet alignment:
 *   - Tenet 3 (tone informs care, not commerce): categories are
 *     operational ('spa', 'fine-dining', 'marina'), never pricing labels.
 *   - Tenet 7: decayed signals are filtered SQL-side, never reach this engine.
 * ===========================================================================
 */

import type { GuestId } from '../../../../shared/types/base';
import type { Signal, SignalSource } from '../../../../shared/types/signals';
import { signalQuery } from '../../signals/signal-query';
import { logger } from '../../../lib/logger';

export interface AffinityScore {
  guestId: GuestId;
  category: string;
  score: number; // 0..1, clamped
  signalCount: number;
  lastReinforced: string; // ISODateTime
}

const SIGNAL_WEIGHTS: Partial<Record<SignalSource, number>> = {
  'voyage-add-to-itinerary': 1.0,
  'voyage-tap': 0.6,
  'voyage-dwell': 0.4,
  'voyage-edit': 0.5,
  'voyage-search': 0.3,
  'voyage-dismiss': -0.5,
  'atrium-video-watched': 0.5,
  'atrium-action-tap': 0.7,
};

const HALF_LIFE_DAYS = 90;
const HALF_LIFE_MS = HALF_LIFE_DAYS * 86_400_000;
const STRETCH_SCORE_CEILING = 0.3;

/** Categorize a signal by its subject + tags. Pure helper, exported for testing. */
export function categorizeSignal(signal: Signal): string | null {
  switch (signal.subject?.kind) {
    case 'venue':
      return 'venue';
    case 'amenity':
      return 'amenity';
    case 'menu-item':
      return 'menu-item';
    case 'occasion':
      return signal.subject.occasionType;
    case 'staff-member':
      return null;
    case 'time-slot':
      return null;
    case 'free-text':
      break;
  }
  for (const tag of signal.tags ?? []) {
    if (tag.kind === 'category' || tag.kind === 'venue-type') {
      return tag.value;
    }
  }
  return null;
}

/**
 * Decay weight for a signal of given age. Half-life 90 days.
 * weight(0d)=1, weight(90d)=0.5, weight(180d)=0.25.
 * Exported for testing.
 */
export function decayFactor(ageMs: number): number {
  if (ageMs <= 0) return 1;
  return Math.pow(0.5, ageMs / HALF_LIFE_MS);
}

/**
 * Pure helper: compute AffinityScore[] from a Signal[]. Exported for testing.
 * Caller fetches signals via signal-query (or test fixtures).
 */
export function computeAffinityFromSignals(
  guestId: GuestId,
  signals: Signal[],
  now: Date = new Date(),
): AffinityScore[] {
  const buckets = new Map<
    string,
    { weightedSum: number; weightSum: number; count: number; latest: string }
  >();

  for (const signal of signals) {
    const category = categorizeSignal(signal);
    if (!category) continue;
    const weight = SIGNAL_WEIGHTS[signal.source];
    if (weight === undefined) continue;

    const ageMs = now.getTime() - new Date(signal.timestamp).getTime();
    const decay = decayFactor(ageMs);

    const bucket = buckets.get(category) ?? {
      weightedSum: 0,
      weightSum: 0,
      count: 0,
      latest: signal.timestamp,
    };
    bucket.weightedSum += weight * decay;
    bucket.weightSum += Math.abs(weight) * decay;
    bucket.count += 1;
    if (signal.timestamp > bucket.latest) bucket.latest = signal.timestamp;
    buckets.set(category, bucket);
  }

  const scores: AffinityScore[] = [];
  for (const [category, bucket] of buckets) {
    const rawMean = bucket.weightSum > 0 ? bucket.weightedSum / bucket.weightSum : 0;
    const score = clamp01((rawMean + 1) / 2);
    scores.push({
      guestId,
      category,
      score,
      signalCount: bucket.count,
      lastReinforced: bucket.latest,
    });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export class AffinityEngine {
  /**
   * Compute affinity scores for a guest from their last 500 signals
   * (filtered to expires_at >= NOW() by signal-query). One row per
   * category that has at least one weighted signal.
   */
  async computeForGuest(guestId: GuestId): Promise<AffinityScore[]> {
    try {
      const signals = await signalQuery.getSignalsForGuest(guestId, 500);
      return computeAffinityFromSignals(guestId, signals);
    } catch (err) {
      logger.error('[AffinityEngine] computeForGuest failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Whether a category is in the guest's "stretch zone" — exposure
   * exists but no demonstrated affinity. Used by suggestion-ranker's
   * surprise budget axis to surface stretch candidates.
   */
  async isStretch(guestId: GuestId, category: string): Promise<boolean> {
    const scores = await this.computeForGuest(guestId);
    const match = scores.find((s) => s.category === category);
    if (!match) return false;
    return match.signalCount > 0 && match.score < STRETCH_SCORE_CEILING;
  }
}

export const affinityEngine = new AffinityEngine();
