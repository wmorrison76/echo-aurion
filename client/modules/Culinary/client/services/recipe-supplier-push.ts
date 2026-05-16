/**
 * Recipe-to-Supplier Push Service
 *
 * Exports recipe ingredient lists to supplier ordering systems
 * Generates purchase orders from recipe scaling
 */

import {
  supplierAPIService,
  type SupplierOrderRequest,
  type SupplierOrderResponse,
} from "../../../PurchasingReceiving/client/services/supplier-api-integration";

export interface RecipeIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  supplierId?: string;
  supplierSku?: string;
}

export interface ScaledRecipe {
  recipeId: string;
  recipeName: string;
  scaleFactor: number; // e.g., 2.0 = double the recipe
  servings: number;
  ingredients: RecipeIngredient[];
}

export interface PurchaseOrderRequest {
  supplierId: string;
  recipes: ScaledRecipe[];
  deliveryDate?: string;
  notes?: string;
}

export interface PurchaseOrderResult {
  orderId: string;
  supplierId: string;
  status: "pending" | "confirmed" | "error";
  items: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    sku?: string;
    status: "confirmed" | "backordered" | "unavailable";
  }>;
  estimatedDelivery?: string;
  totalCost?: number;
}

class RecipeSupplierPushService {
  /**
   * Generate purchase order from scaled recipes
   */
  async generatePurchaseOrder(
    request: PurchaseOrderRequest,
  ): Promise<PurchaseOrderResult> {
    console.log(
      `[RecipeSupplierPush] Generating PO for ${request.recipes.length} recipes`,
    );

    // Aggregate ingredients across all recipes
    const aggregated = this.aggregateIngredients(request.recipes);

    // Match ingredients to supplier catalog
    const matchedItems = await this.matchToSupplierCatalog(
      request.supplierId,
      aggregated,
    );

    // Create supplier order request
    const supplierOrder: SupplierOrderRequest = {
      supplierId: request.supplierId,
      items: matchedItems.map((item) => ({
        sku: item.sku || "",
        quantity: item.quantity,
        unit: item.unit,
      })),
      deliveryDate: request.deliveryDate,
      notes: request.notes,
    };

    // Place order with supplier
    try {
      const response = await supplierAPIService.placeOrder(supplierOrder);

      return {
        orderId: response.orderId,
        supplierId: request.supplierId,
        status: response.status === "confirmed" ? "confirmed" : "pending",
        items: response.items.map((item) => ({
          ingredientName:
            matchedItems.find((m) => m.sku === item.sku)?.name || "Unknown",
          quantity: item.quantity,
          unit: matchedItems.find((m) => m.sku === item.sku)?.unit || "",
          sku: item.sku,
          status: item.status,
        })),
        estimatedDelivery: response.estimatedDelivery,
      };
    } catch (error) {
      console.error("[RecipeSupplierPush] Order placement failed:", error);
      return {
        orderId: "",
        supplierId: request.supplierId,
        status: "error",
        items: matchedItems.map((item) => ({
          ingredientName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          sku: item.sku,
          status: "unavailable" as const,
        })),
      };
    }
  }

  /**
   * Export recipe ingredients to supplier format
   */
  async exportToSupplierFormat(
    recipes: ScaledRecipe[],
    supplierId: string,
  ): Promise<{
    format: "csv" | "json" | "xml";
    data: string;
    filename: string;
  }> {
    const aggregated = this.aggregateIngredients(recipes);
    const matched = await this.matchToSupplierCatalog(supplierId, aggregated);

    // Generate CSV format
    const csv = this.generateCSV(matched);

    return {
      format: "csv",
      data: csv,
      filename: `recipe-order-${supplierId}-${Date.now()}.csv`,
    };
  }

  /**
   * Private methods
   */

  private aggregateIngredients(
    recipes: ScaledRecipe[],
  ): Map<string, RecipeIngredient> {
    const aggregated = new Map<string, RecipeIngredient>();

    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = `${ingredient.ingredientId}:${ingredient.unit}`;
        const existing = aggregated.get(key);

        if (existing) {
          existing.quantity += ingredient.quantity;
        } else {
          aggregated.set(key, {
            ...ingredient,
            quantity: ingredient.quantity,
          });
        }
      }
    }

    return aggregated;
  }

  private async matchToSupplierCatalog(
    supplierId: string,
    ingredients: Map<string, RecipeIngredient>,
  ): Promise<Array<RecipeIngredient & { sku?: string }>> {
    const catalog = supplierAPIService.getCatalog(supplierId);
    const matched: Array<RecipeIngredient & { sku?: string }> = [];

    for (const ingredient of ingredients.values()) {
      // Try to find in supplier catalog
      const catalogItem = supplierAPIService.matchInvoiceItemToCatalog(
        supplierId,
        ingredient.name,
        undefined,
        ingredient.supplierSku,
      );

      if (catalogItem) {
        matched.push({
          ...ingredient,
          supplierId,
          sku: catalogItem.sku,
        });
      } else {
        // No match - include anyway (supplier will need to handle)
        matched.push({
          ...ingredient,
          supplierId,
        });
      }
    }

    return matched;
  }

  private generateCSV(
    items: Array<RecipeIngredient & { sku?: string }>,
  ): string {
    const headers = ["SKU", "Product Name", "Quantity", "Unit"];
    const rows = items.map((item) => [
      item.sku || "",
      item.name,
      item.quantity.toString(),
      item.unit,
    ]);

    return [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
  }
}

export const recipeSupplierPushService = new RecipeSupplierPushService();
