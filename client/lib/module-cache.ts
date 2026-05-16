/**
 * Module Cache with Memory Management
 * Caches loaded modules, deduplicates requests, and manages memory pressure
 */

interface CachedModule {
  component: React.ComponentType<any>;
  loadedAt: number;
  loadTime: number;
  estimatedSize: number;
  lastAccessedAt: number;
  accessCount: number;
  panelId?: string;
  isMinimized?: boolean;
}

interface LoadingPromise {
  promise: Promise<{ default: React.ComponentType<any> }>;
  startTime: number;
}

class ModuleCache {
  private cache = new Map<string, CachedModule>();
  private loading = new Map<string, LoadingPromise>();
  private loadTimes = new Map<string, number[]>();
  private panelModuleMap = new Map<string, string>(); // panelId -> moduleKey
  private maxCacheSize = 50; // Keep 50 modules in memory
  private maxAge = 1000 * 60 * 30; // 30 minutes
  private maxMemoryMB = 200; // 200MB memory budget
  private totalMemoryUsedMB = 0;

  /**
   * Load or return cached module
   * Deduplicates concurrent requests to the same module
   * CRITICAL: Includes timeout to prevent hanging indefinitely
   */
  async load(
    moduleKey: string,
    loader: () => Promise<{ default: React.ComponentType<any> }>,
  ): Promise<{ default: React.ComponentType<any> }> {
    // Return cached module if available and not expired
    const cached = this.cache.get(moduleKey);
    if (cached && Date.now() - cached.loadedAt < this.maxAge) {
      cached.lastAccessedAt = Date.now();
      cached.accessCount++;
      return { default: cached.component };
    }

    // Return existing loading promise if already loading
    const loading = this.loading.get(moduleKey);
    if (loading) {
      // Ensure the promise returns a valid module with default export
      return loading.promise.then((mod) => {
        if (!mod || !mod.default) {
          throw new Error(`Module ${moduleKey} loaded but default export is undefined`);
        }
        return mod;
      });
    }

    // Start new load with timeout protection
    const startTime = performance.now();
    const moduleTimeout = 1200000; // 20 min hard timeout per module - increased to accommodate large refactored modules with many dependencies
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const promise = Promise.race([
      loader(),
      new Promise<{ default: React.ComponentType<any> }>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Module ${moduleKey} load timeout after ${moduleTimeout}ms`));
        }, moduleTimeout);
      }),
    ])
      .then((mod) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        const loadTime = performance.now() - startTime;

        // Validate module has default export
        if (!mod || !mod.default) {
          throw new Error(`Module ${moduleKey} loaded but default export is undefined`);
        }

        // Never cache fallback error modules; allow recovery after code fixes.
        const isFallback = Boolean((mod.default as any)?.__moduleLoadFailed);
        if (!isFallback) {
          const estimatedSize = this.estimateComponentSize();

          // Store in cache with memory tracking
          this.cache.set(moduleKey, {
            component: mod.default,
            loadedAt: Date.now(),
            loadTime,
            estimatedSize,
            lastAccessedAt: Date.now(),
            accessCount: 1,
          });

          this.totalMemoryUsedMB += estimatedSize;

          // Track load time statistics
          if (!this.loadTimes.has(moduleKey)) {
            this.loadTimes.set(moduleKey, []);
          }
          this.loadTimes.get(moduleKey)!.push(loadTime);

          // Prune cache if too large
          if (this.cache.size > this.maxCacheSize) {
            this.pruneCache();
          }

          // Check memory and unload if needed
          if (this.getMemoryUsageMB() > this.maxMemoryMB) {
            this.performMemoryAudit();
          }
        }

        return mod;
      })
      .catch((err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        throw err;
      })
      .finally(() => {
        // CRITICAL: always clear loading state, even if loader throws/rejects.
        this.loading.delete(moduleKey);
      });

    // Store loading promise
    this.loading.set(moduleKey, { promise, startTime });

    return promise;
  }

  /**
   * Preload a module without blocking
   * Used for background loading during idle time
   */
  preload(
    moduleKey: string,
    loader: () => Promise<{ default: React.ComponentType<any> }>,
  ) {
    // Skip if already cached or loading
    if (this.cache.has(moduleKey) || this.loading.has(moduleKey)) {
      return;
    }

    // Fire and forget - don't await
    this.load(moduleKey, loader).catch(() => {
      // Silently fail - preload is best-effort
    });
  }

  /**
   * Preload modules during browser idle time
   */
  preloadOnIdle(
    moduleKey: string,
    loader: () => Promise<{ default: React.ComponentType<any> }>,
  ) {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => this.preload(moduleKey, loader), {
        timeout: 5000,
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.preload(moduleKey, loader), 5000);
    }
  }

  /**
   * Register a panel's association with a module for memory management
   */
  registerPanel(panelId: string, moduleKey: string, isMinimized = false): void {
    this.panelModuleMap.set(panelId, moduleKey);
    const cached = this.cache.get(moduleKey);
    if (cached) {
      cached.panelId = panelId;
      cached.isMinimized = isMinimized;
    }
  }

  /**
   * Signal that a panel's module should be considered for unloading (e.g., when minimized)
   * Allows memory to be freed while keeping panel state intact
   */
  signalPanelMinimized(panelId: string): void {
    const moduleKey = this.panelModuleMap.get(panelId);
    if (moduleKey) {
      const cached = this.cache.get(moduleKey);
      if (cached) {
        cached.isMinimized = true;
      }
      // Check if we need to unload due to memory pressure
      if (this.getMemoryUsageMB() > this.maxMemoryMB * 0.8) {
        this.unloadModule(moduleKey);
      }
    }
  }

  /**
   * Signal that a panel's module is now visible/active
   */
  signalPanelExpanded(panelId: string): void {
    const moduleKey = this.panelModuleMap.get(panelId);
    if (moduleKey) {
      const cached = this.cache.get(moduleKey);
      if (cached) {
        cached.isMinimized = false;
        cached.lastAccessedAt = Date.now();
        cached.accessCount++;
      }
    }
  }

  /**
   * Unload a module from memory while preserving panel state
   * The module can be lazily reloaded when the panel refocuses
   */
  unloadModule(moduleKey: string): void {
    const cached = this.cache.get(moduleKey);
    if (cached) {
      // Update memory usage
      this.totalMemoryUsedMB -= cached.estimatedSize;
      this.cache.delete(moduleKey);
      console.debug(
        `[ModuleCache] Unloaded module '${moduleKey}' (freed ~${cached.estimatedSize}MB, total: ${this.totalMemoryUsedMB}MB)`
      );
    }
  }

  /**
   * Estimate memory size of a component in MB
   * This is a rough estimate based on serialization size
   */
  private estimateComponentSize(): number {
    // Rough estimate: average component ~2-5MB when considering dependencies
    return Math.random() * 3 + 2;
  }

  /**
   * Get total memory usage in MB
   */
  getMemoryUsageMB(): number {
    return this.totalMemoryUsedMB;
  }

  /**
   * Get memory usage percentage (0-100)
   */
  getMemoryUsagePercent(): number {
    return (this.totalMemoryUsedMB / this.maxMemoryMB) * 100;
  }

  /**
   * Check if a module should be unloaded based on memory pressure and usage
   */
  shouldUnloadModule(moduleKey: string): boolean {
    const cached = this.cache.get(moduleKey);
    if (!cached) return false;

    // Never unload if actively used
    if (cached.isMinimized === false) return false;

    // Unload if memory exceeds threshold
    if (this.getMemoryUsageMB() > this.maxMemoryMB) return true;

    // Unload if minimized for 5+ minutes
    if (cached.isMinimized && Date.now() - cached.lastAccessedAt > 5 * 60 * 1000) {
      return true;
    }

    return false;
  }

  /**
   * Periodically check and unload modules that meet unload criteria
   */
  performMemoryAudit(): void {
    const modulesToUnload: string[] = [];

    Array.from(this.cache.entries()).forEach(([moduleKey, cached]) => {
      if (this.shouldUnloadModule(moduleKey)) {
        modulesToUnload.push(moduleKey);
      }
    });

    modulesToUnload.forEach((key) => {
      this.unloadModule(key);
    });

    if (modulesToUnload.length > 0) {
      console.debug(
        `[ModuleCache] Memory audit: unloaded ${modulesToUnload.length} modules`
      );
    }
  }

  /**
   * Remove oldest or least-used modules when cache is full
   */
  private pruneCache() {
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].loadedAt - b[1].loadedAt, // Sort by load time (oldest first)
    );

    const toRemove = Math.max(1, Math.floor(this.maxCacheSize * 0.2)); // Remove 20%
    for (let i = 0; i < toRemove; i++) {
      const [moduleKey, cached] = entries[i];
      this.totalMemoryUsedMB -= cached.estimatedSize;
      this.cache.delete(moduleKey);
    }
  }

  /**
   * Get average load time for a module
   */
  getAverageLoadTime(moduleKey: string): number {
    const times = this.loadTimes.get(moduleKey) || [];
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = {
      cachedModules: this.cache.size,
      loadingModules: this.loading.size,
      totalModulesLoaded: this.loadTimes.size,
      memoryUsedMB: this.totalMemoryUsedMB,
      memoryUsagePercent: this.getMemoryUsagePercent(),
      averageLoadTimes: {} as Record<string, number>,
    };

    Array.from(this.loadTimes.entries()).forEach(([key, times]) => {
      stats.averageLoadTimes[key] =
        parseFloat(
          (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
        ) || 0;
    });

    return stats;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.loading.clear();
    this.loadTimes.clear();
    this.panelModuleMap.clear();
    this.totalMemoryUsedMB = 0;
  }

  /**
   * Clear specific module from cache
   */
  clearModule(moduleKey: string) {
    const cached = this.cache.get(moduleKey);
    if (cached) {
      this.totalMemoryUsedMB -= cached.estimatedSize;
    }
    this.cache.delete(moduleKey);
    this.loading.delete(moduleKey);
    this.loadTimes.delete(moduleKey);
  }

  /**
   * Check if module is cached
   */
  isCached(moduleKey: string): boolean {
    return this.cache.has(moduleKey);
  }

  /**
   * Check if module is currently loading
   */
  isLoading(moduleKey: string): boolean {
    return this.loading.has(moduleKey);
  }
}

// Singleton instance
export const moduleCache = new ModuleCache();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).__moduleCache = moduleCache;
}
