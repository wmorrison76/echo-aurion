// Real Supplier Database & API Integration
// Connects to actual supplier APIs for pricing feeds and order automation

export interface SupplierAPI {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey?: string;
  authType: "api-key" | "oauth" | "basic-auth" | "none";
  capabilities: ("price-feed" | "inventory" | "orders" | "invoices")[];
  updateFrequency: "real-time" | "hourly" | "daily" | "weekly";
  status: "active" | "inactive" | "error";
}

export interface SupplierPriceFeed {
  supplierId: string;
  supplierName: string;
  lastUpdated: number;
  items: Array<{
    sku: string;
    productName: string;
    category: string;
    packSize: number;
    packUnit: string;
    pricePerPack: number;
    currency: string;
    leadTime: number;
    minimumOrder: number;
    availabilityStatus: "in-stock" | "limited" | "out-of-stock";
  }>;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  orderDate: string;
  dueDate: string;
  status: "draft" | "submitted" | "confirmed" | "shipped" | "delivered";
  lineItems: Array<{
    sku: string;
    productName: string;
    quantity: number;
    packSize: number;
    packUnit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  currency: string;
  notes?: string;
}

export interface PricingHistory {
  supplierId: string;
  supplierName: string;
  sku: string;
  productName: string;
  date: string;
  pricePerPack: number;
  currency: string;
}

export interface SupplierIntegration {
  supplierId: string;
  supplierName: string;
  isConnected: boolean;
  apiConfig?: SupplierAPI;
  lastSyncDate?: number;
  priceVariance: number; // % difference from market average
}

const MAJOR_SUPPLIER_APIS: SupplierAPI[] = [
  {
    id: "api-sysco",
    name: "Sysco",
    apiEndpoint: "https://api.sysco.com/v1",
    authType: "oauth",
    capabilities: ["price-feed", "inventory", "orders"],
    updateFrequency: "real-time",
    status: "inactive",
  },
  {
    id: "api-us-foods",
    name: "US Foods",
    apiEndpoint: "https://api.usfoods.com/v1",
    authType: "api-key",
    capabilities: ["price-feed", "inventory", "orders"],
    updateFrequency: "real-time",
    status: "inactive",
  },
  {
    id: "api-gfs",
    name: "Gordon Food Service",
    apiEndpoint: "https://api.gfs.com/v1",
    authType: "api-key",
    capabilities: ["price-feed", "inventory", "orders"],
    updateFrequency: "hourly",
    status: "inactive",
  },
  {
    id: "api-pfg",
    name: "Performance Food Group",
    apiEndpoint: "https://api.pfgc.com/v1",
    authType: "oauth",
    capabilities: ["price-feed", "inventory", "orders"],
    updateFrequency: "daily",
    status: "inactive",
  },
  {
    id: "api-mclane",
    name: "McLane Company",
    apiEndpoint: "https://api.mclaneco.com/v1",
    authType: "basic-auth",
    capabilities: ["price-feed", "inventory", "orders"],
    updateFrequency: "daily",
    status: "inactive",
  },
];

/**
 * Get available supplier APIs
 * @returns Array of major supplier API configurations
 */
export function getAvailableSupplierAPIs(): SupplierAPI[] {
  return MAJOR_SUPPLIER_APIS;
}

/**
 * Connect to supplier API
 * @param supplierAPI - Supplier API configuration
 * @param apiKey - API credentials (varies by auth type)
 * @returns Success status
 */
export async function connectSupplierAPI(supplierAPI: SupplierAPI, apiKey: string): Promise<boolean> {
  try {
    // Test connection by fetching a small dataset
    const response = await fetch(`${supplierAPI.apiEndpoint}/health`, {
      headers: getAuthHeaders(supplierAPI.authType, apiKey),
    });

    if (!response.ok) {
      console.error(`Connection failed: ${response.statusText}`);
      return false;
    }

    // Store connection in session (never store API keys in localStorage)
    sessionStorage.setItem(
      `supplier-api-${supplierAPI.id}`,
      JSON.stringify({
        supplierId: supplierAPI.id,
        isConnected: true,
        lastSyncDate: Date.now(),
      }),
    );

    return true;
  } catch (error) {
    console.error("API connection error:", error);
    return false;
  }
}

/**
 * Fetch price feed from supplier API
 * @param supplierAPI - Supplier API configuration
 * @param apiKey - API credentials
 * @returns Price feed data
 */
export async function fetchSupplierPriceFeed(
  supplierAPI: SupplierAPI,
  apiKey: string,
): Promise<SupplierPriceFeed | null> {
  try {
    const response = await fetch(`${supplierAPI.apiEndpoint}/catalog/prices`, {
      headers: getAuthHeaders(supplierAPI.authType, apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.statusText}`);
    }

    const data = await response.json() as SupplierPriceFeed;

    // Update last sync date
    sessionStorage.setItem(
      `supplier-api-${supplierAPI.id}`,
      JSON.stringify({
        supplierId: supplierAPI.id,
        isConnected: true,
        lastSyncDate: Date.now(),
      }),
    );

    return data;
  } catch (error) {
    console.error(`Error fetching price feed for ${supplierAPI.name}:`, error);
    return null;
  }
}

/**
 * Submit order to supplier API
 * @param supplierAPI - Supplier API configuration
 * @param apiKey - API credentials
 * @param order - Order to submit
 * @returns Order ID from supplier
 */
export async function submitSupplierOrder(
  supplierAPI: SupplierAPI,
  apiKey: string,
  order: Omit<SupplierOrder, "id">,
): Promise<string | null> {
  try {
    const response = await fetch(`${supplierAPI.apiEndpoint}/orders`, {
      method: "POST",
      headers: getAuthHeaders(supplierAPI.authType, apiKey),
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit order: ${response.statusText}`);
    }

    const data = await response.json() as { orderId: string };
    return data.orderId;
  } catch (error) {
    console.error(`Error submitting order to ${supplierAPI.name}:`, error);
    return null;
  }
}

/**
 * Get order status from supplier
 * @param supplierAPI - Supplier API configuration
 * @param apiKey - API credentials
 * @param orderId - Supplier order ID
 * @returns Order status
 */
export async function getSupplierOrderStatus(
  supplierAPI: SupplierAPI,
  apiKey: string,
  orderId: string,
): Promise<SupplierOrder["status"] | null> {
  try {
    const response = await fetch(`${supplierAPI.apiEndpoint}/orders/${orderId}`, {
      headers: getAuthHeaders(supplierAPI.authType, apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order status: ${response.statusText}`);
    }

    const data = await response.json() as { status: SupplierOrder["status"] };
    return data.status;
  } catch (error) {
    console.error(`Error fetching order status from ${supplierAPI.name}:`, error);
    return null;
  }
}

/**
 * Generate auth headers based on auth type
 * @param authType - Type of authentication
 * @param credentials - API key or credentials
 * @returns Headers object
 */
function getAuthHeaders(authType: string, credentials: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  switch (authType) {
    case "api-key":
      headers["X-API-Key"] = credentials;
      break;
    case "oauth":
      headers["Authorization"] = `Bearer ${credentials}`;
      break;
    case "basic-auth":
      headers["Authorization"] = `Basic ${btoa(credentials)}`;
      break;
  }

  return headers;
}

/**
 * Calculate price variance from market average
 * @param price - Item price
 * @param supplierPrices - Prices from all suppliers
 * @returns Variance percentage
 */
export function calculatePriceVariance(price: number, supplierPrices: number[]): number {
  if (supplierPrices.length === 0) return 0;

  const average = supplierPrices.reduce((a, b) => a + b, 0) / supplierPrices.length;
  if (average === 0) return 0;

  return Math.round(((price - average) / average) * 10000) / 100;
}

/**
 * Find best price across suppliers
 * @param priceFeeds - Array of price feeds from different suppliers
 * @param sku - SKU to find
 * @returns Best price info
 */
export function findBestPrice(
  priceFeeds: SupplierPriceFeed[],
  sku: string,
): { supplierName: string; price: number; packSize: number } | null {
  let bestPrice: { supplierName: string; price: number; packSize: number } | null = null;
  let bestPricePerUnit = Infinity;

  priceFeeds.forEach((feed) => {
    const item = feed.items.find((i) => i.sku === sku);
    if (item) {
      const pricePerUnit = item.pricePerPack / item.packSize;
      if (pricePerUnit < bestPricePerUnit) {
        bestPricePerUnit = pricePerUnit;
        bestPrice = {
          supplierName: feed.supplierName,
          price: item.pricePerPack,
          packSize: item.packSize,
        };
      }
    }
  });

  return bestPrice;
}

/**
 * Track pricing history for cost analysis
 * @param supplierId - Supplier ID
 * @param supplierName - Supplier name
 * @param sku - Product SKU
 * @param productName - Product name
 * @param price - Current price
 * @returns Pricing history entry
 */
export function recordPricingHistory(
  supplierId: string,
  supplierName: string,
  sku: string,
  productName: string,
  price: number,
): PricingHistory {
  return {
    supplierId,
    supplierName,
    sku,
    productName,
    date: new Date().toISOString().split("T")[0],
    pricePerPack: price,
    currency: "USD",
  };
}

/**
 * Analyze pricing trends
 * @param history - Pricing history entries
 * @param sku - SKU to analyze
 * @returns Trend analysis
 */
export function analyzePricingTrend(
  history: PricingHistory[],
  sku: string,
): {
  skuHistory: PricingHistory[];
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  trend: "increasing" | "decreasing" | "stable";
} {
  const skuHistory = history.filter((h) => h.sku === sku).sort((a, b) => a.date.localeCompare(b.date));

  if (skuHistory.length === 0) {
    return {
      skuHistory: [],
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      trend: "stable",
    };
  }

  const prices = skuHistory.map((h) => h.pricePerPack);
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  // Determine trend
  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (skuHistory.length >= 2) {
    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.02) {
      trend = "increasing";
    } else if (secondAvg < firstAvg * 0.98) {
      trend = "decreasing";
    }
  }

  return {
    skuHistory,
    averagePrice: Math.round(averagePrice * 100) / 100,
    lowestPrice,
    highestPrice,
    trend,
  };
}
