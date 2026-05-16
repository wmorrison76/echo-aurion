// Enhanced USDA FoodData Central (FDC) Integration
// Supports nutrition analysis, allergen tracking, and recipe analysis

import { supabase } from './auth-service';

export type NutrientValue = {
  value: number;
  unit: string;
  per100g: number;
  dailyValue?: number;
};

export type Allergen = 
  | 'milk' | 'egg' | 'peanut' | 'tree nuts' | 'fish' | 'shellfish' 
  | 'sesame' | 'soy' | 'wheat' | 'gluten';

export type USDAFoodItem = {
  fdcId: string;
  description: string;
  foodCategory: string;
  publishedDate: string;
  dataType: 'Survey (FNDDS)' | 'Foundation' | 'SR Legacy' | 'Branded';
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
    folate: NutrientValue; // mcg
    magnesium: NutrientValue; // mg
    zinc: NutrientValue; // mg
    [key: string]: NutrientValue | string;
  };
  allergens: Allergen[];
  preparationNotes?: string;
};

export type RecipeNutritionInfo = {
  recipeId: string;
  recipeName: string;
  servingCount: number;
  servingSize?: number;
  servingUnit?: string;
  perServing: {
    calories: number;
    protein: number; // g
    fat: number; // g
    carbs: number; // g
    fiber: number; // g
    sodium: number; // mg
    calcium?: number;
    iron?: number;
  };
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    sodium: number;
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
  allergens: Allergen[];
  macroBreakdown: {
    proteinPercentage: number;
    fatPercentage: number;
    carbPercentage: number;
  };
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class USDANutritionDBEnhanced {
  private apiKey = import.meta.env.VITE_USDA_API_KEY || '';
  private readonly FDC_API_BASE = 'https://fdc.nal.usda.gov/api/foods';
  private readonly CACHE_TTL = 2592000000; // 30 days
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  // Common allergen keywords for ingredient matching
  private readonly ALLERGEN_KEYWORDS: Record<Allergen, string[]> = {
    milk: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'lacto'],
    egg: ['egg', 'albumin', 'mayonnaise'],
    peanut: ['peanut', 'arachis oil'],
    'tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'macadamia', 'brazil nut'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'anchovy'],
    shellfish: ['shellfish', 'shrimp', 'crab', 'lobster', 'oyster', 'clam', 'scallop'],
    sesame: ['sesame', 'tahini'],
    soy: ['soy', 'tofu', 'edamame', 'miso', 'soya'],
    wheat: ['wheat', 'flour', 'bread'],
    gluten: ['gluten', 'rye', 'barley'],
  };

  /**
   * Search USDA FoodData Central
   */
  async searchFoods(
    query: string,
    options?: {
      limit?: number;
      pageNumber?: number;
      dataType?: 'Foundation' | 'Survey' | 'Branded' | 'SR Legacy';
    }
  ): Promise<{ success: boolean; foods?: USDAFoodItem[]; error?: any }> {
    const cacheKey = `usda:search:${query}:${JSON.stringify(options || {})}`;

    // Check cache
    const cached = this.getCachedData<USDAFoodItem[]>(cacheKey);
    if (cached) {
      return { success: true, foods: cached };
    }

    return new Promise((resolve) => {
      this.queueRequest(async () => {
        try {
          const params = new URLSearchParams({
            query,
            pageSize: String(options?.limit || 50),
            pageNumber: String(options?.pageNumber || 1),
            api_key: this.apiKey,
          });

          if (options?.dataType) {
            params.append('dataType', options.dataType);
          }

          const response = await fetch(`${this.FDC_API_BASE}/search?${params}`);

          if (!response.ok) {
            resolve({
              success: false,
              error: `API error: ${response.statusText}`,
            });
            return;
          }

          const data = await response.json();
          const foods = (data.foods || []).map((f: any) => this.parseUSDAFood(f));

          // Cache results
          this.setCachedData(cacheKey, foods);

          resolve({ success: true, foods });
        } catch (error) {
          resolve({ success: false, error: String(error) });
        }
      });
    });
  }

  /**
   * Get detailed food information by FDC ID
   */
  async getFoodDetails(
    fdcId: string
  ): Promise<{ success: boolean; food?: USDAFoodItem; error?: any }> {
    const cacheKey = `usda:food:${fdcId}`;

    const cached = this.getCachedData<USDAFoodItem>(cacheKey);
    if (cached) {
      return { success: true, food: cached };
    }

    return new Promise((resolve) => {
      this.queueRequest(async () => {
        try {
          const response = await fetch(
            `${this.FDC_API_BASE}/${fdcId}?api_key=${this.apiKey}`
          );

          if (!response.ok) {
            resolve({
              success: false,
              error: `API error: ${response.statusText}`,
            });
            return;
          }

          const data = await response.json();
          const food = this.parseUSDAFood(data);

          this.setCachedData(cacheKey, food);

          resolve({ success: true, food });
        } catch (error) {
          resolve({ success: false, error: String(error) });
        }
      });
    });
  }

  /**
   * Analyze recipe nutrition
   */
  async analyzeRecipeNutrition(
    recipeName: string,
    ingredients: Array<{ name: string; quantity: number; unit: string }>
  ): Promise<{ success: boolean; nutrition?: RecipeNutritionInfo; error?: any }> {
    try {
      const ingredientNutrition = await Promise.all(
        ingredients.map((ing) => this.getIngredientNutrition(ing.name, ing.quantity, ing.unit))
      );

      if (ingredientNutrition.some((n) => !n)) {
        return {
          success: false,
          error: 'Could not find nutrition data for some ingredients',
        };
      }

      const nutrition = this.aggregateNutrition(
        recipeName,
        ingredients,
        ingredientNutrition as any[]
      );

      // Store in database
      await supabase.from('recipe_nutrition').upsert({
        recipe_name: recipeName,
        nutrition_data: nutrition,
        analyzed_at: new Date().toISOString(),
      });

      return { success: true, nutrition };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get allergen information for ingredient
   */
  async getAllergenInfo(ingredient: string): Promise<Allergen[]> {
    const lowerIngredient = ingredient.toLowerCase();
    const allergens: Allergen[] = [];

    for (const [allergen, keywords] of Object.entries(this.ALLERGEN_KEYWORDS)) {
      if (keywords.some((kw) => lowerIngredient.includes(kw))) {
        allergens.push(allergen as Allergen);
      }
    }

    return allergens;
  }

  /**
   * Check recipe for allergen cross-contamination risk
   */
  async checkAllergenCrossContamination(
    ingredients: Array<{ name: string }>
  ): Promise<{
    success: boolean;
    risks?: Array<{
      allergen: Allergen;
      probability: number;
      ingredients: string[];
    }>;
  }> {
    try {
      const allergenMap = new Map<Allergen, string[]>();

      for (const ingredient of ingredients) {
        const allergens = await this.getAllergenInfo(ingredient.name);
        for (const allergen of allergens) {
          if (!allergenMap.has(allergen)) {
            allergenMap.set(allergen, []);
          }
          allergenMap.get(allergen)!.push(ingredient.name);
        }
      }

      const risks = Array.from(allergenMap.entries())
        .map(([allergen, ingredients]) => ({
          allergen,
          probability: ingredients.length > 1 ? 0.95 : 0.5, // Higher risk if multiple ingredients
          ingredients,
        }))
        .sort((a, b) => b.probability - a.probability);

      return { success: true, risks };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Compare nutrition across similar foods
   */
  async compareNutrition(
    foods: string[]
  ): Promise<{
    success: boolean;
    comparison?: Array<USDAFoodItem & { rankScore: number }>;
    error?: any;
  }> {
    try {
      const results = await Promise.all(
        foods.map((food) => this.searchFoods(food, { limit: 1 }))
      );

      const allFoods = results
        .filter((r) => r.success && r.foods?.length)
        .flatMap((r) => r.foods || [])
        .sort((a, b) => {
          // Rank by energy (calories) - prefer Foundation data
          const scoreA = a.dataType === 'Foundation' ? 1000 : 0;
          const scoreB = b.dataType === 'Foundation' ? 1000 : 0;
          return scoreB + b.nutrients.energy.value - (scoreA + a.nutrients.energy.value);
        })
        .map((f) => ({
          ...f,
          rankScore: f.dataType === 'Foundation' ? 0.95 : 0.5,
        }));

      return { success: true, comparison: allFoods };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Parse USDA food data
   */
  private parseUSDAFood(data: any): USDAFoodItem {
    const nutrients = data.foodNutrients || [];
    const getnutrient = (name: string, defaultValue = 0) => {
      const nutrient = nutrients.find((n: any) =>
        n.nutrient?.name?.toLowerCase().includes(name.toLowerCase())
      );
      return {
        value: nutrient?.value || defaultValue,
        unit: nutrient?.nutrient?.unitName || '',
        per100g: nutrient?.value || defaultValue,
      };
    };

    const allergens = this.extractAllergensFromDescription(data.description);

    return {
      fdcId: data.fdcId,
      description: data.description || '',
      foodCategory: data.foodCategory?.description || '',
      publishedDate: data.publishedDate || '',
      dataType: data.dataType || 'Foundation',
      brandOwner: data.brandOwner,
      nutrients: {
        energy: getnutrient('energy'),
        protein: getnutrient('protein'),
        fat: getnutrient('total lipid'),
        carbohydrate: getnutrient('carbohydrate'),
        fiber: getnutrient('fiber'),
        sugar: getnutrient('sugars'),
        sodium: getnutrient('sodium'),
        calcium: getnutrient('calcium'),
        iron: getnutrient('iron'),
        potassium: getnutrient('potassium'),
        vitaminA: getnutrient('vitamin a'),
        vitaminC: getnutrient('vitamin c'),
        vitaminD: getnutrient('vitamin d'),
        vitaminB12: getnutrient('vitamin b12'),
        folate: getnutrient('folate'),
        magnesium: getnutrient('magnesium'),
        zinc: getnutrient('zinc'),
      },
      allergens,
    };
  }

  /**
   * Extract allergens from food description
   */
  private extractAllergensFromDescription(description: string): Allergen[] {
    const lowerDesc = description.toLowerCase();
    const allergens: Allergen[] = [];

    for (const [allergen, keywords] of Object.entries(this.ALLERGEN_KEYWORDS)) {
      if (keywords.some((kw) => lowerDesc.includes(kw))) {
        allergens.push(allergen as Allergen);
      }
    }

    return allergens;
  }

  /**
   * Get nutrition for ingredient
   */
  private async getIngredientNutrition(
    ingredient: string,
    quantity: number,
    unit: string
  ): Promise<any> {
    const result = await this.searchFoods(ingredient, { limit: 1 });

    if (!result.success || !result.foods?.length) {
      return null;
    }

    const food = result.foods[0];
    const unitMultiplier = this.getUnitMultiplier(unit, food);

    return {
      name: ingredient,
      quantity,
      unit,
      fdcId: food.fdcId,
      calories: (food.nutrients.energy.value * quantity * unitMultiplier) / 100,
      protein: (food.nutrients.protein.value * quantity * unitMultiplier) / 100,
      fat: (food.nutrients.fat.value * quantity * unitMultiplier) / 100,
      carbs: (food.nutrients.carbohydrate.value * quantity * unitMultiplier) / 100,
    };
  }

  /**
   * Aggregate ingredient nutrition into recipe nutrition
   */
  private aggregateNutrition(
    recipeName: string,
    ingredients: Array<{ name: string; quantity: number; unit: string }>,
    nutritionData: any[]
  ): RecipeNutritionInfo {
    const totals = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
      sodium: 0,
    };

    nutritionData.forEach((ing) => {
      totals.calories += ing.calories;
      totals.protein += ing.protein;
      totals.fat += ing.fat;
      totals.carbs += ing.carbs;
    });

    const servingCount = 4; // Default 4 servings

    return {
      recipeId: '',
      recipeName,
      servingCount,
      perServing: {
        calories: Math.round(totals.calories / servingCount),
        protein: Math.round((totals.protein / servingCount) * 10) / 10,
        fat: Math.round((totals.fat / servingCount) * 10) / 10,
        carbs: Math.round((totals.carbs / servingCount) * 10) / 10,
        fiber: Math.round((totals.fiber / servingCount) * 10) / 10,
        sodium: Math.round(totals.sodium / servingCount),
      },
      totals,
      ingredients: nutritionData,
      allergens: [],
      macroBreakdown: {
        proteinPercentage: (totals.protein * 4) / totals.calories,
        fatPercentage: (totals.fat * 9) / totals.calories,
        carbPercentage: (totals.carbs * 4) / totals.calories,
      },
    };
  }

  /**
   * Get unit multiplier for grams
   */
  private getUnitMultiplier(unit: string, food: USDAFoodItem): number {
    const lowerUnit = unit.toLowerCase();

    if (lowerUnit.includes('g') || lowerUnit.includes('gram')) return 1;
    if (lowerUnit.includes('kg')) return 1000;
    if (lowerUnit.includes('oz')) return 28.35;
    if (lowerUnit.includes('lb')) return 453.59;
    if (lowerUnit.includes('cup')) return 240;
    if (lowerUnit.includes('tbsp')) return 15;
    if (lowerUnit.includes('tsp')) return 5;
    if (lowerUnit.includes('ml')) return 1;
    if (lowerUnit.includes('l')) return 1000;

    return 1;
  }

  /**
   * Cache management
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCachedData<T>(key: string, data: T, ttl = this.CACHE_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Queue API requests to avoid rate limiting
   */
  private queueRequest(fn: () => Promise<any>) {
    this.requestQueue.push(fn);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const fn = this.requestQueue.shift();
      if (fn) {
        try {
          await fn();
          // Rate limiting delay (USDA allows ~100 requests/minute)
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      memory: this.cache.size * 1024,
    };
  }
}

export const usda = new USDANutritionDBEnhanced();
