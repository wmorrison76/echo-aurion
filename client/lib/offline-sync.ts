/**
 * Offline-First Sync Engine
 * Manages queue and sync of offline actions with conflict resolution
 * Week 12 Implementation
 */

interface SyncQueueItem {
  id: string;
  type: 'avatar_task' | 'order' | 'clock' | 'message';
  action: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface SyncState {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncErrors: Record<string, string>;
}

const DB_NAME = 'luccca-sync';
const QUEUE_STORE = 'sync-queue';
const STATE_STORE = 'sync-state';

export class OfflineSyncEngine {
  private db: IDBDatabase | null = null;
  private state: SyncState = {
    queue: [],
    isSyncing: false,
    lastSyncTime: null,
    syncErrors: {},
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private onSyncListener: ((state: SyncState) => void) | null = null;

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      await this.loadState();
      console.log('[SYNC] Engine initialized with', this.state.queue.length, 'items in queue');
    } catch (error) {
      console.error('[SYNC] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Start syncing interval
   */
  startSync(intervalMs: number = 10000): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine && this.state.queue.length > 0) {
        await this.syncQueue();
      }
    }, intervalMs);

    console.log('[SYNC] Sync interval started:', intervalMs, 'ms');
  }

  /**
   * Stop syncing
   */
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SYNC] Sync interval stopped');
    }
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(
    type: SyncQueueItem['type'],
    action: SyncQueueItem['action'],
    payload: Record<string, any>
  ): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    try {
      await this.insertQueueItem(item);
      this.state.queue.push(item);
      await this.saveState();
      this.notifyListeners();

      console.log('[SYNC] Item added to queue:', item.id);

      // Attempt sync immediately if online
      if (navigator.onLine) {
        await this.syncQueue();
      }

      return item;
    } catch (error) {
      console.error('[SYNC] Add to queue error:', error);
      throw error;
    }
  }

  /**
   * Sync entire queue
   */
  async syncQueue(): Promise<void> {
    if (this.state.isSyncing || !navigator.onLine || this.state.queue.length === 0) {
      return;
    }

    this.state.isSyncing = true;
    this.notifyListeners();

    try {
      const itemsToSync = [...this.state.queue];

      for (const item of itemsToSync) {
        if (item.retries >= item.maxRetries) {
          console.warn('[SYNC] Max retries exceeded for:', item.id);
          this.state.syncErrors[item.id] = 'Max retries exceeded';
          continue;
        }

        try {
          const success = await this.syncItem(item);

          if (success) {
            // Remove from queue
            this.state.queue = this.state.queue.filter((q) => q.id !== item.id);
            await this.removeQueueItem(item.id);
            delete this.state.syncErrors[item.id];

            console.log('[SYNC] Item synced successfully:', item.id);
          } else {
            item.retries++;
            await this.updateQueueItem(item);
          }
        } catch (error) {
          item.retries++;
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.state.syncErrors[item.id] = message;
          await this.updateQueueItem(item);

          console.error('[SYNC] Sync error for', item.id, ':', error);
        }
      }

      this.state.lastSyncTime = Date.now();
      await this.saveState();
    } finally {
      this.state.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync single item
   */
  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    const url = this.getApiUrl(item.type, item.action);

    const response = await fetch(url, {
      method: this.getHttpMethod(item.action),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('userToken')}`,
      },
      body: JSON.stringify(item.payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Update local payload with server-assigned IDs
    if (item.action === 'create' && result.id) {
      item.payload.id = result.id;
    }

    return true;
  }

  /**
   * Get API URL for sync item
   */
  private getApiUrl(type: string, action: string): string {
    const baseUrl = 'https://api.luccca.app';

    switch (type) {
      case 'avatar_task':
        return `${baseUrl}/api/avatar/tasks`;
      case 'order':
        return `${baseUrl}/api/orders`;
      case 'clock':
        return `${baseUrl}/api/v1/time-tracking/clock`;
      case 'message':
        return `${baseUrl}/api/messages/send`;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  /**
   * Get HTTP method for action
   */
  private getHttpMethod(action: string): string {
    switch (action) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        return 'POST';
    }
  }

  /**
   * Get current queue state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SyncState) => void): () => void {
    this.onSyncListener = listener;
    return () => {
      this.onSyncListener = null;
    };
  }

  /**
   * Clear queue (dangerous - use with care)
   */
  async clearQueue(): Promise<void> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);

      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          this.state.queue = [];
          this.state.syncErrors = {};
          this.saveState();
          console.log('[SYNC] Queue cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[SYNC] Clear queue error:', error);
      throw error;
    }
  }

  /**
   * Private: Open database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Private: Insert queue item
   */
  private insertQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Private: Update queue item
   */
  private updateQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Private: Remove queue item
   */
  private removeQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Private: Save state
   */
  private async saveState(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STATE_STORE, 'readwrite');
      const store = transaction.objectStore(STATE_STORE);
      const request = store.put({
        key: 'sync-state',
        value: this.state,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Private: Load state
   */
  private async loadState(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STATE_STORE, 'readonly');
      const store = transaction.objectStore(STATE_STORE);
      const request = store.get('sync-state');

      request.onsuccess = () => {
        if (request.result) {
          this.state = request.result.value;
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Private: Notify listeners
   */
  private notifyListeners(): void {
    if (this.onSyncListener) {
      this.onSyncListener({ ...this.state });
    }
  }
}

// Export singleton instance
export const offlineSyncEngine = new OfflineSyncEngine();
