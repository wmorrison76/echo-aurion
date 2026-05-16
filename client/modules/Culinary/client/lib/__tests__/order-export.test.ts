import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrderFromRecipeIngredients,
  exportOrderToCSV,
  exportOrderToJSON,
  generateOrderHTML,
  type PurchaseOrder,
} from "../order-export";

describe("Order Export", () => {
  let testOrder: PurchaseOrder;

  beforeEach(() => {
    testOrder = {
      id: "test-po-001",
      date: "2024-01-15",
      vendorName: "Test Supplier",
      vendorEmail: "vendor@test.com",
      vendorPhone: "555-1234",
      organizationName: "Test Restaurant",
      lineItems: [
        {
          ingredientId: "ing-001",
          ingredientName: "Tomatoes",
          supplierId: "sup-001",
          supplierName: "Test Supplier",
          supplierSku: "TOM-001",
          quantity: 10,
          unit: "lb",
          packSize: 5,
          packUnit: "lb",
          unitCost: 2.5,
          totalCost: 25.0,
          leadTimeDays: 3,
        },
        {
          ingredientId: "ing-002",
          ingredientName: "Basil",
          supplierId: "sup-001",
          supplierName: "Test Supplier",
          quantity: 2,
          unit: "bunch",
          unitCost: 1.5,
          totalCost: 3.0,
          leadTimeDays: 2,
        },
      ],
      subtotal: 28.0,
      total: 28.0,
      poNumber: "PO-20240115",
      currency: "USD",
    };
  });

  describe("exportOrderToCSV", () => {
    it("should generate valid CSV format", () => {
      const csv = exportOrderToCSV(testOrder);
      expect(csv).toContain("PO Number: PO-20240115");
      expect(csv).toContain("Tomatoes");
      expect(csv).toContain("Basil");
      expect(csv).toContain("USD 28.00");
    });

    it("should include all line items", () => {
      const csv = exportOrderToCSV(testOrder);
      expect(csv).toContain("10,lb");
      expect(csv).toContain("2,bunch");
    });

    it("should include totals", () => {
      const csv = exportOrderToCSV(testOrder);
      expect(csv).toContain("Total");
      expect(csv).toContain("28.00");
    });

    it("should handle orders with tax and shipping", () => {
      const orderWithTax = {
        ...testOrder,
        subtotal: 100,
        tax: 8.5,
        shipping: 10,
        total: 118.5,
      };
      const csv = exportOrderToCSV(orderWithTax);
      expect(csv).toContain("Tax");
      expect(csv).toContain("8.50");
      expect(csv).toContain("Shipping");
      expect(csv).toContain("10.00");
    });
  });

  describe("exportOrderToJSON", () => {
    it("should generate valid JSON", () => {
      const json = exportOrderToJSON(testOrder);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe("test-po-001");
      expect(parsed.vendorName).toBe("Test Supplier");
      expect(parsed.lineItems.length).toBe(2);
    });

    it("should preserve all order properties", () => {
      const json = exportOrderToJSON(testOrder);
      const parsed = JSON.parse(json);
      expect(parsed.total).toBe(28.0);
      expect(parsed.currency).toBe("USD");
      expect(parsed.poNumber).toBe("PO-20240115");
    });
  });

  describe("generateOrderHTML", () => {
    it("should generate valid HTML", () => {
      const html = generateOrderHTML(testOrder);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Purchase Order");
      expect(html).toContain("</html>");
    });

    it("should include vendor information", () => {
      const html = generateOrderHTML(testOrder);
      expect(html).toContain("Test Supplier");
      expect(html).toContain("vendor@test.com");
      expect(html).toContain("555-1234");
    });

    it("should include all line items in table", () => {
      const html = generateOrderHTML(testOrder);
      expect(html).toContain("Tomatoes");
      expect(html).toContain("Basil");
      expect(html).toContain("<table>");
    });
  });

  describe("createOrderFromRecipeIngredients", () => {
    it("should create order from recipe ingredients", () => {
      const ingredients = [
        {
          ingredientName: "Carrots",
          quantity: 5,
          unit: "lb",
          supplierId: "sup-001",
          supplierName: "Fresh Farm",
          unitCost: 1.0,
        },
        {
          ingredientName: "Onions",
          quantity: 3,
          unit: "lb",
          supplierId: "sup-001",
          supplierName: "Fresh Farm",
          unitCost: 0.8,
        },
      ];

      const order = createOrderFromRecipeIngredients(
        "Test Recipe",
        ingredients,
        "Fresh Farm",
      );

      expect(order.vendorName).toBe("Fresh Farm");
      expect(order.lineItems.length).toBe(2);
      expect(order.total).toBe(7.4); // 5*1.0 + 3*0.8
    });

    it("should calculate total cost correctly", () => {
      const ingredients = [
        {
          ingredientName: "Item A",
          quantity: 10,
          unit: "unit",
          supplierId: "sup-001",
          supplierName: "Supplier",
          unitCost: 5.0,
        },
      ];

      const order = createOrderFromRecipeIngredients("Test", ingredients, "Supplier");
      expect(order.total).toBe(50.0);
      expect(order.lineItems[0].totalCost).toBe(50.0);
    });

    it("should generate unique PO ID", () => {
      const ingredients = [
        {
          ingredientName: "Item",
          quantity: 1,
          unit: "unit",
          supplierId: "sup-001",
          supplierName: "Supplier",
          unitCost: 1.0,
        },
      ];

      const order1 = createOrderFromRecipeIngredients("Test", ingredients, "Supplier");
      const order2 = createOrderFromRecipeIngredients("Test", ingredients, "Supplier");

      expect(order1.id).not.toBe(order2.id);
    });
  });
});
