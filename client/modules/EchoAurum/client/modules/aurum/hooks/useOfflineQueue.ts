import { useCallback, useEffect, useState } from "react";
interface QueuedItem {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body: string;
  type: "approval" | "gl_entry" | "invoice" | "payment";
  description: string;
  timestamp: number;
  status: "pending" | "syncing" | "failed" | "synced";
  retryCount: number;
  lastError?: string;
}
interface OfflineQueueState {
  items: QueuedItem[];
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
}
const DB_NAME = "EchoAurum";
const DB_VERSION = 1;
const STORE_NAME =
  "offlineQueue"; /** * Hook for managing offline queue * Stores pending approvals, GL entries, and other mutations in IndexedDB * Syncs with server when online using background sync API */
export function useOfflineQueue() {
  const [state, setState] = useState<OfflineQueueState>({
    items: [],
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
  }); // Initialize IndexedDB useEffect(() => { const initDb = async () => { try { await openDatabase(); await loadQueueItems(); } catch (error) { console.error("[OfflineQueue] Failed to initialize database:", error); } }; initDb(); // Listen for online/offline events const handleOnline = () => { setState((prev) => ({ ...prev, isOnline: true })); // Trigger sync syncQueue(); }; const handleOffline = () => { setState((prev) => ({ ...prev, isOnline: false })); }; window.addEventListener("online", handleOnline); window.addEventListener("offline", handleOffline); return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); }; }, []); /** * Open or create IndexedDB database */ const openDatabase = useCallback((): Promise<IDBDatabase> => { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); request.onupgradeneeded = (event) => { const db = (event.target as IDBOpenDBRequest).result; if (!db.objectStoreNames.contains(STORE_NAME)) { const store = db.createObjectStore(STORE_NAME, { keyPath:"id" }); store.createIndex("timestamp","timestamp", { unique: false }); store.createIndex("status","status", { unique: false }); store.createIndex("type","type", { unique: false }); } }; }); }, []); /** * Load all queue items from IndexedDB */ const loadQueueItems = useCallback(async () => { try { const db = await openDatabase(); const tx = db.transaction(STORE_NAME,"readonly"); const store = tx.objectStore(STORE_NAME); const index = store.index("status"); const range = IDBKeyRange.bound("pending","syncing"); const items = await new Promise<QueuedItem[]>((resolve, reject) => { const request = index.getAll(range); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result as QueuedItem[]); }); const pendingCount = items.filter((i) => i.status ==="pending").length; const failedCount = items.filter((i) => i.status ==="failed").length; setState((prev) => ({ ...prev, items: items.sort((a, b) => a.timestamp - b.timestamp), pendingCount, failedCount, })); } catch (error) { console.error("[OfflineQueue] Failed to load items:", error); } }, [openDatabase]); /** * Add item to offline queue */ const queueRequest = useCallback( async ( url: string, method:"POST" |"PUT" |"DELETE", body: any, type:"approval" |"gl_entry" |"invoice" |"payment", description: string, ): Promise<string> => { const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; const item: QueuedItem = { id, url, method, headers: {"Content-Type":"application/json" }, body: JSON.stringify(body), type, description, timestamp: Date.now(), status:"pending", retryCount: 0, }; try { const db = await openDatabase(); const tx = db.transaction(STORE_NAME,"readwrite"); const store = tx.objectStore(STORE_NAME); await new Promise<void>((resolve, reject) => { const request = store.add(item); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); // Reload items await loadQueueItems(); console.log(`[OfflineQueue] Queued ${type} request: ${id}`); return id; } catch (error) { console.error("[OfflineQueue] Failed to queue request:", error); throw error; } }, [openDatabase, loadQueueItems], ); /** * Remove item from queue */ const removeFromQueue = useCallback( async (id: string) => { try { const db = await openDatabase(); const tx = db.transaction(STORE_NAME,"readwrite"); const store = tx.objectStore(STORE_NAME); await new Promise<void>((resolve, reject) => { const request = store.delete(id); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(); }); await loadQueueItems(); console.log(`[OfflineQueue] Removed item: ${id}`); } catch (error) { console.error("[OfflineQueue] Failed to remove item:", error); } }, [openDatabase, loadQueueItems], ); /** * Sync offline queue with server */ const syncQueue = useCallback(async () => { if (!state.isOnline || state.isSyncing) { return; } setState((prev) => ({ ...prev, isSyncing: true })); try { const db = await openDatabase(); const tx = db.transaction(STORE_NAME,"readwrite"); const store = tx.objectStore(STORE_NAME); const index = store.index("status"); const pendingItems = await new Promise<QueuedItem[]>( (resolve, reject) => { const request = index.getAll("pending"); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result as QueuedItem[]); }, ); console.log( `[OfflineQueue] Syncing ${pendingItems.length} pending items`, ); for (const item of pendingItems) { try { // Update status to syncing await updateItemStatus(db, item.id,"syncing"); const response = await fetch(item.url, { method: item.method, headers: item.headers, body: item.body, }); if (response.ok) { await removeFromQueue(item.id); console.log(`[OfflineQueue] Synced: ${item.id}`); } else { const error = `Server error: ${response.status}`; await updateItemError(db, item.id, error); console.warn(`[OfflineQueue] Failed to sync ${item.id}: ${error}`); } } catch (error) { const errorMsg = error instanceof Error ? error.message :"Unknown error"; await updateItemError(db, item.id, errorMsg); console.error(`[OfflineQueue] Error syncing ${item.id}:`, error); } } await loadQueueItems(); } catch (error) { console.error("[OfflineQueue] Sync failed:", error); } finally { setState((prev) => ({ ...prev, isSyncing: false })); } }, [ state.isOnline, state.isSyncing, openDatabase, removeFromQueue, loadQueueItems, ]); /** * Retry failed item */ const retryItem = useCallback( async (id: string) => { try { const db = await openDatabase(); const tx = db.transaction(STORE_NAME,"readwrite"); const store = tx.objectStore(STORE_NAME); await new Promise<void>((resolve, reject) => { const request = store.get(id); request.onerror = () => reject(request.error); request.onsuccess = async () => { const item = request.result as QueuedItem; if (item) { item.status ="pending"; item.retryCount = (item.retryCount || 0) + 1; item.lastError = undefined; const updateRequest = store.put(item); updateRequest.onerror = () => reject(updateRequest.error); updateRequest.onsuccess = () => resolve(); } }; }); await loadQueueItems(); if (state.isOnline) { await syncQueue(); } } catch (error) { console.error("[OfflineQueue] Failed to retry item:", error); } }, [openDatabase, loadQueueItems, syncQueue, state.isOnline], ); /** * Clear all failed items */ const clearFailed = useCallback(async () => { try { const db = await openDatabase(); const tx = db.transaction(STORE_NAME,"readwrite"); const store = tx.objectStore(STORE_NAME); const index = store.index("status"); await new Promise<void>((resolve, reject) => { const request = index.openCursor("failed"); request.onerror = () => reject(request.error); request.onsuccess = (event) => { const cursor = (event.target as IDBRequest).result; if (cursor) { cursor.delete(); cursor.continue(); } else { resolve(); } }; }); await loadQueueItems(); } catch (error) { console.error("[OfflineQueue] Failed to clear failed items:", error); } }, [openDatabase, loadQueueItems]); return { ...state, queueRequest, syncQueue, removeFromQueue, retryItem, clearFailed, };
} /** * Helper: Update item status in database */
async function updateItemStatus(
  db: IDBDatabase,
  id: string,
  status: QueuedItem["status"],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineQueue", "readwrite");
    const store = tx.objectStore("offlineQueue");
    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result as QueuedItem;
      if (item) {
        item.status = status;
        const updateRequest = store.put(item);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
} /** * Helper: Update item error in database */
async function updateItemError(
  db: IDBDatabase,
  id: string,
  error: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineQueue", "readwrite");
    const store = tx.objectStore("offlineQueue");
    const request = store.get(id);
    request.onsuccess = () => {
      const item = request.result as QueuedItem;
      if (item) {
        item.status = "failed";
        item.lastError = error;
        const updateRequest = store.put(item);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}
