/**
 * Panel Storage (IndexedDB)
 * Migrates panel state from localStorage to IndexedDB for better scalability
 * Phase 2: Storage & Offline
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { PanelId, PanelState } from "@/components/site/panels/types";

/** Serializable snapshot for IndexedDB (no React nodes or functions) */
export interface SerializablePanelState {
  entry: {
    id: PanelId;
    title: string;
    panelKey?: string;
    defaultWidth: number;
    defaultHeight: number;
    icon?: string;
    isImageIcon?: boolean;
  };
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isExpanded: boolean;
  expandedSize?: { width: number; height: number };
  expandedPosition?: { x: number; y: number };
  preExpandedSize?: { width: number; height: number };
  preExpandedPosition?: { x: number; y: number };
  zIndex: number;
}

interface PanelStorageDB extends DBSchema {
  "panel-state": {
    key: string;
    value: SerializablePanelState;
    indexes: { "by-z-index": number };
  };
  "panel-positions": {
    key: string;
    value: { id: PanelId; position: { x: number; y: number } };
  };
}

let dbPromise: Promise<IDBPDatabase<PanelStorageDB>> | null = null;

function getDB(): Promise<IDBPDatabase<PanelStorageDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PanelStorageDB>("luccca-panel-storage", 1, {
      upgrade(db) {
        // Create panel state store
        if (!db.objectStoreNames.contains("panel-state")) {
          const panelStore = db.createObjectStore("panel-state", {
            keyPath: "entry.id",
          });
          panelStore.createIndex("by-z-index", "zIndex");
        }

        // Create panel positions store (for quick position lookups)
        if (!db.objectStoreNames.contains("panel-positions")) {
          db.createObjectStore("panel-positions", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Save panel state to IndexedDB (serializable fields only; React elements are not stored)
 */
export async function savePanelState(panel: PanelState): Promise<void> {
  try {
    const db = await getDB();
    const serializable: SerializablePanelState = {
      entry: {
        id: panel.entry.id,
        title: panel.entry.title,
        panelKey: panel.entry.panelKey,
        defaultWidth: panel.entry.defaultWidth,
        defaultHeight: panel.entry.defaultHeight,
        icon: panel.entry.icon,
        isImageIcon: panel.entry.isImageIcon,
      },
      position: panel.position,
      size: panel.size,
      isMinimized: panel.isMinimized,
      isExpanded: panel.isExpanded,
      expandedSize: panel.expandedSize,
      expandedPosition: panel.expandedPosition,
      preExpandedSize: panel.preExpandedSize,
      preExpandedPosition: panel.preExpandedPosition,
      zIndex: panel.zIndex,
    };
    await db.put("panel-state", serializable);
  } catch (error) {
    console.error("[PanelStorage] Failed to save panel state:", error);
    throw error;
  }
}

/**
 * Load all panel states from IndexedDB (serializable only; no entry.element).
 * Caller must not use these as full PanelState for rendering; use for restore-by-id only.
 */
export async function loadPanelStates(): Promise<SerializablePanelState[]> {
  try {
    const db = await getDB();
    return await db.getAll("panel-state");
  } catch (error) {
    console.error("[PanelStorage] Failed to load panel states:", error);
    return [];
  }
}

/**
 * Delete panel state from IndexedDB
 */
export async function deletePanelState(panelId: PanelId): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("panel-state", panelId);
  } catch (error) {
    console.error("[PanelStorage] Failed to delete panel state:", error);
    throw error;
  }
}

/**
 * Clear all panel states from IndexedDB
 */
export async function clearPanelStates(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear("panel-state");
  } catch (error) {
    console.error("[PanelStorage] Failed to clear panel states:", error);
    throw error;
  }
}

/**
 * Save panel position (lightweight, frequently updated)
 */
export async function savePanelPosition(
  id: PanelId,
  position: { x: number; y: number }
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("panel-positions", { id, position });
  } catch (error) {
    console.error("[PanelStorage] Failed to save panel position:", error);
  }
}

/**
 * Load panel position
 */
export async function loadPanelPosition(
  id: PanelId
): Promise<{ x: number; y: number } | null> {
  try {
    const db = await getDB();
    const result = await db.get("panel-positions", id);
    return result?.position || null;
  } catch (error) {
    console.error("[PanelStorage] Failed to load panel position:", error);
    return null;
  }
}

/**
 * Migrate from localStorage to IndexedDB (one-time migration)
 */
export async function migrateFromLocalStorage(): Promise<number> {
  try {
    // Check if migration already completed
    const db = await getDB();
    const existing = await db.count("panel-state");
    if (existing > 0) {
      console.log("[PanelStorage] Migration already completed");
      return existing;
    }

    // Migrate sticky note positions from localStorage
    const stickyPositions = localStorage.getItem("sticky-notes-positions");
    if (stickyPositions) {
      try {
        const positions = JSON.parse(stickyPositions);
        for (const [id, position] of Object.entries(positions)) {
          await savePanelPosition(id as PanelId, position as { x: number; y: number });
        }
        console.log(
          `[PanelStorage] Migrated ${Object.keys(positions).length} sticky note positions`
        );
      } catch (error) {
        console.error("[PanelStorage] Failed to migrate sticky positions:", error);
      }
    }

    return 0; // No panel states to migrate (they're in memory)
  } catch (error) {
    console.error("[PanelStorage] Migration failed:", error);
    return 0;
  }
}
