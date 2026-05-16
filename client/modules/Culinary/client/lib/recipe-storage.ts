import type { Recipe } from "@shared/recipes";
import { uid } from "uid";

/**
 * Recipe storage configuration
 */
export interface StorageConfig {
  userId: string;
  organizationId?: string;
  maxRecipesPerExport: number;
  autoBackupInterval: number; // in minutes
  enableCloudSync: boolean;
}

/**
 * Recipe file metadata for storage organization
 */
export interface RecipeFileMetadata {
  id: string;
  recipeId: string;
  title: string;
  fileName: string;
  fileSize: number;
  lastModified: Date;
  storageType: "local" | "cloud" | "backup";
  backupCount: number;
  syncStatus: "synced" | "pending" | "failed";
}

/**
 * Storage organization structure
 */
export class RecipeStorageManager {
  private config: StorageConfig;
  private storageKey = "recipe-storage-metadata";

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * Organize recipes into storage folders
   */
  getStoragePathForRecipe(recipe: Recipe): string {
    const dateFolder = new Date(recipe.createdAt).toISOString().slice(0, 7); // YYYY-MM
    const cuisineFolder = recipe.tags?.[0] || "uncategorized";
    return `recipes/${dateFolder}/${cuisineFolder}/${recipe.id}`;
  }

  /**
   * Get suggested file name for recipe export
   */
  getSuggestedFileName(recipe: Recipe, includeTimestamp = false): string {
    const baseFileName = recipe.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const extension = ".json";

    if (includeTimestamp) {
      const timestamp = new Date().toISOString().slice(0, 10);
      return `${baseFileName}-${timestamp}${extension}`;
    }

    return `${baseFileName}${extension}`;
  }

  /**
   * Save recipe file metadata to local storage
   */
  saveFileMetadata(metadata: RecipeFileMetadata): void {
    const allMetadata = this.getAllFileMetadata();
    const existingIndex = allMetadata.findIndex((m) => m.id === metadata.id);

    if (existingIndex >= 0) {
      allMetadata[existingIndex] = metadata;
    } else {
      allMetadata.push(metadata);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(allMetadata));
  }

  /**
   * Get all file metadata from local storage
   */
  getAllFileMetadata(): RecipeFileMetadata[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get metadata for a specific recipe
   */
  getRecipeMetadata(recipeId: string): RecipeFileMetadata | null {
    const allMetadata = this.getAllFileMetadata();
    return allMetadata.find((m) => m.recipeId === recipeId) || null;
  }

  /**
   * Create backup metadata for recipe
   */
  createBackupMetadata(recipe: Recipe): RecipeFileMetadata {
    const existing = this.getRecipeMetadata(recipe.id);
    const backupCount = (existing?.backupCount || 0) + 1;

    return {
      id: uid(),
      recipeId: recipe.id,
      title: recipe.title,
      fileName: `${this.getSuggestedFileName(recipe)}-backup-${backupCount}.json`,
      fileSize: JSON.stringify(recipe).length,
      lastModified: new Date(),
      storageType: "backup",
      backupCount,
      syncStatus: "pending",
    };
  }

  /**
   * Organize recipes by criterion
   */
  organizeRecipesByTag(recipes: Recipe[]): Record<string, Recipe[]> {
    const organized: Record<string, Recipe[]> = {};

    recipes.forEach((recipe) => {
      if (!recipe.tags || recipe.tags.length === 0) {
        if (!organized["uncategorized"]) {
          organized["uncategorized"] = [];
        }
        organized["uncategorized"].push(recipe);
      } else {
        recipe.tags.forEach((tag) => {
          if (!organized[tag]) {
            organized[tag] = [];
          }
          organized[tag].push(recipe);
        });
      }
    });

    return organized;
  }

  /**
   * Organize recipes by cuisine
   */
  organizeRecipesByCuisine(recipes: Recipe[]): Record<string, Recipe[]> {
    const organized: Record<string, Recipe[]> = {};

    recipes.forEach((recipe) => {
      const cuisine = recipe.tags?.[0] || "other";
      if (!organized[cuisine]) {
        organized[cuisine] = [];
      }
      organized[cuisine].push(recipe);
    });

    return organized;
  }

  /**
   * Organize recipes by creation date
   */
  organizeRecipesByDate(recipes: Recipe[]): Record<string, Recipe[]> {
    const organized: Record<string, Recipe[]> = {};

    recipes.forEach((recipe) => {
      const dateKey = new Date(recipe.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!organized[dateKey]) {
        organized[dateKey] = [];
      }
      organized[dateKey].push(recipe);
    });

    return organized;
  }

  /**
   * Generate storage summary/stats
   */
  generateStorageSummary(recipes: Recipe[]) {
    const totalRecipes = recipes.length;
    const totalSize = recipes.reduce(
      (sum, r) => sum + JSON.stringify(r).length,
      0
    );
    const averageSize = totalSize / (totalRecipes || 1);

    const byTag = this.organizeRecipesByTag(recipes);
    const byDate = this.organizeRecipesByDate(recipes);

    const oldestRecipe = recipes.reduce((oldest, current) => {
      return new Date(current.createdAt) < new Date(oldest.createdAt)
        ? current
        : oldest;
    });

    const newestRecipe = recipes.reduce((newest, current) => {
      return new Date(current.createdAt) > new Date(newest.createdAt)
        ? current
        : newest;
    });

    return {
      totalRecipes,
      totalSize,
      averageSize,
      tagCount: Object.keys(byTag).length,
      dateRangeMonths: Object.keys(byDate).length,
      oldestRecipeDate: oldestRecipe?.createdAt,
      newestRecipeDate: newestRecipe?.createdAt,
      estimatedBackupSize: totalSize * 1.2, // With metadata overhead
    };
  }

  /**
   * Check if storage quota is exceeded (simulated)
   */
  isStorageQuotaExceeded(recipes: Recipe[], quotaMB: number = 100): boolean {
    const totalSize = recipes.reduce(
      (sum, r) => sum + JSON.stringify(r).length,
      0
    );
    return totalSize > quotaMB * 1024 * 1024;
  }

  /**
   * Suggest recipes to archive based on age
   */
  suggestRecipesForArchive(recipes: Recipe[], ageDays: number = 365): Recipe[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ageDays);

    return recipes.filter((r) => new Date(r.updatedAt) < cutoffDate);
  }
}

/**
 * Local IndexedDB storage for large recipe data
 */
export class RecipeIndexedDBStore {
  private dbName = "recipe-store";
  private storeName = "recipes";
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Save recipe to IndexedDB
   */
  async saveRecipe(recipe: Recipe): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(recipe);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get recipe from IndexedDB
   */
  async getRecipe(recipeId: string): Promise<Recipe | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(recipeId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Get all recipes from IndexedDB
   */
  async getAllRecipes(): Promise<Recipe[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Delete recipe from IndexedDB
   */
  async deleteRecipe(recipeId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(recipeId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all recipes from IndexedDB
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
