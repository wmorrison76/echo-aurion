import * as SQLite from "expo-sqlite";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

export class SyncEngine {
  constructor(dbName = "inventory.db") {
    this.db = null;
    this.dbName = dbName;
    this.isOnline = true;
    this.syncQueue = [];
    this.lastSyncTime = null;
  }

  async initialize() {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.createSyncTables();
      this.loadLastSyncTime();
      this.setupNetworkListener();
    } catch (error) {
      console.error("Failed to initialize sync engine:", error);
    }
  }

  async createSyncTables() {
    await this.db.execAsync(`
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

      CREATE TABLE IF NOT EXISTS last_sync (
        entity_type TEXT PRIMARY KEY,
        last_synced_at DATETIME
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
  }

  async queueAction(entityType, entityId, action, data) {
    try {
      await this.db.runAsync(
        `INSERT INTO sync_queue (entity_type, entity_id, action, data, sync_status)
         VALUES (?, ?, ?, ?, ?)`,
        [entityType, entityId, action, JSON.stringify(data), "pending"]
      );
    } catch (error) {
      console.error("Failed to queue action:", error);
    }
  }

  async saveInventoryLocally(inventory) {
    try {
      const placeholders = inventory
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(",");

      const flatData = inventory.flatMap((item) => [
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
        item.last_counted_at,
        item.counted_by,
        "synced",
        new Date().toISOString(),
        new Date().toISOString(),
      ]);

      await this.db.runAsync(
        `INSERT OR REPLACE INTO local_inventory 
         (id, venue_id, item_id, name, quantity, unit, cost_price, retail_price, location, sku, last_counted_at, counted_by, sync_status, created_at, updated_at)
         VALUES ${placeholders}`,
        flatData
      );
    } catch (error) {
      console.error("Failed to save inventory locally:", error);
    }
  }

  async addCount(venueId, itemId, quantity, countedBy, photoPath, notes) {
    try {
      const countId = `${venueId}-${itemId}-${Date.now()}`;
      await this.db.runAsync(
        `INSERT INTO offline_counts (id, venue_id, item_id, counted_quantity, counted_by, photo_path, notes, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [countId, venueId, itemId, quantity, countedBy, photoPath, notes, 0]
      );

      await this.queueAction("inventory_count", countId, "create", {
        venue_id: venueId,
        item_id: itemId,
        quantity,
        counted_by: countedBy,
        photo_path: photoPath,
        notes,
      });

      return countId;
    } catch (error) {
      console.error("Failed to add count:", error);
    }
  }

  async getLocalInventory(venueId) {
    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM local_inventory WHERE venue_id = ? ORDER BY name ASC`,
        [venueId]
      );
      return result || [];
    } catch (error) {
      console.error("Failed to get local inventory:", error);
      return [];
    }
  }

  async getPendingSyncItems() {
    try {
      const result = await this.db.getAllAsync(
        `SELECT * FROM sync_queue WHERE sync_status = 'pending' ORDER BY created_at ASC`
      );
      return result || [];
    } catch (error) {
      console.error("Failed to get pending sync items:", error);
      return [];
    }
  }

  async syncPendingChanges() {
    if (!this.isOnline) {
      console.log("Offline - cannot sync");
      return { synced: 0, failed: 0 };
    }

    try {
      const pendingItems = await this.getPendingSyncItems();
      let synced = 0;
      let failed = 0;

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          synced++;
        } catch (error) {
          console.error(
            `Failed to sync ${item.entity_type}:${item.entity_id}:`,
            error
          );
          failed++;
        }
      }

      await this.updateLastSyncTime();
      return { synced, failed };
    } catch (error) {
      console.error("Sync failed:", error);
      return { synced: 0, failed: 1 };
    }
  }

  async syncItem(item) {
    const endpoint = this.getEndpointForEntityType(item.entity_type);
    const config = { headers: { "Content-Type": "application/json" } };
    let response;

    switch (item.action.toLowerCase()) {
      case "create":
        response = await axios.post(
          `${API_BASE_URL}${endpoint}`,
          JSON.parse(item.data),
          config
        );
        break;
      case "update":
        response = await axios.patch(
          `${API_BASE_URL}${endpoint}/${item.entity_id}`,
          JSON.parse(item.data),
          config
        );
        break;
      case "delete":
        response = await axios.delete(
          `${API_BASE_URL}${endpoint}/${item.entity_id}`,
          config
        );
        break;
      default:
        throw new Error(`Unknown action: ${item.action}`);
    }

    await this.db.runAsync(
      `UPDATE sync_queue SET sync_status = ?, synced_at = ? WHERE id = ?`,
      ["synced", new Date().toISOString(), item.id]
    );

    return response.data;
  }

  getEndpointForEntityType(entityType) {
    const endpoints = {
      inventory_count: "/variance-audit/counts",
      transfer_request: "/transfers",
      comped_drink: "/comped-drinks",
      variance_audit: "/variance-audit/audit",
    };
    return endpoints[entityType] || "/inventory";
  }

  async updateLastSyncTime() {
    const now = new Date().toISOString();
    this.lastSyncTime = now;
    await AsyncStorage.setItem("lastSyncTime", now);
  }

  async loadLastSyncTime() {
    const time = await AsyncStorage.getItem("lastSyncTime");
    this.lastSyncTime = time || null;
  }

  setupNetworkListener() {
    // In a real app, use @react-native-community/netinfo
    setInterval(() => {
      axios
        .head(`${API_BASE_URL}/health`, { timeout: 5000 })
        .then(() => {
          if (!this.isOnline) {
            this.isOnline = true;
            this.syncPendingChanges();
          }
        })
        .catch(() => {
          this.isOnline = false;
        });
    }, 30000);
  }

  async clearOldSyncedItems(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await this.db.runAsync(
        `DELETE FROM sync_queue WHERE sync_status = 'synced' AND synced_at < ?`,
        [cutoffDate.toISOString()]
      );
    } catch (error) {
      console.error("Failed to clear old sync items:", error);
    }
  }
}

export default SyncEngine;
