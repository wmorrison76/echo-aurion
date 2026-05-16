/**
 * Cloud Recipe Sync Service
 * Synchronizes recipes between local storage and Supabase
 * Ensures recipes are consistent across all devices
 */

import type { Recipe } from "@shared/recipes";
import { supabase } from "./auth-service";

interface CloudRecipe extends Recipe {
  synced_at?: string;
  is_deleted?: boolean;
}

class CloudRecipeSync {
  private syncing = false;
  private lastSyncTime: number = 0;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes
  private localStorageKey = "app.recipes.v1";

  /**
   * Initialize cloud sync for recipes
   * Loads recipes from Supabase on first load
   */
  async initialize(userId: string | null): Promise<Recipe[]> {
    if (!userId || !supabase) {
      console.log("[CloudRecipeSync] No user or Supabase, using local storage only");
      return this.getLocalRecipes();
    }

    try {
      // Load recipes from Supabase
      const cloudRecipes = await this.fetchFromSupabase(userId);
      
      // Get local recipes for comparison
      const localRecipes = this.getLocalRecipes();

      // Merge: cloud recipes take precedence for newer items
      const merged = this.mergeRecipes(localRecipes, cloudRecipes);

      // Store merged recipes locally
      this.saveLocalRecipes(merged);

      // Sync any local changes to cloud
      await this.syncLocalChangesToCloud(userId, merged);

      this.lastSyncTime = Date.now();
      return merged;
    } catch (error) {
      console.error("[CloudRecipeSync] Failed to initialize cloud sync:", error);
      // Fall back to local storage
      return this.getLocalRecipes();
    }
  }

  /**
   * Fetch recipes from Supabase for the current user
   */
  private async fetchFromSupabase(userId: string): Promise<CloudRecipe[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from("user_recipes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) {
        console.warn("[CloudRecipeSync] Failed to fetch from Supabase:", error);
        return [];
      }

      return (data || []).map((r: any) => this.cloudToLocal(r));
    } catch (error) {
      console.error("[CloudRecipeSync] Error fetching recipes:", error);
      return [];
    }
  }

  /**
   * Save recipes to Supabase
   */
  async saveRecipeToCloud(userId: string | null, recipe: Recipe): Promise<boolean> {
    if (!userId || !supabase) {
      console.log("[CloudRecipeSync] No user or Supabase, skipping cloud save");
      return false;
    }

    try {
      const cloudData = this.localToCloud(recipe, userId);

      const { error } = await supabase.from("user_recipes").upsert(cloudData, {
        onConflict: "id",
      });

      if (error) {
        console.error("[CloudRecipeSync] Failed to save recipe:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[CloudRecipeSync] Error saving recipe:", error);
      return false;
    }
  }

  /**
   * Batch save recipes to cloud
   */
  async saveRecipeBatchToCloud(userId: string | null, recipes: Recipe[]): Promise<number> {
    if (!userId || !supabase || recipes.length === 0) return 0;

    try {
      const cloudData = recipes.map((r) => this.localToCloud(r, userId));

      const { error, data } = await supabase
        .from("user_recipes")
        .upsert(cloudData, { onConflict: "id" });

      if (error) {
        console.error("[CloudRecipeSync] Failed to batch save recipes:", error);
        return 0;
      }

      return data?.length || recipes.length;
    } catch (error) {
      console.error("[CloudRecipeSync] Error batch saving recipes:", error);
      return 0;
    }
  }

  /**
   * Delete recipe from cloud
   */
  async deleteRecipeFromCloud(userId: string | null, recipeId: string): Promise<boolean> {
    if (!userId || !supabase) return false;

    try {
      // Soft delete: mark as deleted
      const { error } = await supabase
        .from("user_recipes")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", recipeId)
        .eq("user_id", userId);

      if (error) {
        console.error("[CloudRecipeSync] Failed to delete recipe:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[CloudRecipeSync] Error deleting recipe:", error);
      return false;
    }
  }

  /**
   * Sync local changes to cloud
   * Called after merging to ensure all local changes are persisted
   */
  private async syncLocalChangesToCloud(userId: string, recipes: Recipe[]): Promise<void> {
    const cloudSyncKey = "app.recipes.cloud-synced.v1";
    const syncedIds = new Set(JSON.parse(localStorage.getItem(cloudSyncKey) || "[]"));

    const toSync = recipes.filter((r) => !syncedIds.has(r.id));

    if (toSync.length === 0) return;

    console.log(`[CloudRecipeSync] Syncing ${toSync.length} recipes to cloud...`);

    const savedCount = await this.saveRecipeBatchToCloud(userId, toSync);

    // Mark as synced
    toSync.forEach((r) => syncedIds.add(r.id));
    localStorage.setItem(cloudSyncKey, JSON.stringify(Array.from(syncedIds)));

    console.log(
      `[CloudRecipeSync] Synced ${savedCount} / ${toSync.length} recipes to cloud`
    );
  }

  /**
   * Merge local and cloud recipes
   * Cloud recipes with newer timestamps take precedence
   */
  private mergeRecipes(local: Recipe[], cloud: CloudRecipe[]): Recipe[] {
    const merged = new Map<string, Recipe>();

    // Add local recipes
    for (const recipe of local) {
      merged.set(recipe.id, recipe);
    }

    // Override with cloud recipes if newer
    for (const cloudRecipe of cloud) {
      const local = merged.get(cloudRecipe.id);

      // Cloud recipe is newer or doesn't exist locally
      if (!local || (cloudRecipe.synced_at && cloudRecipe.synced_at > new Date(local.createdAt).toISOString())) {
        merged.set(cloudRecipe.id, cloudRecipe as Recipe);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Get recipes from local storage
   */
  private getLocalRecipes(): Recipe[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("[CloudRecipeSync] Error reading local recipes:", error);
      return [];
    }
  }

  /**
   * Save recipes to local storage
   */
  private saveLocalRecipes(recipes: Recipe[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(recipes));
    } catch (error) {
      console.error("[CloudRecipeSync] Error saving local recipes:", error);
    }
  }

  /**
   * Convert cloud format to local format
   */
  private cloudToLocal(cloudRecipe: any): Recipe {
    return {
      id: cloudRecipe.id,
      title: cloudRecipe.title,
      description: cloudRecipe.description,
      image: undefined,
      imageDataUrls: cloudRecipe.image_data_url ? [cloudRecipe.image_data_url] : [],
      cuisine: cloudRecipe.cuisine,
      course: cloudRecipe.course,
      tags: cloudRecipe.tags || [],
      ingredients: cloudRecipe.ingredients || [],
      instructions: cloudRecipe.instructions || [],
      yield: cloudRecipe.yield,
      servings: cloudRecipe.servings,
      prepTime: cloudRecipe.prep_time,
      cookTime: cloudRecipe.cook_time,
      totalTime: cloudRecipe.total_time,
      difficultyLevel: cloudRecipe.difficulty_level,
      calories: cloudRecipe.calories ? Number(cloudRecipe.calories) : undefined,
      rating: cloudRecipe.rating,
      favorite: cloudRecipe.is_favorite,
      createdAt: new Date(cloudRecipe.created_at).getTime(),
      extra: cloudRecipe.extra,
    } as Recipe;
  }

  /**
   * Convert local format to cloud format
   */
  private localToCloud(recipe: Recipe, userId: string): any {
    return {
      id: recipe.id,
      user_id: userId,
      title: recipe.title,
      description: recipe.description,
      image_data_url: recipe.imageDataUrls?.[0],
      cuisine: recipe.cuisine,
      course: recipe.course,
      dietary_restrictions: recipe.tags?.filter((t) => 
        ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "keto", "paleo"].includes(t.toLowerCase())
      ),
      tags: recipe.tags,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      yield: recipe.yield,
      servings: recipe.servings,
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      total_time: recipe.totalTime,
      difficulty_level: recipe.difficultyLevel,
      calories: recipe.calories,
      nutrition: recipe.extra?.nutrition,
      extra: recipe.extra,
      rating: recipe.rating,
      is_favorite: recipe.favorite,
      is_deleted: false,
      source: "user-created",
    };
  }

  /**
   * Enable periodic sync
   */
  startPeriodicSync(userId: string | null): () => void {
    const interval = setInterval(async () => {
      if (!this.syncing && userId) {
        this.syncing = true;
        try {
          const recipes = await this.initialize(userId);
          console.log(`[CloudRecipeSync] Periodic sync completed. ${recipes.length} recipes.`);
        } finally {
          this.syncing = false;
        }
      }
    }, this.syncInterval);

    return () => clearInterval(interval);
  }
}

export const cloudRecipeSync = new CloudRecipeSync();
