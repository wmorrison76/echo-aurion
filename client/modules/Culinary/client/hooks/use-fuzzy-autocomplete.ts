import { useAppData } from "@/context/AppDataContext";
import { INVENTORY_ITEMS } from "@/data/inventoryItems";
import { SUPPLIERS } from "@/data/suppliers";
import { useCallback, useMemo } from "react";
import {
  buildDictionary,
  fuzzyMatch,
  type FuzzyMatchOptions,
} from "@/lib/fuzzy";

export function useFuzzyAutocomplete(source: string[] | Set<string>) {
  const dictionary = useMemo(() => buildDictionary(source), [source]);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, dictionary, options).map((entry) => entry.value),
    [dictionary],
  );
}

export function useRecipeNameSuggestions() {
  const { recipes } = useAppData();
  const names = useMemo(
    () => recipes.map((recipe) => recipe.title || ""),
    [recipes],
  );
  return useFuzzyAutocomplete(names);
}

export function useIngredientSuggestions() {
  const { recipes } = useAppData();

  const candidates = useMemo(() => {
    const extracted: string[] = [];
    for (const recipe of recipes) {
      const rows = recipe.ingredients || [];
      for (const row of rows) {
        const text = String(row || "").trim();
        if (!text) continue;
        const cleaned = text
          .replace(/^\s*[0-9]+(?:[\/\.,]\s*[0-9]+)?\s*[a-zA-Z\.\-]*\s*/i, "")
          .trim();
        if (!cleaned) continue;
        extracted.push(cleaned);
      }
    }
    return buildDictionary(extracted);
  }, [recipes]);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, candidates, options).map((entry) => entry.value),
    [candidates],
  );
}

// Inventory items by canonical name
export function useInventoryItemSuggestions() {
  const candidates = useMemo(() => {
    return buildDictionary(INVENTORY_ITEMS.map((item) => item.canonicalName));
  }, []);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, candidates, options).map((entry) => entry.value),
    [candidates],
  );
}

// Supplier names
export function useSupplierNameSuggestions() {
  const candidates = useMemo(() => {
    return buildDictionary(SUPPLIERS.map((supplier) => supplier.name));
  }, []);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, candidates, options).map((entry) => entry.value),
    [candidates],
  );
}

// Supplier SKUs
export function useSupplierSkuSuggestions() {
  const candidates = useMemo(() => {
    const skus = new Set<string>();
    SUPPLIERS.forEach((supplier) => {
      // Catalog items would be populated from SUPPLIER_CATALOG
    });
    return Array.from(skus);
  }, []);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, candidates, options).map((entry) => entry.value),
    [candidates],
  );
}

// Component names from recipes
export function useComponentNameSuggestions() {
  const { recipes } = useAppData();

  const candidates = useMemo(() => {
    const components = new Set<string>();
    for (const recipe of recipes) {
      if (recipe.title) {
        components.add(recipe.title);
      }
      if (recipe.tags) {
        for (const tag of recipe.tags) {
          if (tag && typeof tag === "string") {
            components.add(tag);
          }
        }
      }
    }
    return buildDictionary(Array.from(components));
  }, [recipes]);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, candidates, options).map((entry) => entry.value),
    [candidates],
  );
}

// Allergen suggestions
export function useAllergenSuggestions() {
  const commonAllergens = useMemo(() => {
    return buildDictionary([
      "Dairy",
      "Eggs",
      "Fish",
      "Crustacean",
      "Tree nuts",
      "Peanuts",
      "Wheat",
      "Soy",
      "Sesame",
      "Celery",
      "Mustard",
      "Sulfites",
      "Mollusks",
      "Lupine",
    ]);
  }, []);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, commonAllergens, options).map((entry) => entry.value),
    [commonAllergens],
  );
}

// Unit of measurement suggestions
export function useUnitSuggestions() {
  const commonUnits = useMemo(() => {
    return buildDictionary([
      "each",
      "oz",
      "lb",
      "g",
      "kg",
      "ml",
      "L",
      "cup",
      "tsp",
      "tbsp",
      "pint",
      "quart",
      "gallon",
      "case",
      "box",
      "bunch",
      "head",
      "piece",
      "portion",
      "count",
    ]);
  }, []);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, commonUnits, options).map((entry) => entry.value),
    [commonUnits],
  );
}

// Technique suggestions
export function useTechniqueSuggestions() {
  const commonTechniques = useMemo(
    () =>
      buildDictionary([
        "Bake",
        "Boil",
        "Braise",
        "Broil",
        "Chop",
        "Dice",
        "Ferment",
        "Fry",
        "Grill",
        "Julienne",
        "Marinate",
        "Mince",
        "Poach",
        "Roast",
        "Sauté",
        "Simmer",
        "Steam",
        "Stew",
      ]),
    [],
  );

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, commonTechniques, options).map((entry) => entry.value),
    [commonTechniques],
  );
}

// Cuisine suggestions
export function useCuisineSuggestions() {
  const commonCuisines = useMemo(
    () =>
      buildDictionary([
        "American",
        "Asian",
        "Caribbean",
        "Chinese",
        "European",
        "French",
        "Indian",
        "Italian",
        "Japanese",
        "Mediterranean",
        "Mexican",
        "Middle Eastern",
        "Thai",
        "Vietnamese",
      ]),
    [],
  );

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, commonCuisines, options).map((entry) => entry.value),
    [commonCuisines],
  );
}

// Course/service suggestions
export function useCourseSuggestions() {
  const { recipes } = useAppData();

  const candidates = useMemo(() => {
    const courses = new Set<string>();
    for (const recipe of recipes) {
      if (recipe.course) {
        courses.add(recipe.course);
      }
    }
    return buildDictionary(Array.from(courses));
  }, [recipes]);

  return useCallback(
    (query: string, options?: FuzzyMatchOptions) =>
      fuzzyMatch(query, candidates, options).map((entry) => entry.value),
    [candidates],
  );
}

// Generic source-based suggestions
export function useSourceSuggestions(
  source:
    | "recipes"
    | "ingredients"
    | "suppliers"
    | "components"
    | "allergens"
    | "units"
    | "techniques"
    | "cuisines"
    | "courses",
) {
  const recipeSuggestions = useRecipeNameSuggestions();
  const ingredientSuggestions = useInventoryItemSuggestions();
  const supplierSuggestions = useSupplierNameSuggestions();
  const componentSuggestions = useComponentNameSuggestions();
  const allergenSuggestions = useAllergenSuggestions();
  const unitSuggestions = useUnitSuggestions();
  const techniqueSuggestions = useTechniqueSuggestions();
  const cuisineSuggestions = useCuisineSuggestions();
  const courseSuggestions = useCourseSuggestions();

  const suggestionMap = {
    recipes: recipeSuggestions,
    ingredients: ingredientSuggestions,
    suppliers: supplierSuggestions,
    components: componentSuggestions,
    allergens: allergenSuggestions,
    units: unitSuggestions,
    techniques: techniqueSuggestions,
    cuisines: cuisineSuggestions,
    courses: courseSuggestions,
  };

  return suggestionMap[source];
}
