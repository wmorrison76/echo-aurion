import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DATABASE_NAME = "cellar.db";
let dbInstance = null;

export async function initDB() {
  try {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);

    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        region TEXT,
        qty_bottles INT,
        cost_per_bottle REAL,
        bin_location TEXT,
        vintage INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS saved_pairings (
        id TEXT PRIMARY KEY NOT NULL,
        wine_id TEXT,
        wine_name TEXT,
        pairing_score REAL,
        rationale TEXT,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS training_progress (
        id TEXT PRIMARY KEY NOT NULL,
        card_index INT,
        completed BOOLEAN,
        score INT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        sync_status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS local_inventory (
        id TEXT PRIMARY KEY,
        venue_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity REAL,
        unit TEXT,
        cost_price REAL,
        retail_price REAL,
        location TEXT,
        sku TEXT,
        last_counted_at DATETIME,
        counted_by TEXT,
        sync_status TEXT DEFAULT 'local',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS local_transfers (
        id TEXT PRIMARY KEY,
        from_venue_id TEXT NOT NULL,
        to_venue_id TEXT NOT NULL,
        status TEXT,
        items TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'local'
      );

      CREATE TABLE IF NOT EXISTS offline_counts (
        id TEXT PRIMARY KEY,
        venue_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        counted_quantity REAL,
        counted_by TEXT,
        count_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        photo_path TEXT,
        notes TEXT,
        synced INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_local_inventory_venue ON local_inventory(venue_id);
      CREATE INDEX IF NOT EXISTS idx_local_transfers_status ON local_transfers(status);
      CREATE INDEX IF NOT EXISTS idx_offline_counts_synced ON offline_counts(synced);
    `);

    console.log("Database initialized successfully");
    return dbInstance;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

export function getDB() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initDB() first.");
  }
  return dbInstance;
}

export async function savePairing(pairing) {
  try {
    const db = getDB();
    await db.runAsync(
      `INSERT INTO saved_pairings (id, wine_id, wine_name, pairing_score, rationale) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        pairing.id || `pairing_${Date.now()}`,
        pairing.wine_id,
        pairing.wine_name,
        pairing.pairing_score,
        pairing.rationale,
      ]
    );
  } catch (error) {
    console.error("Failed to save pairing:", error);
    throw error;
  }
}

export async function getSavedPairings() {
  try {
    const db = getDB();
    const result = await db.getAllAsync(
      `SELECT * FROM saved_pairings ORDER BY saved_at DESC`
    );
    return result || [];
  } catch (error) {
    console.error("Failed to get saved pairings:", error);
    return [];
  }
}

export async function saveTrainingProgress(progress) {
  try {
    const db = getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO training_progress (id, card_index, completed, score) 
       VALUES (?, ?, ?, ?)`,
      [
        progress.id || `progress_${Date.now()}`,
        progress.card_index,
        progress.completed ? 1 : 0,
        progress.score,
      ]
    );
  } catch (error) {
    console.error("Failed to save training progress:", error);
    throw error;
  }
}

export async function getTrainingProgress() {
  try {
    const db = getDB();
    const result = await db.getAllAsync(
      `SELECT * FROM training_progress ORDER BY completed_at DESC`
    );
    return result || [];
  } catch (error) {
    console.error("Failed to get training progress:", error);
    return [];
  }
}

export async function saveLocalInventoryItem(item) {
  try {
    const db = getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO local_inventory 
       (id, venue_id, item_id, name, quantity, unit, cost_price, retail_price, location, sku, last_counted_at, counted_by, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.venue_id,
        item.item_id,
        item.name,
        item.quantity,
        item.unit,
        item.cost_price,
        item.retail_price,
        item.location,
        item.sku,
        item.last_counted_at || new Date().toISOString(),
        item.counted_by,
        item.sync_status || "local",
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  } catch (error) {
    console.error("Failed to save local inventory item:", error);
    throw error;
  }
}

export async function getLocalInventory(venueId) {
  try {
    const db = getDB();
    const result = await db.getAllAsync(
      `SELECT * FROM local_inventory WHERE venue_id = ? ORDER BY name ASC`,
      [venueId]
    );
    return result || [];
  } catch (error) {
    console.error("Failed to get local inventory:", error);
    return [];
  }
}

export async function queueSyncAction(entityType, entityId, action, data) {
  try {
    const db = getDB();
    await db.runAsync(
      `INSERT INTO sync_queue (entity_type, entity_id, action, data, sync_status)
       VALUES (?, ?, ?, ?, ?)`,
      [entityType, entityId, action, JSON.stringify(data), "pending"]
    );
  } catch (error) {
    console.error("Failed to queue sync action:", error);
    throw error;
  }
}

export async function getPendingSyncItems() {
  try {
    const db = getDB();
    const result = await db.getAllAsync(
      `SELECT * FROM sync_queue WHERE sync_status = 'pending' ORDER BY created_at ASC`
    );
    return result || [];
  } catch (error) {
    console.error("Failed to get pending sync items:", error);
    return [];
  }
}

export async function markSyncItemAsCompleted(syncId) {
  try {
    const db = getDB();
    await db.runAsync(
      `UPDATE sync_queue SET sync_status = ?, synced_at = ? WHERE id = ?`,
      ["synced", new Date().toISOString(), syncId]
    );
  } catch (error) {
    console.error("Failed to mark sync item as completed:", error);
    throw error;
  }
}

export async function addOfflineCount(count) {
  try {
    const db = getDB();
    const countId = `${count.venue_id}-${count.item_id}-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO offline_counts (id, venue_id, item_id, counted_quantity, counted_by, photo_path, notes, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        countId,
        count.venue_id,
        count.item_id,
        count.counted_quantity,
        count.counted_by,
        count.photo_path || null,
        count.notes || null,
        0,
      ]
    );
    return countId;
  } catch (error) {
    console.error("Failed to add offline count:", error);
    throw error;
  }
}

export async function getUnsyncedCounts() {
  try {
    const db = getDB();
    const result = await db.getAllAsync(
      `SELECT * FROM offline_counts WHERE synced = 0 ORDER BY count_timestamp DESC`
    );
    return result || [];
  } catch (error) {
    console.error("Failed to get unsynced counts:", error);
    return [];
  }
}

export async function markCountAsSynced(countId) {
  try {
    const db = getDB();
    await db.runAsync(
      `UPDATE offline_counts SET synced = 1 WHERE id = ?`,
      [countId]
    );
  } catch (error) {
    console.error("Failed to mark count as synced:", error);
    throw error;
  }
}

export async function clearOldSyncedItems(daysOld = 7) {
  try {
    const db = getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await db.runAsync(
      `DELETE FROM sync_queue WHERE sync_status = 'synced' AND synced_at < ?`,
      [cutoffDate.toISOString()]
    );
  } catch (error) {
    console.error("Failed to clear old synced items:", error);
    throw error;
  }
}

export async function clearDB() {
  try {
    const db = getDB();
    await db.execAsync(`
      DROP TABLE IF EXISTS inventory;
      DROP TABLE IF EXISTS saved_pairings;
      DROP TABLE IF EXISTS training_progress;
      DROP TABLE IF EXISTS sync_queue;
      DROP TABLE IF EXISTS local_inventory;
      DROP TABLE IF EXISTS local_transfers;
      DROP TABLE IF EXISTS offline_counts;
    `);
    console.log("Database cleared");
  } catch (error) {
    console.error("Failed to clear database:", error);
    throw error;
  }
}
