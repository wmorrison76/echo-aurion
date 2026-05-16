import type {
  CocktailRecipe,
  RecipeCosting,
  RecipeIngredient,
  RecipePerformance,
} from "../types/recipe";

import { osBus } from "../lib/os-bus";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api";

export class RecipeService {
  static async getAllRecipes(): Promise<CocktailRecipe[]> {
    const response = await fetch(`${API_BASE_URL}/mixology/recipes`);
    return response.json();
  }

  static async getRecipe(recipeId: string): Promise<CocktailRecipe> {
    const response = await fetch(
      `${API_BASE_URL}/mixology/recipes/${encodeURIComponent(recipeId)}`,
    );
    return response.json();
  }

  static async createRecipe(
    recipe: Partial<CocktailRecipe>,
  ): Promise<CocktailRecipe> {
    const costing = await this.calculateCosting(
      (recipe.ingredients as any[]) || [],
    );
    const newRecipe: Partial<CocktailRecipe> = {
      ...recipe,
      version: "1.0.0",
      status: recipe.status || "draft",
      costing,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await fetch(`${API_BASE_URL}/mixology/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecipe),
    });

    const created = await response.json();
    try {
      osBus.emit?.("mixology:recipe_created" as any, { id: created?.id });
    } catch {
      /* ignore */
    }
    return created;
  }

  static async updateRecipe(
    recipeId: string,
    updates: Partial<CocktailRecipe>,
  ): Promise<CocktailRecipe> {
    const nextUpdates: Partial<CocktailRecipe> = {
      ...updates,
      updatedAt: new Date(),
    };
    if (nextUpdates.ingredients) {
      nextUpdates.costing = await this.calculateCosting(
        nextUpdates.ingredients as any,
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/mixology/recipes/${encodeURIComponent(recipeId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextUpdates),
      },
    );
    return response.json();
  }

  static async createVersion(
    recipeId: string,
    updates: Partial<CocktailRecipe>,
  ): Promise<CocktailRecipe> {
    const currentRecipe = await this.getRecipe(recipeId);
    const newVersion = this.incrementVersion(currentRecipe.version);

    const versionedRecipe: Partial<CocktailRecipe> = {
      ...currentRecipe,
      ...updates,
      version: newVersion,
      parentVersion: currentRecipe.id,
      changes: this.calculateChanges(currentRecipe, updates),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (versionedRecipe.ingredients) {
      versionedRecipe.costing = await this.calculateCosting(
        versionedRecipe.ingredients as any,
      );
    }

    const response = await fetch(`${API_BASE_URL}/mixology/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(versionedRecipe),
    });
    return response.json();
  }

  static async deleteRecipe(recipeId: string): Promise<void> {
    await fetch(
      `${API_BASE_URL}/mixology/recipes/${encodeURIComponent(recipeId)}`,
      { method: "DELETE" },
    );
  }

  static async calculateCosting(
    ingredients: RecipeIngredient[],
  ): Promise<RecipeCosting> {
    let totalCost = 0;
    for (const ingredient of ingredients) {
      const inventoryItem = await this.getInventoryItem(
        ingredient.ingredientId,
      );
      const cost = this.calculateIngredientCost(
        ingredient.quantity,
        ingredient.unit,
        inventoryItem.costPerUnit,
        inventoryItem.unit,
      );
      (ingredient as any).cost = cost;
      totalCost += cost;
    }

    const sellingPrice = 18.0;
    const margin = sellingPrice - totalCost;
    const marginPercent = sellingPrice ? (margin / sellingPrice) * 100 : 0;

    return {
      totalCost,
      costPerOz: totalCost / Math.max(1, this.getTotalVolume(ingredients)),
      sellingPrice,
      margin,
      marginPercent,
      lastUpdated: new Date(),
    } as any;
  }

  private static async getInventoryItem(ingredientId: string): Promise<{
    costPerUnit: number;
    unit: string;
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/inventory/items/${encodeURIComponent(ingredientId)}`,
      );
      const data = await response.json();
      return { costPerUnit: data.cost_price || 0, unit: data.unit || "oz" };
    } catch (error) {
      console.error("Failed to get inventory item:", error);
      return { costPerUnit: 0, unit: "oz" };
    }
  }

  private static calculateIngredientCost(
    quantity: number,
    unit: string,
    costPerUnit: number,
    inventoryUnit: string,
  ): number {
    const conversionFactor = this.getUnitConversion(unit, inventoryUnit);
    return quantity * costPerUnit * conversionFactor;
  }

  private static getUnitConversion(from: string, to: string): number {
    const conversions: Record<string, Record<string, number>> = {
      oz: { ml: 29.5735, dash: 0.1, slice: 0.1 },
      ml: { oz: 0.033814, dash: 0.00338, slice: 0.00338 },
      dash: { oz: 10, ml: 295.735 },
      slice: { oz: 10, ml: 295.735 },
    };
    return conversions[from]?.[to] || 1;
  }

  private static getTotalVolume(ingredients: RecipeIngredient[]): number {
    return ingredients.reduce((total, ing) => {
      if (ing.unit === "oz" || ing.unit === "ml") return total + ing.quantity;
      return total;
    }, 0);
  }

  private static incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = Number.parseInt(parts[2] || "0", 10) + 1;
    return `${parts[0] || "1"}.${parts[1] || "0"}.${patch}`;
  }

  private static calculateChanges(
    current: CocktailRecipe,
    updates: Partial<CocktailRecipe>,
  ): string[] {
    const changes: string[] = [];
    if (updates.ingredients) changes.push("Ingredients updated");
    if (updates.instructions) changes.push("Instructions updated");
    if (updates.notes) changes.push("Notes updated");
    return changes;
  }

  static async getPerformance(recipeId: string): Promise<RecipePerformance> {
    const response = await fetch(
      `${API_BASE_URL}/mixology/recipes/${encodeURIComponent(recipeId)}/performance`,
    );
    return response.json();
  }
}
