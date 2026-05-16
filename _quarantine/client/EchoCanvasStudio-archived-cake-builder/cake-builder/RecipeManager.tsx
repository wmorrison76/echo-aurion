import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Recipe {
  id: string;
  name: string;
  type: "cake" | "frosting" | "filling";
  ingredients: { item: string; amount: string; unit: string }[];
  instructions: string[];
  prepTime: number; // minutes
  yield: string;
}

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "vanilla-cake",
    name: "Classic Vanilla Cake",
    type: "cake",
    ingredients: [
      { item: "All-purpose flour", amount: "2", unit: "cups" },
      { item: "Sugar", amount: "2", unit: "cups" },
      { item: "Butter", amount: "1", unit: "cup" },
      { item: "Eggs", amount: "4", unit: "" },
      { item: "Vanilla extract", amount: "2", unit: "tsp" },
      { item: "Baking powder", amount: "2", unit: "tsp" },
      { item: "Salt", amount: "0.5", unit: "tsp" },
      { item: "Milk", amount: "1", unit: "cup" },
    ],
    instructions: [
      "Preheat oven to 350°F",
      "Cream butter and sugar until light and fluffy",
      "Beat in eggs one at a time",
      "Stir in vanilla",
      "Alternate adding flour mixture and milk",
      "Pour into prepared pans",
      "Bake 30-35 minutes until golden",
    ],
    prepTime: 45,
    yield: "Two 9-inch rounds",
  },
];

export default function RecipeManager() {
  const [recipes, setRecipes] = useState<Recipe[]>(SAMPLE_RECIPES);
  const [selectedId, setSelectedId] = useState<string | null>(recipes[0].id);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    type: "cake",
    ingredients: [],
    instructions: [],
  });

  const selected = recipes.find((r) => r.id === selectedId);

  const handleAddRecipe = () => {
    if (!newRecipe.name) return;
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name: newRecipe.name || "",
      type: newRecipe.type || "cake",
      ingredients: newRecipe.ingredients || [],
      instructions: newRecipe.instructions || [],
      prepTime: newRecipe.prepTime || 0,
      yield: newRecipe.yield || "",
    };
    setRecipes([...recipes, recipe]);
    setNewRecipe({ type: "cake", ingredients: [], instructions: [] });
    setShowAdd(false);
    setSelectedId(recipe.id);
  };

  return (
    <Card id="recipes">
      <CardHeader>
        <CardTitle>Recipe Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="add">Add Recipe</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Select Recipe</label>
              <select
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full border rounded p-2"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Type:</strong> {selected.type}
                  </div>
                  <div>
                    <strong>Prep Time:</strong> {selected.prepTime} min
                  </div>
                  <div className="col-span-2">
                    <strong>Yield:</strong> {selected.yield}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <ul className="space-y-1 text-sm">
                    {selected.ingredients.map((ing, idx) => (
                      <li key={idx}>
                        • {ing.amount} {ing.unit} {ing.item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <ol className="space-y-2 text-sm list-decimal list-inside">
                    {selected.instructions.map((inst, idx) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ol>
                </div>

                <Button className="w-full">Scale Recipe for Guests</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">Recipe Name</label>
                <Input
                  placeholder="e.g. Chocolate Ganache"
                  value={newRecipe.name || ""}
                  onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm block mb-1">Type</label>
                <select
                  value={newRecipe.type || "cake"}
                  onChange={(e) => setNewRecipe({ ...newRecipe, type: e.target.value as any })}
                  className="w-full border rounded p-2"
                >
                  <option value="cake">Cake</option>
                  <option value="frosting">Frosting</option>
                  <option value="filling">Filling</option>
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                Full recipe form coming soon. For now, use the built-in settings.
              </div>
              <Button onClick={handleAddRecipe} disabled={!newRecipe.name}>
                Save Recipe
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
