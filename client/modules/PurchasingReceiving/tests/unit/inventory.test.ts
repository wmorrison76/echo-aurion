import { describe, it, expect, beforeEach } from "vitest";
interface InventoryItem {
  id: string;
  productId: string;
  onHand: number;
  par: number;
  min: number;
  max: number;
} // Utility functions to test
function calculateDaysOfStock(
  onHand: number,
  dailyUsage: number,
): number | null {
  if (dailyUsage <= 0) return null;
  return onHand / dailyUsage;
}
function calculateOrderQuantity(
  onHand: number,
  par: number,
  leadTime: number,
): number {
  const safetyStock = par * 0.5;
  const projectedUsage = par * (leadTime / 7); // Assume par is weekly usage const reorderPoint = safetyStock + projectedUsage; return Math.max(0, par - onHand + projectedUsage);
}
function isLowStock(inventory: InventoryItem): boolean {
  return inventory.onHand <= inventory.min;
}
function isOverstock(inventory: InventoryItem): boolean {
  return inventory.onHand > inventory.max;
}
function calculateStockValue(
  inventory: InventoryItem,
  costPerUnit: number,
): number {
  return inventory.onHand * costPerUnit;
}
describe("Inventory Utilities", () => {
  let testInventory: InventoryItem;
  beforeEach(() => {
    testInventory = {
      id: "inv-1",
      productId: "prod-1",
      onHand: 50,
      par: 100,
      min: 25,
      max: 150,
    };
  });
  describe("calculateDaysOfStock", () => {
    it("should calculate days of stock correctly", () => {
      expect(calculateDaysOfStock(100, 10)).toBe(10);
      expect(calculateDaysOfStock(50, 5)).toBe(10);
      expect(calculateDaysOfStock(0, 10)).toBe(0);
    });
    it("should return null for zero or negative daily usage", () => {
      expect(calculateDaysOfStock(100, 0)).toBeNull();
      expect(calculateDaysOfStock(100, -5)).toBeNull();
    });
    it("should handle fractional days", () => {
      expect(calculateDaysOfStock(10, 3)).toBeCloseTo(3.33, 2);
    });
  });
  describe("calculateOrderQuantity", () => {
    it("should calculate order quantity with lead time", () => {
      const quantity = calculateOrderQuantity(50, 100, 7);
      expect(quantity).toBeGreaterThan(0);
    });
    it("should not order negative quantities", () => {
      const quantity = calculateOrderQuantity(150, 100, 7);
      expect(quantity).toBeGreaterThanOrEqual(0);
    });
    it("should account for lead time", () => {
      const short = calculateOrderQuantity(50, 100, 3);
      const long = calculateOrderQuantity(50, 100, 14);
      expect(long).toBeGreaterThan(short);
    });
  });
  describe("isLowStock", () => {
    it("should identify low stock", () => {
      testInventory.onHand = 20;
      expect(isLowStock(testInventory)).toBe(true);
    });
    it("should identify adequate stock", () => {
      testInventory.onHand = 50;
      expect(isLowStock(testInventory)).toBe(false);
    });
    it("should consider at-minimum as not low", () => {
      testInventory.onHand = testInventory.min;
      expect(isLowStock(testInventory)).toBe(false);
    });
  });
  describe("isOverstock", () => {
    it("should identify overstock", () => {
      testInventory.onHand = 160;
      expect(isOverstock(testInventory)).toBe(true);
    });
    it("should identify adequate stock", () => {
      testInventory.onHand = 100;
      expect(isOverstock(testInventory)).toBe(false);
    });
    it("should consider at-maximum as not overstock", () => {
      testInventory.onHand = testInventory.max;
      expect(isOverstock(testInventory)).toBe(false);
    });
  });
  describe("calculateStockValue", () => {
    it("should calculate total stock value", () => {
      expect(calculateStockValue(testInventory, 10)).toBe(500);
      expect(calculateStockValue(testInventory, 2.5)).toBe(125);
    });
    it("should handle zero inventory", () => {
      testInventory.onHand = 0;
      expect(calculateStockValue(testInventory, 10)).toBe(0);
    });
    it("should handle fractional costs", () => {
      expect(calculateStockValue(testInventory, 3.75)).toBe(187.5);
    });
  });
});
