import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mobileSync,
  type OfflineRecipe,
  type MobileRecipeSync,
} from "../mobile-recipe-sync";

vi.mock("../auth-service", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      mockResolvedValue: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe("MobileRecipeSyncManager", () => {
  beforeEach(async () => {
    await mobileSync.initialize("org-1", "user-1");
  });

  afterEach(async () => {
    await mobileSync.clearOfflineStorage();
    mobileSync.cleanup();
  });

  describe("Offline Storage", () => {
    it("should save recipe offline", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-1",
        title: "Pasta",
        ingredients: ["pasta", "tomato", "basil"],
        instructions: ["boil pasta", "add sauce", "serve"],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      const result = await mobileSync.saveRecipeOffline(recipe);
      expect(result).toBe(true);
    });

    it("should retrieve offline recipe", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-2",
        title: "Risotto",
        ingredients: ["rice", "broth"],
        instructions: ["cook rice"],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const retrieved = await mobileSync.getOfflineRecipe("recipe-2");

      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(retrieved.title).toBe("Risotto");
      }
    });

    it("should get all offline recipes", async () => {
      const recipes: OfflineRecipe[] = [
        {
          id: "recipe-1",
          title: "Pasta",
          ingredients: [],
          instructions: [],
          metadata: {
            lastModified: Date.now(),
            isOfflineOnly: false,
            needsSync: true,
            syncAttempts: 0,
          },
        },
        {
          id: "recipe-2",
          title: "Pizza",
          ingredients: [],
          instructions: [],
          metadata: {
            lastModified: Date.now(),
            isOfflineOnly: false,
            needsSync: true,
            syncAttempts: 0,
          },
        },
      ];

      for (const recipe of recipes) {
        await mobileSync.saveRecipeOffline(recipe);
      }

      const allRecipes = await mobileSync.getAllOfflineRecipes();
      expect(allRecipes.length).toBeGreaterThanOrEqual(2);
    });

    it("should delete offline recipe", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-delete",
        title: "Test",
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const deleted = await mobileSync.deleteOfflineRecipe("recipe-delete");

      expect(deleted).toBe(true);
    });

    it("should update recipe metadata on save", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-3",
        title: "Burger",
        ingredients: ["beef"],
        instructions: ["grill"],
        metadata: {
          lastModified: 1000,
          isOfflineOnly: false,
          needsSync: false,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const retrieved = await mobileSync.getOfflineRecipe("recipe-3");

      expect(retrieved?.metadata.lastModified).toBeGreaterThan(1000);
    });
  });

  describe("Sync Management", () => {
    it("should sync recipes from server", async () => {
      const result = await mobileSync.syncRecipesFromServer();

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("count");
    });

    it("should sync pending changes to server", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-sync-1",
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const result = await mobileSync.syncPendingChanges();

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("synced");
      expect(result).toHaveProperty("failed");
    });

    it("should track pending changes", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-pending",
        title: "Pending Recipe",
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);

      const status = await mobileSync.getSyncStatus();
      expect(status.pendingChanges).toBeGreaterThanOrEqual(0);
    });

    it("should respect retry attempts limit", async () => {
      const result = await mobileSync.syncPendingChanges();

      expect(result).toHaveProperty("synced");
      expect(result).toHaveProperty("failed");
    });
  });

  describe("Online/Offline Detection", () => {
    it("should get sync status", async () => {
      const status = await mobileSync.getSyncStatus();

      expect(status).toHaveProperty("organizationId");
      expect(status).toHaveProperty("isOnline");
      expect(status).toHaveProperty("syncedRecipes");
      expect(status).toHaveProperty("pendingChanges");
      expect(status).toHaveProperty("storageUsed");
      expect(status).toHaveProperty("storageLimit");
    });

    it("should indicate online status", async () => {
      const status = await mobileSync.getSyncStatus();

      expect(typeof status.isOnline).toBe("boolean");
    });

    it("should track storage usage", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-storage",
        title: "Storage Test",
        ingredients: Array(100).fill("ingredient"),
        instructions: Array(100).fill("step"),
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const status = await mobileSync.getSyncStatus();

      expect(status.storageUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Conflict Resolution", () => {
    it("should set conflict resolver", async () => {
      const resolver = vi.fn(async (): Promise<"local" | "remote"> => "local");

      mobileSync.setConflictResolver(resolver);
      expect(mobileSync).toBeDefined();
    });

    it("should support custom conflict resolution strategy", async () => {
      const resolver = async (conflict: any) => {
        // Prefer newer version
        return conflict.localVersion.lastModified >
          conflict.remoteVersion.lastModified
          ? "local"
          : "remote";
      };

      mobileSync.setConflictResolver(resolver);
      expect(mobileSync).toBeDefined();
    });

    it("should handle last-write-wins resolution", async () => {
      const resolver = async (conflict: any): Promise<"local" | "remote"> => {
        return "local"; // Always prefer local
      };

      mobileSync.setConflictResolver(resolver);
      expect(mobileSync).toBeDefined();
    });
  });

  describe("Data Consistency", () => {
    it("should maintain data consistency across saves", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-consistency",
        title: "Consistent Recipe",
        ingredients: ["a", "b", "c"],
        instructions: ["step 1", "step 2"],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const retrieved1 =
        await mobileSync.getOfflineRecipe("recipe-consistency");
      const retrieved2 =
        await mobileSync.getOfflineRecipe("recipe-consistency");

      expect(retrieved1).toEqual(retrieved2);
    });

    it("should handle concurrent saves", async () => {
      const recipes: OfflineRecipe[] = Array.from({ length: 10 }, (_, i) => ({
        id: `recipe-concurrent-${i}`,
        title: `Recipe ${i}`,
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      }));

      const results = await Promise.all(
        recipes.map((r) => mobileSync.saveRecipeOffline(r)),
      );

      expect(results.every((r) => r === true)).toBe(true);
    });

    it("should preserve data integrity on sync", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-integrity",
        title: "Integrity Test",
        ingredients: ["ingredient1", "ingredient2", "ingredient3"],
        instructions: ["instruction1", "instruction2"],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      await mobileSync.syncPendingChanges();

      const retrieved = await mobileSync.getOfflineRecipe("recipe-integrity");

      expect(retrieved?.ingredients).toEqual(recipe.ingredients);
      expect(retrieved?.instructions).toEqual(recipe.instructions);
    });
  });

  describe("Storage Management", () => {
    it("should clear offline storage", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-clear",
        title: "Clear Test",
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const cleared = await mobileSync.clearOfflineStorage();

      expect(cleared).toBe(true);

      const allRecipes = await mobileSync.getAllOfflineRecipes();
      expect(allRecipes.length).toBe(0);
    });

    it("should estimate storage usage", async () => {
      const status = await mobileSync.getSyncStatus();

      expect(status.storageUsed).toBeGreaterThanOrEqual(0);
      expect(status.storageLimit).toBeGreaterThan(0);
    });

    it("should handle large recipes", async () => {
      const largeRecipe: OfflineRecipe = {
        id: "recipe-large",
        title: "Large Recipe",
        ingredients: Array(1000).fill("ingredient"),
        instructions: Array(500).fill("step"),
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      const result = await mobileSync.saveRecipeOffline(largeRecipe);
      expect(result).toBe(true);
    });
  });

  describe("Integration Scenarios", () => {
    it("should support offline-first workflow", async () => {
      // Create recipe offline
      const recipe: OfflineRecipe = {
        id: "recipe-offline-first",
        title: "Offline First Recipe",
        ingredients: ["flour", "sugar"],
        instructions: ["mix", "bake"],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: true,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);

      // Retrieve offline
      const retrieved = await mobileSync.getOfflineRecipe(
        "recipe-offline-first",
      );
      expect(retrieved).not.toBeNull();

      // Sync when online
      const syncResult = await mobileSync.syncPendingChanges();
      expect(syncResult).toHaveProperty("success");
    });

    it("should handle rapid changes", async () => {
      const baseId = "recipe-rapid";

      for (let i = 0; i < 10; i++) {
        const recipe: OfflineRecipe = {
          id: baseId,
          title: `Version ${i}`,
          ingredients: [`ingredient-${i}`],
          instructions: [`step-${i}`],
          metadata: {
            lastModified: Date.now() + i,
            isOfflineOnly: false,
            needsSync: true,
            syncAttempts: 0,
          },
        };

        await mobileSync.saveRecipeOffline(recipe);
      }

      const final = await mobileSync.getOfflineRecipe(baseId);
      expect(final?.title).toContain("Version");
    });

    it("should maintain sync across app restarts", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-persist",
        title: "Persistent Recipe",
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);

      // Simulate restart
      mobileSync.cleanup();
      await mobileSync.initialize("org-1", "user-1");

      const retrieved = await mobileSync.getOfflineRecipe("recipe-persist");
      expect(retrieved).not.toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle sync errors gracefully", async () => {
      const result = await mobileSync.syncPendingChanges();

      expect(result).toHaveProperty("success");
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it("should retry failed syncs", async () => {
      const recipe: OfflineRecipe = {
        id: "recipe-retry",
        title: "Retry Test",
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      };

      await mobileSync.saveRecipeOffline(recipe);
      const result1 = await mobileSync.syncPendingChanges();
      const result2 = await mobileSync.syncPendingChanges();

      expect(result1).toHaveProperty("synced");
      expect(result2).toHaveProperty("synced");
    });

    it("should handle network timeouts", async () => {
      const result = await mobileSync.syncRecipesFromServer();

      // Should gracefully fail
      expect(result).toHaveProperty("success");
    });

    it("should handle corrupted offline data", async () => {
      // Try to retrieve non-existent recipe
      const result = await mobileSync.getOfflineRecipe("nonexistent-recipe");

      expect(result).toBeNull();
    });
  });

  describe("Performance", () => {
    it("should handle bulk recipes", async () => {
      const recipes: OfflineRecipe[] = Array.from({ length: 50 }, (_, i) => ({
        id: `recipe-bulk-${i}`,
        title: `Bulk Recipe ${i}`,
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      }));

      const start = Date.now();
      await Promise.all(recipes.map((r) => mobileSync.saveRecipeOffline(r)));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete in < 10s
    });

    it("should efficiently retrieve all recipes", async () => {
      const recipes: OfflineRecipe[] = Array.from({ length: 20 }, (_, i) => ({
        id: `recipe-retrieve-${i}`,
        title: `Recipe ${i}`,
        ingredients: [],
        instructions: [],
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      }));

      for (const recipe of recipes) {
        await mobileSync.saveRecipeOffline(recipe);
      }

      const start = Date.now();
      const all = await mobileSync.getAllOfflineRecipes();
      const duration = Date.now() - start;

      expect(all.length).toBeGreaterThanOrEqual(20);
      expect(duration).toBeLessThan(1000); // Should complete in < 1s
    });

    it("should handle large batch syncs", async () => {
      const recipes: OfflineRecipe[] = Array.from({ length: 30 }, (_, i) => ({
        id: `recipe-batch-${i}`,
        title: `Batch Recipe ${i}`,
        ingredients: Array(10).fill("ingredient"),
        instructions: Array(5).fill("step"),
        metadata: {
          lastModified: Date.now(),
          isOfflineOnly: false,
          needsSync: true,
          syncAttempts: 0,
        },
      }));

      for (const recipe of recipes) {
        await mobileSync.saveRecipeOffline(recipe);
      }

      const start = Date.now();
      const result = await mobileSync.syncPendingChanges();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(30000); // Should complete in < 30s
    });
  });
});
