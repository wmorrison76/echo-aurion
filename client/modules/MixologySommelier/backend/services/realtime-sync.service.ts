import { query } from "../db/client";
import EventBroadcaster from "./event-broadcaster.service";
interface SyncOperation {
  operation_id: string;
  venue_id: string;
  sync_type: "inventory_pull" | "inventory_push" | "pricing_sync" | "menu_sync";
  status: "pending" | "in_progress" | "completed" | "failed";
  started_at: Date;
  completed_at?: Date;
  items_processed: number;
  error_message?: string;
}
interface VenueInventorySnapshot {
  venue_id: string;
  item_id: string;
  current_qty: number;
  timestamp: Date;
}
class RealtimeSyncService {
  private activeSyncs = new Map<string, SyncOperation>();
  async initiateSyncOperation(
    venue_id: string,
    sync_type:
      | "inventory_pull"
      | "inventory_push"
      | "pricing_sync"
      | "menu_sync",
  ): Promise<string> {
    const operation_id = `${sync_type}:${venue_id}:${Date.now()}`;
    const operation: SyncOperation = {
      operation_id,
      venue_id,
      sync_type,
      status: "pending",
      started_at: new Date(),
      items_processed: 0,
    };
    this.activeSyncs.set(operation_id, operation);
    EventBroadcaster.emitSyncEvent(venue_id, sync_type, {
      status: "started",
      items_synced: 0,
      duration_ms: 0,
    });
    return operation_id;
  }
  async executeSyncOperation(operation_id: string): Promise<SyncOperation> {
    const operation = this.activeSyncs.get(operation_id);
    if (!operation) {
      throw new Error(`Sync operation ${operation_id} not found`);
    }
    operation.status = "in_progress";
    try {
      switch (operation.sync_type) {
        case "inventory_pull":
          operation.items_processed = await this.syncInventoryFromPOS(
            operation.venue_id,
          );
          break;
        case "inventory_push":
          operation.items_processed = await this.pushInventoryToPOS(
            operation.venue_id,
          );
          break;
        case "pricing_sync":
          operation.items_processed = await this.syncPricingUpdates(
            operation.venue_id,
          );
          break;
        case "menu_sync":
          operation.items_processed = await this.syncMenuItems(
            operation.venue_id,
          );
          break;
      }
      operation.status = "completed";
      operation.completed_at = new Date();
      const duration =
        operation.completed_at.getTime() - operation.started_at.getTime();
      EventBroadcaster.emitSyncEvent(operation.venue_id, operation.sync_type, {
        status: "completed",
        items_synced: operation.items_processed,
        duration_ms: duration,
      });
    } catch (error) {
      operation.status = "failed";
      operation.error_message =
        error instanceof Error ? error.message : "Unknown error occurred";
      operation.completed_at = new Date();
      const duration =
        operation.completed_at.getTime() - operation.started_at.getTime();
      EventBroadcaster.emitSyncEvent(operation.venue_id, operation.sync_type, {
        status: "failed",
        items_synced: operation.items_processed,
        duration_ms: duration,
        error: operation.error_message,
      });
      throw error;
    }
    return operation;
  }
  private async syncInventoryFromPOS(venue_id: string): Promise<number> {
    try {
      const config = await query(
        `SELECT * FROM pos_config WHERE venue_id = $1`,
        [venue_id],
      );
      if (config.rows.length === 0) {
        throw new Error("No POS configuration found");
      }
      const posConfig = config.rows[0];
      let processedItems = 0;
      const recentTransactions = await query(
        ` SELECT DISTINCT item_id, SUM(qty_sold) as total_sold FROM pos_transactions WHERE venue_id = $1 AND transaction_date >= NOW() - INTERVAL '1 hour' GROUP BY item_id `,
        [venue_id],
      );
      for (const transaction of recentTransactions.rows) {
        const inventoryResult = await query(
          ` UPDATE liquor_inventory SET current_qty = current_qty - $1, last_sync_at = NOW() WHERE id = $2 AND venue_id = $3 RETURNING * `,
          [transaction.total_sold, transaction.item_id, venue_id],
        );
        if (inventoryResult.rows.length > 0) {
          processedItems++;
          const updatedItem = inventoryResult.rows[0];
          if (updatedItem.current_qty < updatedItem.reorder_level) {
            EventBroadcaster.emitAlert(venue_id, "low_stock", {
              item_id: transaction.item_id,
              current_qty: updatedItem.current_qty,
              reorder_level: updatedItem.reorder_level,
            });
          }
        }
      }
      return processedItems;
    } catch (error) {
      console.error("Error syncing inventory from POS:", error);
      throw error;
    }
  }
  private async pushInventoryToPOS(venue_id: string): Promise<number> {
    try {
      const inventoryItems = await query(
        ` SELECT id, name, current_qty, api_sku FROM liquor_inventory WHERE venue_id = $1 AND api_sku IS NOT NULL `,
        [venue_id],
      );
      let processedItems = 0;
      for (const item of inventoryItems.rows) {
        try {
          await this.pushItemToPOS(venue_id, item);
          processedItems++;
        } catch (error) {
          console.error(`Error pushing item ${item.id} to POS:`, error);
        }
      }
      return processedItems;
    } catch (error) {
      console.error("Error pushing inventory to POS:", error);
      throw error;
    }
  }
  private async pushItemToPOS(venue_id: string, item: any): Promise<void> {
    const config = await query(`SELECT * FROM pos_config WHERE venue_id = $1`, [
      venue_id,
    ]);
    if (config.rows.length === 0) {
      throw new Error("No POS configuration found");
    }
    const posConfig = config.rows[0];
    const payload = {
      sku: item.api_sku,
      quantity: item.current_qty,
      timestamp: new Date().toISOString(),
    };
    console.log(
      `Pushing item ${item.id} to ${posConfig.pos_type} POS:`,
      payload,
    );
  }
  private async syncPricingUpdates(venue_id: string): Promise<number> {
    try {
      const pricingRules = await query(
        ` SELECT id, item_id, base_price, dynamic_price FROM dynamic_pricing_rules WHERE venue_id = $1 AND active = true LIMIT 100 `,
        [venue_id],
      );
      let processedItems = 0;
      for (const rule of pricingRules.rows) {
        await query(
          ` UPDATE liquor_inventory SET current_price = $1, last_price_update = NOW() WHERE id = $2 AND venue_id = $3 `,
          [rule.dynamic_price, rule.item_id, venue_id],
        );
        processedItems++;
        EventBroadcaster.emitPricingEvent(venue_id, rule.item_id, {
          previous_price: rule.base_price,
          new_price: rule.dynamic_price,
          adjustment_reason: "Dynamic pricing update",
        });
      }
      return processedItems;
    } catch (error) {
      console.error("Error syncing pricing updates:", error);
      throw error;
    }
  }
  private async syncMenuItems(venue_id: string): Promise<number> {
    try {
      const menuItems = await query(
        ` SELECT id, name, description, category, current_price FROM liquor_inventory WHERE venue_id = $1 `,
        [venue_id],
      );
      console.log(
        `Syncing menu items for venue ${venue_id}: ${menuItems.rows.length} items`,
      );
      return menuItems.rows.length;
    } catch (error) {
      console.error("Error syncing menu items:", error);
      throw error;
    }
  }
  async getSyncStatus(operation_id: string): Promise<SyncOperation | null> {
    return this.activeSyncs.get(operation_id) || null;
  }
  async getVenueInventorySnapshot(
    venue_id: string,
  ): Promise<VenueInventorySnapshot[]> {
    try {
      const result = await query(
        ` SELECT venue_id, id as item_id, current_qty, last_sync_at as timestamp FROM liquor_inventory WHERE venue_id = $1 ORDER BY last_sync_at DESC `,
        [venue_id],
      );
      return result.rows.map((row) => ({
        venue_id: row.venue_id,
        item_id: row.item_id,
        current_qty: parseFloat(row.current_qty),
        timestamp: new Date(row.timestamp),
      }));
    } catch (error) {
      console.error("Error getting inventory snapshot:", error);
      return [];
    }
  }
  getActiveSyncOperations(): SyncOperation[] {
    return Array.from(this.activeSyncs.values()).filter(
      (op) => op.status === "in_progress",
    );
  }
  getSyncOperationHistory(limit: number = 50): SyncOperation[] {
    return Array.from(this.activeSyncs.values()).slice(-limit);
  }
  cleanupCompletedOperations(maxAgeMs: number = 3600000): number {
    let removed = 0;
    const now = Date.now();
    for (const [opId, operation] of this.activeSyncs) {
      if (
        operation.status !== "in_progress" &&
        operation.completed_at &&
        now - operation.completed_at.getTime() > maxAgeMs
      ) {
        this.activeSyncs.delete(opId);
        removed++;
      }
    }
    return removed;
  }
}
export default new RealtimeSyncService();
