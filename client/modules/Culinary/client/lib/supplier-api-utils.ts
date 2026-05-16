import type {
  SupplierProduct,
  SupplierAPIConfig,
  PriceComparison,
  SupplierMetrics,
  DeliveryPerformance,
  PurchaseOrder,
  RFQRequest,
  RFQResponse,
  SupplierCostAnalysis,
} from "@/types/supplier-api";
import {
  SUPPLIER_API_CONFIGS,
  SUPPLIER_PRODUCTS,
  SUPPLIER_PRICE_FEEDS,
  MOCK_PURCHASE_ORDERS,
  MOCK_SUPPLIER_METRICS,
  MOCK_DELIVERY_PERFORMANCE,
  MOCK_RFQ_REQUESTS,
} from "@/data/supplier-api";

// Supplier API configuration utilities
export function getSupplierAPIConfig(supplierId: string): SupplierAPIConfig | undefined {
  return SUPPLIER_API_CONFIGS.find((c) => c.supplierId === supplierId);
}

export function getAllSupplierAPIConfigs(): SupplierAPIConfig[] {
  return [...SUPPLIER_API_CONFIGS];
}

export function getEnabledSupplierAPIs(): SupplierAPIConfig[] {
  return SUPPLIER_API_CONFIGS.filter((c) => c.enabled);
}

export function getSupplierConnectionStatus(supplierId: string): string {
  const config = getSupplierAPIConfig(supplierId);
  return config?.connectionStatus ?? "unknown";
}

export function isSupplierConnected(supplierId: string): boolean {
  return getSupplierConnectionStatus(supplierId) === "connected";
}

// Product lookup utilities
export function getSupplierProductBySKU(
  supplierId: string,
  sku: string,
): SupplierProduct | undefined {
  return SUPPLIER_PRODUCTS.find((p) => p.supplierId === supplierId && p.sku === sku);
}

export function getSupplierProductsByCategory(
  supplierId: string,
  category: string,
): SupplierProduct[] {
  return SUPPLIER_PRODUCTS.filter(
    (p) => p.supplierId === supplierId && p.category === category,
  );
}

export function getProductsBySupplier(supplierId: string): SupplierProduct[] {
  return SUPPLIER_PRODUCTS.filter((p) => p.supplierId === supplierId);
}

export function searchProducts(
  supplierId: string,
  searchTerm: string,
): SupplierProduct[] {
  const lowerSearch = searchTerm.toLowerCase();
  return SUPPLIER_PRODUCTS.filter(
    (p) =>
      p.supplierId === supplierId &&
      (p.productName.toLowerCase().includes(lowerSearch) ||
        p.description?.toLowerCase().includes(lowerSearch) ||
        p.sku.toLowerCase().includes(lowerSearch)),
  );
}

export function filterProductsByAvailability(
  supplierId: string,
  availability: string,
): SupplierProduct[] {
  return SUPPLIER_PRODUCTS.filter(
    (p) => p.supplierId === supplierId && p.availability === availability,
  );
}

export function getInStockProducts(supplierId: string): SupplierProduct[] {
  return filterProductsByAvailability(supplierId, "in-stock");
}

// Pricing utilities
export function getCurrentPrice(supplierId: string, sku: string): number {
  const product = getSupplierProductBySKU(supplierId, sku);
  return product?.currentPrice ?? 0;
}

export function getPriceHistory(supplierId: string, sku: string) {
  const product = getSupplierProductBySKU(supplierId, sku);
  return product?.priceHistory ?? [];
}

export function getAveragePrice(supplierId: string, sku: string): number {
  const history = getPriceHistory(supplierId, sku);
  if (history.length === 0) return 0;
  const total = history.reduce((sum, h) => sum + h.pricePerUnit, 0);
  return total / history.length;
}

export function getPriceChange(supplierId: string, sku: string): {
  amount: number;
  percent: number;
} {
  const history = getPriceHistory(supplierId, sku);
  if (history.length < 2) {
    return { amount: 0, percent: 0 };
  }

  const oldest = history[0];
  const latest = history[history.length - 1];
  const amount = latest.pricePerUnit - oldest.pricePerUnit;
  const percent = (amount / oldest.pricePerUnit) * 100;

  return { amount, percent };
}

export function compareSupplierPrices(
  ingredientName: string,
  unit: string,
  suppliers: string[],
): PriceComparison {
  const comparison: PriceComparison = {
    ingredientName,
    ingredientId: `ing-${ingredientName.toLowerCase().replace(/\s+/g, "-")}`,
    unit,
    suppliers: [],
    timestamp: Date.now(),
  };

  suppliers.forEach((supplierId) => {
    // Find matching products from supplier (simplified search)
    const supplierProducts = getProductsBySupplier(supplierId);
    const matchingProduct = supplierProducts.find((p) =>
      p.productName.toLowerCase().includes(ingredientName.toLowerCase()),
    );

    if (matchingProduct) {
      const supplierMetrics = getSupplierMetrics(supplierId);
      comparison.suppliers.push({
        supplierId,
        supplierName: supplierId.replace("sup-", "").replace(/-/g, " "),
        sku: matchingProduct.sku,
        packSize: matchingProduct.packSize,
        packUnit: matchingProduct.packUnit,
        unitPrice: matchingProduct.currentPrice / matchingProduct.packSize,
        totalPackPrice: matchingProduct.currentPrice,
        availability: matchingProduct.availability,
        leadTimeDays: matchingProduct.leadTimeDays,
        reliability: supplierMetrics?.onTimeDeliveryPercent ?? 0 / 100,
      });
    }
  });

  return comparison;
}

// Purchase order utilities
export function getPurchaseOrderById(id: string): PurchaseOrder | undefined {
  return MOCK_PURCHASE_ORDERS.find((p) => p.id === id);
}

export function getAllPurchaseOrders(): PurchaseOrder[] {
  return [...MOCK_PURCHASE_ORDERS];
}

export function getPurchaseOrdersBySupplier(supplierId: string): PurchaseOrder[] {
  return MOCK_PURCHASE_ORDERS.filter((p) => p.supplierId === supplierId);
}

export function getPurchaseOrdersByStatus(status: string): PurchaseOrder[] {
  return MOCK_PURCHASE_ORDERS.filter((p) => p.status === status);
}

export function getDraftPurchaseOrders(): PurchaseOrder[] {
  return getPurchaseOrdersByStatus("draft");
}

export function getSubmittedPurchaseOrders(): PurchaseOrder[] {
  return getPurchaseOrdersByStatus("submitted");
}

export function getTotalOrderAmount(
  period: { startDate: number; endDate: number },
): number {
  return MOCK_PURCHASE_ORDERS.filter(
    (p) => p.createdAt >= period.startDate && p.createdAt <= period.endDate,
  ).reduce((sum, p) => sum + p.totalAmount, 0);
}

export function getTotalOrderCount(
  period: { startDate: number; endDate: number },
): number {
  return MOCK_PURCHASE_ORDERS.filter(
    (p) => p.createdAt >= period.startDate && p.createdAt <= period.endDate,
  ).length;
}

export function getAverageOrderSize(
  period: { startDate: number; endDate: number },
): number {
  const count = getTotalOrderCount(period);
  return count > 0 ? getTotalOrderAmount(period) / count : 0;
}

// Supplier metrics utilities
export function getSupplierMetrics(supplierId: string): SupplierMetrics | undefined {
  return MOCK_SUPPLIER_METRICS.find((m) => m.supplierId === supplierId);
}

export function getAllSupplierMetrics(): SupplierMetrics[] {
  return [...MOCK_SUPPLIER_METRICS];
}

export function rankSuppliersByReliability(): SupplierMetrics[] {
  return MOCK_SUPPLIER_METRICS.slice().sort(
    (a, b) => b.onTimeDeliveryPercent - a.onTimeDeliveryPercent,
  );
}

export function rankSuppliersByQuality(): SupplierMetrics[] {
  return MOCK_SUPPLIER_METRICS.slice().sort((a, b) => b.qualityScore - a.qualityScore);
}

export function rankSuppliersByPrice(): SupplierMetrics[] {
  return MOCK_SUPPLIER_METRICS.slice().sort(
    (a, b) => b.priceCompetitiveness - a.priceCompetitiveness,
  );
}

export function getSupplierScore(supplierId: string): number {
  const metrics = getSupplierMetrics(supplierId);
  if (!metrics) return 0;

  const weights = {
    onTime: 0.35,
    quality: 0.35,
    price: 0.15,
    responsive: 0.1,
    minOrder: 0.05,
  };

  const score =
    (metrics.onTimeDeliveryPercent / 100) * weights.onTime +
    (metrics.qualityScore / 5) * weights.quality +
    (metrics.priceCompetitiveness / 5) * weights.price +
    (Math.max(0, 4 - metrics.responseTime) / 4) * weights.responsive +
    (metrics.minOrderReliability / 100) * weights.minOrder;

  return Math.min(100, score * 100);
}

// Delivery performance utilities
export function getDeliveryPerformanceByOrder(
  orderId: string,
): DeliveryPerformance | undefined {
  return MOCK_DELIVERY_PERFORMANCE.find((d) => d.orderId === orderId);
}

export function getDeliveryPerformanceBySupplier(
  supplierId: string,
): DeliveryPerformance[] {
  return MOCK_DELIVERY_PERFORMANCE.filter((d) => d.supplierId === supplierId);
}

export function getOnTimeDeliveryPercent(supplierId: string): number {
  const performances = getDeliveryPerformanceBySupplier(supplierId);
  if (performances.length === 0) return 0;

  const onTime = performances.filter((p) => p.daysLate <= 0).length;
  return (onTime / performances.length) * 100;
}

export function getAverageDeliveryDays(supplierId: string): number {
  const performances = getDeliveryPerformanceBySupplier(supplierId);
  if (performances.length === 0) return 0;

  const avgDays = performances.reduce((sum, p) => {
    const days = p.actualDeliveryDate
      ? (p.actualDeliveryDate - p.orderDate) / (24 * 60 * 60 * 1000)
      : 0;
    return sum + days;
  }, 0);

  return avgDays / performances.length;
}

export function hasQualityIssues(supplierId: string): boolean {
  return getDeliveryPerformanceBySupplier(supplierId).some(
    (p) => p.qualityIssues && p.qualityIssues.length > 0,
  );
}

// RFQ utilities
export function getRFQById(id: string): RFQRequest | undefined {
  return MOCK_RFQ_REQUESTS.find((r) => r.id === id);
}

export function getAllRFQs(): RFQRequest[] {
  return [...MOCK_RFQ_REQUESTS];
}

export function getActiveRFQs(): RFQRequest[] {
  return MOCK_RFQ_REQUESTS.filter((r) => r.expiresAt > Date.now());
}

export function getRFQsByStatus(status: string): RFQRequest[] {
  return MOCK_RFQ_REQUESTS.filter((r) => r.status === status);
}

export function getRFQResponseCount(rfqId: string): number {
  const rfq = getRFQById(rfqId);
  return rfq?.responses.length ?? 0;
}

export function getBestRFQResponse(rfqId: string): RFQResponse | undefined {
  const rfq = getRFQById(rfqId);
  if (!rfq || rfq.responses.length === 0) return undefined;

  return rfq.responses.reduce((best, current) =>
    current.totalPrice < best.totalPrice ? current : best,
  );
}

export function getRFQResponsesBySupplier(rfqId: string, supplierId: string): RFQResponse[] {
  const rfq = getRFQById(rfqId);
  return rfq?.responses.filter((r) => r.supplierId === supplierId) ?? [];
}

// Cost analysis utilities
export function analyzeSupplierCosts(
  supplierId: string,
  period: { startDate: number; endDate: number },
): SupplierCostAnalysis {
  const orders = MOCK_PURCHASE_ORDERS.filter(
    (p) =>
      p.supplierId === supplierId &&
      p.createdAt >= period.startDate &&
      p.createdAt <= period.endDate,
  );

  const totalOrderAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const averageOrderSize = orders.length > 0 ? totalOrderAmount / orders.length : 0;

  // Group by SKU
  const topProducts = new Map<
    string,
    { sku: string; productName: string; quantity: number; totalSpent: number }
  >();
  orders.forEach((order) => {
    order.lineItems.forEach((item) => {
      const existing = topProducts.get(item.sku) || {
        sku: item.sku,
        productName: item.productName,
        quantity: 0,
        totalSpent: 0,
      };
      topProducts.set(item.sku, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        totalSpent: existing.totalSpent + item.totalPrice,
      });
    });
  });

  const priceVariation = {
    averagePrice: averageOrderSize,
    minPrice: Math.min(...orders.map((o) => o.totalAmount)),
    maxPrice: Math.max(...orders.map((o) => o.totalAmount)),
  };

  return {
    supplierId,
    period,
    totalOrderAmount,
    totalOrderCount: orders.length,
    averageOrderSize,
    topProducts: Array.from(topProducts.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent,
    ),
    priceVariation,
  };
}

// Mock API call functions (simulated)
export async function syncSupplierPrices(
  supplierId: string,
): Promise<{ success: boolean; productsCount: number; error?: string }> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        productsCount: SUPPLIER_PRODUCTS.filter(
          (p) => p.supplierId === supplierId,
        ).length,
      });
    }, 1000);
  });
}

export async function submitPurchaseOrder(
  orderId: string,
): Promise<{ success: boolean; confirmedOrderId?: string; error?: string }> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const order = getPurchaseOrderById(orderId);
      if (!order) {
        resolve({ success: false, error: "Order not found" });
      } else {
        resolve({
          success: true,
          confirmedOrderId: `${order.supplierId.toUpperCase()}-${Date.now()}`,
        });
      }
    }, 2000);
  });
}

export async function checkOrderStatus(orderId: string): Promise<{
  status: string;
  message: string;
}> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const order = getPurchaseOrderById(orderId);
      resolve({
        status: order?.status ?? "unknown",
        message: `Order ${orderId} status: ${order?.status ?? "not found"}`,
      });
    }, 500);
  });
}
