// Maps recipe ingredient text strings to canonical inventory items
// Handles common variations, synonyms, and fuzzy matching

import { INVENTORY_ITEMS } from "./inventoryItems";
import { ingredientSimilarity, fuzzySearch } from "@/lib/fuzzy-matcher";

export type IngredientMapping = {
  recipeText: string;
  inventoryId: string;
  confidence: number; // 0-1, where 1 is exact match
  notes?: string;
};

// Exact mappings: recipe text → inventory item ID
// These are manually curated for high confidence matches
const EXACT_MAPPINGS: IngredientMapping[] = [
  { recipeText: "heirloom carrots, peeled", inventoryId: "ing-heirloom-carrot", confidence: 1.0 },
  { recipeText: "heirloom carrots", inventoryId: "ing-heirloom-carrot", confidence: 0.95 },
  { recipeText: "heirloom carrot", inventoryId: "ing-heirloom-carrot", confidence: 0.95 },
  { recipeText: "carrots, peeled", inventoryId: "ing-heirloom-carrot", confidence: 0.85 },
  { recipeText: "whole blanched almonds", inventoryId: "ing-whole-blanched-almonds", confidence: 1.0 },
  { recipeText: "almonds, blanched", inventoryId: "ing-whole-blanched-almonds", confidence: 0.95 },
  { recipeText: "prime beef short rib, boneless", inventoryId: "ing-beef-short-rib", confidence: 1.0 },
  { recipeText: "beef short rib", inventoryId: "ing-beef-short-rib", confidence: 0.9 },
  { recipeText: "short rib", inventoryId: "ing-beef-short-rib", confidence: 0.8 },
  { recipeText: "beef tallow", inventoryId: "ing-beef-tallow", confidence: 1.0 },
  { recipeText: "tallow", inventoryId: "ing-beef-tallow", confidence: 0.95 },
  { recipeText: "fresh garlic cloves, jumbo", inventoryId: "ing-fresh-garlic-cloves", confidence: 1.0 },
  { recipeText: "garlic cloves", inventoryId: "ing-fresh-garlic-cloves", confidence: 0.95 },
  { recipeText: "garlic", inventoryId: "ing-fresh-garlic-cloves", confidence: 0.8 },
  { recipeText: "organic coconut milk", inventoryId: "ing-organic-coconut-milk", confidence: 1.0 },
  { recipeText: "coconut milk", inventoryId: "ing-organic-coconut-milk", confidence: 0.95 },
  { recipeText: "agar powder", inventoryId: "ing-agar-powder", confidence: 1.0 },
  { recipeText: "agar", inventoryId: "ing-agar-powder", confidence: 0.95 },
  { recipeText: "madagascar vanilla bean paste", inventoryId: "ing-vanilla-bean-paste", confidence: 1.0 },
  { recipeText: "vanilla bean paste", inventoryId: "ing-vanilla-bean-paste", confidence: 0.95 },
  { recipeText: "vanilla paste", inventoryId: "ing-vanilla-bean-paste", confidence: 0.9 },
  { recipeText: "fermented calabrian chili puree", inventoryId: "ing-calabrian-chili", confidence: 1.0 },
  { recipeText: "calabrian chili", inventoryId: "ing-calabrian-chili", confidence: 0.95 },
  { recipeText: "chili puree", inventoryId: "ing-calabrian-chili", confidence: 0.8 },
  { recipeText: "wildflower honey, raw", inventoryId: "ing-wildflower-honey", confidence: 1.0 },
  { recipeText: "wildflower honey", inventoryId: "ing-wildflower-honey", confidence: 0.95 },
  { recipeText: "raw honey", inventoryId: "ing-wildflower-honey", confidence: 0.85 },
  { recipeText: "honey", inventoryId: "ing-wildflower-honey", confidence: 0.7 },
  { recipeText: "mirepoix blend, diced", inventoryId: "ing-mirepoix-blend", confidence: 1.0 },
  { recipeText: "mirepoix", inventoryId: "ing-mirepoix-blend", confidence: 0.95 },
  { recipeText: "fresh meyer lemons", inventoryId: "ing-meyer-lemon", confidence: 1.0 },
  { recipeText: "meyer lemons", inventoryId: "ing-meyer-lemon", confidence: 0.95 },
  { recipeText: "lemons", inventoryId: "ing-meyer-lemon", confidence: 0.7 },
];

// Main function: Map recipe ingredient text to inventory item
export function mapIngredientToInventory(recipeText: string): IngredientMapping | null {
  const normalizedText = recipeText.toLowerCase().trim();

  // 1. Try exact matching first against EXACT_MAPPINGS
  const exactMatch = EXACT_MAPPINGS.find(
    (m) => m.recipeText.toLowerCase() === normalizedText,
  );
  if (exactMatch) return exactMatch;

  // 2. Try case-insensitive partial matching against EXACT_MAPPINGS
  const partialMatch = EXACT_MAPPINGS.find(
    (m) => normalizedText.includes(m.recipeText.toLowerCase()) ||
           m.recipeText.toLowerCase().includes(normalizedText),
  );
  if (partialMatch && partialMatch.confidence >= 0.8) {
    return {
      ...partialMatch,
      confidence: Math.min(partialMatch.confidence, 0.85),
    };
  }

  // 3. Fuzzy match against canonical names using the better algorithm
  const results = fuzzySearch(
    recipeText,
    INVENTORY_ITEMS,
    (item) => item.canonicalName,
    0.65, // Use slightly higher threshold for auto-mapping
  );

  if (results.length > 0) {
    const bestMatch = results[0];
    return {
      recipeText,
      inventoryId: bestMatch.item.id,
      confidence: bestMatch.score,
      notes: bestMatch.matchType === "exact" ? undefined : `Matched by ${bestMatch.matchType}`,
    };
  }

  return null;
}

// Batch mapping for multiple ingredients
export function mapIngredientsToInventory(
  recipeTexts: string[],
): Map<string, IngredientMapping> {
  const results = new Map<string, IngredientMapping>();
  for (const text of recipeTexts) {
    const mapping = mapIngredientToInventory(text);
    if (mapping) {
      results.set(text, mapping);
    }
  }
  return results;
}

// Search inventory items by name
export function searchInventoryItems(
  query: string,
  minConfidence: number = 0.6,
): IngredientMapping[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery.length === 0) return [];

  const results: IngredientMapping[] = [];

  // Search against canonical names
  const canonicalResults = fuzzySearch(
    query,
    INVENTORY_ITEMS,
    (item) => item.canonicalName,
    minConfidence,
  );

  for (const result of canonicalResults) {
    results.push({
      recipeText: result.item.canonicalName,
      inventoryId: result.item.id,
      confidence: result.score,
    });
  }

  // Also search descriptions for items not already in results
  const resultsMap = new Set(results.map((r) => r.inventoryId));
  for (const item of INVENTORY_ITEMS) {
    if (!resultsMap.has(item.id) && item.description) {
      const descResults = fuzzySearch(
        query,
        [item],
        (i) => i.description || "",
        minConfidence,
      );
      if (descResults.length > 0) {
        results.push({
          recipeText: item.description,
          inventoryId: item.id,
          confidence: descResults[0].score,
        });
      }
    }
  }

  // Sort by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence);
}

// Get all mapped ingredients (for debugging/admin)
export function getAllMappings(): IngredientMapping[] {
  return EXACT_MAPPINGS;
}

// Add a custom mapping (for user overrides)
const customMappings = new Map<string, string>();

export function setCustomMapping(recipeText: string, inventoryId: string): void {
  customMappings.set(recipeText.toLowerCase(), inventoryId);
}

export function getCustomMapping(recipeText: string): string | undefined {
  return customMappings.get(recipeText.toLowerCase());
}

// Enhanced mapping function that checks custom mappings first
export function mapIngredientWithCustom(recipeText: string): IngredientMapping | null {
  const customId = getCustomMapping(recipeText);
  if (customId) {
    return {
      recipeText,
      inventoryId: customId,
      confidence: 1.0,
      notes: "Custom mapping",
    };
  }
  return mapIngredientToInventory(recipeText);
}
