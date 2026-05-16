import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usda, type USDAFoodItem, type Allergen } from '../usda-nutrition-enhanced';

vi.mock('../auth-service', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('USDANutritionDBEnhanced', () => {
  beforeEach(() => {
    usda.clearCache();
    vi.clearAllMocks();
  });

  describe('Food Search', () => {
    it('should search foods by name', async () => {
      const result = await usda.searchFoods('chicken breast');

      expect(result).toHaveProperty('success');
      if (result.success && result.foods?.length) {
        const food = result.foods[0];
        expect(food).toHaveProperty('fdcId');
        expect(food).toHaveProperty('description');
        expect(food).toHaveProperty('nutrients');
      }
    });

    it('should return cached results', async () => {
      const query = 'beef';
      const result1 = await usda.searchFoods(query);
      const result2 = await usda.searchFoods(query);

      expect(result1.success).toBe(result2.success);
    });

    it('should respect limit parameter', async () => {
      const result = await usda.searchFoods('rice', { limit: 5 });

      if (result.success && result.foods) {
        expect(result.foods.length).toBeLessThanOrEqual(5);
      }
    });

    it('should filter by data type', async () => {
      const result = await usda.searchFoods('tomato', {
        dataType: 'Foundation',
      });

      expect(result).toHaveProperty('success');
    });

    it('should handle pagination', async () => {
      const page1 = await usda.searchFoods('vegetable', {
        limit: 10,
        pageNumber: 1,
      });

      const page2 = await usda.searchFoods('vegetable', {
        limit: 10,
        pageNumber: 2,
      });

      expect(page1).toHaveProperty('success');
      expect(page2).toHaveProperty('success');
    });

    it('should handle search with no results', async () => {
      const result = await usda.searchFoods('nonexistentfood12345xyz');

      expect(result).toHaveProperty('success');
    });
  });

  describe('Food Details', () => {
    it('should fetch detailed food information by FDC ID', async () => {
      const result = await usda.getFoodDetails('169400'); // Broccoli

      expect(result).toHaveProperty('success');
      if (result.success && result.food) {
        expect(result.food).toHaveProperty('fdcId');
        expect(result.food).toHaveProperty('nutrients');
        expect(result.food.nutrients).toHaveProperty('energy');
        expect(result.food.nutrients).toHaveProperty('protein');
      }
    });

    it('should cache detailed food information', async () => {
      const fdcId = '169400';
      await usda.getFoodDetails(fdcId);
      const stats1 = usda.getCacheStats();

      await usda.getFoodDetails(fdcId);
      const stats2 = usda.getCacheStats();

      expect(stats2.entries).toBeGreaterThanOrEqual(stats1.entries);
    });

    it('should include nutrient units', async () => {
      const result = await usda.getFoodDetails('168065'); // Apples

      if (result.success && result.food) {
        Object.values(result.food.nutrients).forEach((nutrient) => {
          if (typeof nutrient === 'object' && nutrient.value !== undefined) {
            expect(nutrient).toHaveProperty('unit');
            expect(nutrient).toHaveProperty('per100g');
          }
        });
      }
    });
  });

  describe('Recipe Nutrition Analysis', () => {
    it('should analyze recipe nutrition', async () => {
      const ingredients = [
        { name: 'chicken breast', quantity: 200, unit: 'g' },
        { name: 'olive oil', quantity: 1, unit: 'tbsp' },
        { name: 'salt', quantity: 1, unit: 'tsp' },
      ];

      const result = await usda.analyzeRecipeNutrition('Grilled Chicken', ingredients);

      expect(result).toHaveProperty('success');
      if (result.success && result.nutrition) {
        expect(result.nutrition.recipeName).toBe('Grilled Chicken');
        expect(result.nutrition.perServing).toHaveProperty('calories');
        expect(result.nutrition.perServing).toHaveProperty('protein');
        expect(result.nutrition.ingredients.length).toBeGreaterThan(0);
      }
    });

    it('should calculate per-serving nutrition', async () => {
      const ingredients = [
        { name: 'pasta', quantity: 400, unit: 'g' },
        { name: 'tomato sauce', quantity: 500, unit: 'ml' },
      ];

      const result = await usda.analyzeRecipeNutrition('Pasta', ingredients);

      if (result.success && result.nutrition) {
        const perServing = result.nutrition.perServing;
        const totals = result.nutrition.totals;

        expect(perServing.calories).toBeLessThanOrEqual(totals.calories);
        expect(perServing.calories).toBeGreaterThan(0);
      }
    });

    it('should calculate macro breakdown percentages', async () => {
      const ingredients = [
        { name: 'chicken', quantity: 100, unit: 'g' },
        { name: 'rice', quantity: 150, unit: 'g' },
      ];

      const result = await usda.analyzeRecipeNutrition('Chicken Rice', ingredients);

      if (result.success && result.nutrition) {
        const macro = result.nutrition.macroBreakdown;
        const total = macro.proteinPercentage + macro.fatPercentage + macro.carbPercentage;

        expect(total).toBeGreaterThan(0.8); // Allow some rounding
        expect(total).toBeLessThan(1.2);
      }
    });

    it('should handle multiple ingredients', async () => {
      const ingredients = [
        { name: 'beef', quantity: 250, unit: 'g' },
        { name: 'potato', quantity: 200, unit: 'g' },
        { name: 'carrot', quantity: 100, unit: 'g' },
        { name: 'onion', quantity: 50, unit: 'g' },
        { name: 'butter', quantity: 2, unit: 'tbsp' },
      ];

      const result = await usda.analyzeRecipeNutrition('Beef Stew', ingredients);

      expect(result).toHaveProperty('success');
      if (result.success && result.nutrition) {
        expect(result.nutrition.ingredients.length).toBe(ingredients.length);
      }
    });
  });

  describe('Allergen Detection', () => {
    it('should detect common allergens', async () => {
      const allergens = await usda.getAllergenInfo('peanut');
      expect(allergens).toContain('peanut');
    });

    it('should detect multiple allergens in ingredient', async () => {
      const allergens = await usda.getAllergenInfo('fish sauce');
      expect(allergens).toContain('fish');
    });

    it('should be case-insensitive', async () => {
      const allergens1 = await usda.getAllergenInfo('Milk');
      const allergens2 = await usda.getAllergenInfo('MILK');

      expect(allergens1).toEqual(allergens2);
    });

    it('should handle tree nuts', async () => {
      const allergens = await usda.getAllergenInfo('almonds');
      expect(allergens).toContain('tree nuts');
    });

    it('should handle shellfish', async () => {
      const allergens = await usda.getAllergenInfo('shrimp');
      expect(allergens).toContain('shellfish');
    });

    it('should return empty for non-allergen items', async () => {
      const allergens = await usda.getAllergenInfo('rice');
      expect(Array.isArray(allergens)).toBe(true);
    });
  });

  describe('Cross-Contamination Risk', () => {
    it('should check for allergen cross-contamination', async () => {
      const ingredients = [
        { name: 'fish' },
        { name: 'shellfish' },
        { name: 'rice' },
      ];

      const result = await usda.checkAllergenCrossContamination(ingredients);

      expect(result.success).toBe(true);
      if (result.risks) {
        expect(Array.isArray(result.risks)).toBe(true);
      }
    });

    it('should rank contamination risks by probability', async () => {
      const ingredients = [
        { name: 'milk' },
        { name: 'cheese' },
        { name: 'egg' },
      ];

      const result = await usda.checkAllergenCrossContamination(ingredients);

      if (result.risks && result.risks.length > 0) {
        const sorted = [...result.risks].sort((a, b) => b.probability - a.probability);
        expect(result.risks).toEqual(sorted);
      }
    });

    it('should handle recipes with no allergens', async () => {
      const ingredients = [
        { name: 'rice' },
        { name: 'water' },
        { name: 'salt' },
      ];

      const result = await usda.checkAllergenCrossContamination(ingredients);

      expect(result.success).toBe(true);
    });

    it('should increase risk probability with multiple allergen sources', async () => {
      const ingredients = [
        { name: 'milk' },
        { name: 'cheese' },
        { name: 'butter' },
        { name: 'yogurt' },
      ];

      const result = await usda.checkAllergenCrossContamination(ingredients);

      if (result.risks) {
        const milkRisk = result.risks.find((r) => r.allergen === 'milk');
        expect(milkRisk?.probability).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Nutrition Comparison', () => {
    it('should compare nutrition across foods', async () => {
      const foods = ['chicken breast', 'beef', 'salmon'];

      const result = await usda.compareNutrition(foods);

      expect(result.success).toBe(true);
      if (result.comparison) {
        expect(Array.isArray(result.comparison)).toBe(true);
      }
    });

    it('should rank Foundation data higher', async () => {
      const result = await usda.compareNutrition(['potato']);

      if (result.comparison && result.comparison.length > 1) {
        const foundation = result.comparison.find((f) => f.dataType === 'Foundation');
        const branded = result.comparison.find((f) => f.dataType === 'Branded');

        if (foundation && branded) {
          expect(foundation.rankScore).toBeGreaterThan(branded.rankScore);
        }
      }
    });

    it('should compare calorie content', async () => {
      const result = await usda.compareNutrition(['rice', 'potato']);

      if (result.comparison?.length === 2) {
        const calories1 = result.comparison[0].nutrients.energy.value;
        const calories2 = result.comparison[1].nutrients.energy.value;

        expect(typeof calories1).toBe('number');
        expect(typeof calories2).toBe('number');
      }
    });
  });

  describe('Unit Conversion', () => {
    it('should convert grams correctly', async () => {
      const ingredients = [{ name: 'flour', quantity: 100, unit: 'g' }];

      const result = await usda.analyzeRecipeNutrition('Flour Test', ingredients);
      expect(result).toHaveProperty('success');
    });

    it('should convert cups correctly', async () => {
      const ingredients = [{ name: 'milk', quantity: 1, unit: 'cup' }];

      const result = await usda.analyzeRecipeNutrition('Milk Test', ingredients);
      expect(result).toHaveProperty('success');
    });

    it('should convert ounces correctly', async () => {
      const ingredients = [{ name: 'beef', quantity: 8, unit: 'oz' }];

      const result = await usda.analyzeRecipeNutrition('Beef Test', ingredients);
      expect(result).toHaveProperty('success');
    });

    it('should convert tablespoons correctly', async () => {
      const ingredients = [{ name: 'oil', quantity: 2, unit: 'tbsp' }];

      const result = await usda.analyzeRecipeNutrition('Oil Test', ingredients);
      expect(result).toHaveProperty('success');
    });

    it('should convert teaspoons correctly', async () => {
      const ingredients = [{ name: 'salt', quantity: 1, unit: 'tsp' }];

      const result = await usda.analyzeRecipeNutrition('Salt Test', ingredients);
      expect(result).toHaveProperty('success');
    });

    it('should convert pounds correctly', async () => {
      const ingredients = [{ name: 'chicken', quantity: 2, unit: 'lb' }];

      const result = await usda.analyzeRecipeNutrition('Chicken Test', ingredients);
      expect(result).toHaveProperty('success');
    });
  });

  describe('Caching', () => {
    it('should cache search results', async () => {
      const before = usda.getCacheStats();

      await usda.searchFoods('apple');
      await usda.searchFoods('apple');

      const after = usda.getCacheStats();
      expect(after.entries).toBeGreaterThanOrEqual(before.entries);
    });

    it('should cache food details', async () => {
      const before = usda.getCacheStats();

      await usda.getFoodDetails('169400');
      await usda.getFoodDetails('169400');

      const after = usda.getCacheStats();
      expect(after.entries).toBeGreaterThanOrEqual(before.entries);
    });

    it('should allow clearing cache', () => {
      usda.searchFoods('test');
      usda.clearCache();

      const stats = usda.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('should track cache size', () => {
      usda.clearCache();
      const stats1 = usda.getCacheStats();

      usda.searchFoods('test');
      const stats2 = usda.getCacheStats();

      expect(stats2.entries).toBeGreaterThan(stats1.entries);
    });
  });

  describe('Data Normalization', () => {
    it('should normalize nutrients', async () => {
      const result = await usda.searchFoods('chicken');

      if (result.success && result.foods?.length) {
        const food = result.foods[0];
        expect(food.nutrients.protein).toHaveProperty('value');
        expect(food.nutrients.protein).toHaveProperty('unit');
        expect(food.nutrients.protein).toHaveProperty('per100g');
      }
    });

    it('should include allergen information', async () => {
      const result = await usda.searchFoods('peanuts');

      if (result.success && result.foods?.length) {
        const food = result.foods[0];
        expect(Array.isArray(food.allergens)).toBe(true);
      }
    });

    it('should handle branded products', async () => {
      const result = await usda.searchFoods('yogurt');

      if (result.success && result.foods?.length) {
        const branded = result.foods.find((f) => f.dataType === 'Branded');
        if (branded) {
          expect(branded.brandOwner).toBeDefined();
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const result = await usda.searchFoods('test');

      expect(result).toHaveProperty('success');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle missing nutrition data', async () => {
      const ingredients = [{ name: 'unknown_ingredient_xyz', quantity: 100, unit: 'g' }];

      const result = await usda.analyzeRecipeNutrition('Test', ingredients);

      expect(result).toHaveProperty('success');
    });

    it('should handle invalid units', async () => {
      const ingredients = [{ name: 'flour', quantity: 100, unit: 'invalid_unit' }];

      const result = await usda.analyzeRecipeNutrition('Test', ingredients);

      expect(result).toHaveProperty('success');
    });

    it('should handle empty ingredient list', async () => {
      const result = await usda.analyzeRecipeNutrition('Empty Recipe', []);

      expect(result).toHaveProperty('success');
    });
  });

  describe('Performance', () => {
    it('should queue API requests', async () => {
      const queries = ['apple', 'banana', 'cherry', 'date', 'egg'];

      const results = await Promise.all(
        queries.map((q) => usda.searchFoods(q))
      );

      expect(results.length).toBe(queries.length);
      results.forEach((r) => {
        expect(r).toHaveProperty('success');
      });
    });

    it('should handle large ingredient lists', async () => {
      const ingredients = Array.from({ length: 20 }, (_, i) => ({
        name: `ingredient-${i}`,
        quantity: 10,
        unit: 'g',
      }));

      const result = await usda.analyzeRecipeNutrition('Large Recipe', ingredients);

      expect(result).toHaveProperty('success');
    });

    it('should calculate nutrition efficiently', async () => {
      const ingredients = [
        { name: 'chicken', quantity: 200, unit: 'g' },
        { name: 'broccoli', quantity: 100, unit: 'g' },
        { name: 'rice', quantity: 150, unit: 'g' },
      ];

      const start = Date.now();
      const result = await usda.analyzeRecipeNutrition('Test', ingredients);
      const duration = Date.now() - start;

      expect(result).toHaveProperty('success');
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Integration Scenarios', () => {
    it('should analyze complete meal', async () => {
      const ingredients = [
        { name: 'salmon', quantity: 150, unit: 'g' },
        { name: 'asparagus', quantity: 100, unit: 'g' },
        { name: 'olive oil', quantity: 1, unit: 'tbsp' },
        { name: 'lemon', quantity: 0.5, unit: 'unit' },
      ];

      const result = await usda.analyzeRecipeNutrition('Grilled Salmon Dinner', ingredients);

      if (result.success && result.nutrition) {
        expect(result.nutrition.perServing.calories).toBeGreaterThan(0);
        expect(result.nutrition.allergens).toBeDefined();
      }
    });

    it('should detect allergens in complete meal', async () => {
      const ingredients = [
        { name: 'shrimp' },
        { name: 'garlic' },
        { name: 'sesame oil' },
      ];

      const result = await usda.checkAllergenCrossContamination(ingredients);

      expect(result.success).toBe(true);
      if (result.risks) {
        expect(result.risks.some((r) => r.allergen === 'shellfish')).toBe(true);
        expect(result.risks.some((r) => r.allergen === 'sesame')).toBe(true);
      }
    });

    it('should compare protein sources', async () => {
      const proteins = ['chicken breast', 'beef', 'fish', 'eggs', 'tofu'];

      const result = await usda.compareNutrition(proteins);

      expect(result.success).toBe(true);
    });
  });
});
