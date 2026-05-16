/**
 * P&L Cache
 * 
 * Caches P&L calculations for fast retrieval.
 * Target: <1s for single outlet, <5s for 10 outlets
 */

import { getCache } from "./cache-layer";
import { logger } from "./logger";

export interface PnLCacheEntry {
  outletId: string;
  period: string;
  data: any;
  calculatedAt: Date;
  version: number;
}

const cache = getCache();
const CACHE_TTL = 300; // 5 minutes

/**
 * Get cached P&L calculation
 */
export async function getCachedPnL(
  outletId: string,
  period: string
): Promise<any | null> {
  try {
    const cacheKey = `pnl:${outletId}:${period}`;
    const cached = await cache.get<PnLCacheEntry>(cacheKey);
    return cached?.data || null;
  } catch (error) {
    logger.error("[PnLCache] Error getting cached P&L:", error);
    return null;
  }
}

/**
 * Cache P&L calculation
 */
export async function cachePnL(
  outletId: string,
  period: string,
  data: any,
  version: number = 1
): Promise<void> {
  try {
    const cacheKey = `pnl:${outletId}:${period}`;
    const entry: PnLCacheEntry = {
      outletId,
      period,
      data,
      calculatedAt: new Date(),
      version,
    };

    await cache.set(cacheKey, entry, "stats");
    logger.debug(`[PnLCache] Cached P&L for ${outletId}:${period}`);
  } catch (error) {
    logger.error("[PnLCache] Error caching P&L:", error);
  }
}

/**
 * Invalidate P&L cache for outlet/period
 */
export async function invalidatePnLCache(
  outletId: string,
  period?: string
): Promise<void> {
  try {
    if (period) {
      const cacheKey = `pnl:${outletId}:${period}`;
      await cache.del(cacheKey);
    } else {
      // Invalidate all periods for outlet
      await cache.invalidatePattern(new RegExp(`pnl:${outletId}:.*`));
    }
    logger.debug(`[PnLCache] Invalidated P&L cache for ${outletId}:${period || "all"}`);
  } catch (error) {
    logger.error("[PnLCache] Error invalidating cache:", error);
  }
}
