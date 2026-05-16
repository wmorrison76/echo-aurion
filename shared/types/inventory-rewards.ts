/**
 * Inventory Recognition & Rewards Types
 * Deterministic award system for inventory health achievements
 */

export type RewardSeverity = "CELEBRATE" | "PRAISE" | "NUDGE";

export type InventoryRewardKind =
  | "STREAK"
  | "CADENCE_WIN"
  | "ACCURACY_HERO"
  | "SURPLUS_SAVER"
  | "FIRST_WEEK_COMPLETE"
  | "MONTHLY_CHAMP";

/**
 * A single reward issued to a location
 * Every field is deterministic and auditable
 */
export interface InventoryReward {
  id: string; // e.g. "inventory_reward:storeroom:DAILY:streak:7:2025-1-3"
  kind: InventoryRewardKind;
  severity: RewardSeverity;

  locationId: string;
  title: string;
  message: string;

  // deterministic proof window
  windowStart: number; // timestamp
  windowEnd: number; // timestamp
  evidence: Record<string, any>; // streakDays, expectedValue, actualValue, etc.

  issuedAt: number;
}

/**
 * Settings for the rewards system
 * Controls thresholds, feature flags, and integration
 */
export interface InventoryRewardSettings {
  enabled: boolean;

  // publish to ChefNet recognition feed
  publishToChefNet: boolean;

  // streak thresholds (days)
  streakDaysForBadge: number; // e.g. 7 (daily counts)
  amPmStreakDaysForBadge: number; // e.g. 5 (AM+PM counts)
  weeklyStreakWeeksForBadge: number; // e.g. 4 (weekly counts)

  // accuracy thresholds (%)
  accuracyVariancePct: number; // e.g. 2 (counts within 2% of expected = hero)

  updatedAt: number;
}
