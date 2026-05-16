/**
 * ===========================================================================
 * Suggestion ranker — gap-fill recommendation scoring
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Per master doc §6.4: scores candidate suggestions on seven axes
 *           (affinity, energy, schedule, capacity, diversity, surprise
 *           budget, companion harmony) and surfaces the top 1-2.
 *
 *           Phase 2: deterministic weighted scoring. Phase 3 swaps with
 *           Echo-Deep LLM ranking; same surface.
 *
 * Tenet alignment:
 *   - Tenet 3 (tone informs care, not commerce): no input here is a
 *     pricing or revenue signal.
 *   - Silent Service Principle: the ranker honors the master doc's
 *     "one or two stretch suggestions per trip" via the surprise budget.
 *
 * Existing stub API preserved (rankForGap / SuggestionCandidate /
 * RankedSuggestion / factors with seven named axes).
 * ===========================================================================
 */

import type { Gap } from './gap-finder';
import type { UUID } from '../../../../shared/types/base';

export interface SuggestionCandidate {
  venueId: UUID;
  category: string;
  estimatedDurationMinutes: number;
  /** Optional richer context — populated when the affinity engine is wired. */
  name?: string;
  affinity?: number;            // 0..1; default 0.4 ("safe but not personalized")
  energyFit?: number;           // 0..1
  capacityAvailable?: boolean;  // default true
  travelMinutes?: number;       // default 0
  isSurprise?: boolean;         // default false
  fitsAllPartyMembers?: boolean; // default true
}

export interface RankedSuggestion {
  candidate: SuggestionCandidate;
  score: number;
  factors: {
    affinityFit: number;
    energyFit: number;
    scheduleFit: number;
    capacity: number;
    diversity: number;
    surpriseBudget: number;
    companionHarmony: number;
  };
  copyForGuest: string;
}

export interface RankerContext {
  /** Categories already suggested or accepted on this trip. */
  alreadySuggestedCategories?: string[];
  /** Surprise budget consumed so far (0, 1, 2). */
  surpriseBudgetUsed?: number;
}

const WEIGHTS = {
  affinity: 0.30,
  energy: 0.20,
  schedule: 0.15,
  capacity: 0.15,
  diversity: 0.10,
  surprise: 0.05,
  companion: 0.05,
} as const;

const SURPRISE_BUDGET_MAX = 2;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Pure scoring function. Exported for testing. */
export function scoreCandidate(
  candidate: SuggestionCandidate,
  gap: Gap,
  context: RankerContext = {},
): RankedSuggestion {
  const affinityFit = clamp01(candidate.affinity ?? 0.4);
  const energyFit = clamp01(candidate.energyFit ?? 0.5);

  const travel = candidate.travelMinutes ?? 0;
  const halfGap = gap.durationMinutes / 2;
  const scheduleRaw = travel >= halfGap ? 0.1 : 1 - (travel / halfGap) * 0.5;
  const scheduleFit = clamp01(scheduleRaw);

  const capacityAvailable = candidate.capacityAvailable !== false; // default true
  const capacity = capacityAvailable ? 1 : 0.4;

  const seenOverlap = (context.alreadySuggestedCategories ?? []).filter(
    (c) => c === candidate.category,
  ).length;
  const diversity = clamp01(1 - seenOverlap * 0.4);

  const used = context.surpriseBudgetUsed ?? 0;
  let surpriseBudget: number;
  if (!candidate.isSurprise) {
    surpriseBudget = 1;
  } else if (used >= SURPRISE_BUDGET_MAX) {
    surpriseBudget = 0.2;
  } else {
    surpriseBudget = 1 - used * 0.3;
  }

  const fitsParty = candidate.fitsAllPartyMembers !== false; // default true
  const companionHarmony = fitsParty ? 1 : 0.7;

  const factors = {
    affinityFit,
    energyFit,
    scheduleFit,
    capacity,
    diversity,
    surpriseBudget,
    companionHarmony,
  };

  const score = clamp01(
    affinityFit * WEIGHTS.affinity +
      energyFit * WEIGHTS.energy +
      scheduleFit * WEIGHTS.schedule +
      capacity * WEIGHTS.capacity +
      diversity * WEIGHTS.diversity +
      surpriseBudget * WEIGHTS.surprise +
      companionHarmony * WEIGHTS.companion,
  );

  // Phase 2 copyForGuest: deterministic short blurb. Phase 3 LLM-composed.
  const dispName = candidate.name ?? candidate.category;
  const startTime = new Date(gap.startsAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const copyForGuest = `${dispName} fits the ${gap.classification} window starting ${startTime}.`;

  return { candidate, score, factors, copyForGuest };
}

export class SuggestionRanker {
  /**
   * Rank candidates against a single gap. Returns the top 2 by default
   * per master doc §6.4 ("Aurion always shows the top one or two
   * suggestions, never the full list").
   */
  async rankForGap(
    gap: Gap,
    candidates: SuggestionCandidate[],
    context: RankerContext = {},
    topN = 2,
  ): Promise<RankedSuggestion[]> {
    return candidates
      .map((c) => scoreCandidate(c, gap, context))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        // Tie-break by category alphabetical for stability
        return a.candidate.category.localeCompare(b.candidate.category);
      })
      .slice(0, Math.max(1, topN));
  }
}

export const suggestionRanker = new SuggestionRanker();
