/**
 * Inventory Health Scorer
 * Deterministic algorithm for computing health scores per location/cadence
 * No probabilistic/AI elements — rules-based scoring
 */

import type {
  HealthCadence,
  HealthLabel,
  TrendLabel,
  InventoryHealthScore,
  LocationLeaderboardEntry,
  LocationHealthParams,
} from "@/../shared/types/inventory-health";

/**
 * Compute health score (0..1) for a single location
 * Factors:
 * - Recency: how recently was the location's inventory counted?
 * - Frequency: how many counts in the window (daily/weekly/monthly)?
 * - Activity: surplus broadcasts indicate active monitoring
 * - Variance: change in on-hand counts (shows use, not stale)
 */
export function scoreLocationHealth(
  params: LocationHealthParams,
): InventoryHealthScore {
  const {
    locationId,
    locationName,
    lastCountAt,
    countFrequencyInWindow,
    surplusEventsInWindow,
    hasVariance,
    cadence,
  } = params;

  const now = Date.now();
  const minutesSinceCount = (now - lastCountAt) / (60 * 1000);

  // Base score: 0.4 (pessimistic baseline)
  let score = 0.4;

  // Recency bonus (up to +0.35)
  if (minutesSinceCount <= 60) {
    score += 0.35; // count within last hour
  } else if (minutesSinceCount <= 6 * 60) {
    score += 0.25; // within 6 hours
  } else if (minutesSinceCount <= 24 * 60) {
    score += 0.15; // within 1 day
  } else if (minutesSinceCount <= 3 * 24 * 60) {
    score += 0.05; // within 3 days
  }

  // Frequency bonus (up to +0.15)
  // Expected counts per cadence:
  // DAILY: 1-2 counts/day expected
  // WEEKLY: 3-5 counts/week expected
  // MONTHLY: 4-8 counts/month expected
  const expectedFrequency =
    cadence === "DAILY" ? 1 : cadence === "WEEKLY" ? 3 : 4;
  const frequencyRatio = Math.min(
    countFrequencyInWindow / expectedFrequency,
    1,
  );
  score += 0.15 * frequencyRatio;

  // Surplus activity bonus (up to +0.1)
  // Each surplus broadcast indicates active monitoring
  const surplusBonus = Math.min(surplusEventsInWindow * 0.02, 0.1);
  score += surplusBonus;

  // Variance bonus (+0.05 if there's actual activity)
  if (hasVariance) {
    score += 0.05;
  }

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, score));

  const label = scoreToLabel(score);

  return {
    locationId,
    locationName,
    cadence,
    score,
    label,
    lastUpdatedAt: now,
  };
}

/**
 * Convert numeric score to label
 */
function scoreToLabel(score: number): HealthLabel {
  if (score >= 0.85) return "EXCELLENT";
  if (score >= 0.7) return "GOOD";
  if (score >= 0.55) return "OK";
  return "AT_RISK";
}

/**
 * Rank locations by health score and compute trends
 * Optionally compare against previous scores for trend calculation
 */
export function rankLocationsByHealth(
  scores: InventoryHealthScore[],
  previousScores?: Map<string, number>,
): LocationLeaderboardEntry[] {
  // Sort by score descending
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return sorted.map((score, idx) => {
    const previousScore = previousScores?.get(score.locationId);
    const { delta, label: trendLabel } = computeTrend(
      score.score,
      previousScore,
    );

    return {
      rank: idx + 1,
      locationId: score.locationId,
      locationName: score.locationName,
      healthScore: score.score,
      healthLabel: score.label,
      trendDelta: delta,
      trendLabel,
      recentCount: null, // Will be populated by caller if needed
      lastCountMinutesAgo: Math.round(
        (Date.now() - score.lastUpdatedAt) / (60 * 1000),
      ),
    };
  });
}

/**
 * Compute trend (delta + label) between current and previous score
 */
export function computeTrend(
  currentScore: number,
  previousScore: number | undefined,
): { delta: number; label: TrendLabel } {
  if (previousScore === undefined) {
    return { delta: 0, label: "STABLE" };
  }

  const delta = currentScore - previousScore;
  const threshold = 0.05; // ±5% threshold for "stable"

  if (delta > threshold) {
    return { delta, label: "UP" };
  } else if (delta < -threshold) {
    return { delta, label: "DOWN" };
  } else {
    return { delta, label: "STABLE" };
  }
}

/**
 * Helper: format trend for display
 */
export function formatTrendArrow(label: TrendLabel): string {
  switch (label) {
    case "UP":
      return "↑";
    case "DOWN":
      return "↓";
    case "STABLE":
      return "→";
  }
}

/**
 * Helper: format score as percentage
 */
export function formatScorePercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Helper: format trend delta as signed percentage
 */
export function formatTrendDelta(delta: number): string {
  const pct = Math.round(delta * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
}

/**
 * Helper: color class for health label
 */
export function healthLabelToColorClass(label: HealthLabel): string {
  switch (label) {
    case "EXCELLENT":
      return "text-emerald-400";
    case "GOOD":
      return "text-blue-400";
    case "OK":
      return "text-amber-400";
    case "AT_RISK":
      return "text-red-400";
  }
}

/**
 * Helper: background color for health label
 */
export function healthLabelToBgClass(label: HealthLabel): string {
  switch (label) {
    case "EXCELLENT":
      return "bg-emerald-950/40 border-emerald-700/30";
    case "GOOD":
      return "bg-blue-950/40 border-blue-700/30";
    case "OK":
      return "bg-amber-950/40 border-amber-700/30";
    case "AT_RISK":
      return "bg-red-950/40 border-red-700/30";
  }
}
