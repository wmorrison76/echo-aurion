import { useMemo } from "react";
import { useAppData } from "@/context/AppDataContext";
import { operationsDocs } from "@/data/operationsDocs";
import { CHIT_PRINTERS, KITCHEN_STATIONS } from "@/data/kitchenStations";
import { buildDictionary, fuzzyMatch, type FuzzyMatchOptions } from "@/lib/fuzzy";

const CLEAN_LEADING_QUANTITY = /^\s*[0-9]+(?:[\/\.,]\s*[0-9]+)?\s*[a-zA-Z\.\-]*\s*/i;

export const suggestionScopes = [
  "general",
  "recipes",
  "ingredients",
  "documents",
  "stations",
  "tags",
  "people",
  "systems",
  "collections",
] as const;

export type FuzzySuggestionScope = (typeof suggestionScopes)[number];

type SuggestionBuckets = Record<FuzzySuggestionScope, string[]>;

type Addable = string | null | undefined | number;

function normalizeCandidate(value: Addable): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text;
}

function stripQuantityPrefix(value: string): string {
  return value.replace(CLEAN_LEADING_QUANTITY, "").trim();
}

function addValues(target: Set<string>, ...values: Addable[]): void {
  for (const value of values) {
    const normalized = normalizeCandidate(value);
    if (normalized) {
      target.add(normalized);
    }
  }
}

function addMany(target: Set<string>, values: Iterable<Addable>): void {
  for (const value of values) {
    const normalized = normalizeCandidate(value);
    if (normalized) {
      target.add(normalized);
    }
  }
}

export function useSuggestionBuckets(): SuggestionBuckets {
  const { recipes, images, lookbooks, tileBoards, collections, workflows, inspections } = useAppData();

  return useMemo(() => {
    const recipeSet = new Set<string>();
    const ingredientSet = new Set<string>();
    const documentSet = new Set<string>();
    const stationSet = new Set<string>();
    const tagSet = new Set<string>();
    const peopleSet = new Set<string>();
    const systemsSet = new Set<string>();
    const collectionSet = new Set<string>();

    for (const recipe of recipes) {
      addValues(recipeSet, recipe.title, recipe.description, recipe.course, recipe.cuisine, recipe.difficulty);
      if (Array.isArray(recipe.ingredients)) {
        for (const row of recipe.ingredients) {
          const cleaned = stripQuantityPrefix(String(row ?? ""));
          if (cleaned) {
            ingredientSet.add(cleaned);
          }
        }
      }
      addMany(tagSet, recipe.tags ?? []);
      if (Array.isArray((recipe as any).access)) {
        addMany(peopleSet, (recipe as any).access as Addable[]);
      }
    }

    for (const image of images) {
      addValues(collectionSet, image.name);
      addMany(tagSet, image.tags ?? []);
    }

    for (const lookbook of lookbooks) {
      addValues(collectionSet, lookbook.name);
    }

    for (const board of tileBoards) {
      addValues(collectionSet, board.name, board.description);
      for (const tile of board.tiles) {
        addValues(collectionSet, tile.title, tile.subtitle);
        addMany(tagSet, tile.tags);
      }
    }

    for (const collection of collections) {
      addValues(collectionSet, collection.name, collection.description, collection.season);
    }

    for (const workflow of workflows) {
      addValues(documentSet, workflow.name, workflow.menuTitle, workflow.menuDescription, workflow.serverNotes);
      addMany(systemsSet, workflow.stationIds ?? []);
      addMany(systemsSet, workflow.printerIds ?? []);
    }

    for (const inspection of inspections) {
      addValues(documentSet, inspection.name, inspection.notes, inspection.inspector, inspection.fileName);
      addMany(tagSet, inspection.tags ?? []);
    }

    for (const doc of operationsDocs) {
      addValues(documentSet, doc.title, doc.docType, doc.category, doc.owner, doc.frequencyLabel);
      addMany(tagSet, doc.tags);
      addMany(systemsSet, doc.linkedSystems);
      addMany(documentSet, doc.playbookFocus);
      for (const entry of doc.history) {
        addValues(peopleSet, entry.author);
        addValues(documentSet, entry.note);
      }
    }

    for (const station of KITCHEN_STATIONS) {
      addValues(stationSet, station.name, station.category, station.description);
      addMany(systemsSet, station.defaultPrinters);
    }

    for (const printer of CHIT_PRINTERS) {
      addValues(stationSet, printer.name, printer.technology, printer.description, printer.recommendedUse);
    }

    const scoped: Partial<SuggestionBuckets> = {
      recipes: buildDictionary(recipeSet),
      ingredients: buildDictionary(ingredientSet),
      documents: buildDictionary(documentSet),
      stations: buildDictionary(stationSet),
      tags: buildDictionary(tagSet),
      people: buildDictionary(peopleSet),
      systems: buildDictionary(systemsSet),
      collections: buildDictionary(collectionSet),
    };

    const generalSet = new Set<string>();
    for (const scope of suggestionScopes) {
      if (scope === "general") continue;
      const entries = scoped[scope];
      if (!entries) continue;
      for (const entry of entries) {
        generalSet.add(entry);
      }
    }

    return {
      general: buildDictionary(generalSet),
      recipes: scoped.recipes ?? [],
      ingredients: scoped.ingredients ?? [],
      documents: scoped.documents ?? [],
      stations: scoped.stations ?? [],
      tags: scoped.tags ?? [],
      people: scoped.people ?? [],
      systems: scoped.systems ?? [],
      collections: scoped.collections ?? [],
    } satisfies SuggestionBuckets;
  }, [recipes, images, lookbooks, tileBoards, collections, workflows, inspections]);
}

export type UseFuzzySuggestionOptions = FuzzyMatchOptions & {
  scope?: FuzzySuggestionScope | FuzzySuggestionScope[];
  disabled?: boolean;
  minQueryLength?: number;
  includeExact?: boolean;
};

export function useFuzzySuggestions(query: string, options?: UseFuzzySuggestionOptions): string[] {
  const buckets = useSuggestionBuckets();

  const {
    scope = "general",
    disabled = false,
    minQueryLength = 2,
    includeExact = false,
    ...fuzzyOptions
  } = options ?? {};

  const dictionary = useMemo(() => {
    const scopes = Array.isArray(scope) ? scope : [scope];
    const combined = new Set<string>();
    for (const key of scopes) {
      const values = buckets[key];
      if (values) {
        for (const entry of values) {
          combined.add(entry);
        }
      }
    }
    if (combined.size === 0) {
      for (const entry of buckets.general) {
        combined.add(entry);
      }
    }
    return Array.from(combined);
  }, [buckets, scope]);

  return useMemo(() => {
    const term = query.trim();
    if (disabled || term.length < minQueryLength) return [];
    const results = fuzzyMatch(term, dictionary, fuzzyOptions);
    const normalized = term.toLowerCase();
    const seen = new Set<string>();
    return results
      .map((entry) => entry.value)
      .filter((value) => {
        if (!includeExact && value.toLowerCase() === normalized) {
          return false;
        }
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [dictionary, disabled, fuzzyOptions, includeExact, minQueryLength, query]);
}
