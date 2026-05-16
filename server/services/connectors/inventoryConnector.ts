/**
 * Inventory Connector
 * Syncs inventory data from MarginEdge and calculates GL impact
 */

import { logger } from "../../lib/logger";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  glAccount: string;
  lastCountDate: Date;
  location: string;
}

export interface InventoryVariance {
  itemId: string;
  itemName: string;
  expectedQuantity: number;
  actualQuantity: number;
  varianceQuantity: number;
  expectedValue: number;
  actualValue: number;
  varianceValue: number;
  variancePercent: number;
  glImpact: {
    accountId: string;
    debit: number;
    credit: number;
  };
}

export class InventoryConnector {
  private static readonly MARGIN_EDGE_API =
    process.env.MARGIN_EDGE_API_URL || "https://api.marginedge.com";
  private static readonly API_KEY = process.env.MARGIN_EDGE_API_KEY || "";

  /**
   * Sync inventory from MarginEdge
   */
  static async syncInventory(entityId: string): Promise<InventoryItem[]> {
    try {
      logger.info("[InventoryConnector] Syncing from MarginEdge", { entityId });

      // In production: const response = await fetch(`${this.MARGIN_EDGE_API}/inventory`, {
      //   headers: { 'Authorization': `Bearer ${this.API_KEY}` }
      // });

      // Mock data for demonstration
      const mockInventory: InventoryItem[] = [
        {
          id: "inv-001",
          name: "Premium Beef - Per LB",
          sku: "BEEF-PREM",
          quantity: 45,
          unitCost: 8.5,
          glAccount: "1150",
          lastCountDate: new Date(),
          location: "Walk-in Cooler A",
        },
        {
          id: "inv-002",
          name: "Organic Vegetables",
          sku: "VEG-ORG",
          quantity: 120,
          unitCost: 2.25,
          glAccount: "1150",
          lastCountDate: new Date(),
          location: "Produce Storage",
        },
        {
          id: "inv-003",
          name: "Premium Wine - Case",
          sku: "WINE-PREM-CASE",
          quantity: 12,
          unitCost: 95.0,
          glAccount: "1160",
          lastCountDate: new Date(),
          location: "Wine Cellar",
        },
      ];

      logger.info("[InventoryConnector] Sync complete", {
        entityId,
        itemCount: mockInventory.length,
        totalValue: mockInventory.reduce(
          (sum, i) => sum + i.quantity * i.unitCost,
          0,
        ),
      });

      return mockInventory;
    } catch (error) {
      logger.error("[InventoryConnector] Sync failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate inventory variance and GL impact
   */
  static async calculateVariance(
    entityId: string,
    expectedInventory: InventoryItem[],
    actualInventory: InventoryItem[],
  ): Promise<InventoryVariance[]> {
    const variances: InventoryVariance[] = [];

    for (const expected of expectedInventory) {
      const actual = actualInventory.find((a) => a.id === expected.id);

      if (!actual) {
        logger.warn("[InventoryConnector] Item not found in actual count", {
          itemId: expected.id,
          itemName: expected.name,
        });
        continue;
      }

      const quantityVariance = actual.quantity - expected.quantity;
      const valueVariance = quantityVariance * actual.unitCost;
      const percentVariance =
        expected.quantity > 0
          ? (quantityVariance / expected.quantity) * 100
          : 0;

      const variance: InventoryVariance = {
        itemId: expected.id,
        itemName: expected.name,
        expectedQuantity: expected.quantity,
        actualQuantity: actual.quantity,
        varianceQuantity: quantityVariance,
        expectedValue: expected.quantity * expected.unitCost,
        actualValue: actual.quantity * actual.unitCost,
        varianceValue: valueVariance,
        variancePercent: percentVariance,
        glImpact: {
          accountId: expected.glAccount,
          debit: Math.max(0, -valueVariance), // Shrinkage (loss)
          credit: Math.max(0, valueVariance), // Gain
        },
      };

      variances.push(variance);
    }

    // Filter to only items with variance
    const significantVariances = variances.filter(
      (v) => v.varianceQuantity !== 0,
    );

    logger.info("[InventoryConnector] Variance calculation complete", {
      entityId,
      totalItems: expectedInventory.length,
      varianceCount: significantVariances.length,
      totalVarianceValue: significantVariances.reduce(
        (sum, v) => sum + Math.abs(v.varianceValue),
        0,
      ),
    });

    return significantVariances;
  }

  /**
   * Create GL entries for inventory variances
   */
  static async createVarianceEntries(
    entityId: string,
    variances: InventoryVariance[],
  ): Promise<string[]> {
    const entryIds: string[] = [];

    for (const variance of variances) {
      try {
        // Create journal entry
        const entryId = `inv-var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Entry structure:
        // If actual < expected (shrinkage): Debit Shrinkage Expense, Credit Inventory
        // If actual > expected (gain): Debit Inventory, Credit Shrinkage Gain

        logger.info("[InventoryConnector] Variance entry created", {
          entryId,
          itemId: variance.itemId,
          varianceValue: variance.varianceValue,
          glAccount: variance.glImpact.accountId,
        });

        entryIds.push(entryId);
      } catch (error) {
        logger.error("[InventoryConnector] Failed to create variance entry", {
          itemId: variance.itemId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return entryIds;
  }

  /**
   * Get inventory summary for entity
   */
  static async getInventorySummary(entityId: string): Promise<any> {
    try {
      const inventory = await this.syncInventory(entityId);

      const summary = {
        totalItems: inventory.length,
        totalValue: inventory.reduce(
          (sum, i) => sum + i.quantity * i.unitCost,
          0,
        ),
        byCategory: {
          produce: inventory
            .filter((i) => i.glAccount === "1150")
            .reduce((sum, i) => sum + i.quantity * i.unitCost, 0),
          beverage: inventory
            .filter((i) => i.glAccount === "1160")
            .reduce((sum, i) => sum + i.quantity * i.unitCost, 0),
          other: inventory
            .filter((i) => !["1150", "1160"].includes(i.glAccount))
            .reduce((sum, i) => sum + i.quantity * i.unitCost, 0),
        },
        lastSyncDate: new Date(),
      };

      return summary;
    } catch (error) {
      logger.error("[InventoryConnector] Summary failed", {
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
