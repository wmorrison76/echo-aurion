import type { ServerNoteRecipe } from "../../shared/server-notes";

const TAG_MATCHER = /(gluten|dairy|milk|lactose|egg|soy|soya|nut|peanut|tree\s*nuts|shellfish|crustacean|mollusk|fish|sesame|wheat)/i;

function normalizeList(source: unknown): string[] {
  if (Array.isArray(source)) {
    return source.map((value) => String(value)).filter((value) => value.trim().length > 0);
  }
  if (typeof source === "string" && source.trim()) {
    return source
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

export function extractRecipeAllergens(entry: ServerNoteRecipe): string[] {
  const recipe: any = entry.recipe ?? {};
  const found = new Set<string>();

  const collect = (input: unknown) => {
    for (const item of normalizeList(input)) {
      found.add(item);
    }
  };

  collect(recipe.allergens);
  collect(recipe.extra?.allergenList);
  collect(recipe.extra?.selectedAllergens);
  collect(recipe.extra?.selectedAllergenList);

  if (Array.isArray(recipe.tags)) {
    for (const tag of recipe.tags) {
      if (TAG_MATCHER.test(String(tag))) {
        found.add(String(tag));
      }
    }
  }

  const list = Array.from(found);
  list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return list;
}

export function collectUniqueAllergens(recipes: ServerNoteRecipe[]): string[] {
  const set = new Set<string>();
  for (const entry of recipes) {
    for (const allergen of extractRecipeAllergens(entry)) {
      set.add(allergen);
    }
  }
  const unique = Array.from(set);
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return unique;
}
