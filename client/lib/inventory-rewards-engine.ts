/**
 * Inventory Rewards Engine
 * Deterministic, rules-based reward generation
 * No AI/hallucinations — all rewards are auditable based on hard data
 */

import type {
  InventoryReward,
  InventoryRewardKind,
} from "@/../shared/types/inventory-rewards";
import type { HealthCadence } from "@/../shared/types/inventory-health";
import { getInventoryRewardSettings } from "@/lib/inventory-rewards-store";
import { getLeaderboardHistory } from "@/lib/inventory-leaderboard-store";

/**
 * Convert timestamp to YYYY-M-D string for grouping by day
 */
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Create a deterministic reward ID from components
 * Same inputs → same ID → prevents duplicates even if function runs multiple times
 */
function makeId(prefix: string, parts: (string | number)[]): string {
  return `${prefix}:${parts.join(":")}`;
}

/**
 * Check if a value is within a percentage variance of expected value
 */
function pctWithin(
  variancePct: number,
  actual: number,
  expected: number,
): boolean {
  if (expected === 0) return actual === 0;
  const diff = Math.abs(actual - expected);
  return (diff / expected) * 100 <= variancePct;
}

export interface LocationProfile {
  locationId: string;
  cadence: HealthCadence;
  enabled: boolean;
}

/**
 * Generate all applicable rewards for a location based on its count history
 * Checks for streaks, accuracy, cadence wins
 */
export function generateInventoryRewardsForLocation(
  profile: LocationProfile,
  now = Date.now(),
): InventoryReward[] {
  const settings = getInventoryRewardSettings();
  if (!settings.enabled || !profile.enabled) return [];

  const history = getLeaderboardHistory(profile.locationId);
  if (!history.length) return [];

  const rewards: InventoryReward[] = [];

  // --------- Daily / AM_PM streak logic ----------
  if (profile.cadence === "DAILY" || profile.cadence === "AM_PM") {
    const dailyMap = new Map<string, number>();

    for (const ts of history) {
      const k = dayKey(ts);
      dailyMap.set(k, (dailyMap.get(k) ?? 0) + 1);
    }

    // Count consecutive days ending today (or yesterday if no count today)
    const requiredPerDay = profile.cadence === "AM_PM" ? 2 : 1;
    let streak = 0;

    for (let i = 0; i < 30; i++) {
      const checkTs = now - i * 24 * 60 * 60 * 1000;
      const k = dayKey(checkTs);
      const count = dailyMap.get(k) ?? 0;

      if (count >= requiredPerDay) {
        streak++;
      } else {
        break;
      }
    }

    const targetDays =
      profile.cadence === "AM_PM"
        ? settings.amPmStreakDaysForBadge
        : settings.streakDaysForBadge;

    if (streak >= targetDays) {
      const id = makeId("inventory_reward", [
        profile.locationId,
        profile.cadence,
        "streak",
        targetDays,
        dayKey(now),
      ]);

      rewards.push({
        id,
        kind: "STREAK",
        severity: profile.cadence === "AM_PM" ? "CELEBRATE" : "PRAISE",
        locationId: profile.locationId,
        title: `${streak}-Day Streak`,
        message:
          profile.cadence === "AM_PM"
            ? `AM+PM counts maintained for ${streak} consecutive days. Great discipline!`
            : `Daily counts maintained for ${streak} consecutive days. Excellent consistency!`,
        windowStart: now - streak * 24 * 60 * 60 * 1000,
        windowEnd: now,
        evidence: {
          streakDays: streak,
          requiredPerDay,
          cadence: profile.cadence,
        },
        issuedAt: now,
      });
    }
  }

  // --------- Weekly streak logic ----------
  if (profile.cadence === "WEEKLY") {
    const weeksOk: string[] = [];
    const today = new Date(now);

    for (let w = 0; w < 8; w++) {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - w * 7);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const hasCount = history.some((ts) => {
        return ts >= weekStart.getTime() && ts <= weekEnd.getTime();
      });

      if (hasCount) {
        weeksOk.push(
          `${weekStart.toISOString().slice(0, 10)}..${weekEnd
            .toISOString()
            .slice(0, 10)}`,
        );
      } else {
        break;
      }
    }

    const streakWeeks = weeksOk.length;
    if (streakWeeks >= settings.weeklyStreakWeeksForBadge) {
      const id = makeId("inventory_reward", [
        profile.locationId,
        "weekly",
        "streak",
        settings.weeklyStreakWeeksForBadge,
        dayKey(now),
      ]);

      rewards.push({
        id,
        kind: "STREAK",
        severity: "PRAISE",
        locationId: profile.locationId,
        title: `${streakWeeks}-Week Consistency`,
        message: `Weekly inventory rhythm maintained for ${streakWeeks} consecutive weeks. Exemplary!`,
        windowStart: now - streakWeeks * 7 * 24 * 60 * 60 * 1000,
        windowEnd: now,
        evidence: { weeksOk, streakWeeks },
        issuedAt: now,
      });
    }
  }

  return rewards;
}

/**
 * Create an "Accuracy Hero" reward when variance is within threshold
 * Called from wiring layer when snapshot event includes variance data
 */
export function createAccuracyHeroReward(args: {
  locationId: string;
  now: number;
  expectedValue: number;
  actualValue: number;
  variancePct: number;
  windowStart: number;
  windowEnd: number;
}): InventoryReward | null {
  const settings = getInventoryRewardSettings();
  if (!settings.enabled) return null;

  const ok = pctWithin(
    settings.accuracyVariancePct,
    args.actualValue,
    args.expectedValue,
  );
  if (!ok) return null;

  const id = makeId("inventory_reward", [
    args.locationId,
    "accuracy_hero",
    dayKey(args.now),
  ]);

  return {
    id,
    kind: "ACCURACY_HERO",
    severity: "CELEBRATE",
    locationId: args.locationId,
    title: "Accuracy Hero",
    message: `Inventory reconciliation stayed within ${settings.accuracyVariancePct}% variance. Outstanding accuracy!`,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    evidence: {
      expectedValue: args.expectedValue,
      actualValue: args.actualValue,
      measuredVariancePct: args.variancePct,
      thresholdPct: settings.accuracyVariancePct,
    },
    issuedAt: args.now,
  };
}
