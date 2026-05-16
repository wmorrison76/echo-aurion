/**
 * Storage utilities for persistent state management
 * Uses localStorage for all data persistence (NO EXCEL files)
 * Includes quota management and whiteboard-specific optimization
 */

export interface StorageOptions {
  version?: number;
  ttl?: number; // Time to live in milliseconds
}

export interface StorageSetResult {
  success: boolean;
  error?: "QuotaExceededError" | "SecurityError" | "UnknownError";
  message?: string;
}

/**
 * Storage namespace prefix
 */
const PREFIX = "echo:";
const WHITEBOARD_PAGES_PREFIX = `${PREFIX}state:whiteboard-pages-`;
const QUOTA_WARNING_THRESHOLD = 0.85; // 85% of quota
const QUOTA_CRITICAL_THRESHOLD = 0.95; // 95% of quota

/**
 * Storage key helpers
 */
export const storageKeys = {
  // Module states
  moduleState: (moduleName: string) => `${PREFIX}state:${moduleName}`,

  // UI states
  uiState: (key: string) => `${PREFIX}ui:${key}`,

  // Panel positions
  panelPositions: () => `${PREFIX}panels:positions`,

  // i18n
  language: () => `${PREFIX}i18n:language`,

  // Theme
  colorScheme: () => `${PREFIX}theme:colorScheme`,

  // User preferences
  userPreference: (key: string) => `${PREFIX}user:${key}`,
} as const;

/**
 * Prepare object for storage (no actual compression, just JSON)
 */
function compressObject<T>(obj: T): string {
  return JSON.stringify(obj);
}

function decompressObject<T>(data: string): T | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Get current storage usage stats (cached to avoid performance issues)
 */
let cachedStats: any = null;
let lastStatsTime = 0;
const STATS_CACHE_MS = 5000; // Cache for 5 seconds

function getStorageStats(): {
  used: number;
  available: number;
  percentage: number;
  isWarning: boolean;
  isCritical: boolean;
} {
  const now = Date.now();
  if (cachedStats && now - lastStatsTime < STATS_CACHE_MS) {
    return cachedStats;
  }

  let totalSize = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += (localStorage[key] || "").length + key.length;
    }
  }
  const available = 5 * 1024 * 1024; // 5MB typical limit
  const percentage = totalSize / available;

  cachedStats = {
    used: totalSize,
    available,
    percentage,
    isWarning: percentage >= QUOTA_WARNING_THRESHOLD,
    isCritical: percentage >= QUOTA_CRITICAL_THRESHOLD,
  };
  lastStatsTime = now;

  return cachedStats;
}

/**
 * Clean up old data when storage is critical
 * Priority: whiteboard > goals > other module states
 */
function performStorageCleanup(targetBytes: number = 2 * 1024 * 1024): void {
  try {
    const items: Array<{ key: string; size: number; priority: number }> = [];

    // Collect all non-critical keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const size = (localStorage[key] || "").length + key.length;

      // Skip auth and critical system keys
      if (
        key.startsWith("auth") ||
        key.startsWith("session") ||
        key.includes("user") ||
        key.includes("org")
      ) {
        continue;
      }

      // Assign priority (lower = removed first)
      let priority = 3; // Default
      if (key.startsWith(WHITEBOARD_PAGES_PREFIX)) {
        priority = 1; // Whiteboard pages: remove first
      } else if (key.includes("daily-goals-tracker")) {
        priority = 2; // Goals: remove second
      } else if (key.startsWith(PREFIX)) {
        priority = 3; // Other module states
      }

      items.push({ key, size, priority });
    }

    // Sort by priority (lowest first), then by size (largest first)
    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.size - a.size;
    });

    // Remove items until we've freed enough space
    let freedSpace = 0;
    for (const { key, size } of items) {
      if (freedSpace >= targetBytes) break;

      localStorage.removeItem(key);
      freedSpace += size;

      const type = key.startsWith(WHITEBOARD_PAGES_PREFIX)
        ? "whiteboard"
        : key.includes("daily-goals-tracker")
          ? "goals"
          : "module state";
      console.log(
        `[Storage] Cleaned up old ${type} data: ${key.substring(0, 50)}...`,
      );
    }

    console.log(
      `[Storage] Cleanup complete: freed ~${Math.round(freedSpace / 1024)}KB`,
    );
  } catch (error) {
    console.error("[Storage] Error during cleanup:", error);
  }
}

/**
 * Generic storage interface with error handling and quota management
 */
export const storage = {
  /**
   * Get value from localStorage
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue ?? null;

      const decompressed = decompressObject<T>(item);
      return decompressed ?? defaultValue ?? null;
    } catch (error) {
      console.error("Storage.get error:", error);
      return defaultValue ?? null;
    }
  },

  /**
   * Set value in localStorage with quota management
   */
  set<T>(key: string, value: T): StorageSetResult {
    try {
      // Try to set the item first - no stats check on happy path
      localStorage.setItem(key, compressObject(value));
      return { success: true };
    } catch (error) {
      const errorName = (error as any)?.name || "UnknownError";

      if (errorName === "QuotaExceededError") {
        console.warn(
          `Storage quota exceeded - Key: ${key.substring(0, 50)}..., Size: ~${JSON.stringify(value).length} bytes`,
        );

        // Try cleanup for any data type
        try {
          performStorageCleanup(2 * 1024 * 1024); // Try to free 2MB
          // Retry once after cleanup
          try {
            localStorage.setItem(key, compressObject(value));
            console.log("[Storage] Successfully saved after cleanup");
            return { success: true };
          } catch {
            return {
              success: false,
              error: "QuotaExceededError",
              message:
                "Storage quota exceeded even after cleanup. Data not persisted.",
            };
          }
        } catch {
          // Cleanup failed, return error
          return {
            success: false,
            error: "QuotaExceededError",
            message: "Storage cleanup failed. Data not persisted.",
          };
        }
      }

      if (errorName === "SecurityError") {
        console.error(
          `Storage.set error: SecurityError - localStorage may be disabled`,
        );
        return {
          success: false,
          error: "SecurityError",
          message:
            "Storage is unavailable (likely disabled or in private mode)",
        };
      }

      console.error("Storage.set error:", error);
      return {
        success: false,
        error: "UnknownError",
        message: "Unknown error writing to storage",
      };
    }
  },

  /**
   * Remove value from localStorage
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Storage.remove error:", error);
      return false;
    }
  },

  /**
   * Clear all storage
   */
  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Storage.clear error:", error);
      return false;
    }
  },

  /**
   * Get all keys with a specific prefix
   */
  keys(prefix: string = PREFIX): string[] {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  },

  /**
   * Get module state
   */
  getModuleState<T = any>(moduleName: string, defaultValue?: T): T | null {
    return storage.get<T>(storageKeys.moduleState(moduleName), defaultValue);
  },

  /**
   * Set module state with quota handling
   */
  setModuleState<T = any>(moduleName: string, state: T): boolean {
    const result = storage.set(storageKeys.moduleState(moduleName), state);
    return result.success;
  },

  /**
   * Get UI state
   */
  getUIState<T = any>(key: string, defaultValue?: T): T | null {
    return storage.get<T>(storageKeys.uiState(key), defaultValue);
  },

  /**
   * Set UI state
   */
  setUIState<T = any>(key: string, value: T): boolean {
    const result = storage.set(storageKeys.uiState(key), value);
    return result.success;
  },

  /**
   * Get panel positions
   */
  getPanelPositions() {
    return (
      storage.get<Record<string, any>>(storageKeys.panelPositions(), {}) || {}
    );
  },

  /**
   * Set panel positions
   */
  setPanelPositions(positions: Record<string, any>): boolean {
    const result = storage.set(storageKeys.panelPositions(), positions);
    return result.success;
  },

  /**
   * Get user preference
   */
  getUserPreference<T = any>(key: string, defaultValue?: T): T | null {
    return storage.get<T>(storageKeys.userPreference(key), defaultValue);
  },

  /**
   * Set user preference
   */
  setUserPreference<T = any>(key: string, value: T): boolean {
    const result = storage.set(storageKeys.userPreference(key), value);
    return result.success;
  },

  /**
   * Get storage stats
   */
  getStats() {
    return getStorageStats();
  },

  /**
   * Perform storage cleanup (removes old data when quota exceeded)
   */
  performStorageCleanup,
};

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage usage (approximate)
 */
export function getStorageSize(): {
  used: number;
  available: number;
  percentage: number;
} {
  return getStorageStats();
}

/**
 * Hook-friendly storage utilities
 */
export function useStorage<T = any>(
  key: string,
  initialValue?: T,
): [T | null, (value: T) => boolean, () => void] {
  const getStoredValue = (): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue ?? null;

      const decompressed = decompressObject<T>(item);
      return decompressed ?? initialValue ?? null;
    } catch (error) {
      console.error("useStorage get error:", error);
      return initialValue ?? null;
    }
  };

  const setValue = (value: T): boolean => {
    const result = storage.set(key, value);
    return result.success;
  };

  const removeValue = () => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("useStorage remove error:", error);
    }
  };

  return [getStoredValue(), setValue, removeValue];
}
