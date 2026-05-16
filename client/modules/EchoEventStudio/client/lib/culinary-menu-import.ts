import type { MenuItem } from "../components/BeoMenuPicker";

type RawRecipe = {
  id?: string;
  title?: string;
  description?: string;
  ingredients?: string[];
  tags?: string[];
};

const RECIPE_KEY = "app.recipes.v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function inferCategory(recipe: RawRecipe, fallback: string) {
  const title = String(recipe.title || "").toLowerCase();
  const tags = (recipe.tags || []).join(" ").toLowerCase();
  const needle = `${title} ${tags}`;
  if (
    needle.includes("dessert") ||
    needle.includes("pastry") ||
    needle.includes("cake")
  )
    return "Dessert";
  if (needle.includes("appetizer") || needle.includes("starter"))
    return "Appetizer";
  if (needle.includes("beverage") || needle.includes("cocktail"))
    return "Beverage";
  return fallback;
}

export function importCulinaryRecipes(params?: {
  outletId?: string;
  defaultCategory?: string;
  defaultPrice?: number;
}): MenuItem[] {
  if (typeof window === "undefined") return [];
  const recipes =
    safeParse<RawRecipe[]>(localStorage.getItem(RECIPE_KEY)) || [];
  const defaultCategory = params?.defaultCategory || "Entree";
  const defaultPrice = params?.defaultPrice ?? 25;
  return recipes
    .filter((r) => r && (r.title || r.id))
    .map((recipe, idx) => ({
      id: recipe.id
        ? `culinary-${recipe.id}`
        : `culinary-${idx}-${String(recipe.title || "item").toLowerCase()}`,
      name: String(recipe.title || "Untitled"),
      category: inferCategory(recipe, defaultCategory),
      description:
        recipe.description || (recipe.ingredients || []).slice(0, 3).join(", "),
      price: defaultPrice,
      cost: Math.max(0, defaultPrice * 0.45),
      preparationTime: 20,
      servingSize: "per person",
      dietary: [],
      allergens: [],
      popularity: 0.6,
      upsellPotential: 0.4,
      outletId: params?.outletId || "all",
      baseItemId: recipe.id,
      menuVersion: "v1",
    }));
}

export function importPastryRecipes(params?: {
  outletId?: string;
  defaultPrice?: number;
}): MenuItem[] {
  return importCulinaryRecipes({
    outletId: params?.outletId,
    defaultCategory: "Dessert",
    defaultPrice: params?.defaultPrice ?? 12,
  });
}
