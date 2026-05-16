// Integration with USDA FoodData Central for nutrition database

export type NutrientValue = {
  value: number;
  unit: string;
  per100g: number;
};

export type USDAFoodItem = {
  fdcId: string;
  description: string;
  foodCategory: string;
  publishedDate: string;
  dataType: "Survey (FNDDS)" | "Foundation" | "SR Legacy" | "Branded";
  brandOwner?: string;
  nutrients: {
    energy: NutrientValue; // kcal
    protein: NutrientValue; // g
    fat: NutrientValue; // g
    carbohydrate: NutrientValue; // g
    fiber: NutrientValue; // g
    sugar: NutrientValue; // g
    sodium: NutrientValue; // mg
    calcium: NutrientValue; // mg
    iron: NutrientValue; // mg
    potassium: NutrientValue; // mg
    vitaminA: NutrientValue; // mcg
    vitaminC: NutrientValue; // mg
    vitaminD: NutrientValue; // mcg
    vitaminB12: NutrientValue; // mcg
    [key: string]: NutrientValue | string;
  };
};

export type RecipeNutritionInfo = {
  recipeId: string;
  recipeName: string;
  servingSize: number;
  servingUnit: string;
  perServing: {
    calories: number;
    protein: number; // g
    fat: number; // g
    carbs: number; // g
    fiber: number; // g
    sodium: number; // mg
  };
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    fdcId?: string;
    nutrition: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
  }>;
  allergenInfo: string[];
};

class USDANutritionDB {
  private apiKey = import.meta.env.VITE_USDA_API_KEY || "";
  private baseUrl = "https://fdc.nal.usda.gov/api/foods/search";
  private cache: Map<string, { data: USDAFoodItem; timestamp: number }> =
    new Map();
  private cacheTTL = 86400000; // 24 hours

  /**
   * Search USDA FoodData Central
   */
  async searchFoods(
    query: string,
    limit: number = 10,
  ): Promise<USDAFoodItem[]> {
    const cacheKey = `usda-${query}-${limit}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return [cached.data];
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append("query", query);
      url.searchParams.append("pageSize", limit.toString());
      url.searchParams.append("api_key", this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error("USDA API error:", response.statusText);
        return [];
      }

      const data = await response.json();
      const foods = (data.foods || []).map((f: any) => this.parseUSDAFood(f));

      // Cache top result
      if (foods.length > 0) {
        this.cache.set(cacheKey, { data: foods[0], timestamp: Date.now() });
      }

      return foods;
    } catch (error) {
      console.error("Error searching USDA foods:", error);
      return [];
    }
  }

  /**
   * Get food details by FDC ID
   */
  async getFoodById(fdcId: string): Promise<USDAFoodItem | null> {
    const cacheKey = `usda-id-${fdcId}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const url = new URL(`https://fdc.nal.usda.gov/api/foods/${fdcId}`);
      url.searchParams.append("api_key", this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const food = this.parseUSDAFood(data);

      // Cache result
      this.cache.set(cacheKey, { data: food, timestamp: Date.now() });

      return food;
    } catch (error) {
      console.error("Error fetching USDA food:", error);
      return null;
    }
  }

  /**
   * Search for foods by category
   */
  async searchByCategory(category: string): Promise<USDAFoodItem[]> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append("query", category);
      url.searchParams.append("pageSize", "50");
      url.searchParams.append("api_key", this.apiKey);

      const response = await fetch(url.toString());

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.foods || []).map((f: any) => this.parseUSDAFood(f));
    } catch (error) {
      console.error("Error searching by category:", error);
      return [];
    }
  }

  /**
   * Calculate recipe nutrition from ingredients
   */
  async calculateRecipeNutrition(
    recipeName: string,
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>,
    servingSize: number,
    servingUnit: string,
  ): Promise<RecipeNutritionInfo> {
    const ingredientNutrition = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let totalFiber = 0;
    let totalSodium = 0;

    for (const ingredient of ingredients) {
      const foods = await this.searchFoods(ingredient.name, 1);

      if (foods.length > 0) {
        const food = foods[0];
        const quantity = this.convertToGrams(
          ingredient.quantity,
          ingredient.unit,
        );

        const caloriesPerGram = food.nutrients.energy.per100g / 100;
        const proteinPerGram = food.nutrients.protein.per100g / 100;
        const fatPerGram = food.nutrients.fat.per100g / 100;
        const carbsPerGram = food.nutrients.carbohydrate.per100g / 100;
        const fiberPerGram = food.nutrients.fiber.per100g / 100;
        const sodiumPerGram = food.nutrients.sodium.per100g / 100;

        const ingredientCalories = caloriesPerGram * quantity;
        const ingredientProtein = proteinPerGram * quantity;
        const ingredientFat = fatPerGram * quantity;
        const ingredientCarbs = carbsPerGram * quantity;
        const ingredientFiber = fiberPerGram * quantity;
        const ingredientSodium = sodiumPerGram * quantity;

        totalCalories += ingredientCalories;
        totalProtein += ingredientProtein;
        totalFat += ingredientFat;
        totalCarbs += ingredientCarbs;
        totalFiber += ingredientFiber;
        totalSodium += ingredientSodium;

        ingredientNutrition.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          fdcId: food.fdcId,
          nutrition: {
            calories: ingredientCalories,
            protein: ingredientProtein,
            fat: ingredientFat,
            carbs: ingredientCarbs,
          },
        });
      }
    }

    // Calculate per serving
    const servingSizeGrams = this.convertToGrams(servingSize, servingUnit);
    const servings = Math.max(1, totalCalories > 0 ? 1 : 0);

    return {
      recipeId: `recipe-${Date.now()}`,
      recipeName,
      servingSize,
      servingUnit,
      perServing: {
        calories: Math.round(totalCalories / servings),
        protein: Math.round((totalProtein / servings) * 10) / 10,
        fat: Math.round((totalFat / servings) * 10) / 10,
        carbs: Math.round((totalCarbs / servings) * 10) / 10,
        fiber: Math.round((totalFiber / servings) * 10) / 10,
        sodium: Math.round(totalSodium / servings),
      },
      ingredients: ingredientNutrition,
      allergenInfo: this.detectAllergens(ingredientNutrition),
    };
  }

  /**
   * Get common allergens in food
   */
  async getAllergenInfo(fdcId: string): Promise<string[]> {
    const food = await this.getFoodById(fdcId);
    if (!food) return [];

    const allergens: string[] = [];

    // Check food description for allergen keywords
    const description = food.description.toLowerCase();
    const allergenKeywords: Record<string, string> = {
      peanut: "peanut",
      "tree nut": "tree nut",
      milk: "milk",
      egg: "egg",
      fish: "fish",
      shellfish: "shellfish",
      crustacean: "crustacean",
      wheat: "wheat",
      soy: "soy",
      sesame: "sesame",
      gluten: "gluten",
    };

    Object.values(allergenKeywords).forEach((keyword) => {
      if (description.includes(keyword)) {
        allergens.push(keyword);
      }
    });

    return allergens;
  }

  /**
   * Compare nutrition of similar foods
   */
  async compareNutrition(
    foodName1: string,
    foodName2: string,
  ): Promise<{
    food1: USDAFoodItem | null;
    food2: USDAFoodItem | null;
    comparison: {
      caloriesDiff: number;
      proteinDiff: number;
      fatDiff: number;
      carbsDiff: number;
    };
  }> {
    const foods1 = await this.searchFoods(foodName1, 1);
    const foods2 = await this.searchFoods(foodName2, 1);

    const food1 = foods1[0] || null;
    const food2 = foods2[0] || null;

    return {
      food1,
      food2,
      comparison: {
        caloriesDiff:
          (food2?.nutrients.energy.per100g || 0) -
          (food1?.nutrients.energy.per100g || 0),
        proteinDiff:
          (food2?.nutrients.protein.per100g || 0) -
          (food1?.nutrients.protein.per100g || 0),
        fatDiff:
          (food2?.nutrients.fat.per100g || 0) -
          (food1?.nutrients.fat.per100g || 0),
        carbsDiff:
          (food2?.nutrients.carbohydrate.per100g || 0) -
          (food1?.nutrients.carbohydrate.per100g || 0),
      },
    };
  }

  /**
   * Parse USDA API response
   */
  private parseUSDAFood(data: any): USDAFoodItem {
    const getNutrient = (nutrientId: number, defaultValue: number = 0) => {
      const nutrient = (data.foodNutrients || []).find(
        (n: any) => n.nutrient.id === nutrientId,
      );
      return nutrient?.value || defaultValue;
    };

    return {
      fdcId: data.fdcId,
      description: data.description,
      foodCategory: data.foodCategory || "General",
      publishedDate: data.publishedDate || new Date().toISOString(),
      dataType: data.dataType || "Survey (FNDDS)",
      nutrients: {
        energy: {
          value: getNutrient(1008),
          unit: "kcal",
          per100g: getNutrient(1008),
        }, // Energy
        protein: {
          value: getNutrient(1003),
          unit: "g",
          per100g: getNutrient(1003),
        },
        fat: {
          value: getNutrient(1004),
          unit: "g",
          per100g: getNutrient(1004),
        },
        carbohydrate: {
          value: getNutrient(1005),
          unit: "g",
          per100g: getNutrient(1005),
        },
        fiber: {
          value: getNutrient(1079),
          unit: "g",
          per100g: getNutrient(1079),
        },
        sugar: {
          value: getNutrient(2000),
          unit: "g",
          per100g: getNutrient(2000),
        },
        sodium: {
          value: getNutrient(1093),
          unit: "mg",
          per100g: getNutrient(1093),
        },
        calcium: {
          value: getNutrient(1087),
          unit: "mg",
          per100g: getNutrient(1087),
        },
        iron: {
          value: getNutrient(1089),
          unit: "mg",
          per100g: getNutrient(1089),
        },
        potassium: {
          value: getNutrient(1092),
          unit: "mg",
          per100g: getNutrient(1092),
        },
        vitaminA: {
          value: getNutrient(1104),
          unit: "mcg",
          per100g: getNutrient(1104),
        },
        vitaminC: {
          value: getNutrient(1162),
          unit: "mg",
          per100g: getNutrient(1162),
        },
        vitaminD: {
          value: getNutrient(1114),
          unit: "mcg",
          per100g: getNutrient(1114),
        },
        vitaminB12: {
          value: getNutrient(1168),
          unit: "mcg",
          per100g: getNutrient(1168),
        },
      },
    };
  }

  /**
   * Convert common units to grams
   */
  private convertToGrams(quantity: number, unit: string): number {
    const conversions: Record<string, number> = {
      g: 1,
      gram: 1,
      grams: 1,
      oz: 28.35,
      ounce: 28.35,
      ounces: 28.35,
      lb: 453.6,
      lbs: 453.6,
      pound: 453.6,
      pounds: 453.6,
      kg: 1000,
      ml: 1, // Approximate for water
      l: 1000,
      cup: 240,
      cups: 240,
      tbsp: 15,
      tsp: 5,
    };

    return quantity * (conversions[unit.toLowerCase()] || 1);
  }

  /**
   * Detect allergens in ingredients
   */
  private detectAllergens(
    ingredients: RecipeNutritionInfo["ingredients"],
  ): string[] {
    const allergens = new Set<string>();
    const allergenPatterns: Record<string, string[]> = {
      peanut: ["peanut", "arachis"],
      "tree nut": [
        "almond",
        "cashew",
        "walnut",
        "pecan",
        "macadamia",
        "pistachio",
        "brazil",
      ],
      milk: ["milk", "dairy", "cheese", "butter", "cream", "yogurt"],
      egg: ["egg", "eggs"],
      fish: ["fish", "cod", "salmon", "tuna"],
      shellfish: ["shellfish", "shrimp", "crab", "lobster", "oyster"],
      wheat: ["wheat", "bread", "pasta"],
      soy: ["soy", "soybean", "tofu"],
      sesame: ["sesame"],
    };

    ingredients.forEach((ingredient) => {
      const name = ingredient.name.toLowerCase();
      Object.entries(allergenPatterns).forEach(([allergen, patterns]) => {
        if (patterns.some((pattern) => name.includes(pattern))) {
          allergens.add(allergen);
        }
      });
    });

    return Array.from(allergens);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const usdaNutrition = new USDANutritionDB();

// Export convenience functions
export async function searchUSDAFoodsCached(
  query: string,
  limit: number = 10,
): Promise<USDAFoodItem[]> {
  return usdaNutrition.searchFoods(query, limit);
}

export async function getFoodById(fdcId: string): Promise<USDAFoodItem | null> {
  return usdaNutrition.getFoodById(fdcId);
}

export async function searchByCategory(
  category: string,
): Promise<USDAFoodItem[]> {
  return usdaNutrition.searchByCategory(category);
}

export async function calculateRecipeNutrition(
  recipeName: string,
  ingredients: Array<{ name: string; quantity: number; unit: string }>,
  servingSize: number,
  servingUnit: string,
): Promise<RecipeNutritionInfo> {
  return usdaNutrition.calculateRecipeNutrition(
    recipeName,
    ingredients,
    servingSize,
    servingUnit,
  );
}

export async function getAllergenInfo(fdcId: string): Promise<string[]> {
  return usdaNutrition.getAllergenInfo(fdcId);
}

export async function compareNutrition(
  foodName1: string,
  foodName2: string,
): Promise<{
  food1: USDAFoodItem | null;
  food2: USDAFoodItem | null;
  comparison: {
    caloriesDiff: number;
    proteinDiff: number;
    fatDiff: number;
    carbsDiff: number;
  };
}> {
  return usdaNutrition.compareNutrition(foodName1, foodName2);
}

// Helper functions for NutritionAnalyzer
export type NutritionInfo = {
  calories: number;
  protein: number;
  fat: number;
  carbs?: number;
  carbohydrates?: number;
  fiber?: number;
  sodium?: number;
  allergens?: string[];
};

export function extractNutritionInfo(foodItem: USDAFoodItem): NutritionInfo {
  return {
    calories: foodItem.nutrients.energy.value,
    protein: foodItem.nutrients.protein.value,
    fat: foodItem.nutrients.fat.value,
    carbs: foodItem.nutrients.carbohydrate.value,
    fiber: foodItem.nutrients.fiber.value,
    allergens: [],
  };
}

export function detectAllergens(
  description: string,
  ingredients?: any[],
): string[] {
  const allergens = new Set<string>();
  const allergenKeywords = {
    peanut: ["peanut", "arachis"],
    "tree nut": [
      "almond",
      "cashew",
      "walnut",
      "pecan",
      "macadamia",
      "pistachio",
      "brazil",
    ],
    milk: ["milk", "dairy", "cheese", "butter", "cream", "yogurt"],
    egg: ["egg", "eggs"],
    fish: ["fish", "cod", "salmon", "tuna"],
    shellfish: ["shellfish", "shrimp", "crab", "lobster", "oyster"],
    wheat: ["wheat", "bread", "pasta"],
    soy: ["soy", "soybean", "tofu"],
    sesame: ["sesame"],
  };

  const text = (
    description +
    " " +
    (ingredients?.join(" ") || "")
  ).toLowerCase();
  Object.entries(allergenKeywords).forEach(([allergen, patterns]) => {
    if (patterns.some((pattern) => text.includes(pattern))) {
      allergens.add(allergen);
    }
  });

  return Array.from(allergens);
}
