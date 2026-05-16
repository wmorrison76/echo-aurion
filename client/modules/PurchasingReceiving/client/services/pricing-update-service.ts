/**
 * Pricing Update Service
 *
 * Automatically updates inventory item pricing based on:
 * - Invoice purchase dates and prices
 * - Supplier API pricing updates
 * - Manual price corrections
 *
 * Features:
 * - Price history tracking
 * - Price change alerts
 * - Automatic inventory updates
 * - Cost analysis integration
 */

import {
  supplierAPIService,
  SupplierPricingUpdate,
} from "./supplier-api-integration";
import type { StandardizedLineItem } from "@shared/api";

export interface PriceUpdate {
  inventoryItemId: string;
  supplierId: string;
  sku?: string;
  oldPrice: number;
  newPrice: number;
  effectiveDate: string;
  source: "invoice" | "supplier_api" | "manual";
  invoiceId?: string;
  invoiceNumber?: string;
  confidence: number;
}

export interface PriceChangeAlert {
  inventoryItemId: string;
  itemName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  severity: "info" | "warning" | "critical";
  message: string;
}

class PricingUpdateService {
  private priceHistory: Map<
    string,
    Array<{ date: string; price: number; source: string }>
  > = new Map();
  private alerts: PriceChangeAlert[] = [];
  private alertThresholds = {
    warning: 0.05, // 5% change
    critical: 0.1, // 10% change
  };

  /**
   * Update pricing from invoice line items
   */
  async updateFromInvoice(
    invoiceId: string,
    invoiceNumber: string,
    invoiceDate: string,
    lineItems: StandardizedLineItem[],
    supplierId?: string,
  ): Promise<PriceUpdate[]> {
    const updates: PriceUpdate[] = [];

    console.log(
      `[PricingUpdate] Processing invoice ${invoiceNumber} with ${lineItems.length} items`,
    );

    for (const item of lineItems) {
      // Find matching inventory item
      const inventoryItemId = await this.findInventoryItem(
        item.productName,
        item.vendor,
        item.standardized,
      );

      if (!inventoryItemId) {
        console.warn(
          `[PricingUpdate] No inventory item found for: ${item.productName}`,
        );
        continue;
      }

      // Calculate price per standard unit
      const pricePerUnit = item.costPerStandardUnit || 0;
      if (pricePerUnit <= 0) {
        continue;
      }

      // Get current price
      const currentPrice = await this.getCurrentPrice(inventoryItemId);

      // Create price update
      const update: PriceUpdate = {
        inventoryItemId,
        supplierId: supplierId || item.vendor,
        sku: item.standardized?.sku,
        oldPrice: currentPrice,
        newPrice: pricePerUnit,
        effectiveDate: invoiceDate,
        source: "invoice",
        invoiceId,
        invoiceNumber,
        confidence: 0.95, // High confidence from actual invoice
      };

      // Apply update
      await this.applyPriceUpdate(update);
      updates.push(update);

      // Check for significant price changes
      if (currentPrice > 0) {
        const changePercent = Math.abs(
          (newPrice - currentPrice) / currentPrice,
        );
        if (changePercent >= this.alertThresholds.warning) {
          this.createPriceAlert(update, changePercent);
        }
      }
    }

    console.log(`[PricingUpdate] Updated ${updates.length} items from invoice`);
    return updates;
  }

  /**
   * Update pricing from supplier API
   */
  async updateFromSupplierAPI(
    update: SupplierPricingUpdate,
  ): Promise<PriceUpdate[]> {
    const updates: PriceUpdate[] = [];

    console.log(
      `[PricingUpdate] Processing supplier API update: ${update.items.length} items`,
    );

    for (const item of update.items) {
      // Find inventory items by SKU
      const inventoryItemId = await this.findInventoryItemBySKU(
        update.supplierId,
        item.sku,
      );

      if (!inventoryItemId) {
        console.warn(
          `[PricingUpdate] No inventory item found for SKU: ${item.sku}`,
        );
        continue;
      }

      const currentPrice = await this.getCurrentPrice(inventoryItemId);

      const priceUpdate: PriceUpdate = {
        inventoryItemId,
        supplierId: update.supplierId,
        sku: item.sku,
        oldPrice: currentPrice,
        newPrice: item.price,
        effectiveDate: item.effectiveDate,
        source: "supplier_api",
        confidence: 0.9, // High confidence from supplier API
      };

      await this.applyPriceUpdate(priceUpdate);
      updates.push(priceUpdate);

      if (currentPrice > 0) {
        const changePercent = Math.abs(
          (item.price - currentPrice) / currentPrice,
        );
        if (changePercent >= this.alertThresholds.warning) {
          this.createPriceAlert(priceUpdate, changePercent);
        }
      }
    }

    // Also update supplier API service
    await supplierAPIService.updatePricing(update);

    return updates;
  }

  /**
   * Get current price for an inventory item
   */
  async getCurrentPrice(inventoryItemId: string): Promise<number> {
    // This would query the inventory system
    // For now, check price history
    const history = this.priceHistory.get(inventoryItemId);
    if (history && history.length > 0) {
      // Return most recent price
      const sorted = history.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return sorted[0].price;
    }

    // Fallback: query inventory system
    // In production, this would be:
    // const item = await inventoryService.getItem(inventoryItemId);
    // return item?.costPerUnit || 0;

    return 0;
  }

  /**
   * Get price history for an item
   */
  getPriceHistory(
    inventoryItemId: string,
  ): Array<{ date: string; price: number; source: string }> {
    return this.priceHistory.get(inventoryItemId) || [];
  }

  /**
   * Get price alerts
   */
  getAlerts(): PriceChangeAlert[] {
    return this.alerts;
  }

  /**
   * Clear old alerts (older than 30 days)
   */
  clearOldAlerts(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.alerts = this.alerts.filter((alert) => {
      // Alerts don't have dates in this implementation
      // In production, would filter by date
      return true;
    });
  }

  /**
   * Private methods
   */

  private async findInventoryItem(
    productName: string,
    vendor: string,
    standardized?: any,
  ): Promise<string | null> {
    // This would query the inventory system to find matching item
    // For now, return mock ID
    // In production:
    // const items = await inventoryService.searchItems({
    //   name: productName,
    //   vendor: vendor,
    //   category: standardized?.category,
    // });
    // return items[0]?.id || null;

    return `inv_${productName.toLowerCase().replace(/\s+/g, "_")}`;
  }

  private async findInventoryItemBySKU(
    supplierId: string,
    sku: string,
  ): Promise<string | null> {
    // Find inventory item by supplier SKU
    // In production:
    // const items = await inventoryService.searchItems({
    //   supplierId: supplierId,
    //   sku: sku,
    // });
    // return items[0]?.id || null;

    return `inv_${sku}`;
  }

  private async applyPriceUpdate(update: PriceUpdate): Promise<void> {
    // Store in price history
    const history = this.priceHistory.get(update.inventoryItemId) || [];
    history.push({
      date: update.effectiveDate,
      price: update.newPrice,
      source: update.source,
    });

    // Keep last 2 years of history
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const filtered = history.filter((h) => new Date(h.date) >= twoYearsAgo);
    this.priceHistory.set(update.inventoryItemId, filtered);

    // Update inventory system
    await this.updateInventoryPrice(update);

    // Dispatch event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("inventory-price-updated", {
          detail: update,
        }),
      );
    }
  }

  private async updateInventoryPrice(update: PriceUpdate): Promise<void> {
    // Update inventory item price
    // In production:
    // await inventoryService.updateItem(update.inventoryItemId, {
    //   costPerUnit: update.newPrice,
    //   lastPriceUpdate: update.effectiveDate,
    //   priceSource: update.source,
    // });

    console.log(
      `[PricingUpdate] Updated inventory item ${update.inventoryItemId}: $${update.oldPrice} → $${update.newPrice}`,
    );
  }

  private createPriceAlert(update: PriceUpdate, changePercent: number): void {
    const severity =
      changePercent >= this.alertThresholds.critical
        ? "critical"
        : changePercent >= this.alertThresholds.warning
          ? "warning"
          : "info";

    const isIncrease = update.newPrice > update.oldPrice;
    const message = `Price ${isIncrease ? "increased" : "decreased"} by ${(changePercent * 100).toFixed(1)}%`;

    const alert: PriceChangeAlert = {
      inventoryItemId: update.inventoryItemId,
      itemName: update.inventoryItemId, // Would get actual name from inventory
      oldPrice: update.oldPrice,
      newPrice: update.newPrice,
      changePercent,
      severity,
      message,
    };

    this.alerts.push(alert);

    // Dispatch alert event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("price-change-alert", {
          detail: alert,
        }),
      );
    }
  }
}

export const pricingUpdateService = new PricingUpdateService();
