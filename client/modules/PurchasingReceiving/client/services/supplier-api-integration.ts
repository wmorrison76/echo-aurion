/**
 * Supplier API Integration Service
 *
 * Provides unified interface for integrating with major supplier APIs:
 * - Sysco
 * - US Foods
 * - Gordon Food Service (GFS)
 * - Restaurant Depot
 * - Performance Food Group (PFG)
 *
 * Features:
 * - Catalog synchronization
 * - Pricing updates
 * - Nutritional data import
 * - Order placement
 * - Inventory synchronization
 */

export interface SupplierAPI {
  id: string;
  name: string;
  apiEndpoint: string;
  authType: "oauth2" | "api_key" | "basic";
  authConfig: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    tokenUrl?: string;
  };
  capabilities: {
    pricing: boolean;
    catalog: boolean;
    nutritional: boolean;
    ordering: boolean;
    inventory: boolean;
  };
  syncFrequency: "daily" | "weekly" | "monthly" | "manual";
  lastSync?: string;
  status: "active" | "inactive" | "error";
}

export interface SupplierCatalogItem {
  sku: string;
  name: string;
  description?: string;
  unit: string;
  packSize?: string;
  price: number;
  priceDate: string;
  currency: string;
  nutritional?: NutritionalData;
  barcode?: string;
  gtin?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  imageUrl?: string;
  availability?: "in_stock" | "out_of_stock" | "limited";
  leadTimeDays?: number;
  minOrderQty?: number;
  caseSize?: number;
}

export interface NutritionalData {
  calories?: number;
  totalFat?: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  totalCarbohydrates?: number;
  dietaryFiber?: number;
  sugars?: number;
  protein?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  servingSize?: string;
  servingsPerContainer?: number;
  allergens?: string[];
  ingredients?: string[];
}

export interface SupplierPricingUpdate {
  supplierId: string;
  items: Array<{
    sku: string;
    price: number;
    effectiveDate: string;
    currency?: string;
  }>;
  source: "api" | "invoice" | "manual";
}

export interface SupplierOrderRequest {
  supplierId: string;
  items: Array<{
    sku: string;
    quantity: number;
    unit?: string;
  }>;
  deliveryDate?: string;
  notes?: string;
}

export interface SupplierOrderResponse {
  orderId: string;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  estimatedDelivery?: string;
  trackingNumber?: string;
  items: Array<{
    sku: string;
    quantity: number;
    status: "confirmed" | "backordered" | "cancelled";
  }>;
}

class SupplierAPIService {
  private suppliers: Map<string, SupplierAPI> = new Map();
  private catalogCache: Map<string, SupplierCatalogItem[]> = new Map();
  private pricingHistory: Map<string, Array<{ date: string; price: number }>> =
    new Map();

  /**
   * Register a supplier API configuration
   */
  registerSupplier(supplier: SupplierAPI): void {
    this.suppliers.set(supplier.id, supplier);
    console.log(
      `[SupplierAPI] Registered supplier: ${supplier.name} (${supplier.id})`,
    );
  }

  /**
   * Get all registered suppliers
   */
  getSuppliers(): SupplierAPI[] {
    return Array.from(this.suppliers.values());
  }

  /**
   * Get supplier by ID
   */
  getSupplier(supplierId: string): SupplierAPI | undefined {
    return this.suppliers.get(supplierId);
  }

  /**
   * Sync catalog from supplier API
   */
  async syncCatalog(supplierId: string): Promise<SupplierCatalogItem[]> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${supplierId} not found`);
    }

    if (!supplier.capabilities.catalog) {
      throw new Error(`Supplier ${supplierId} does not support catalog sync`);
    }

    try {
      console.log(`[SupplierAPI] Syncing catalog for ${supplier.name}...`);

      // Authenticate
      const token = await this.authenticate(supplier);

      // Fetch catalog (implementation varies by supplier)
      const catalog = await this.fetchCatalog(supplier, token);

      // Cache catalog
      this.catalogCache.set(supplierId, catalog);

      // Update last sync time
      supplier.lastSync = new Date().toISOString();
      supplier.status = "active";

      console.log(
        `[SupplierAPI] Catalog sync complete: ${catalog.length} items`,
      );
      return catalog;
    } catch (error) {
      console.error(
        `[SupplierAPI] Catalog sync failed for ${supplier.name}:`,
        error,
      );
      supplier.status = "error";
      throw error;
    }
  }

  /**
   * Get catalog items for a supplier
   */
  getCatalog(supplierId: string): SupplierCatalogItem[] {
    return this.catalogCache.get(supplierId) || [];
  }

  /**
   * Search catalog by name, SKU, or barcode
   */
  searchCatalog(supplierId: string, query: string): SupplierCatalogItem[] {
    const catalog = this.getCatalog(supplierId);
    const lowerQuery = query.toLowerCase();

    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.sku.toLowerCase().includes(lowerQuery) ||
        item.barcode?.toLowerCase().includes(lowerQuery) ||
        item.gtin?.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Update pricing from supplier API or invoice
   */
  async updatePricing(update: SupplierPricingUpdate): Promise<void> {
    const supplier = this.suppliers.get(update.supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${update.supplierId} not found`);
    }

    console.log(
      `[SupplierAPI] Updating pricing for ${supplier.name}: ${update.items.length} items`,
    );

    // Store pricing history
    for (const item of update.items) {
      const key = `${update.supplierId}:${item.sku}`;
      const history = this.pricingHistory.get(key) || [];
      history.push({
        date: item.effectiveDate,
        price: item.price,
      });
      // Keep last 365 days of history
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const filtered = history.filter((h) => new Date(h.date) >= oneYearAgo);
      this.pricingHistory.set(key, filtered);
    }

    // Update catalog cache if item exists
    const catalog = this.catalogCache.get(update.supplierId) || [];
    for (const item of update.items) {
      const catalogItem = catalog.find((c) => c.sku === item.sku);
      if (catalogItem) {
        catalogItem.price = item.price;
        catalogItem.priceDate = item.effectiveDate;
      }
    }

    // Notify inventory system of price changes
    await this.notifyInventoryPriceUpdate(update);
  }

  /**
   * Get pricing history for an item
   */
  getPricingHistory(
    supplierId: string,
    sku: string,
  ): Array<{ date: string; price: number }> {
    const key = `${supplierId}:${sku}`;
    return this.pricingHistory.get(key) || [];
  }

  /**
   * Place order with supplier
   */
  async placeOrder(
    request: SupplierOrderRequest,
  ): Promise<SupplierOrderResponse> {
    const supplier = this.suppliers.get(request.supplierId);
    if (!supplier) {
      throw new Error(`Supplier ${request.supplierId} not found`);
    }

    if (!supplier.capabilities.ordering) {
      throw new Error(`Supplier ${supplier.name} does not support ordering`);
    }

    try {
      console.log(`[SupplierAPI] Placing order with ${supplier.name}...`);

      const token = await this.authenticate(supplier);
      const response = await this.submitOrder(supplier, token, request);

      console.log(`[SupplierAPI] Order placed: ${response.orderId}`);
      return response;
    } catch (error) {
      console.error(`[SupplierAPI] Order placement failed:`, error);
      throw error;
    }
  }

  /**
   * Match invoice line item to supplier catalog
   */
  matchInvoiceItemToCatalog(
    supplierId: string,
    productName: string,
    barcode?: string,
    sku?: string,
  ): SupplierCatalogItem | null {
    const catalog = this.getCatalog(supplierId);

    // Try exact SKU match first
    if (sku) {
      const skuMatch = catalog.find(
        (item) => item.sku.toLowerCase() === sku.toLowerCase(),
      );
      if (skuMatch) return skuMatch;
    }

    // Try barcode/GTIN match
    if (barcode) {
      const barcodeMatch = catalog.find(
        (item) => item.barcode === barcode || item.gtin === barcode,
      );
      if (barcodeMatch) return barcodeMatch;
    }

    // Try fuzzy name match
    const nameMatch = this.fuzzyMatchProductName(catalog, productName);
    if (nameMatch) return nameMatch;

    return null;
  }

  /**
   * Private methods
   */

  private async authenticate(supplier: SupplierAPI): Promise<string> {
    // Implementation varies by auth type
    switch (supplier.authType) {
      case "oauth2":
        return this.authenticateOAuth2(supplier);
      case "api_key":
        return supplier.authConfig.apiKey || "";
      case "basic":
        return this.authenticateBasic(supplier);
      default:
        throw new Error(`Unsupported auth type: ${supplier.authType}`);
    }
  }

  private async authenticateOAuth2(supplier: SupplierAPI): Promise<string> {
    // OAuth2 flow implementation
    // This would make actual API calls to get access token
    // For now, return mock token
    return "mock_oauth_token";
  }

  private async authenticateBasic(supplier: SupplierAPI): Promise<string> {
    // Basic auth implementation
    const { username, password } = supplier.authConfig;
    if (!username || !password) {
      throw new Error("Basic auth requires username and password");
    }
    return btoa(`${username}:${password}`);
  }

  private async fetchCatalog(
    supplier: SupplierAPI,
    token: string,
  ): Promise<SupplierCatalogItem[]> {
    // Implementation would call actual supplier API
    // For now, return mock data structure
    // In production, this would be:
    // const response = await fetch(`${supplier.apiEndpoint}/catalog`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    // return response.json();

    return [];
  }

  private async submitOrder(
    supplier: SupplierAPI,
    token: string,
    request: SupplierOrderRequest,
  ): Promise<SupplierOrderResponse> {
    // Implementation would call actual supplier API
    // For now, return mock response
    return {
      orderId: `ORD-${Date.now()}`,
      status: "confirmed",
      items: request.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        status: "confirmed" as const,
      })),
    };
  }

  private async notifyInventoryPriceUpdate(
    update: SupplierPricingUpdate,
  ): Promise<void> {
    // Notify inventory system to update prices
    // This would integrate with the inventory module
    console.log(`[SupplierAPI] Notifying inventory system of price updates`);

    // Dispatch event for inventory system
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("supplier-pricing-updated", {
          detail: update,
        }),
      );
    }
  }

  private fuzzyMatchProductName(
    catalog: SupplierCatalogItem[],
    productName: string,
  ): SupplierCatalogItem | null {
    const normalized = productName.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    let bestMatch: SupplierCatalogItem | null = null;
    let bestScore = 0;

    for (const item of catalog) {
      const itemName = item.name.toLowerCase();
      let score = 0;

      // Exact match
      if (itemName === normalized) {
        return item;
      }

      // Word overlap
      const itemWords = itemName.split(/\s+/);
      const commonWords = words.filter((w) => itemWords.includes(w));
      score = commonWords.length / Math.max(words.length, itemWords.length);

      // Substring match
      if (itemName.includes(normalized) || normalized.includes(itemName)) {
        score = Math.max(score, 0.7);
      }

      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = item;
      }
    }

    return bestMatch;
  }
}

// Singleton instance
export const supplierAPIService = new SupplierAPIService();

// Initialize with common suppliers
const commonSuppliers: SupplierAPI[] = [
  {
    id: "sysco",
    name: "Sysco",
    apiEndpoint: "https://api.sysco.com/v1",
    authType: "oauth2",
    authConfig: {
      clientId: process.env.SYSCO_CLIENT_ID || "",
      clientSecret: process.env.SYSCO_CLIENT_SECRET || "",
      tokenUrl: "https://api.sysco.com/oauth/token",
    },
    capabilities: {
      pricing: true,
      catalog: true,
      nutritional: true,
      ordering: true,
      inventory: true,
    },
    syncFrequency: "daily",
    status: "inactive",
  },
  {
    id: "usfoods",
    name: "US Foods",
    apiEndpoint: "https://api.usfoods.com/v1",
    authType: "oauth2",
    authConfig: {
      clientId: process.env.USFOODS_CLIENT_ID || "",
      clientSecret: process.env.USFOODS_CLIENT_SECRET || "",
      tokenUrl: "https://api.usfoods.com/oauth/token",
    },
    capabilities: {
      pricing: true,
      catalog: true,
      nutritional: true,
      ordering: true,
      inventory: false,
    },
    syncFrequency: "daily",
    status: "inactive",
  },
  {
    id: "gfs",
    name: "Gordon Food Service",
    apiEndpoint: "https://api.gfs.com/v1",
    authType: "api_key",
    authConfig: {
      apiKey: process.env.GFS_API_KEY || "",
    },
    capabilities: {
      pricing: true,
      catalog: true,
      nutritional: false,
      ordering: true,
      inventory: false,
    },
    syncFrequency: "weekly",
    status: "inactive",
  },
];

// Register common suppliers
commonSuppliers.forEach((supplier) => {
  supplierAPIService.registerSupplier(supplier);
});
