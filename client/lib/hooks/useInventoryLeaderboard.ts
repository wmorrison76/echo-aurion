/**
 * useInventoryLeaderboard Hook
 * Subscribes to inventory events and recomputes leaderboard rankings
 * Returns current leaderboard state and refresh function
 * Handles lazy initialization and quota errors gracefully
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type {
  HealthCadence,
  InventoryHealthLeaderboard,
} from "@/../shared/types/inventory-health";
import {
  getLeaderboardSnapshot,
  upsertLeaderboardSnapshot,
  getPreviousScore,
  getAllTrackedLocations,
  initializeLeaderboardSamples,
} from "@/lib/inventory-leaderboard-store";
import {
  getLocationSnapshot,
  getSnapshotMeta,
} from "@/lib/inventory-ledger-store";
import {
  scoreLocationHealth,
  rankLocationsByHealth,
} from "@/lib/inventory-health-scorer";
import { osBus } from "@/lib/os-bus";

const initTrackerRef = { initialized: false };

export function useInventoryLeaderboard(cadence: HealthCadence) {
  const [leaderboard, setLeaderboard] =
    useState<InventoryHealthLeaderboard | null>(() =>
      getLeaderboardSnapshot(cadence),
    );
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Recompute leaderboard rankings
   * Called when snapshots update or on explicit refresh
   */
  const recomputeLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      // Get all locations that have inventory snapshots
      const locations = getAllTrackedLocations(cadence);

      if (locations.length === 0) {
        // No tracked locations yet, use defaults from sample init
        const snapshot = getLeaderboardSnapshot(cadence);
        if (snapshot) {
          setLeaderboard(snapshot);
        }
        return;
      }

      const scores = locations.map((locationId) => {
        const snapshot = getLocationSnapshot(locationId);
        const meta = getSnapshotMeta(locationId);

        // Count frequency in window (simplified: use entry count)
        const countFrequency = snapshot.length > 0 ? 1 : 0;

        // Score this location
        const score = scoreLocationHealth({
          locationId,
          locationName: locationId, // TODO: get from registry if available
          lastCountAt: meta.updatedAt ?? Date.now(),
          countFrequencyInWindow: countFrequency,
          surplusEventsInWindow: 0, // TODO: count surplus events
          hasVariance: snapshot.some((s) => s.onHand > 0),
          cadence,
        });

        return score;
      });

      // Get previous scores for trend calculation
      const previousScoresMap = new Map<string, number>();
      for (const locationId of locations) {
        const prevScore = getPreviousScore(locationId, cadence);
        if (prevScore !== undefined) {
          previousScoresMap.set(locationId, prevScore);
        }
      }

      // Rank locations
      const entries = rankLocationsByHealth(scores, previousScoresMap);

      // Build leaderboard
      const now = new Date();
      const newLeaderboard: InventoryHealthLeaderboard = {
        cadence,
        asOfISO: now.toISOString(),
        entries,
      };

      // Store and update state
      upsertLeaderboardSnapshot(newLeaderboard);
      setLeaderboard(newLeaderboard);

      // Emit event for other listeners
      osBus.emit("inventory:leaderboard_updated", {
        cadence,
        leaderboard: newLeaderboard,
        source: "useInventoryLeaderboard.recomputeLeaderboard",
      });
    } catch (err) {
      console.error(
        "[useInventoryLeaderboard] recomputeLeaderboard error:",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [cadence]);

  /**
   * Debounced recomputation (avoid thrashing on rapid events)
   */
  const debouncedRecompute = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      recomputeLeaderboard();
    }, 1000); // Debounce 1 second
  }, [recomputeLeaderboard]);

  /**
   * Lazy initialize samples on first mount (non-blocking)
   */
  useEffect(() => {
    if (!initTrackerRef.initialized) {
      initTrackerRef.initialized = true;
      try {
        initializeLeaderboardSamples();
      } catch (err) {
        // Silently fail on quota exceeded or other errors
        // Panel will work with existing data, just without samples
        console.debug(
          "[useInventoryLeaderboard] Sample initialization skipped:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const unsubscribeSnapshot = osBus.on("inventory:snapshot_updated", () => {
      debouncedRecompute();
    });

    const unsubscribeSurplus = osBus.on("inventory:surplus_broadcasted", () => {
      debouncedRecompute();
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribeSurplus();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [debouncedRecompute]);

  /**
   * Refresh leaderboard explicitly
   */
  const refresh = useCallback(() => {
    recomputeLeaderboard();
  }, [recomputeLeaderboard]);

  return {
    leaderboard,
    loading,
    refresh,
  };
}
