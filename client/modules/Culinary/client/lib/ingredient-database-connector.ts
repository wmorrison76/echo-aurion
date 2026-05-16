/**
 * National/Standardized Ingredient Database Connector
 * Supports integration with USDA FoodData Central, Open Food Facts, and other standardized databases
 */

export interface StandardizedIngredient {
  // Unique identifier from the database
  externalId: string;
  dataSource: "usda" | "open-food-facts" | "custom" | "other";
  
  // Names and descriptions
  commonName: string;
  scientificName?: string;
  alternateNames?: string[];
  description?: string;
  
  // Classification
  category?: string;
  foodGroup?: string;
  usdaCategory?: string;
  
  // Nutrition per 100g (standard serving size)
  nutrition?: {
    calories: number;
    protein: number; // grams
    fat: number; // grams
    carbohydrates: number; // grams
    fiber: number; // grams
    sugar: number; // grams
    sodium: number; // milligrams
    calcium: number; // milligrams
    iron: number; // milligrams
    potassium: number; // milligrams
    [key: string]: number | undefined;
  };
  
  // Allergen information
  allergens?: string[];
  
  // Source metadata
  lastUpdated?: number;
  dataQuality?: number; // 0-1 confidence score
}

/**
 * USDA FoodData Central Integration
 * Free public API for accessing standardized food data
 * https://fdc.nal.usda.gov/api-guide.html
 */
export class USDAFoodDatabase {
  private apiKey?: string;
  private baseUrl = "https://api.nal.usda.gov/fdc/v1";
  private cache = new Map<string, StandardizedIngredient>();

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for ingredients in USDA database
   * @param query - Search term
   * @returns Array of matching ingredients
   */
  async search(query: string): Promise<StandardizedIngredient[]> {
    if (!query.trim()) return [];

    try {
      const params = new URLSearchParams({
        query,
        pageSize: "20",
        ...(this.apiKey ? { api_key: this.apiKey } : {}),
      });

      const response = await fetch(
        `${this.baseUrl}/foods/search?${params}`,
        { headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) {
        console.error("USDA API error:", response.statusText);
        return [];
      }

      const data = await response.json();
      return this.parseUSDAResults(data);
    } catch (error) {
      console.error("Error searching USDA database:", error);
      return [];
    }
  }

  /**
   * Get detailed ingredient information from USDA
   * @param fdcId - USDA FDC ID
   */
  async getDetail(fdcId: string): Promise<StandardizedIngredient | null> {
    // Check cache first
    const cached = this.cache.get(fdcId);
    if (cached) return cached;

    try {
      const params = new URLSearchParams(
        this.apiKey ? { api_key: this.apiKey } : {}
      );

      const response = await fetch(`${this.baseUrl}/food/${fdcId}?${params}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const ingredient = this.parseUSDADetail(data);
      this.cache.set(fdcId, ingredient);
      return ingredient;
    } catch (error) {
      console.error("Error fetching USDA detail:", error);
      return null;
    }
  }

  /**
   * Parse USDA search results into standard format
   */
  private parseUSDAResults(data: any): StandardizedIngredient[] {
    if (!data.foods) return [];

    return data.foods.map((food: any) => ({
      externalId: food.fdcId,
      dataSource: "usda" as const,
      commonName: food.description,
      category: food.foodCategory,
      nutrition: this.extractNutrients(food.foodNutrients),
      lastUpdated: new Date(food.lastModifiedDate).getTime(),
      dataQuality: 0.9, // USDA data is high quality
    }));
  }

  /**
   * Parse USDA detail into standard format
   */
  private parseUSDADetail(data: any): StandardizedIngredient {
    return {
      externalId: data.fdcId,
      dataSource: "usda" as const,
      commonName: data.description,
      category: data.foodCategory,
      nutrition: this.extractNutrients(data.foodNutrients),
      allergens: this.extractAllergens(data),
      lastUpdated: new Date(data.lastModifiedDate).getTime(),
      dataQuality: 0.95,
    };
  }

  /**
   * Extract nutrition data from USDA nutrients array
   */
  private extractNutrients(nutrients: any[]): Record<string, number> {
    const result: Record<string, number> = {};

    const nutrientMap: Record<string, string> = {
      "1003": "protein",
      "1004": "fat",
      "1005": "carbohydrates",
      "1079": "fiber",
      "2000": "sugar",
      "1093": "sodium",
      "1087": "calcium",
      "1089": "iron",
      "1092": "potassium",
      "1008": "calories",
      "1018": "vitaminA",
      "1162": "vitaminC",
      "1106": "vitaminD",
      "1124": "vitaminE",
      "1087": "calcium",
      "1089": "iron",
    };

    if (!Array.isArray(nutrients)) return result;

    for (const nutrient of nutrients) {
      const key = nutrientMap[nutrient.nutrientId];
      if (key && nutrient.value !== null) {
        result[key] = nutrient.value;
      }
    }

    return result;
  }

  /**
   * Extract allergen information from USDA data
   */
  private extractAllergens(data: any): string[] {
    const allergens: string[] = [];

    if (data.foodComponents) {
      for (const component of data.foodComponents) {
        // Common allergen markers in USDA data
        const allergenKeywords = [
          "milk",
          "egg",
          "peanut",
          "tree nut",
          "fish",
          "shellfish",
          "soy",
          "wheat",
          "sesame",
        ];
        const componentName = component.name?.toLowerCase() || "";
        for (const allergen of allergenKeywords) {
          if (
            componentName.includes(allergen) &&
            !allergens.includes(allergen)
          ) {
            allergens.push(allergen);
          }
        }
      }
    }

    return allergens;
  }
}

/**
 * Open Food Facts Integration
 * Community-driven open database of food products
 * https://world.openfoodfacts.org/api/v2
 */
export class OpenFoodFactsDatabase {
  private baseUrl = "https://world.openfoodfacts.org/api/v2";
  private cache = new Map<string, StandardizedIngredient>();

  /**
   * Search for ingredients
   */
  async search(query: string): Promise<StandardizedIngredient[]> {
    if (!query.trim()) return [];

    try {
      const params = new URLSearchParams({
        search_terms: query,
        page_size: "20",
        fields:
          "code,product_name,brands,nutriments,allergens,generic_name",
      });

      const response = await fetch(
        `${this.baseUrl}/search?${params}`,
        { headers: { "User-Agent": "FoodServiceApp/1.0" } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.parseResults(data);
    } catch (error) {
      console.error("Error searching Open Food Facts:", error);
      return [];
    }
  }

  /**
   * Parse Open Food Facts results
   */
  private parseResults(data: any): StandardizedIngredient[] {
    if (!data.products) return [];

    return data.products
      .filter((product: any) => product.product_name)
      .map((product: any) => ({
        externalId: product.code,
        dataSource: "open-food-facts" as const,
        commonName: product.product_name,
        description: product.generic_name,
        allergens: this.parseAllergens(product.allergens),
        nutrition: this.parseNutrients(product.nutriments),
        lastUpdated: Date.now(),
        dataQuality: 0.7, // Community data, variable quality
      }));
  }

  /**
   * Parse allergens from Open Food Facts
   */
  private parseAllergens(allergenString: string): string[] {
    if (!allergenString) return [];
    return allergenString
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
  }

  /**
   * Parse nutrients from Open Food Facts
   */
  private parseNutrients(nutriments: any): Record<string, number> {
    const result: Record<string, number> = {};

    const nutrientMap: Record<string, string> = {
      energy_kcal_100g: "calories",
      proteins_100g: "protein",
      fat_100g: "fat",
      carbohydrates_100g: "carbohydrates",
      fiber_100g: "fiber",
      sugars_100g: "sugar",
      sodium_100g: "sodium",
      calcium_100g: "calcium",
      iron_100g: "iron",
      potassium_100g: "potassium",
    };

    if (!nutriments) return result;

    for (const [key, nutrientName] of Object.entries(nutrientMap)) {
      const value = (nutriments as any)[key];
      if (value !== null && value !== undefined) {
        result[nutrientName as string] = value;
      }
    }

    return result;
  }
}

/**
 * Manager for working with multiple ingredient databases
 * Allows fallback and comparison between sources
 */
export class IngredientDatabaseManager {
  private usda?: USDAFoodDatabase;
  private openFoodFacts: OpenFoodFactsDatabase;
  private localCache = new Map<string, StandardizedIngredient>();

  constructor(usdaApiKey?: string) {
    this.usda = usdaApiKey ? new USDAFoodDatabase(usdaApiKey) : undefined;
    this.openFoodFacts = new OpenFoodFactsDatabase();
  }

  /**
   * Search across all available databases
   * Returns results prioritized by source quality
   */
  async search(query: string): Promise<StandardizedIngredient[]> {
    const results: StandardizedIngredient[] = [];
    const seen = new Set<string>();

    // Try USDA first if available (usually highest quality)
    if (this.usda) {
      try {
        const usdaResults = await this.usda.search(query);
        for (const result of usdaResults) {
          if (!seen.has(result.externalId)) {
            results.push(result);
            seen.add(result.externalId);
          }
        }
      } catch (error) {
        console.error("USDA search failed:", error);
      }
    }

    // Fall back to Open Food Facts
    try {
      const offResults = await this.openFoodFacts.search(query);
      for (const result of offResults) {
        if (!seen.has(result.externalId)) {
          results.push(result);
          seen.add(result.externalId);
        }
      }
    } catch (error) {
      console.error("Open Food Facts search failed:", error);
    }

    // Cache successful results
    for (const result of results) {
      this.localCache.set(result.commonName.toLowerCase(), result);
    }

    return results;
  }

  /**
   * Get ingredient from cache
   */
  getFromCache(name: string): StandardizedIngredient | undefined {
    return this.localCache.get(name.toLowerCase());
  }

  /**
   * Add or update ingredient in local cache
   */
  cacheIngredient(ingredient: StandardizedIngredient): void {
    this.localCache.set(ingredient.commonName.toLowerCase(), ingredient);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.localCache.clear();
  }
}

// Singleton instance
let databaseManager: IngredientDatabaseManager | null = null;

/**
 * Get or create the ingredient database manager
 */
export function getIngredientDatabaseManager(
  usdaApiKey?: string
): IngredientDatabaseManager {
  if (!databaseManager) {
    databaseManager = new IngredientDatabaseManager(usdaApiKey);
  }
  return databaseManager;
}
