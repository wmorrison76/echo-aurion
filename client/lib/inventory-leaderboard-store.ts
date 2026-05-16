/**
 * Inventory Leaderboard Store
 * localStorage-backed cache for leaderboard snapshots and historical scores
 * Supports trend calculation by storing previous period scores
 */

import type {
  HealthCadence,
  InventoryHealthScore,
  InventoryHealthLeaderboard,
} from "@/../shared/types/inventory-health";

const LEADERBOARD_KEY = (cadence: HealthCadence) =>
  `luccca:inventory_leaderboard:v1:${cadence}`;
const SCORE_HISTORY_KEY = (locationId: string, cadence: HealthCadence) =>
  `luccca:inventory_score_history:v1:${locationId}:${cadence}`;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Store a complete leaderboard snapshot for a cadence
 */
export function upsertLeaderboardSnapshot(
  leaderboard: InventoryHealthLeaderboard,
): void {
  try {
    const key = LEADERBOARD_KEY(leaderboard.cadence);
    localStorage.setItem(key, JSON.stringify(leaderboard));

    // Also store individual scores in history for trend calculation
    for (const entry of leaderboard.entries) {
      const historyKey = SCORE_HISTORY_KEY(
        entry.locationId,
        leaderboard.cadence,
      );
      const history =
        safeParse<InventoryHealthScore[]>(localStorage.getItem(historyKey)) ||
        [];

      // Add new score entry (keep last 30)
      history.push({
        locationId: entry.locationId,
        locationName: entry.locationName,
        cadence: leaderboard.cadence,
        score: entry.healthScore,
        label: entry.healthLabel,
        lastUpdatedAt: Date.now(),
      });

      // Keep only last 30 entries
      if (history.length > 30) {
        history.splice(0, history.length - 30);
      }

      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  } catch (err) {
    console.error("[LeaderboardStore] upsertLeaderboardSnapshot error:", err);
  }
}

/**
 * Retrieve the current leaderboard snapshot for a cadence
 */
export function getLeaderboardSnapshot(
  cadence: HealthCadence,
): InventoryHealthLeaderboard | null {
  try {
    const key = LEADERBOARD_KEY(cadence);
    return safeParse<InventoryHealthLeaderboard>(localStorage.getItem(key));
  } catch (err) {
    console.error("[LeaderboardStore] getLeaderboardSnapshot error:", err);
    return null;
  }
}

/**
 * Get the previous score for a location in a given cadence
 * Used for trend calculation
 */
export function getPreviousScore(
  locationId: string,
  cadence: HealthCadence,
): number | undefined {
  try {
    const key = SCORE_HISTORY_KEY(locationId, cadence);
    const history = safeParse<InventoryHealthScore[]>(
      localStorage.getItem(key),
    );

    if (!history || history.length === 0) {
      return undefined;
    }

    // If we have at least 2 entries, return the second-to-last (previous period)
    if (history.length >= 2) {
      return history[history.length - 2].score;
    }

    // Otherwise return undefined (no prior period to compare)
    return undefined;
  } catch (err) {
    console.error("[LeaderboardStore] getPreviousScore error:", err);
    return undefined;
  }
}

/**
 * Get historical scores for a location across a cadence
 * Useful for trending/analytics
 */
export function getLeaderboardHistory(
  locationId: string,
  cadence: HealthCadence,
  limitEntries: number = 30,
): InventoryHealthScore[] {
  try {
    const key = SCORE_HISTORY_KEY(locationId, cadence);
    const history =
      safeParse<InventoryHealthScore[]>(localStorage.getItem(key)) || [];

    return history.slice(-limitEntries);
  } catch (err) {
    console.error("[LeaderboardStore] getLeaderboardHistory error:", err);
    return [];
  }
}

/**
 * Clear leaderboard data for a cadence
 * Useful for testing or manual refresh
 */
export function clearLeaderboard(cadence: HealthCadence): void {
  try {
    const key = LEADERBOARD_KEY(cadence);
    localStorage.removeItem(key);
  } catch (err) {
    console.error("[LeaderboardStore] clearLeaderboard error:", err);
  }
}

/**
 * Get all locations that have score history
 * Useful for iterating over all tracked locations
 */
export function getAllTrackedLocations(cadence: HealthCadence): string[] {
  try {
    const locations = new Set<string>();

    // Iterate through all keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const prefix = `luccca:inventory_score_history:v1:`;
      if (key.startsWith(prefix) && key.includes(`:${cadence}`)) {
        // Extract locationId from key format: prefix:locationId:cadence
        const parts = key.substring(prefix.length).split(":");
        if (parts.length >= 2) {
          const locationId = parts.slice(0, -1).join(":");
          locations.add(locationId);
        }
      }
    }

    return Array.from(locations);
  } catch (err) {
    console.error("[LeaderboardStore] getAllTrackedLocations error:", err);
    return [];
  }
}

/**
 * Initialize sample leaderboard (for demo purposes)
 */
export function initializeLeaderboardSamples(): void {
  try {
    const cadences: HealthCadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

    for (const cadence of cadences) {
      const existing = getLeaderboardSnapshot(cadence);
      if (existing) continue; // Already initialized

      const now = new Date();
      const leaderboard: InventoryHealthLeaderboard = {
        cadence,
        asOfISO: now.toISOString(),
        entries: [
          {
            rank: 1,
            locationId: "storeroom",
            locationName: "Storeroom",
            healthScore: 0.88,
            healthLabel: "EXCELLENT",
            trendDelta: 0.05,
            trendLabel: "UP",
            recentCount: {
              itemKey: "chicken_breast_6oz",
              name: "Chicken Breast 6oz",
              onHand: 48,
              uom: "cs",
            },
            lastCountMinutesAgo: 15,
          },
          {
            rank: 2,
            locationId: "banquets-commissary",
            locationName: "Banquets Commissary",
            healthScore: 0.72,
            healthLabel: "GOOD",
            trendDelta: -0.02,
            trendLabel: "STABLE",
            recentCount: {
              itemKey: "beef_tenderloin",
              name: "Beef Tenderloin Prime",
              onHand: 12,
              uom: "lb",
            },
            lastCountMinutesAgo: 240,
          },
          {
            rank: 3,
            locationId: "pastry-commissary",
            locationName: "Pastry Commissary",
            healthScore: 0.58,
            healthLabel: "OK",
            trendDelta: -0.12,
            trendLabel: "DOWN",
            recentCount: {
              itemKey: "chocolate_dark",
              name: "Dark Chocolate 70% Couverture",
              onHand: 10,
              uom: "lb",
            },
            lastCountMinutesAgo: 1440,
          },
        ],
      };

      upsertLeaderboardSnapshot(leaderboard);
    }
  } catch (err) {
    // Silently skip initialization if quota is exceeded or other storage error occurs
    // Panel will function with existing data
    console.debug(
      "[LeaderboardStore] Sample initialization skipped:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
