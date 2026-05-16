/**
 * Inventory Health Leaderboard Types
 * Canonical types for multi-location inventory accuracy ranking and trending
 */

export type HealthCadence = "DAILY" | "WEEKLY" | "MONTHLY";
export type HealthLabel = "EXCELLENT" | "GOOD" | "OK" | "AT_RISK";
export type TrendLabel = "UP" | "DOWN" | "STABLE";

/**
 * Health score for a single location in a given cadence
 */
export interface InventoryHealthScore {
  locationId: string;
  locationName: string;
  cadence: HealthCadence;
  score: number; // 0..1
  label: HealthLabel;
  lastUpdatedAt: number; // timestamp when score was computed
  previousScore?: number; // prior period score (for trend)
  rank?: number; // rank in leaderboard (set during ranking)
}

/**
 * Entry in a leaderboard (ranked location)
 */
export interface LocationLeaderboardEntry {
  rank: number;
  locationId: string;
  locationName: string;
  healthScore: number; // 0..1
  healthLabel: HealthLabel;
  trendDelta: number; // score change from last period (-1..1, can be negative)
  trendLabel: TrendLabel;
  recentCount: {
    itemKey: string;
    name: string;
    onHand: number;
    uom: string;
  } | null; // most recently updated item
  lastCountMinutesAgo: number; // minutes since last snapshot update
}

/**
 * Complete leaderboard snapshot for a cadence
 */
export interface InventoryHealthLeaderboard {
  cadence: HealthCadence;
  asOfISO: string;
  entries: LocationLeaderboardEntry[];
}

/**
 * Scoring input parameters for a location
 */
export interface LocationHealthParams {
  locationId: string;
  locationName: string;
  lastCountAt: number; // timestamp of most recent snapshot update
  countFrequencyInWindow: number; // how many count events in this cadence period
  surplusEventsInWindow: number; // how many surplus broadcasts from this location
  hasVariance: boolean; // did on-hand amounts change (vs. zero activity)
  cadence: HealthCadence;
}
