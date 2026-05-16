/**
 * FastAPI Backend Adapter for PurchRec
 * Wires the PurchRec module to the LUCCCA backend at /api/ordering/*
 * instead of fixtures or Supabase.
 */
import type { PurchRecAdapters } from "./adapters";
import type { MenuItem, Recipe, Ingredient } from "../data/schemas";

const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== "undefined" ? window.location.origin : "") ;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export const fastApiAdapters: PurchRecAdapters = {
  /**
   * List active menu items from POS
   */
  listActiveMenuItems: async (): Promise<MenuItem[]> => {
    try {
      const data = await apiFetch<{ items: any[] }>("/ordering/menu");
      return data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        category: item.category || "Other",
        isActive: true,
        recipeId: item.recipe_id || null,
      }));
    } catch {
      // Fallback to empty
      return [];
    }
  },

  /**
   * Get recipe by ID — maps to operations route
   */
  getRecipeById: async (recipeId: string): Promise<Recipe | null> => {
    try {
      const data = await apiFetch<any>(`/operations/recipe/${recipeId}`);
      return {
        id: data.id,
        name: data.name,
        yield: data.yield || 1,
        components: (data.ingredients || []).map((ing: any) => ({
          ingredientId: ing.ingredient_id || ing.id,
          name: ing.name,
          quantity: ing.quantity || 0,
          unit: ing.unit || "ea",
          yieldPct: ing.yield_pct || 1,
          wastePct: ing.waste_pct || 0,
        })),
      };
    } catch {
      return null;
    }
  },

  /**
   * Issue stock for a recipe — consumes inventory
   */
  issueStockForRecipe: async (recipeId: string, qty: number): Promise<void> => {
    try {
      await apiFetch("/operations/consume", {
        method: "POST",
        body: JSON.stringify({
          recipe_id: recipeId,
          portions: qty,
        }),
      });
    } catch (e) {
      console.warn("[PurchRec] Stock issue failed:", e);
    }
  },

  /**
   * Get on-hand inventory from ordering module
   */
  getInventoryOnHand: async (
    outletId?: string,
  ): Promise<Record<string, { qtyBase: number; unit: string }>> => {
    try {
      const params = outletId ? `?outlet_id=${outletId}` : "";
      const data = await apiFetch<{ items: any[] }>(`/ordering/on-hand${params}`);
      const map: Record<string, { qtyBase: number; unit: string }> = {};
      for (const item of data.items || []) {
        map[item.id] = {
          qtyBase: item.current_stock || item.on_hand || 0,
          unit: item.unit || "ea",
        };
      }
      return map;
    } catch {
      return {};
    }
  },

  /**
   * Invalidate any cached data
   */
  invalidateCache: async () => {
    // No-op — FastAPI queries are live
  },
};
