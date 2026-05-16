import type { MenuItem, Recipe } from "../data/schemas";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { loadMenuItems, loadRecipe, loadOnHand } from "./fixtures";

/**
 * Helper to add timeout to async operations
 * Handles Supabase-style {data, error} responses and any thrown errors
 * Never throws - always resolves with a result object
 * @param promise The promise to wrap (typically Supabase query)
 * @param timeoutMs Timeout in milliseconds (default: 5000ms)
 * @returns Promise that always resolves with {data, error} object
 */
function withTimeout<T extends { data: any; error: any }>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
): Promise<T> {
  return Promise.race([
    promise.catch((err) => {
      // If the promise throws (network error, etc.), convert to Supabase format
      return {
        data: null,
        error: err,
      } as T;
    }),
    new Promise<T>((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: null,
            error: new Error(`Operation timed out after ${timeoutMs}ms`),
          } as T),
        timeoutMs,
      ),
    ),
  ]);
}

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  if (url.includes("placeholder") || key.includes("placeholder")) {
    return false;
  }

  if (!url.includes("supabase.co")) {
    return false;
  }

  if (key.length < 20) {
    return false;
  }

  return true;
}

export interface RealAdapters {
  listActiveMenuItems: () => Promise<MenuItem[]>;
  getRecipeById: (recipeId: string) => Promise<Recipe | null>;
  issueStockForRecipe: (recipeId: string, qty: number) => Promise<void>;
  getInventoryOnHand: (
    outletId?: string,
  ) => Promise<Record<string, { qtyBase: number; unit: string }>>;
  invalidateCache: () => Promise<void>;
}

class RealAdaptersImpl implements RealAdapters {
  private menuItemsCache: MenuItem[] | null = null;
  private recipesCache: Map<string, Recipe> = new Map();
  private onHandCache: Record<
    string,
    { qtyBase: number; unit: string }
  > | null = null;
  private cacheTimestamps = { menuItems: 0, onHand: 0 };
  private readonly CACHE_TTL = 30000;
  private supabaseAvailable: boolean;

  constructor() {
    this.supabaseAvailable = isSupabaseConfigured();
    if (!this.supabaseAvailable) {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      logger.info(
        "Supabase not properly configured - using fixture data only",
        {
          hasUrl: !!url,
          urlIsValid:
            url && !url.includes("placeholder") && url.includes("supabase.co"),
          hasKey: !!key,
          keyIsValid: key && !key.includes("placeholder") && key.length > 20,
        },
      );
    }
  }

  private serializeError(error: any): Record<string, any> {
    if (!error) return { message: "Unknown error" };
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack?.split("\n").slice(0, 3).join(" |"),
      };
    }
    if (typeof error === "object") {
      return {
        message: error.message || JSON.stringify(error).substring(0, 200),
        code: error.code,
        status: error.status,
      };
    }
    return { message: String(error) };
  }

  async listActiveMenuItems(): Promise<MenuItem[]> {
    try {
      const now = Date.now();
      if (
        this.menuItemsCache &&
        now - this.cacheTimestamps.menuItems < this.CACHE_TTL
      ) {
        logger.debug("Using cached menu items");
        return this.menuItemsCache;
      }

      if (!this.supabaseAvailable) {
        logger.warn("Supabase unavailable, loading fixtures for menu items");
        return await loadMenuItems().catch((err) => {
          logger.error("Failed to load fixture menu items", this.serializeError(err));
          return [];
        });
      }

      logger.debug("Fetching menu items from Supabase");
      // Wrap in try-catch to handle any errors from withTimeout
      let data: any = null;
      let error: any = null;
      try {
        const query = supabase
          .from("recipes")
          .select("id, name, short_code, outlet_id, status")
          .eq("status", "active")
          .limit(1000);
        const result = await withTimeout(query);
        data = result.data;
        error = result.error;
      } catch (timeoutErr) {
        // Timeout or other error from withTimeout
        logger.error("withTimeout threw exception", this.serializeError(timeoutErr));
        error = timeoutErr;
      }

      if (error) {
        logger.error(
          "Failed to fetch menu items from Supabase",
          this.serializeError(error),
        );
        this.supabaseAvailable = false;
        logger.info("Falling back to fixture data for menu items");
        return await loadMenuItems().catch((err) => {
          logger.error("Failed to load fixture menu items", this.serializeError(err));
          return [];
        });
      }

      this.supabaseAvailable = true;
      this.menuItemsCache = (data || []).map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name,
        recipeId: recipe.id,
        active: recipe.status === "active" || true,
      }));
      this.cacheTimestamps.menuItems = now;
      logger.info("Menu items updated from Supabase", {
        count: this.menuItemsCache.length,
      });
      return this.menuItemsCache;
    } catch (err) {
      logger.error("listActiveMenuItems exception", this.serializeError(err));
      this.supabaseAvailable = false;
      try {
        return await loadMenuItems().catch((fallbackErr) => {
          logger.error(
            "Failed to load fixtures for menu items",
            this.serializeError(fallbackErr),
          );
          return [];
        });
      } catch (finalErr) {
        logger.error("Final exception in listActiveMenuItems", this.serializeError(finalErr));
        return [];
      }
    }
  }

  async getRecipeById(recipeId: string): Promise<Recipe | null> {
    try {
      if (this.recipesCache.has(recipeId)) {
        return this.recipesCache.get(recipeId) || null;
      }

      if (!this.supabaseAvailable) {
        return await loadRecipe(recipeId);
      }

      logger.debug("Fetching recipe", { recipeId });
      const query = supabase
        .from("recipes")
        .select("*")
        .eq("id", recipeId)
        .single();
      const { data, error } = await withTimeout(query);

      if (error) {
        logger.warn("Failed to fetch recipe from Supabase, using fixture", {
          recipeId,
          error: this.serializeError(error),
        });
        this.supabaseAvailable = false;
        return await loadRecipe(recipeId);
      }

      if (!data) {
        logger.warn("Recipe not found in Supabase", { recipeId });
        return await loadRecipe(recipeId);
      }

      this.supabaseAvailable = true;
      const recipe: Recipe = {
        id: data.id,
        name: data.name,
        shortCode: data.short_code,
        components: data.components || [],
        status: data.status,
      };
      this.recipesCache.set(recipeId, recipe);
      return recipe;
    } catch (err) {
      logger.warn("getRecipeById exception", {
        recipeId,
        error: this.serializeError(err),
      });
      return await loadRecipe(recipeId);
    }
  }

  async getInventoryOnHand(
    outletId?: string,
  ): Promise<Record<string, { qtyBase: number; unit: string }>> {
    try {
      const now = Date.now();
      if (
        this.onHandCache &&
        now - this.cacheTimestamps.onHand < this.CACHE_TTL
      ) {
        logger.debug("Using cached on-hand inventory");
        return this.onHandCache;
      }

      if (!this.supabaseAvailable) {
        logger.warn("Supabase unavailable, loading fixtures for inventory");
        return await loadOnHand().catch((err) => {
          logger.error("Failed to load fixture inventory", this.serializeError(err));
          return {};
        });
      }

      logger.debug("Fetching inventory on-hand from Supabase", { outletId });
      // Wrap in try-catch to handle any errors from withTimeout
      let data: any = null;
      let error: any = null;
      try {
        let query = supabase
          .from("inventory_events")
          .select("item_id, quantity, unit, outlet_id")
          .eq("event_type", "current_on_hand");

        if (outletId) {
          query = query.eq("outlet_id", outletId);
        } else {
          query = query.is("outlet_id", null);
        }

        const result = await withTimeout(query);
        data = result.data;
        error = result.error;
      } catch (timeoutErr) {
        // Timeout or other error from withTimeout
        logger.error("withTimeout threw exception", this.serializeError(timeoutErr));
        error = timeoutErr;
      }

      if (error) {
        logger.error(
          "Failed to fetch inventory from Supabase",
          this.serializeError(error),
        );
        this.supabaseAvailable = false;
        logger.info("Falling back to fixture data for inventory");
        return await loadOnHand().catch((err) => {
          logger.error("Failed to load fixture inventory", this.serializeError(err));
          return {};
        });
      }

      this.supabaseAvailable = true;
      this.onHandCache = {};
      (data || []).forEach((row: any) => {
        this.onHandCache![row.item_id] = {
          qtyBase: row.quantity,
          unit: row.unit,
        };
      });
      this.cacheTimestamps.onHand = now;
      logger.info("Inventory on-hand updated from Supabase", {
        count: Object.keys(this.onHandCache).length,
      });
      return this.onHandCache;
    } catch (err) {
      logger.error("getInventoryOnHand exception", this.serializeError(err));
      this.supabaseAvailable = false;
      try {
        return await loadOnHand().catch((fallbackErr) => {
          logger.error(
            "Failed to load fixture inventory",
            this.serializeError(fallbackErr),
          );
          return {};
        });
      } catch (finalErr) {
        logger.error("Final exception in getInventoryOnHand", this.serializeError(finalErr));
        return {};
      }
    }
  }

  async issueStockForRecipe(recipeId: string, qty: number): Promise<void> {
    try {
      logger.info("Issuing stock for recipe", { recipeId, qty });
      await this.invalidateCache();
    } catch (err) {
      logger.error("issueStockForRecipe exception", {
        recipeId,
        qty,
        error: this.serializeError(err),
      });
      throw err;
    }
  }

  async invalidateCache(): Promise<void> {
    logger.debug("Invalidating PurchRec cache");
    this.menuItemsCache = null;
    this.recipesCache.clear();
    this.onHandCache = null;
    this.cacheTimestamps = { menuItems: 0, onHand: 0 };
  }
}

let realAdaptersInstance: RealAdaptersImpl | null = null;

function getRealAdaptersInstance(): RealAdaptersImpl {
  if (!realAdaptersInstance) {
    try {
      realAdaptersInstance = new RealAdaptersImpl();
    } catch (err) {
      logger.error("Failed to initialize RealAdaptersImpl", {
        message: err instanceof Error ? err.message : String(err),
      });
      realAdaptersInstance = new RealAdaptersImpl();
    }
  }
  return realAdaptersInstance;
}

export const realAdapters: RealAdapters = {
  listActiveMenuItems: () => getRealAdaptersInstance().listActiveMenuItems(),
  getRecipeById: (recipeId: string) =>
    getRealAdaptersInstance().getRecipeById(recipeId),
  issueStockForRecipe: (recipeId: string, qty: number) =>
    getRealAdaptersInstance().issueStockForRecipe(recipeId, qty),
  getInventoryOnHand: (outletId?: string) =>
    getRealAdaptersInstance().getInventoryOnHand(outletId),
  invalidateCache: () => getRealAdaptersInstance().invalidateCache(),
};

export function setupRealtimeUpdates(): () => void {
  logger.debug("Setting up real-time update subscriptions");
  const subscriptions: any[] = [];

  try {
    const recipeChannel = supabase
      .channel("recipe-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recipes" },
        () => {
          logger.debug("Recipe update detected, invalidating cache");
          getRealAdaptersInstance().invalidateCache();
        },
      )
      .subscribe();
    subscriptions.push(recipeChannel);
  } catch (err) {
    logger.warn("Failed to subscribe to recipe updates", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const inventoryChannel = supabase
      .channel("inventory-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_events" },
        () => {
          logger.debug("Inventory update detected, invalidating cache");
          getRealAdaptersInstance().invalidateCache();
        },
      )
      .subscribe();
    subscriptions.push(inventoryChannel);
  } catch (err) {
    logger.warn("Failed to subscribe to inventory updates", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return () => {
    subscriptions.forEach((sub) => {
      try {
        supabase.removeChannel(sub);
      } catch (err) {
        logger.warn("Failed to unsubscribe from channel", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };
}
