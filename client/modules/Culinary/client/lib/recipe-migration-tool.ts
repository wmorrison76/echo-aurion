/**
 * Recipe Migration Tool
 * Helps users migrate recipes from local storage to Supabase cloud
 * This enables recipes to sync across all devices
 */

import type { Recipe } from "@shared/recipes";
import { cloudRecipeSync } from "./cloud-recipe-sync";

export interface MigrationStatus {
  totalRecipes: number;
  migratedRecipes: number;
  failedRecipes: number;
  skippedRecipes: number;
  errors: Array<{ recipeId: string; title: string; error: string }>;
  progress: number;
}

class RecipeMigrationTool {
  /**
   * Get migration status
   */
  getMigrationStatus(recipes: Recipe[]): {
    needsMigration: boolean;
    count: number;
  } {
    const cloudSyncKey = "app.recipes.cloud-synced.v1";
    const syncedIds = new Set(JSON.parse(localStorage.getItem(cloudSyncKey) || "[]"));

    const needsMigration = recipes.some((r) => !syncedIds.has(r.id));
    const count = recipes.filter((r) => !syncedIds.has(r.id)).length;

    return { needsMigration, count };
  }

  /**
   * Migrate all local recipes to cloud
   * Returns migration status with detailed results
   */
  async migrateRecipesToCloud(
    userId: string | null,
    recipes: Recipe[],
    onProgress?: (status: MigrationStatus) => void,
  ): Promise<MigrationStatus> {
    if (!userId) {
      return {
        totalRecipes: recipes.length,
        migratedRecipes: 0,
        failedRecipes: 0,
        skippedRecipes: recipes.length,
        errors: [],
        progress: 0,
      };
    }

    const status: MigrationStatus = {
      totalRecipes: recipes.length,
      migratedRecipes: 0,
      failedRecipes: 0,
      skippedRecipes: 0,
      errors: [],
      progress: 0,
    };

    const cloudSyncKey = "app.recipes.cloud-synced.v1";
    const syncedIds = new Set(JSON.parse(localStorage.getItem(cloudSyncKey) || "[]"));

    // Filter out already synced recipes
    const recipesToMigrate = recipes.filter((r) => !syncedIds.has(r.id));

    if (recipesToMigrate.length === 0) {
      status.skippedRecipes = recipes.length;
      status.progress = 100;
      if (onProgress) onProgress(status);
      return status;
    }

    console.log(`[RecipeMigration] Starting migration of ${recipesToMigrate.length} recipes...`);

    // Migrate in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < recipesToMigrate.length; i += batchSize) {
      const batch = recipesToMigrate.slice(i, i + batchSize);

      try {
        const savedCount = await cloudRecipeSync.saveRecipeBatchToCloud(userId, batch);

        // Mark recipes as synced
        batch.forEach((recipe) => {
          syncedIds.add(recipe.id);
        });

        status.migratedRecipes += savedCount;
        status.failedRecipes += batch.length - savedCount;

        // Update localStorage
        localStorage.setItem(cloudSyncKey, JSON.stringify(Array.from(syncedIds)));
      } catch (error) {
        // If batch fails, try individual recipes
        for (const recipe of batch) {
          try {
            const success = await cloudRecipeSync.saveRecipeToCloud(userId, recipe);
            if (success) {
              status.migratedRecipes++;
              syncedIds.add(recipe.id);
            } else {
              status.failedRecipes++;
              status.errors.push({
                recipeId: recipe.id,
                title: recipe.title,
                error: "Failed to save recipe",
              });
            }
          } catch (e) {
            status.failedRecipes++;
            status.errors.push({
              recipeId: recipe.id,
              title: recipe.title,
              error: `${e instanceof Error ? e.message : "Unknown error"}`,
            });
          }
        }

        // Update localStorage after individual saves
        localStorage.setItem(cloudSyncKey, JSON.stringify(Array.from(syncedIds)));
      }

      // Update progress
      status.progress = Math.round(((i + batch.length) / recipesToMigrate.length) * 100);
      if (onProgress) onProgress(status);
    }

    // Mark skipped recipes (already synced)
    status.skippedRecipes = recipes.length - status.migratedRecipes - status.failedRecipes;

    console.log(
      `[RecipeMigration] Migration complete: ${status.migratedRecipes} migrated, ${status.failedRecipes} failed, ${status.skippedRecipes} skipped`,
    );

    status.progress = 100;
    if (onProgress) onProgress(status);

    return status;
  }

  /**
   * Get a summary of migration readiness
   */
  getMigrationSummary(recipes: Recipe[]): {
    isReady: boolean;
    message: string;
    recipesNeedingMigration: number;
    estimatedDuration: string;
  } {
    const { needsMigration, count } = this.getMigrationStatus(recipes);

    let estimatedDuration = "< 1 minute";
    if (count > 100) {
      estimatedDuration = "2-3 minutes";
    } else if (count > 50) {
      estimatedDuration = "1-2 minutes";
    }

    return {
      isReady: recipes.length > 0 && needsMigration,
      message: needsMigration
        ? `${count} recipe(s) ready to migrate to cloud storage`
        : "All recipes are synchronized with cloud storage",
      recipesNeedingMigration: count,
      estimatedDuration,
    };
  }

  /**
   * Create a migration backup (export local recipes before migrating)
   */
  createMigrationBackup(recipes: Recipe[]): Blob {
    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      recipes: recipes,
      count: recipes.length,
    };

    const json = JSON.stringify(backup, null, 2);
    return new Blob([json], { type: "application/json" });
  }

  /**
   * Download migration backup
   */
  downloadMigrationBackup(recipes: Recipe[]): void {
    const blob = this.createMigrationBackup(recipes);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recipe-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const recipeMigrationTool = new RecipeMigrationTool();
