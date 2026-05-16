/**
 * Inventory Rewards Store
 * localStorage-backed persistence for rewards and settings
 */

import type {
  InventoryReward,
  InventoryRewardSettings,
} from "@/../shared/types/inventory-rewards";

const KEY_REWARDS = "luccca:inventory:rewards:v1";
const KEY_SETTINGS = "luccca:inventory:rewards:settings:v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadRewards(): InventoryReward[] {
  return safeParse(localStorage.getItem(KEY_REWARDS), []);
}

function saveRewards(v: InventoryReward[]) {
  try {
    localStorage.setItem(KEY_REWARDS, JSON.stringify(v));
  } catch (err) {
    console.error("[InventoryRewardsStore] saveRewards error:", err);
  }
}

/**
 * List all rewards, sorted by most recent first
 */
export function listInventoryRewards(): InventoryReward[] {
  return loadRewards().sort((a, b) => b.issuedAt - a.issuedAt);
}

/**
 * Add or update a reward
 * Automatically caps list to 250 entries to prevent localStorage bloat
 */
export function upsertInventoryReward(r: InventoryReward) {
  try {
    const all = loadRewards();
    const idx = all.findIndex((x) => x.id === r.id);
    if (idx >= 0) {
      all[idx] = r;
    } else {
      all.unshift(r);
    }

    // cap to prevent localStorage bloat
    if (all.length > 250) {
      all.splice(250);
    }

    saveRewards(all);
  } catch (err) {
    console.error("[InventoryRewardsStore] upsertInventoryReward error:", err);
  }
}

/**
 * Get current rewards settings with safe defaults
 */
export function getInventoryRewardSettings(): InventoryRewardSettings {
  const defaults: InventoryRewardSettings = {
    enabled: true,
    publishToChefNet: true,
    streakDaysForBadge: 7,
    amPmStreakDaysForBadge: 5,
    weeklyStreakWeeksForBadge: 4,
    accuracyVariancePct: 2,
    updatedAt: Date.now(),
  };

  return safeParse(localStorage.getItem(KEY_SETTINGS), defaults);
}

/**
 * Update rewards settings (partial merge)
 */
export function updateInventoryRewardSettings(
  patch: Partial<InventoryRewardSettings>,
): InventoryRewardSettings {
  try {
    const current = getInventoryRewardSettings();
    const next: InventoryRewardSettings = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    };
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(next));
    return next;
  } catch (err) {
    console.error(
      "[InventoryRewardsStore] updateInventoryRewardSettings error:",
      err,
    );
    return getInventoryRewardSettings();
  }
}
