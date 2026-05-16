/**
 * PHASE 4.1: IndexedDB-based offline caching
 * Allows app to work without internet connection
 * Stores: Generated code, conversations, files, preferences
 */

export interface CacheEntry<T> {
  id: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

export class IndexedDBCache {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = "EchoCoder", dbVersion: number = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("generatedCode")) {
          db.createObjectStore("generatedCode", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("conversations")) {
          db.createObjectStore("conversations", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Save item to cache
   */
  async set<T>(
    store: string,
    id: string,
    data: T,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);

      const entry: CacheEntry<T> = {
        id,
        data,
        timestamp: Date.now(),
        metadata,
      };

      const request = objectStore.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve item from cache
   */
  async get<T>(store: string, id: string): Promise<T | null> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;

        if (!entry) {
          resolve(null);
          return;
        }

        // Check expiration
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          objectStore.delete(id);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(store: string): Promise<CacheEntry<T>[]> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Delete item
   */
  async delete(store: string, id: string): Promise<void> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear entire store
   */
  async clear(store: string): Promise<void> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get storage usage
   */
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if (!navigator.storage?.estimate) {
      return { used: 0, available: 50 * 1024 * 1024 }; // Default 50MB
    }

    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      available: estimate.quota || 50 * 1024 * 1024,
    };
  }

  /**
   * Check if storage quota exceeded
   */
  async isStorageFull(threshold: number = 0.9): Promise<boolean> {
    const { used, available } = await this.getStorageInfo();
    return used / available > threshold;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let cache: IndexedDBCache | null = null;

export async function getIndexedDBCache(): Promise<IndexedDBCache> {
  if (!cache) {
    cache = new IndexedDBCache();
    await cache.init();
  }
  return cache;
}

/**
 * Hook-like function for React components
 */
export async function useIndexedDBCache<T>(
  store: string,
  id: string,
  initialValue?: T,
): Promise<{
  data: T | null;
  set: (value: T) => Promise<void>;
  delete: () => Promise<void>;
  refresh: () => Promise<T | null>;
}> {
  const cache = await getIndexedDBCache();

  return {
    data: await cache.get<T>(store, id),
    set: (value) => cache.set(store, id, value),
    delete: () => cache.delete(store, id),
    refresh: () => cache.get<T>(store, id),
  };
}
