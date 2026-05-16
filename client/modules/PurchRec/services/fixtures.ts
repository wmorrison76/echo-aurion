import { Ingredient, MenuItem, Recipe, VendorItem } from "../data/schemas";
import type * as SchemaTypes from "../data/schemas";
import { VendorCatalogEntry } from "../utils/vendors";
const FIXTURE_LOADERS = {
  "vendorCatalog.sample.json": () =>
    import("../data/fixtures/vendorCatalog.sample.json?raw"),
  "menuItems.sample.json": () =>
    import("../data/fixtures/menuItems.sample.json?raw"),
  "recipes.sample.json": () =>
    import("../data/fixtures/recipes.sample.json?raw"),
  "ingredients.sample.json": () =>
    import("../data/fixtures/ingredients.sample.json?raw"),
  "onhand.sample.json": () => import("../data/fixtures/onhand.sample.json?raw"),
} as const;
type FixtureKey = keyof typeof FIXTURE_LOADERS;
async function loadJsonFixture<T>(relativePath: FixtureKey): Promise<T> {
  const mod = await FIXTURE_LOADERS[relativePath]();
  return JSON.parse(mod.default) as T;
}
type VendorFixture = {
  id: string;
  name: string;
  items: (Omit<SchemaTypes.VendorItem, "vendorId"> & { vendorId?: string })[];
};
type OnHandFixture = Record<string, { qtyBase: number; unit: string }>;
let cachedVendorCatalog: VendorCatalogEntry[] | null = null;
let cachedMenuItems: SchemaTypes.MenuItem[] | null = null;
let cachedRecipes: Record<string, SchemaTypes.Recipe> | null = null;
let cachedIngredients: Record<string, SchemaTypes.Ingredient> | null = null;
let cachedOnHand: OnHandFixture | null = null;
export async function loadVendorCatalog(): Promise<VendorCatalogEntry[]> {
  if (cachedVendorCatalog) return cachedVendorCatalog;
  const raw = await loadJsonFixture<VendorFixture[]>(
    "vendorCatalog.sample.json",
  );
  cachedVendorCatalog = raw.map((vendor) => ({
    vendorId: vendor.id,
    vendorName: vendor.name,
    items: vendor.items.map((item) => ({ ...item, vendorId: vendor.id })),
  }));
  return cachedVendorCatalog;
}
export async function loadMenuItems(): Promise<SchemaTypes.MenuItem[]> {
  if (cachedMenuItems) return cachedMenuItems;
  cachedMenuItems = await loadJsonFixture<SchemaTypes.MenuItem[]>(
    "menuItems.sample.json",
  );
  return cachedMenuItems;
}
export async function loadRecipe(
  recipeId: string,
): Promise<SchemaTypes.Recipe | null> {
  const recipes = await loadRecipesMap();
  return recipes[recipeId] ?? null;
}
export async function loadRecipesMap(): Promise<
  Record<string, SchemaTypes.Recipe>
> {
  if (cachedRecipes) return cachedRecipes;
  const list = await loadJsonFixture<SchemaTypes.Recipe[]>(
    "recipes.sample.json",
  );
  cachedRecipes = Object.fromEntries(list.map((recipe) => [recipe.id, recipe]));
  return cachedRecipes;
}
export async function loadIngredientsMap(): Promise<
  Record<string, SchemaTypes.Ingredient>
> {
  if (cachedIngredients) return cachedIngredients;
  const list = await loadJsonFixture<SchemaTypes.Ingredient[]>(
    "ingredients.sample.json",
  );
  cachedIngredients = Object.fromEntries(
    list.map((ingredient) => [ingredient.id, ingredient]),
  );
  return cachedIngredients;
}
export async function loadOnHand(): Promise<OnHandFixture> {
  if (cachedOnHand) return cachedOnHand;
  cachedOnHand = await loadJsonFixture<OnHandFixture>("onhand.sample.json");
  return cachedOnHand;
}
export function resetFixturesCache() {
  cachedVendorCatalog = null;
  cachedMenuItems = null;
  cachedRecipes = null;
  cachedIngredients = null;
  cachedOnHand = null;
}
