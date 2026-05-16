/**
 * Recipe Workspace Page
 * Main editing interface for cocktail recipes
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useRecipeStore } from "../stores/recipeStore";
import type {
  CocktailRecipe,
  RecipeIngredient,
  RecipeStep,
} from "../types/recipe";

export function RecipeWorkspace() {
  const { recipeId } = useParams<{ recipeId?: string }>();
  const navigate = useNavigate();
  const { currentRecipe, loading, loadRecipe, createRecipe, updateRecipe } =
    useRecipeStore();
  const [recipe, setRecipe] = useState<Partial<CocktailRecipe>>({
    name: "",
    version: "1.0.0",
    status: "draft",
    ingredients: [],
    instructions: [],
    category: "r&d",
    tags: [],
    notes: "",
  });

  useEffect(() => {
    if (recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId, loadRecipe]);

  useEffect(() => {
    if (currentRecipe) {
      setRecipe(currentRecipe);
    }
  }, [currentRecipe]);

  const handleSave = async () => {
    try {
      if (recipeId) {
        await updateRecipe(recipeId, recipe);
      } else {
        const newRecipe = await createRecipe(recipe);
        navigate(`/workspace/${newRecipe.id}`);
      }
    } catch (error) {
      console.error("Failed to save recipe:", error);
    }
  };

  const addIngredient = () => {
    setRecipe({
      ...recipe,
      ingredients: [
        ...(recipe.ingredients || []),
        {
          id: `ing-${Date.now()}`,
          ingredientId: "",
          name: "",
          quantity: 0,
          unit: "oz",
          cost: 0,
        },
      ],
    });
  };

  const removeIngredient = (index: number) => {
    setRecipe({
      ...recipe,
      ingredients: recipe.ingredients?.filter((_, i) => i !== index) || [],
    });
  };

  const addStep = () => {
    setRecipe({
      ...recipe,
      instructions: [
        ...(recipe.instructions || []),
        {
          id: `step-${Date.now()}`,
          order: (recipe.instructions?.length || 0) + 1,
          instruction: "",
        },
      ],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {recipeId ? "Edit Recipe" : "New Recipe"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Develop and refine cocktail recipes
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Save size={18} />
          Save Recipe
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Basic Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Recipe Name
              </label>
              <input
                type="text"
                value={recipe.name || ""}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Classic Old Fashioned"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Version
              </label>
              <input
                type="text"
                value={recipe.version || ""}
                onChange={(e) =>
                  setRecipe({ ...recipe, version: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Status
              </label>
              <select
                value={recipe.status || "draft"}
                onChange={(e) =>
                  setRecipe({
                    ...recipe,
                    status: e.target.value as CocktailRecipe["status"],
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="testing">Testing</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Category
              </label>
              <select
                value={recipe.category || "r&d"}
                onChange={(e) =>
                  setRecipe({
                    ...recipe,
                    category: e.target.value as CocktailRecipe["category"],
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="classic">Classic</option>
                <option value="signature">Signature</option>
                <option value="seasonal">Seasonal</option>
                <option value="r&d">R&D</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Ingredients
            </h2>
            <button
              onClick={addIngredient}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
            >
              <Plus size={16} />
              Add Ingredient
            </button>
          </div>
          <div className="space-y-3">
            {recipe.ingredients?.map((ing, index) => (
              <div key={ing.id || index} className="flex gap-3 items-center">
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => {
                    const updated = [...(recipe.ingredients || [])];
                    updated[index] = { ...ing, name: e.target.value };
                    setRecipe({ ...recipe, ingredients: updated });
                  }}
                  placeholder="Ingredient name"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="number"
                  value={ing.quantity}
                  onChange={(e) => {
                    const updated = [...(recipe.ingredients || [])];
                    updated[index] = {
                      ...ing,
                      quantity: parseFloat(e.target.value) || 0,
                    };
                    setRecipe({ ...recipe, ingredients: updated });
                  }}
                  placeholder="Qty"
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => {
                    const updated = [...(recipe.ingredients || [])];
                    updated[index] = {
                      ...ing,
                      unit: e.target.value as RecipeIngredient["unit"],
                    };
                    setRecipe({ ...recipe, ingredients: updated });
                  }}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="oz">oz</option>
                  <option value="ml">ml</option>
                  <option value="dash">dash</option>
                  <option value="slice">slice</option>
                  <option value="unit">unit</option>
                </select>
                <button
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {(!recipe.ingredients || recipe.ingredients.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ingredients added yet. Click "Add Ingredient" to get started.
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Instructions
            </h2>
            <button
              onClick={addStep}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
            >
              <Plus size={16} />
              Add Step
            </button>
          </div>
          <div className="space-y-3">
            {recipe.instructions?.map((step, index) => (
              <div key={step.id || index} className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-muted rounded-lg text-sm font-semibold text-foreground">
                  {step.order}
                </span>
                <textarea
                  value={step.instruction}
                  onChange={(e) => {
                    const updated = [...(recipe.instructions || [])];
                    updated[index] = { ...step, instruction: e.target.value };
                    setRecipe({ ...recipe, instructions: updated });
                  }}
                  placeholder="Enter instruction..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                />
              </div>
            ))}
            {(!recipe.instructions || recipe.instructions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No instructions added yet. Click "Add Step" to get started.
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Notes</h2>
          <textarea
            value={recipe.notes || ""}
            onChange={(e) => setRecipe({ ...recipe, notes: e.target.value })}
            placeholder="Add notes, tips, or observations..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
}
