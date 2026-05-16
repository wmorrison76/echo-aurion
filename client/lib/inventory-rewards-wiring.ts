/**
 * Inventory Rewards Wiring
 * Event listeners that generate rewards and emit recognition events
 * Bridges inventory health updates to the rewards system and ChefNet
 */

import { osBus } from "@/lib/os-bus";
import { getLeaderboardHistory } from "@/lib/inventory-leaderboard-store";
import {
  getInventoryRewardSettings,
  upsertInventoryReward,
} from "@/lib/inventory-rewards-store";
import {
  createAccuracyHeroReward,
  generateInventoryRewardsForLocation,
  type LocationProfile,
} from "@/lib/inventory-rewards-engine";
import type { HealthCadence } from "@/../shared/types/inventory-health";

let initialized = false;

/**
 * Initialize the rewards wiring
 * Call once at app startup (non-blocking, minimal setup)
 */
export function ensureInventoryRewardsWiring() {
  if (initialized) return;
  initialized = true;

  // Listen for health leaderboard updates
  // When health scores are recomputed, check for new streaks/wins
  osBus.on("inventory:leaderboard_updated", (evt: any) => {
    const settings = getInventoryRewardSettings();
    if (!settings.enabled) return;

    // Extract profiles from the leaderboard event
    // The leaderboard contains locations that were scored
    const leaderboard = evt?.leaderboard;
    if (!leaderboard || !Array.isArray(leaderboard.entries)) return;

    const now = Date.now();
    const newRewards = [];

    // For each location in the leaderboard, generate applicable rewards
    for (const entry of leaderboard.entries) {
      const profile: LocationProfile = {
        locationId: entry.locationId,
        cadence: leaderboard.cadence,
        enabled: true,
      };

      const rewards = generateInventoryRewardsForLocation(profile, now);

      for (const reward of rewards) {
        upsertInventoryReward(reward);
        newRewards.push(reward);

        // Emit internal event
        osBus.emit("inventory:reward_issued", {
          id: reward.id,
          kind: reward.kind,
          severity: reward.severity,
          locationId: reward.locationId,
          title: reward.title,
          message: reward.message,
          issuedAt: reward.issuedAt,
          source: "inventory:leaderboard_updated",
        });

        // Bridge to ChefNet if enabled
        if (settings.publishToChefNet) {
          osBus.emit("chefnet:recognition_posted", {
            kind: "inventory",
            locationId: reward.locationId,
            title: reward.title,
            message: reward.message,
            severity: reward.severity,
            issuedAt: reward.issuedAt,
            sourceRewardId: reward.id,
            source: "inventory:rewards",
          });
        }
      }
    }
  });

  // Listen for snapshot updates (potential accuracy hero awards)
  // If the snapshot includes variance data, we can award accuracy heroes
  osBus.on("inventory:snapshot_updated", (evt: any) => {
    const settings = getInventoryRewardSettings();
    if (!settings.enabled) return;

    const locationId = evt?.locationId;
    const expectedValue = evt?.expectedValue;
    const actualValue = evt?.actualValue;
    const variancePct = evt?.variancePct;

    // All fields must be present to award accuracy hero
    if (
      !locationId ||
      typeof expectedValue !== "number" ||
      typeof actualValue !== "number" ||
      typeof variancePct !== "number"
    ) {
      return;
    }

    const now = Date.now();
    const reward = createAccuracyHeroReward({
      locationId,
      now,
      expectedValue,
      actualValue,
      variancePct,
      windowStart: evt?.windowStart ?? now - 24 * 60 * 60 * 1000,
      windowEnd: evt?.updatedAt ?? now,
    });

    if (!reward) return;

    // Persist the reward
    upsertInventoryReward(reward);

    // Emit internal event
    osBus.emit("inventory:reward_issued", {
      id: reward.id,
      kind: reward.kind,
      severity: reward.severity,
      locationId: reward.locationId,
      title: reward.title,
      message: reward.message,
      issuedAt: reward.issuedAt,
      source: "inventory:snapshot_updated",
    });

    // Bridge to ChefNet if enabled
    if (settings.publishToChefNet) {
      osBus.emit("chefnet:recognition_posted", {
        kind: "inventory",
        locationId: reward.locationId,
        title: reward.title,
        message: reward.message,
        severity: reward.severity,
        issuedAt: reward.issuedAt,
        sourceRewardId: reward.id,
        source: "inventory:rewards",
      });
    }
  });
}
