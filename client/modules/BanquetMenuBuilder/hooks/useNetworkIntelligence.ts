/**
 * hooks/useNetworkIntelligence.ts
 * ----------------------------------------------------------------------------
 * Hook over networkIntelligenceService. Provides:
 *   - Menu-level benchmark (with caching)
 *   - Item-level percentile lookups (batched + memoized)
 *   - Loading/error state per query
 *
 * Cache strategy:
 *   - Menu benchmarks: keyed by hash of {eventType, guestCount, itemIds, perGuestCost}
 *   - Item percentiles: keyed by itemId + metric
 *   - Cache TTL: 30 minutes (network data updates daily; 30min is a reasonable
 *     refresh window for a single editing session)
 *
 * Why hook-level caching:
 *   The benchmark is queried by multiple components (the live stats footer,
 *   the network percentile badges on item cards, the workflow bar). Without
 *   caching we'd hit the network N times for the same data.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchMenuBenchmark,
  fetchItemPercentiles,
} from '../services/networkIntelligenceService';
import type {
  NetworkBenchmark,
  NetworkPercentileData,
  MenuItemId,
} from '../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';

const CACHE_TTL_MS = 30 * 60 * 1000;

interface UseNetworkIntelligenceResult {
  menuBenchmark: NetworkBenchmark | null;
  isMenuBenchmarkLoading: boolean;
  menuBenchmarkError: string | null;
  refreshMenuBenchmark: () => Promise<void>;

  /** Get cached or fetch percentile for a single item */
  getItemPercentile: (itemId: MenuItemId) => NetworkPercentileData | null;
  /** Trigger fetch for a batch of items */
  primeItemPercentiles: (itemIds: MenuItemId[]) => Promise<void>;
}

export function useNetworkIntelligence(
  composition: CompositionSnapshot | null,
): UseNetworkIntelligenceResult {
  const [menuBenchmark, setMenuBenchmark] = useState<NetworkBenchmark | null>(null);
  const [isMenuBenchmarkLoading, setIsMenuBenchmarkLoading] = useState(false);
  const [menuBenchmarkError, setMenuBenchmarkError] = useState<string | null>(null);

  const lastBenchmarkKeyRef = useRef<string>('');
  const lastBenchmarkAtRef = useRef<number>(0);

  // Per-item percentile cache
  const [itemPercentiles, setItemPercentiles] = useState<
    Record<MenuItemId, { data: NetworkPercentileData | null; fetchedAt: number }>
  >({});

  // ----- Menu benchmark -----

  const refreshMenuBenchmark = useCallback(async () => {
    if (!composition) return;
    const key = makeBenchmarkKey(composition);
    setIsMenuBenchmarkLoading(true);
    setMenuBenchmarkError(null);
    try {
      const data = await fetchMenuBenchmark(composition);
      setMenuBenchmark(data);
      lastBenchmarkKeyRef.current = key;
      lastBenchmarkAtRef.current = Date.now();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMenuBenchmarkError(msg);
    } finally {
      setIsMenuBenchmarkLoading(false);
    }
  }, [composition]);

  // Auto-refresh when composition fingerprint changes (and cache expired)
  useEffect(() => {
    if (!composition) return;
    const key = makeBenchmarkKey(composition);
    const now = Date.now();
    const isCacheValid =
      lastBenchmarkKeyRef.current === key &&
      now - lastBenchmarkAtRef.current < CACHE_TTL_MS;
    if (isCacheValid) return;
    void refreshMenuBenchmark();
  }, [composition, refreshMenuBenchmark]);

  // ----- Item percentiles -----

  const primeItemPercentiles = useCallback(
    async (itemIds: MenuItemId[]) => {
      if (itemIds.length === 0) return;

      // Filter to ones not in cache or expired
      const now = Date.now();
      const needFetch = itemIds.filter((id) => {
        const entry = itemPercentiles[id];
        if (!entry) return true;
        return now - entry.fetchedAt > CACHE_TTL_MS;
      });
      if (needFetch.length === 0) return;

      try {
        const result = await fetchItemPercentiles(needFetch, 'price_per_guest');
        const update: Record<MenuItemId, { data: NetworkPercentileData | null; fetchedAt: number }> =
          {};
        for (const id of needFetch) {
          update[id] = { data: result[id] ?? null, fetchedAt: now };
        }
        setItemPercentiles((prev) => ({ ...prev, ...update }));
      } catch (err) {
        console.warn('[useNetworkIntelligence] primeItemPercentiles failed', err);
      }
    },
    [itemPercentiles],
  );

  const getItemPercentile = useCallback(
    (itemId: MenuItemId): NetworkPercentileData | null => {
      return itemPercentiles[itemId]?.data ?? null;
    },
    [itemPercentiles],
  );

  return {
    menuBenchmark,
    isMenuBenchmarkLoading,
    menuBenchmarkError,
    refreshMenuBenchmark,
    getItemPercentile,
    primeItemPercentiles,
  };
}

// ----------------------------------------------------------------------------
// Cache key
// ----------------------------------------------------------------------------

function makeBenchmarkKey(c: CompositionSnapshot): string {
  const itemIds = c.sections
    .flatMap((s) => s.items.map((i) => i.itemId))
    .sort()
    .join(',');
  // Include itemCount + costPerGuest in the key so adding/removing items
  // refreshes the benchmark at most every TTL window
  return `${c.eventType}|${c.guestCount}|${c.itemCount}|${c.perGuestCost.toFixed(2)}|${itemIds}`;
}
