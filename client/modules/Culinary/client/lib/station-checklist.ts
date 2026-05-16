import type { Recipe, RecipeExport } from "../../shared/recipes";
import type { RecipeCollection } from "../../shared/server-notes";

export type StationChecklistItem = {
  id: string;
  ingredient: string;
  quantity?: string;
  unit?: string;
  prep?: string;
  yieldText?: string;
  recipeId: string;
  recipeName: string;
};

export type StationChecklistRecipe = {
  id: string;
  name: string;
  course?: string;
  portions?: { count: number; unit?: string } | null;
  allergens: string[];
  items: StationChecklistItem[];
};

export type StationChecklistStation = {
  id: string;
  name: string;
  recipes: StationChecklistRecipe[];
  totalItems: number;
};

export type StationChecklistAggregate = {
  ingredient: string;
  occurrences: number;
  recipeIds: string[];
};

export type StationChecklistSummary = {
  totalStations: number;
  totalRecipes: number;
  totalItems: number;
  uniqueIngredients: number;
  allergens: string[];
  collectionName: string;
  updatedAt: string;
};

export type StationChecklistMissing = {
  recipeId: string;
  recipeName: string;
  reason: "missingServerNotes" | "noIngredients";
};

export type StationChecklistResult = {
  stations: StationChecklistStation[];
  summary: StationChecklistSummary;
  aggregates: StationChecklistAggregate[];
  missing: StationChecklistMissing[];
};

type StationBuilder = {
  id: string;
  name: string;
  recipes: Map<string, StationChecklistRecipe>;
};

const fallbackStationName = "General Line";

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const toStationId = (name: string) =>
  normalizeWhitespace(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general";

const toTitleCase = (value: string) =>
  normalizeWhitespace(value)
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const extractServerNotes = (recipe: Recipe): RecipeExport | undefined => {
  const extra = recipe.extra as { serverNotes?: RecipeExport } | undefined;
  if (!extra) return undefined;
  const serverNotes = extra.serverNotes;
  if (!serverNotes || typeof serverNotes !== "object") return undefined;
  return serverNotes;
};

export function buildStationChecklist(
  collection: RecipeCollection,
  recipes: Recipe[],
): StationChecklistResult {
  const selection = collection.recipeIds
    .map((recipeId) => recipes.find((recipe) => recipe.id === recipeId))
    .filter((recipe): recipe is Recipe => Boolean(recipe));

  const stationMap = new Map<string, StationBuilder>();
  const ingredientAggregate = new Map<string, { count: number; recipeIds: Set<string> }>();
  const missing: StationChecklistMissing[] = [];
  const allergenSet = new Set<string>();

  selection.forEach((recipe) => {
    const serverNotes = extractServerNotes(recipe);
    if (!serverNotes) {
      missing.push({ recipeId: recipe.id, recipeName: recipe.title, reason: "missingServerNotes" });
      return;
    }

    const ingredients = (serverNotes.ingredients ?? [])
      .map((row, index) => {
        const ingredientName = row.item ? normalizeWhitespace(row.item) : "";
        if (!ingredientName) return null;
        return {
          id: `${recipe.id}::${index}`,
          ingredient: ingredientName,
          quantity: row.qty ? normalizeWhitespace(row.qty) : undefined,
          unit: row.unit ? normalizeWhitespace(row.unit) : undefined,
          prep: row.prep ? normalizeWhitespace(row.prep) : undefined,
          yieldText: row.yield ? normalizeWhitespace(row.yield) : undefined,
          recipeId: recipe.id,
          recipeName: recipe.title,
        } as StationChecklistItem;
      })
      .filter((value): value is Exclude<typeof value, null> => value !== null);

    if (ingredients.length === 0) {
      missing.push({ recipeId: recipe.id, recipeName: recipe.title, reason: "noIngredients" });
      return;
    }

    const stationsRaw = Array.isArray(serverNotes.access) ? serverNotes.access : [];
    const stationNames = stationsRaw
      .map((entry) => normalizeWhitespace(String(entry)))
      .filter((entry) => entry.length > 0);

    const courses = Array.isArray(serverNotes.modifiers?.courses)
      ? serverNotes.modifiers?.courses.filter((course): course is string => typeof course === "string")
      : [];

    const course = courses[0] ?? recipe.course ?? undefined;

    const portions =
      typeof serverNotes.portionCount === "number" && serverNotes.portionCount > 0
        ? {
            count: serverNotes.portionCount,
            unit: serverNotes.portionUnit || undefined,
          }
        : null;

    const allergens = Array.isArray(serverNotes.allergens)
      ? serverNotes.allergens.filter((value): value is string => typeof value === "string")
      : [];

    allergens.forEach((value) => allergenSet.add(normalizeWhitespace(value)));

    const effectiveStations = stationNames.length ? stationNames : [fallbackStationName];

    ingredients.forEach((item) => {
      const key = normalizeWhitespace(item.ingredient).toLowerCase();
      const aggregate = ingredientAggregate.get(key);
      if (aggregate) {
        aggregate.count += 1;
        aggregate.recipeIds.add(recipe.id);
      } else {
        ingredientAggregate.set(key, {
          count: 1,
          recipeIds: new Set([recipe.id]),
        });
      }
    });

    effectiveStations.forEach((stationNameRaw) => {
      const stationName = toTitleCase(stationNameRaw || fallbackStationName);
      const stationId = toStationId(stationName);

      let station = stationMap.get(stationId);
      if (!station) {
        station = {
          id: stationId,
          name: stationName,
          recipes: new Map<string, StationChecklistRecipe>(),
        } satisfies StationBuilder;
        stationMap.set(stationId, station);
      }

      let stationRecipe = station.recipes.get(recipe.id);
      if (!stationRecipe) {
        stationRecipe = {
          id: recipe.id,
          name: recipe.title,
          course,
          portions,
          allergens,
          items: [],
        } satisfies StationChecklistRecipe;
        station.recipes.set(recipe.id, stationRecipe);
      }

      stationRecipe.items.push(
        ...ingredients.map((item) => ({
          ...item,
          id: `${stationId}::${item.id}`,
        })),
      );
    });
  });

  const stations: StationChecklistStation[] = Array.from(stationMap.values())
    .map((station) => {
      const recipesList = Array.from(station.recipes.values()).map((recipe) => ({
        ...recipe,
        items: recipe.items,
      }));
      return {
        id: station.id,
        name: station.name,
        recipes: recipesList,
        totalItems: recipesList.reduce((sum, recipe) => sum + recipe.items.length, 0),
      } satisfies StationChecklistStation;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary: StationChecklistSummary = {
    totalStations: stations.length,
    totalRecipes: selection.length,
    totalItems: stations.reduce((sum, station) => sum + station.totalItems, 0),
    uniqueIngredients: ingredientAggregate.size,
    allergens: Array.from(allergenSet).sort((a, b) => a.localeCompare(b)),
    collectionName: collection.name,
    updatedAt: collection.updatedAt,
  } satisfies StationChecklistSummary;

  const aggregates: StationChecklistAggregate[] = Array.from(ingredientAggregate.entries())
    .map(([key, value]) => ({
      ingredient: toTitleCase(key),
      occurrences: value.count,
      recipeIds: Array.from(value.recipeIds),
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.ingredient.localeCompare(b.ingredient));

  return {
    stations,
    summary,
    aggregates,
    missing,
  } satisfies StationChecklistResult;
}
