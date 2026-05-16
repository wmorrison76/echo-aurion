/**
 * Order History Management
 * Stores and retrieves purchase order history with analytics
 */

import type { PurchaseOrder } from "./order-export";

export interface OrderHistoryEntry extends PurchaseOrder {
  status: "draft" | "sent" | "confirmed" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
  supplierReference?: string;
  deliveryDate?: string;
  actualCost?: number;
  variance?: number;
}

const STORAGE_KEY = "echo_recipe_order_history";
const MAX_ORDERS = 500;

/**
 * Save order to history
 */
export function saveOrderToHistory(order: PurchaseOrder, status: "draft" | "sent" = "draft"): OrderHistoryEntry {
  try {
    const now = new Date().toISOString();
    const entry: OrderHistoryEntry = {
      ...order,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const history = getOrderHistory();
    history.unshift(entry);

    // Keep only recent orders
    if (history.length > MAX_ORDERS) {
      history.splice(MAX_ORDERS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return entry;
  } catch (error) {
    console.error("Failed to save order to history:", error);
    throw error;
  }
}

/**
 * Get all orders from history
 */
export function getOrderHistory(): OrderHistoryEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load order history:", error);
    return [];
  }
}

/**
 * Get specific order from history
 */
export function getOrderFromHistory(orderId: string): OrderHistoryEntry | null {
  const history = getOrderHistory();
  return history.find((order) => order.id === orderId) || null;
}

/**
 * Update order status
 */
export function updateOrderStatus(
  orderId: string,
  status: OrderHistoryEntry["status"],
  updates?: Partial<OrderHistoryEntry>,
): OrderHistoryEntry | null {
  try {
    const history = getOrderHistory();
    const index = history.findIndex((order) => order.id === orderId);

    if (index === -1) return null;

    history[index] = {
      ...history[index],
      ...updates,
      status,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history[index];
  } catch (error) {
    console.error("Failed to update order status:", error);
    return null;
  }
}

/**
 * Delete order from history
 */
export function deleteOrderFromHistory(orderId: string): boolean {
  try {
    const history = getOrderHistory();
    const filtered = history.filter((order) => order.id !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Failed to delete order:", error);
    return false;
  }
}

/**
 * Get orders by supplier
 */
export function getOrdersBySupplier(supplierName: string): OrderHistoryEntry[] {
  const history = getOrderHistory();
  return history.filter((order) => order.vendorName === supplierName);
}

/**
 * Get orders within date range
 */
export function getOrdersByDateRange(startDate: Date, endDate: Date): OrderHistoryEntry[] {
  const history = getOrderHistory();
  return history.filter((order) => {
    const orderDate = new Date(order.date);
    return orderDate >= startDate && orderDate <= endDate;
  });
}

/**
 * Calculate supplier statistics
 */
export interface SupplierStats {
  supplierName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  onTimeDeliveryRate: number;
}

export function getSupplierStatistics(): SupplierStats[] {
  const history = getOrderHistory();
  const stats: Map<string, SupplierStats> = new Map();

  history.forEach((order) => {
    const existing = stats.get(order.vendorName) || {
      supplierName: order.vendorName,
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      onTimeDeliveryRate: 0,
    };

    existing.totalOrders++;
    existing.totalSpent += order.total;
    existing.averageOrderValue = existing.totalSpent / existing.totalOrders;
    existing.lastOrderDate = order.date;

    // Calculate on-time delivery rate
    const deliveredOrders = history.filter(
      (o) =>
        o.vendorName === order.vendorName &&
        o.status === "delivered" &&
        o.deliveryDate &&
        o.requestedDeliveryDate &&
        new Date(o.deliveryDate) <= new Date(o.requestedDeliveryDate),
    ).length;

    const totalDelivered = history.filter(
      (o) => o.vendorName === order.vendorName && o.status === "delivered",
    ).length;

    if (totalDelivered > 0) {
      existing.onTimeDeliveryRate = (deliveredOrders / totalDelivered) * 100;
    }

    stats.set(order.vendorName, existing);
  });

  return Array.from(stats.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Get cost trends
 */
export interface CostTrend {
  date: string;
  supplier: string;
  ingredient: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
}

export function getCostTrends(ingredientName: string, days: number = 90): CostTrend[] {
  const history = getOrderHistory();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const trends: CostTrend[] = [];

  history.forEach((order) => {
    if (new Date(order.date) < cutoffDate) return;

    order.lineItems.forEach((item) => {
      if (item.ingredientName.toLowerCase().includes(ingredientName.toLowerCase())) {
        trends.push({
          date: order.date,
          supplier: order.vendorName,
          ingredient: item.ingredientName,
          unitCost: item.unitCost,
          quantity: item.quantity,
          totalCost: item.totalCost,
        });
      }
    });
  });

  return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get ingredient cost history
 */
export interface IngredientCostHistory {
  ingredientName: string;
  minCost: number;
  maxCost: number;
  averageCost: number;
  priceHistory: Array<{ date: string; cost: number; supplier: string }>;
}

export function getIngredientCostHistory(ingredientName: string): IngredientCostHistory {
  const trends = getCostTrends(ingredientName, 365);

  if (trends.length === 0) {
    return {
      ingredientName,
      minCost: 0,
      maxCost: 0,
      averageCost: 0,
      priceHistory: [],
    };
  }

  const costs = trends.map((t) => t.unitCost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const averageCost = costs.reduce((a, b) => a + b, 0) / costs.length;

  return {
    ingredientName,
    minCost,
    maxCost,
    averageCost,
    priceHistory: trends.map((t) => ({
      date: t.date,
      cost: t.unitCost,
      supplier: t.supplier,
    })),
  };
}

/**
 * Get spending summary
 */
export interface SpendingSummary {
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  topSupplier: string;
  topIngredient: string;
  monthlySpending: Array<{ month: string; amount: number }>;
}

export function getSpendingSummary(): SpendingSummary {
  const history = getOrderHistory();

  if (history.length === 0) {
    return {
      totalSpent: 0,
      orderCount: 0,
      averageOrderValue: 0,
      topSupplier: "",
      topIngredient: "",
      monthlySpending: [],
    };
  }

  const totalSpent = history.reduce((sum, order) => sum + order.total, 0);
  const orderCount = history.length;
  const averageOrderValue = totalSpent / orderCount;

  // Top supplier
  const supplierStats = getSupplierStatistics();
  const topSupplier = supplierStats[0]?.supplierName || "";

  // Top ingredient
  const ingredientMap = new Map<string, number>();
  history.forEach((order) => {
    order.lineItems.forEach((item) => {
      ingredientMap.set(
        item.ingredientName,
        (ingredientMap.get(item.ingredientName) || 0) + item.totalCost,
      );
    });
  });

  const topIngredient = Array.from(ingredientMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  // Monthly spending
  const monthlyMap = new Map<string, number>();
  history.forEach((order) => {
    const date = new Date(order.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + order.total);
  });

  const monthlySpending = Array.from(monthlyMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months

  return {
    totalSpent,
    orderCount,
    averageOrderValue,
    topSupplier,
    topIngredient,
    monthlySpending,
  };
}
