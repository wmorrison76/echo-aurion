import type { MenuItem, Recipe } from "../data/schemas";
import { loadMenuItems, loadRecipe } from "./fixtures";
import { realAdapters } from "./realAdapters";
import { fastApiAdapters } from "./fastApiAdapters";

export interface PurchRecAdapters {
  listActiveMenuItems: () => Promise<MenuItem[]>;
  getRecipeById: (recipeId: string) => Promise<Recipe | null>;
  issueStockForRecipe: (recipeId: string, qty: number) => Promise<void>;
  getInventoryOnHand?: (
    outletId?: string,
  ) => Promise<Record<string, { qtyBase: number; unit: string }>>;
  invalidateCache?: () => Promise<void>;
}

const defaultAdapters: PurchRecAdapters = {
  listActiveMenuItems: () => loadMenuItems(),
  getRecipeById: (recipeId) => loadRecipe(recipeId),
  issueStockForRecipe: async () => {
    // no-op for MVP fixtures
  },
};

function isSupabaseConfigured(): boolean {
  const url =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL
      ? import.meta.env.VITE_SUPABASE_URL
      : "";
  const key =
    typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY
      ? import.meta.env.VITE_SUPABASE_ANON_KEY
      : "";

  if (
    !url ||
    !key ||
    url.includes("placeholder") ||
    key.includes("placeholder")
  ) {
    return false;
  }

  if (!url.includes("supabase.co")) {
    return false;
  }

  return true;
}

function isFastApiAvailable(): boolean {
  // FastAPI backend is always available in LUCCCA environment
  const backendUrl = typeof import.meta !== "undefined" && import.meta.env?.REACT_APP_BACKEND_URL;
  // Also available if running on same origin (default LUCCCA setup)
  return true;
}

const supabaseConfigured = isSupabaseConfigured();
const fastApiAvailable = isFastApiAvailable();

// Priority: FastAPI backend > Supabase > Fixtures
let currentAdapters: PurchRecAdapters = fastApiAvailable
  ? fastApiAdapters
  : supabaseConfigured
    ? (realAdapters as PurchRecAdapters)
    : defaultAdapters;
let useFixtures = !fastApiAvailable && !supabaseConfigured;

export function configurePurchRecAdapters(adapters: Partial<PurchRecAdapters>) {
  currentAdapters = { ...currentAdapters, ...adapters };
}

export function getPurchRecAdapters(): PurchRecAdapters {
  return currentAdapters;
}

export function useFixturesMode(enabled: boolean) {
  useFixtures = enabled;
  currentAdapters = enabled
    ? defaultAdapters
    : (realAdapters as PurchRecAdapters);
}

export function isUsingFixtures(): boolean {
  return useFixtures;
}
