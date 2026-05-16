/**
 * useNetworkPercentile.ts
 * ----------------------------------------------------------------------------
 * Surfaces the anonymized network intelligence layer (the "Bloomberg
 * Terminal for hospitality" angle) — for every PropertyItem in the menu,
 * looks up where its price sits vs. similar items at peer properties.
 *
 * The percentile semantics:
 *   p10  = "Your price is among the 10% lowest in the network"
 *   p50  = "Right at the network median"
 *   p72  = "Higher than 72% of comparable items in the network"
 *   p99  = "Among the 1% highest"
 *
 * Privacy contract:
 *   The networkIntelligenceRepository ONLY returns aggregated percentile
 *   buckets. It NEVER returns identifying property data. That is enforced
 *   at the data layer; this hook is just a consumer.
 *
 * Caching:
 *   Results are cached in a module-scoped Map keyed by archetypeId. The
 *   cache is invalidated when itemSnapshots change. Network signals are
 *   slow-moving (re-aggregated nightly), so a lightweight in-memory cache
 *   is plenty.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { networkIntelligenceRepository } from '../data/repositories';
import { useCompositionStore, selectAllComposedItems } from './useCompositionStore';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface NetworkPercentile {
  /** PropertyItem id this signal refers to */
  itemId: string;
  /** The network archetype this item maps to */
  archetypeId: string;
  /** Percentile (0..100) — null when sample size insufficient */
  pricePercentile: number | null;
  /** Number of comparable items in network */
  sampleSize: number;
  /** Whether sample is large enough to display (>=10 by convention) */
  isReliable: boolean;
}

// ----------------------------------------------------------------------------
// Module-scoped cache
// ----------------------------------------------------------------------------

const cache = new Map<string, NetworkPercentile>();
const inFlight = new Map<string, Promise<NetworkPercentile | null>>();

const RELIABILITY_THRESHOLD = 10;

// ----------------------------------------------------------------------------
// Public hook
// ----------------------------------------------------------------------------

export function useNetworkPercentile(): {
  byItemId: Record<string, NetworkPercentile | null>;
  loading: boolean;
} {
  const items = useCompositionStore(selectAllComposedItems);
  const [byItemId, setByItemId] = useState<Record<string, NetworkPercentile | null>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const out: Record<string, NetworkPercentile | null> = {};
      await Promise.all(
        items.map(async (composed) => {
          const archetypeId = composed.itemSnapshot.networkArchetypeId;
          const itemId = composed.itemId;
          if (!archetypeId) {
            out[itemId] = null;
            return;
          }

          // Cache hit
          const cached = cache.get(archetypeId);
          if (cached) {
            out[itemId] = { ...cached, itemId };
            return;
          }

          // De-duplicate concurrent fetches for same archetype
          let pending = inFlight.get(archetypeId);
          if (!pending) {
            pending = fetchPercentile(archetypeId, composed.itemSnapshot);
            inFlight.set(archetypeId, pending);
          }
          const result = await pending;
          inFlight.delete(archetypeId);

          if (result) {
            cache.set(archetypeId, result);
            out[itemId] = { ...result, itemId };
          } else {
            out[itemId] = null;
          }
        }),
      );

      if (!cancelled) {
        setByItemId(out);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally key off itemId list, not the items themselves —
    // overrides changing shouldn't trigger refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.itemId).sort().join('|')]);

  return { byItemId, loading };
}

// ----------------------------------------------------------------------------
// Internal fetch
// ----------------------------------------------------------------------------

async function fetchPercentile(
  archetypeId: string,
  itemSnapshot: { pricing: { kind: string } },
): Promise<NetworkPercentile | null> {
  try {
    const signal = await networkIntelligenceRepository.getSignalForArchetype(
      archetypeId,
    );
    if (!signal) return null;

    const sampleSize = signal.sampleSize ?? 0;
    const isReliable = sampleSize >= RELIABILITY_THRESHOLD;

    return {
      itemId: '', // filled in by consumer
      archetypeId,
      pricePercentile: isReliable ? signal.pricePercentile : null,
      sampleSize,
      isReliable,
    };
  } catch (err) {
    console.warn('[useNetworkPercentile] fetch failed', err);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Cache management (for testing + manual refresh)
// ----------------------------------------------------------------------------

export function clearNetworkPercentileCache(): void {
  cache.clear();
  inFlight.clear();
}
