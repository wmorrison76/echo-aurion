/**
 * useEchoAI3RecipeChain — client-side driver for the AI^3 culinary chain.
 *
 * Wraps POST /api/echo-ai3/recipe-chain/{build,compose,publish-pos,run} so any
 * panel (CulinaryRecipeBuilder, EMERGENT Culinary RecipeInputPage, MaestroBQT,
 * BanquetMenuBuilder) can drive the same end-to-end flow:
 *
 *   AI^3 ChefIntent  →  Recipe (priced from invoices + yields)
 *                    →  Plated Dish (cost rolled up across components)
 *                    →  POS publication (food-cost % computed against sell price)
 *
 * The hook returns one method per chain step plus loading + last-error state.
 * It does not assume any global state framework — callers can stash results
 * in their own state.
 */
import { useCallback, useState } from "react";

const API = (typeof window !== "undefined" ? window.location.origin : "");

export interface ChefIntentItem {
  name: string;
  qty: number;
  unit: string;
  prep?: string;
  unitCost?: number;
  yieldPct?: number;
}

export interface ChefIntent {
  name: string;
  servings: number;
  items: ChefIntentItem[];
  notes?: string;
  courseHint?: string;
  orgId?: string;
}

export interface ChainRecipe {
  id: string;
  name: string;
  servings: number;
  items: Array<ChefIntentItem & { unitCost: number; yieldPct: number; lineCost: number; vendorName?: string; vendorSku?: string }>;
  totalCost: number;
  costPerServing: number;
  notes?: string;
  courseHint?: string;
  orgId: string;
  source: "echo-ai3";
  createdAt: string;
}

export interface DishComponent {
  recipeId: string;
  portions: number;
}

export interface ChainDish {
  id: string;
  name: string;
  components: Array<DishComponent & { recipeName: string; lineCost: number }>;
  totalCost: number;
  plateNotes?: string;
  orgId: string;
  source: "echo-ai3";
  createdAt: string;
}

export interface PosCostPublication {
  id: string;
  dishId: string;
  dishName: string;
  posSystem: string;
  posCode: string;
  unitCost: number;
  sellPrice?: number;
  foodCostPct?: number;
  outletId?: string;
  orgId: string;
  publishedAt: string;
}

interface PublishInput {
  dishId: string;
  posSystem: string;
  posCode: string;
  sellPrice?: number;
  outletId?: string;
  orgId?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Request failed: ${res.status}`);
  }
  return json as T;
}

export function useEchoAI3RecipeChain() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRecipe = useCallback(async (intent: ChefIntent): Promise<ChainRecipe> => {
    setLoading(true);
    setError(null);
    try {
      const r = await post<{ recipe: ChainRecipe }>("/api/echo-ai3/recipe-chain/build", intent);
      return r.recipe;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const composeDish = useCallback(
    async (input: { dishName: string; components: DishComponent[]; plateNotes?: string; orgId?: string }): Promise<ChainDish> => {
      setLoading(true);
      setError(null);
      try {
        const r = await post<{ dish: ChainDish }>("/api/echo-ai3/recipe-chain/compose", input);
        return r.dish;
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const publishPosCost = useCallback(async (input: PublishInput): Promise<PosCostPublication> => {
    setLoading(true);
    setError(null);
    try {
      const r = await post<{ publication: PosCostPublication }>(
        "/api/echo-ai3/recipe-chain/publish-pos",
        input,
      );
      return r.publication;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const runFullChain = useCallback(
    async (args: {
      intent: ChefIntent;
      portionsPerDish?: number;
      pos?: { posSystem: string; posCode: string; sellPrice?: number; outletId?: string };
    }): Promise<{ recipe: ChainRecipe; dish: ChainDish; publication?: PosCostPublication }> => {
      setLoading(true);
      setError(null);
      try {
        const r = await post<{
          recipe: ChainRecipe;
          dish: ChainDish;
          publication?: PosCostPublication;
        }>("/api/echo-ai3/recipe-chain/run", args);
        return { recipe: r.recipe, dish: r.dish, publication: r.publication };
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { buildRecipe, composeDish, publishPosCost, runFullChain, loading, error };
}
