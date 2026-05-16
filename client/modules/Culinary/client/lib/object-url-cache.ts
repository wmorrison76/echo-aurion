/**
 * LRU Cache for Object URLs
 * ========================
 * Prevents WebKitBlobResource exhaustion by limiting the number of
 * simultaneously active object URLs and automatically revoking older ones
 *
 * For crawlers/bulk operations: use maxSize 50-75
 * For normal gallery use: use maxSize 100-150
 *
 * CRITICAL: This uses the NATIVE URL API directly, never wrapped versions
 */

interface CacheEntry {
  url: string;
  lastAccessed: number;
  accessCount: number;
}

// Save native functions at module load time before any wrapping can happen
const nativeCreateObjectURL = URL.createObjectURL;
const nativeRevokeObjectURL = URL.revokeObjectURL;

export class ObjectURLLRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly debug: boolean;
  private readonly evictionThreshold: number; // Trigger eviction before full

  constructor(maxSize: number = 100, debug: boolean = false) {
    this.maxSize = maxSize;
    this.debug = debug;
    // Evict when 85% full to prevent hitting hard limit
    this.evictionThreshold = Math.floor(maxSize * 0.85);
  }

  /**
   * Get a URL from cache, updating its access time
   */
  get(id: string): string | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    // Update access time and count to mark as recently/frequently used
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    return entry.url;
  }

  /**
   * Set a URL in cache, evicting LRU entries if needed
   * Uses native API directly to avoid any recursion issues
   */
  set(id: string, blob: Blob): string {
    // Revoke old URL if exists
    const existing = this.cache.get(id);
    if (existing) {
      try {
        nativeRevokeObjectURL(existing.url);
      } catch (e) {
        // Ignore revoke errors
      }
    }

    // Create new object URL using NATIVE (not wrapped) createObjectURL
    let url: string;
    try {
      url = nativeCreateObjectURL(blob);
    } catch (error) {
      console.error("[ObjectURLCache] Failed to create object URL:", error);
      throw error;
    }

    // Evict LRU entries if at or above threshold (85% full)
    // This prevents hitting the hard limit and gives buffer for burst operations
    while (this.cache.size >= this.evictionThreshold) {
      this.evictLRU();
    }

    // Store in cache
    this.cache.set(id, {
      url,
      lastAccessed: Date.now(),
      accessCount: 1,
    });

    if (this.debug) {
      console.log(
        `[ObjectURLCache] Set ${id}, cache size: ${this.cache.size}/${this.maxSize} (threshold: ${this.evictionThreshold})`,
      );
    }

    return url;
  }

  /**
   * Evict the least recently used entry (with low access frequency)
   * Prioritizes evicting entries that are both old AND infrequently accessed
   */
  private evictLRU(): void {
    let lruId: string | null = null;
    let lruScore = Infinity; // Lower score = more likely to evict

    // Find entry with lowest "value" score
    // Score = (time since last access in ms) / (access count + 1)
    // Older, less-used entries score higher
    for (const [id, entry] of this.cache.entries()) {
      const timeSinceAccess = Date.now() - entry.lastAccessed;
      const score = timeSinceAccess / (entry.accessCount + 1);

      if (score < lruScore) {
        lruScore = score;
        lruId = id;
      }
    }

    if (lruId) {
      const entry = this.cache.get(lruId)!;
      try {
        nativeRevokeObjectURL(entry.url);
      } catch (e) {
        // Ignore revoke errors
      }
      this.cache.delete(lruId);

      if (this.debug) {
        console.log(
          `[ObjectURLCache] Evicted LRU entry: ${lruId} (score: ${lruScore.toFixed(0)}, size now: ${this.cache.size})`,
        );
      }
    }
  }

  /**
   * Remove specific entry and revoke its URL
   */
  remove(id: string): void {
    const entry = this.cache.get(id);
    if (entry) {
      try {
        nativeRevokeObjectURL(entry.url);
      } catch (e) {
        // Ignore revoke errors
      }
      this.cache.delete(id);

      if (this.debug) {
        console.log(`[ObjectURLCache] Removed ${id}, cache size: ${this.cache.size}`);
      }
    }
  }

  /**
   * Clear all entries and revoke all URLs
   */
  clear(): void {
    for (const [, entry] of this.cache.entries()) {
      try {
        nativeRevokeObjectURL(entry.url);
      } catch (e) {
        // Ignore revoke errors
      }
    }
    this.cache.clear();

    if (this.debug) {
      console.log("[ObjectURLCache] Cleared all entries");
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    currentSize: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      currentSize: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100),
    };
  }

  /**
   * Warn if cache utilization is high
   */
  checkUtilization(): void {
    const utilization = (this.cache.size / this.maxSize) * 100;
    if (utilization > 80) {
      console.warn(
        `[ObjectURLCache] High utilization: ${Math.round(utilization)}% (${this.cache.size}/${this.maxSize})`,
      );
    }
  }
}

// Export singleton instance for global use
// Size: 100 (85% threshold = 85)
// For heavy crawlers, consider reducing to 50
export const objectURLCache = new ObjectURLLRUCache(100, false);
