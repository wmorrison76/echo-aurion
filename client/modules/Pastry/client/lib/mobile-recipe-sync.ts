import { supabase } from './auth-service';
import { cloudSync, type SyncEvent } from './cloud-sync';

export interface MobileRecipeSync {
  organizationId: string;
  userId: string;
  isOnline: boolean;
  lastSyncTime: number;
  syncedRecipes: number;
  pendingChanges: number;
  storageUsed: number;
  storageLimit: number;
}

export interface OfflineRecipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  metadata: {
    lastModified: number;
    isOfflineOnly: boolean;
    needsSync: boolean;
    syncAttempts: number;
  };
}

interface PendingChange {
  id: string;
  recipeId: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  attempts: number;
}

interface SyncConflict {
  recipeId: string;
  localVersion: any;
  remoteVersion: any;
  timestamp: number;
}

class MobileRecipeSyncManager {
  private organizationId: string = '';
  private userId: string = '';
  private isOnline = navigator.onLine;
  private dbName = 'recipe_app_db';
  private storeName = 'recipes';
  private conflictStoreName = 'sync_conflicts';
  private pendingChangesStoreName = 'pending_changes';
  private db: IDBDatabase | null = null;
  private syncIntervalId: NodeJS.Timer | null = null;
  private conflictResolver: ((conflict: SyncConflict) => Promise<'local' | 'remote'>) | null = null;
  private readonly MAX_STORAGE = 52428800; // 50MB
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly RETRY_ATTEMPTS = 3;

  /**
   * Initialize mobile sync database
   */
  async initialize(organizationId: string, userId: string): Promise<boolean> {
    this.organizationId = organizationId;
    this.userId = userId;

    try {
      // Open IndexedDB
      await this.openDatabase();

      // Setup online/offline listeners
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Start sync interval
      this.startSyncInterval();

      return true;
    } catch (error) {
      console.error('Error initializing mobile sync:', error);
      return false;
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create recipes store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('lastModified', 'metadata.lastModified', { unique: false });
          store.createIndex('needsSync', 'metadata.needsSync', { unique: false });
        }

        // Create sync conflicts store
        if (!db.objectStoreNames.contains(this.conflictStoreName)) {
          db.createObjectStore(this.conflictStoreName, { keyPath: 'recipeId' });
        }

        // Create pending changes store
        if (!db.objectStoreNames.contains(this.pendingChangesStoreName)) {
          const store = db.createObjectStore(this.pendingChangesStoreName, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Save recipe offline
   */
  async saveRecipeOffline(recipe: OfflineRecipe): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);

      const recipeToStore = {
        ...recipe,
        metadata: {
          ...recipe.metadata,
          lastModified: Date.now(),
        },
      };

      const request = store.put(recipeToStore);

      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        this.trackPendingChange('update', recipe.id, recipeToStore);
        resolve(true);
      };
    });
  }

  /**
   * Get offline recipe
   */
  async getOfflineRecipe(recipeId: string): Promise<OfflineRecipe | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(recipeId);

      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Get all offline recipes
   */
  async getAllOfflineRecipes(): Promise<OfflineRecipe[]> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Delete offline recipe
   */
  async deleteOfflineRecipe(recipeId: string): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(recipeId);

      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        this.trackPendingChange('delete', recipeId, {});
        resolve(true);
      };
    });
  }

  /**
   * Sync recipes from server
   */
  async syncRecipesFromServer(): Promise<{ success: boolean; count: number; error?: any }> {
    if (!this.isOnline) {
      return { success: false, count: 0, error: 'Offline' };
    }

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('organization_id', this.organizationId)
        .gt('updated_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      if (error) {
        return { success: false, count: 0, error };
      }

      // Save to offline storage
      const recipes = data || [];
      for (const recipe of recipes) {
        const offlineRecipe: OfflineRecipe = {
          id: recipe.id,
          title: recipe.title,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          metadata: {
            lastModified: new Date(recipe.updated_at).getTime(),
            isOfflineOnly: false,
            needsSync: false,
            syncAttempts: 0,
          },
        };

        await this.saveRecipeOffline(offlineRecipe);
      }

      return { success: true, count: recipes.length };
    } catch (error) {
      return { success: false, count: 0, error: String(error) };
    }
  }

  /**
   * Sync pending changes to server
   */
  async syncPendingChanges(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0 };
    }

    const changes = await this.getPendingChanges();
    let synced = 0;
    let failed = 0;

    for (const change of changes) {
      if (change.attempts >= this.RETRY_ATTEMPTS) {
        // Store as conflict
        await this.storeConflict(change.recipeId, change.data);
        await this.removePendingChange(change.id);
        failed++;
        continue;
      }

      try {
        const event: SyncEvent = {
          id: change.id.toString(),
          event_type: change.type,
          table: 'recipes',
          record_id: change.recipeId,
          user_id: this.userId,
          organization_id: this.organizationId,
          new_data: change.data,
          timestamp: change.timestamp,
          synced: false,
        };

        cloudSync.queueChange(event);

        await this.updatePendingChange(change.id, change.attempts + 1);
        synced++;
      } catch (error) {
        console.error('Error syncing change:', error);
        await this.updatePendingChange(change.id, change.attempts + 1);
        failed++;
      }
    }

    return { success: true, synced, failed };
  }

  /**
   * Handle online status
   */
  private async handleOnline() {
    this.isOnline = true;
    console.log('Device online - syncing recipes...');

    // Sync server recipes
    await this.syncRecipesFromServer();

    // Sync pending changes
    const result = await this.syncPendingChanges();
    console.log(`Synced ${result.synced} changes, ${result.failed} failed`);

    // Check for conflicts
    const conflicts = await this.getConflicts();
    if (conflicts.length > 0) {
      await this.resolveConflicts(conflicts);
    }
  }

  /**
   * Handle offline status
   */
  private handleOffline() {
    this.isOnline = false;
    console.log('Device offline - using local recipes');
  }

  /**
   * Start sync interval
   */
  private startSyncInterval() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.syncIntervalId = setInterval(async () => {
      if (this.isOnline) {
        await this.syncPendingChanges();
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Track pending change
   */
  private async trackPendingChange(
    type: 'create' | 'update' | 'delete',
    recipeId: string,
    data: any
  ) {
    if (!this.db) return;

    return new Promise<void>((resolve) => {
      const tx = this.db!.transaction([this.pendingChangesStoreName], 'readwrite');
      const store = tx.objectStore(this.pendingChangesStoreName);

      const change: PendingChange = {
        id: `${recipeId}-${Date.now()}`,
        recipeId,
        type,
        data,
        timestamp: Date.now(),
        attempts: 0,
      };

      const request = store.add(change);
      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get pending changes
   */
  private getPendingChanges(): Promise<PendingChange[]> {
    if (!this.db) return Promise.resolve([]);

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.pendingChangesStoreName], 'readonly');
      const store = tx.objectStore(this.pendingChangesStoreName);
      const request = store.getAll();

      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Update pending change attempt count
   */
  private updatePendingChange(id: string, attempts: number): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.pendingChangesStoreName], 'readwrite');
      const store = tx.objectStore(this.pendingChangesStoreName);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const change = getRequest.result;
        if (change) {
          change.attempts = attempts;
          store.put(change);
        }
        resolve();
      };
      getRequest.onerror = () => resolve();
    });
  }

  /**
   * Remove pending change
   */
  private removePendingChange(id: string): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.pendingChangesStoreName], 'readwrite');
      const store = tx.objectStore(this.pendingChangesStoreName);
      const request = store.delete(id);

      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Store sync conflict
   */
  private storeConflict(recipeId: string, localVersion: any): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.conflictStoreName], 'readwrite');
      const store = tx.objectStore(this.conflictStoreName);

      const conflict: SyncConflict = {
        recipeId,
        localVersion,
        remoteVersion: {}, // Will be populated during conflict resolution
        timestamp: Date.now(),
      };

      const request = store.put(conflict);
      request.onerror = () => resolve();
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get conflicts
   */
  private getConflicts(): Promise<SyncConflict[]> {
    if (!this.db) return Promise.resolve([]);

    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.conflictStoreName], 'readonly');
      const store = tx.objectStore(this.conflictStoreName);
      const request = store.getAll();

      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(conflicts: SyncConflict[]): Promise<void> {
    if (!this.conflictResolver) return;

    for (const conflict of conflicts) {
      try {
        const resolution = await this.conflictResolver(conflict);

        if (resolution === 'local') {
          // Keep local version
          await this.syncPendingChanges();
        } else {
          // Use remote version - update local
          const remoteData = conflict.remoteVersion;
          const recipe: OfflineRecipe = {
            id: conflict.recipeId,
            title: remoteData.title || '',
            ingredients: remoteData.ingredients || [],
            instructions: remoteData.instructions || [],
            metadata: {
              lastModified: Date.now(),
              isOfflineOnly: false,
              needsSync: false,
              syncAttempts: 0,
            },
          };
          await this.saveRecipeOffline(recipe);
        }

        // Remove conflict
        if (this.db) {
          const tx = this.db.transaction([this.conflictStoreName], 'readwrite');
          tx.objectStore(this.conflictStoreName).delete(conflict.recipeId);
        }
      } catch (error) {
        console.error('Error resolving conflict:', error);
      }
    }
  }

  /**
   * Set conflict resolver
   */
  setConflictResolver(
    resolver: (conflict: SyncConflict) => Promise<'local' | 'remote'>
  ) {
    this.conflictResolver = resolver;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<MobileRecipeSync> {
    const offlineRecipes = await this.getAllOfflineRecipes();
    const pendingChanges = await this.getPendingChanges();
    const storageEstimate = await navigator.storage?.estimate?.() || { usage: 0, quota: 0 };

    return {
      organizationId: this.organizationId,
      userId: this.userId,
      isOnline: this.isOnline,
      lastSyncTime: Date.now(),
      syncedRecipes: offlineRecipes.length,
      pendingChanges: pendingChanges.length,
      storageUsed: storageEstimate.usage || 0,
      storageLimit: storageEstimate.quota || this.MAX_STORAGE,
    };
  }

  /**
   * Clear offline storage
   */
  async clearOfflineStorage(): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(
        [this.storeName, this.conflictStoreName, this.pendingChangesStoreName],
        'readwrite'
      );

      tx.objectStore(this.storeName).clear();
      tx.objectStore(this.conflictStoreName).clear();
      tx.objectStore(this.pendingChangesStoreName).clear();

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());

    if (this.db) {
      this.db.close();
    }
  }
}

export const mobileSync = new MobileRecipeSyncManager();
