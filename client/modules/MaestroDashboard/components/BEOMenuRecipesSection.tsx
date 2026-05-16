/** * BEO Menu & Recipes Section * * Shows menu items with linked recipes. * Allows users to link existing recipes or add new ones. */ import React, {
  useState,
  useEffect,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecipeQuickAddModal } from "./RecipeQuickAddModal";
import { maestroEventBus } from "@/lib/maestro-event-bus";
import type { Recipe } from "./RecipeQuickAddModal";
interface MenuItem {
  id: string;
  name: string;
  linkedRecipeId?: string;
  linkedRecipeName?: string;
}
interface BEOMenuRecipesSectionProps {
  beoId: string;
}
export function BEOMenuRecipesSection({ beoId }: BEOMenuRecipesSectionProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    {
      id: "1",
      name: "Caesar Salad",
      linkedRecipeId: "r1",
      linkedRecipeName: "Caesar Salad Classic",
    },
    {
      id: "2",
      name: "Pan-Seared Salmon",
      linkedRecipeId: "r2",
      linkedRecipeName: "Pan-Seared Salmon",
    },
    { id: "3", name: "Roasted Vegetables" },
    {
      id: "4",
      name: "Chocolate Mousse",
      linkedRecipeId: "r4",
      linkedRecipeName: "Chocolate Mousse",
    },
  ]);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([
    {
      id: "r1",
      title: "Caesar Salad Classic",
      course: "Appetizer",
      description: "Fresh romaine with house-made dressing",
      servings: 50,
      prepTime: 30,
    },
    {
      id: "r2",
      title: "Pan-Seared Salmon",
      course: "Main Course",
      description: "6oz Atlantic salmon with lemon butter",
      servings: 100,
      prepTime: 15,
      cookTime: 12,
    },
    {
      id: "r3",
      title: "Roasted Vegetables",
      course: "Side",
      description: "Seasonal vegetables with olive oil and herbs",
      servings: 200,
      prepTime: 10,
      cookTime: 25,
    },
    {
      id: "r4",
      title: "Chocolate Mousse",
      course: "Dessert",
      description: "Rich dark chocolate mousse with berries",
      servings: 100,
      prepTime: 20,
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const handleRecipeSelect = async (recipe: Recipe) => {
    if (!selectedMenuItem) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/beo/${beoId}/link-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: selectedMenuItem.id,
          recipeId: recipe.id,
          recipeName: recipe.title,
        }),
      });
      if (response.ok) {
        setMenuItems((prev) =>
          prev.map((item) =>
            item.id === selectedMenuItem.id
              ? {
                  ...item,
                  linkedRecipeId: recipe.id,
                  linkedRecipeName: recipe.title,
                }
              : item,
          ),
        );
        maestroEventBus.emit("BEO_MENU_CHANGED", {
          beoId,
          menuItemId: selectedMenuItem.id,
          recipeId: recipe.id,
        });
      }
    } finally {
      setIsLoading(false);
      setSelectedMenuItem(null);
    }
  };
  const handleOpenModal = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsModalOpen(true);
  };
  const handleRemoveRecipe = async (item: MenuItem) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/beo/${beoId}/unlink-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId: item.id }),
      });
      if (response.ok) {
        setMenuItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, linkedRecipeId: undefined, linkedRecipeName: undefined }
              : i,
          ),
        );
        maestroEventBus.emit("BEO_MENU_CHANGED", {
          beoId,
          menuItemId: item.id,
          recipeId: null,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      {" "}
      <Card className="bg-slate-800 border-border p-6">
        {" "}
        <div className="flex items-center justify-between mb-4">
          {" "}
          <h3 className="text-sm font-semibold text-white">
            Menu & Recipes
          </h3>{" "}
          <Button size="sm" variant="outline" className="text-xs h-7 px-2">
            {" "}
            + Add Item{" "}
          </Button>{" "}
        </div>{" "}
        <div className="space-y-2 text-sm">
          {" "}
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded bg-surface border border-border hover:border-slate-600 transition-colors"
            >
              {" "}
              <div className="flex-1">
                {" "}
                <p className="text-white font-medium text-sm">
                  {item.name}
                </p>{" "}
                {item.linkedRecipeName && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {" "}
                    Recipe: {item.linkedRecipeName}{" "}
                  </p>
                )}{" "}
              </div>{" "}
              <div className="flex items-center gap-2">
                {" "}
                {item.linkedRecipeId ? (
                  <>
                    {" "}
                    <Badge variant="secondary" className="text-xs">
                      {" "}
                      ✓ Linked{" "}
                    </Badge>{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenModal(item)}
                      className="text-xs h-6 px-2"
                    >
                      {" "}
                      View{" "}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveRecipe(item)}
                      className="text-xs h-6 px-2 text-red-400 hover:text-red-300"
                      disabled={isLoading}
                    >
                      {" "}
                      Unlink{" "}
                    </Button>{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <Badge variant="destructive" className="text-xs">
                      {" "}
                      No Recipe{" "}
                    </Badge>{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenModal(item)}
                      className="text-xs h-6 px-2"
                      disabled={isLoading}
                    >
                      {" "}
                      Connect{" "}
                    </Button>{" "}
                  </>
                )}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </Card>{" "}
      {selectedMenuItem && (
        <RecipeQuickAddModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          menuItemId={selectedMenuItem.id}
          menuItemName={selectedMenuItem.name}
          availableRecipes={availableRecipes}
          onRecipeSelect={handleRecipeSelect}
          isLoading={isLoading}
        />
      )}{" "}
    </>
  );
}
