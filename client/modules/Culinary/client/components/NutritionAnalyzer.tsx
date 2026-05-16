import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertCircle } from "lucide-react";
import {
  searchUSDAFoodsCached,
  extractNutritionInfo,
  detectAllergens,
  type NutritionInfo,
  type USDAFoodItem,
} from "@/lib/usda-nutrition";
import { AutocompleteInput } from "@/components/AutocompleteInput";

export interface NutritionAnalyzerProps {
  recipeName?: string;
  onNutritionUpdate?: (nutrition: NutritionInfo) => void;
}

interface IngredientNutrition {
  ingredientName: string;
  fdcId?: string;
  quantity: number;
  unit: string;
  usdfFood?: USDAFoodItem;
  nutrition?: NutritionInfo;
  allergens: string[];
}

export const NutritionAnalyzer: React.FC<NutritionAnalyzerProps> = ({
  recipeName,
  onNutritionUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<USDAFoodItem[]>([]);
  const [ingredients, setIngredients] = useState<IngredientNutrition[]>([]);
  const [selectedResult, setSelectedResult] = useState<USDAFoodItem | null>(
    null,
  );
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("g");

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchUSDAFoodsCached(searchQuery, 10);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSelectFood = useCallback((food: USDAFoodItem) => {
    setSelectedResult(food);
    setSearchResults([]);
    setSearchQuery("");
  }, []);

  const handleAddIngredient = useCallback(() => {
    if (!selectedResult || !quantity) return;

    const nutrition = extractNutritionInfo(selectedResult);
    const allergens = detectAllergens(selectedResult.description);

    const newIngredient: IngredientNutrition = {
      ingredientName: selectedResult.description,
      fdcId: selectedResult.fdcId,
      quantity: parseFloat(quantity),
      unit,
      usdfFood: selectedResult,
      nutrition,
      allergens,
    };

    setIngredients([...ingredients, newIngredient]);
    setSelectedResult(null);
    setQuantity("100");
    setUnit("g");

    // Calculate and update total nutrition
    const totalNutrition = calculateTotalNutrition();
    onNutritionUpdate?.(totalNutrition);
  }, [selectedResult, quantity, unit, ingredients, onNutritionUpdate]);

  const handleRemoveIngredient = useCallback(
    (index: number) => {
      const updated = ingredients.filter((_, i) => i !== index);
      setIngredients(updated);
    },
    [ingredients],
  );

  const calculateTotalNutrition = useCallback((): NutritionInfo => {
    if (ingredients.length === 0) {
      return {
        calories: 0,
        protein: 0,
        fat: 0,
        carbohydrates: 0,
      };
    }

    const totals: NutritionInfo = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbohydrates: 0,
    };

    ingredients.forEach((ing) => {
      if (!ing.nutrition) return;

      // Simple scaling: assume standard gram weights
      const scale = ing.quantity / 100;

      totals.calories += (ing.nutrition.calories || 0) * scale;
      totals.protein += (ing.nutrition.protein || 0) * scale;
      totals.fat += (ing.nutrition.fat || 0) * scale;
      totals.carbohydrates += (ing.nutrition.carbohydrates || 0) * scale;
      totals.fiber = (totals.fiber || 0) + (ing.nutrition.fiber || 0) * scale;
      totals.sodium =
        (totals.sodium || 0) + (ing.nutrition.sodium || 0) * scale;
    });

    return {
      ...totals,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      carbohydrates: Math.round(totals.carbohydrates * 10) / 10,
      fiber: totals.fiber ? Math.round(totals.fiber * 10) / 10 : undefined,
      sodium: totals.sodium ? Math.round(totals.sodium) : undefined,
    };
  }, [ingredients]);

  const totalNutrition = calculateTotalNutrition();
  const allAllergens = Array.from(
    new Set(ingredients.flatMap((ing) => ing.allergens)),
  );

  return (
    <div className="w-full space-y-4">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search USDA Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <AutocompleteInput
              suggestionType="ingredients"
              placeholder="Search for ingredient (e.g., 'Almonds', 'Flour')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSuggestionSelect={(suggestion) => setSearchQuery(suggestion)}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="gap-2"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Found {searchResults.length} results
              </p>
              {searchResults.map((food) => (
                <button
                  key={food.fdcId}
                  onClick={() => handleSelectFood(food)}
                  className="w-full text-left p-2 rounded border hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium">{food.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.dataType} •{" "}
                    {food.brandOwner && `${food.brandOwner} • `}
                    FDC ID: {food.fdcId}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedResult && (
            <div className="p-3 rounded border-2 border-blue-500 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {selectedResult.description}
                </p>
                {selectedResult.brandOwner && (
                  <p className="text-xs text-muted-foreground">
                    {selectedResult.brandOwner}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded border border-input px-2 py-1 text-sm"
                    step="0.1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded border border-input px-2 py-1 text-sm"
                  >
                    <option value="g">grams (g)</option>
                    <option value="oz">ounces (oz)</option>
                    <option value="cup">cups</option>
                    <option value="tbsp">tablespoons</option>
                    <option value="tsp">teaspoons</option>
                    <option value="kg">kilograms (kg)</option>
                    <option value="lb">pounds (lb)</option>
                  </select>
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <Button size="sm" onClick={handleAddIngredient}>
                    Add to Recipe
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingredients List */}
      {ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipe Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredients.map((ing, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-2 rounded border hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{ing.ingredientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ing.quantity} {ing.unit}
                  </p>
                  {ing.allergens.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {ing.allergens.map((allergen) => (
                        <Badge
                          key={allergen}
                          variant="outline"
                          className="text-xs"
                        >
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveIngredient(index)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Nutrition Summary */}
      {ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Total Nutrition (per 100g serving)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Calories</span>
                  <span className="text-sm font-semibold">
                    {totalNutrition.calories} kcal
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Protein</span>
                  <span className="text-sm font-semibold">
                    {totalNutrition.protein}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Fat</span>
                  <span className="text-sm font-semibold">
                    {totalNutrition.fat}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Carbs</span>
                  <span className="text-sm font-semibold">
                    {totalNutrition.carbohydrates}g
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {totalNutrition.fiber !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm">Fiber</span>
                    <span className="text-sm font-semibold">
                      {totalNutrition.fiber}g
                    </span>
                  </div>
                )}
                {totalNutrition.sodium !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm">Sodium</span>
                    <span className="text-sm font-semibold">
                      {Math.round(totalNutrition.sodium)}mg
                    </span>
                  </div>
                )}
                {allAllergens.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Allergens
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {allAllergens.map((allergen) => (
                        <Badge
                          key={allergen}
                          variant="destructive"
                          className="text-xs"
                        >
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Message */}
      {ingredients.length === 0 && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            Search for ingredients above to analyze your recipe's nutrition
            using USDA FoodData Central. This uses the free public USDA API with
            no authentication required.
          </p>
        </div>
      )}
    </div>
  );
};

export default NutritionAnalyzer;
