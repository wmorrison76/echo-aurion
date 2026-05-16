import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveOrderToHistory,
  getOrderHistory,
  getOrderFromHistory,
  updateOrderStatus,
  deleteOrderFromHistory,
  getOrdersBySupplier,
  getOrdersByDateRange,
  getSupplierStatistics,
  getCostTrends,
  getIngredientCostHistory,
  getSpendingSummary,
  type OrderHistoryEntry,
} from "../order-history";
import type { PurchaseOrder } from "../order-export";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Order History", () => {
  const mockOrder: PurchaseOrder = {
    id: "po-001",
    date: "2024-01-15",
    vendorName: "Test Supplier",
    lineItems: [
      {
        ingredientId: "ing-001",
        ingredientName: "Tomatoes",
        supplierId: "sup-001",
        supplierName: "Test Supplier",
        quantity: 10,
        unit: "lb",
        unitCost: 2.5,
        totalCost: 25.0,
      },
    ],
    subtotal: 25.0,
    total: 25.0,
    currency: "USD",
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("saveOrderToHistory", () => {
    it("should save order to history", () => {
      const entry = saveOrderToHistory(mockOrder);
      expect(entry.id).toBe(mockOrder.id);
      expect(entry.status).toBe("draft");
      expect(entry.createdAt).toBeDefined();
    });

    it("should add status and timestamps", () => {
      const entry = saveOrderToHistory(mockOrder, "sent");
      expect(entry.status).toBe("sent");
      expect(entry.createdAt).toBeDefined();
      expect(entry.updatedAt).toBeDefined();
    });

    it("should store order in localStorage", () => {
      saveOrderToHistory(mockOrder);
      const history = getOrderHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(mockOrder.id);
    });
  });

  describe("getOrderHistory", () => {
    it("should return empty array when no history", () => {
      const history = getOrderHistory();
      expect(history).toEqual([]);
    });

    it("should return all saved orders", () => {
      saveOrderToHistory(mockOrder);
      saveOrderToHistory({ ...mockOrder, id: "po-002" });
      const history = getOrderHistory();
      expect(history.length).toBe(2);
    });

    it("should return orders in reverse chronological order", () => {
      const order1 = saveOrderToHistory(mockOrder);
      const order2 = saveOrderToHistory({ ...mockOrder, id: "po-002" });
      const history = getOrderHistory();
      expect(history[0].id).toBe(order2.id);
      expect(history[1].id).toBe(order1.id);
    });
  });

  describe("getOrderFromHistory", () => {
    it("should retrieve specific order by ID", () => {
      saveOrderToHistory(mockOrder);
      const order = getOrderFromHistory("po-001");
      expect(order?.id).toBe("po-001");
    });

    it("should return null for non-existent order", () => {
      const order = getOrderFromHistory("non-existent");
      expect(order).toBeNull();
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status", () => {
      saveOrderToHistory(mockOrder);
      const updated = updateOrderStatus("po-001", "confirmed");
      expect(updated?.status).toBe("confirmed");
    });

    it("should update additional properties", () => {
      saveOrderToHistory(mockOrder);
      const updated = updateOrderStatus("po-001", "delivered", {
        deliveryDate: "2024-01-20",
        supplierReference: "SR-001",
      });
      expect(updated?.deliveryDate).toBe("2024-01-20");
      expect(updated?.supplierReference).toBe("SR-001");
    });

    it("should return null for non-existent order", () => {
      const result = updateOrderStatus("non-existent", "confirmed");
      expect(result).toBeNull();
    });
  });

  describe("deleteOrderFromHistory", () => {
    it("should delete order from history", () => {
      saveOrderToHistory(mockOrder);
      const deleted = deleteOrderFromHistory("po-001");
      expect(deleted).toBe(true);
      expect(getOrderHistory().length).toBe(0);
    });

    it("should handle deletion of non-existent order gracefully", () => {
      const deleted = deleteOrderFromHistory("non-existent");
      expect(deleted).toBe(true);
    });
  });

  describe("getOrdersBySupplier", () => {
    it("should filter orders by supplier name", () => {
      saveOrderToHistory(mockOrder);
      saveOrderToHistory({
        ...mockOrder,
        id: "po-002",
        vendorName: "Other Supplier",
      });

      const orders = getOrdersBySupplier("Test Supplier");
      expect(orders.length).toBe(1);
      expect(orders[0].vendorName).toBe("Test Supplier");
    });

    it("should return empty array for non-existent supplier", () => {
      const orders = getOrdersBySupplier("Non-existent");
      expect(orders).toEqual([]);
    });
  });

  describe("getOrdersByDateRange", () => {
    it("should filter orders by date range", () => {
      saveOrderToHistory({ ...mockOrder, date: "2024-01-10" });
      saveOrderToHistory({ ...mockOrder, id: "po-002", date: "2024-01-15" });
      saveOrderToHistory({ ...mockOrder, id: "po-003", date: "2024-02-01" });

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-20");
      const orders = getOrdersByDateRange(startDate, endDate);

      expect(orders.length).toBe(2);
    });
  });

  describe("getSupplierStatistics", () => {
    it("should calculate supplier statistics", () => {
      const order1 = {
        ...mockOrder,
        id: "po-001",
        vendorName: "Supplier A",
        total: 100,
      };
      const order2 = {
        ...mockOrder,
        id: "po-002",
        vendorName: "Supplier A",
        total: 150,
      };

      saveOrderToHistory(order1);
      saveOrderToHistory(order2);

      const stats = getSupplierStatistics();
      const supplierA = stats.find((s) => s.supplierName === "Supplier A");

      expect(supplierA?.totalOrders).toBe(2);
      expect(supplierA?.totalSpent).toBe(250);
      expect(supplierA?.averageOrderValue).toBe(125);
    });

    it("should sort by total spent", () => {
      saveOrderToHistory({ ...mockOrder, vendorName: "Supplier A", total: 50 });
      saveOrderToHistory({
        ...mockOrder,
        id: "po-002",
        vendorName: "Supplier B",
        total: 200,
      });

      const stats = getSupplierStatistics();
      expect(stats[0].supplierName).toBe("Supplier B");
      expect(stats[1].supplierName).toBe("Supplier A");
    });
  });

  describe("getCostTrends", () => {
    it("should retrieve cost trends for ingredient", () => {
      saveOrderToHistory({
        ...mockOrder,
        lineItems: [
          {
            ...mockOrder.lineItems[0],
            ingredientName: "Tomatoes",
            unitCost: 2.0,
          },
        ],
      });

      const trends = getCostTrends("Tomatoes");
      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0].ingredient).toBe("Tomatoes");
    });

    it("should filter by date range", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200);
      const oldDateStr = oldDate.toISOString().split("T")[0];

      saveOrderToHistory({
        ...mockOrder,
        date: oldDateStr,
      });

      const trends = getCostTrends("Tomatoes", 90);
      expect(trends.length).toBe(0);
    });
  });

  describe("getSpendingSummary", () => {
    it("should calculate spending summary", () => {
      saveOrderToHistory(mockOrder);
      const summary = getSpendingSummary();

      expect(summary.totalSpent).toBe(25.0);
      expect(summary.orderCount).toBe(1);
      expect(summary.averageOrderValue).toBe(25.0);
      expect(summary.topSupplier).toBe("Test Supplier");
    });

    it("should handle empty history", () => {
      const summary = getSpendingSummary();
      expect(summary.totalSpent).toBe(0);
      expect(summary.orderCount).toBe(0);
    });
  });
});
