/**
 * Advanced NLP engine for voice inventory capture
 * Handles mistake correction, fuzzy matching, and intelligent interpretation
 */
import type { InventoryItem, StorageLocation } from "@shared/inventory";

export interface LocationMatch {
  name: string;
  bin?: string | null;
  confidence: number;
  isMistakeCorrection?: boolean;
}

export interface ItemMatch {
  id: string;
  name: string;
  confidence: number;
}

export interface ParsedVoiceInput {
  itemName: string;
  itemId?: string;
  quantity: number;
  unit: string;
  location?: LocationMatch;
  confidence: number;
  rawInput: string;
}

// Common location aliases and mistakes
const LOCATION_ALIASES: Record<string, string[]> = {
  "dry storage": ["dry", "dry goods", "dry store", "drygoods"],
  "walk-in cooler": ["walkin", "walk in", "walk-in", "cooler", "walk in cooler", "walkin cooler"],
  "reach-in cooler": ["reach in", "reach-in", "reach cooler"],
  freezer: ["freeze", "frozen", "deep freeze"],
  "walk-in freezer": ["walk in freezer", "walkin freezer", "freeze room"],
  bar: ["liquor", "bottle rack", "bar storage"],
  "dry goods": ["pantry", "storage", "cupboard"],
  "walk-in": ["walkin", "walk in", "walk-in", "cooler"],
};

// Create reverse lookup for quick matching
function buildLocationAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(LOCATION_ALIASES)) {
    for (const alias of aliases) {
      map.set(normalizeText(alias), canonical);
    }
    map.set(normalizeText(canonical), canonical);
  }
  return map;
}

const LOCATION_ALIAS_MAP = buildLocationAliasMap();

// Unit normalization
const UNIT_PATTERNS: Record<string, string> = {
  case: "case", cases: "case", box: "case", boxes: "case",
  pound: "lb", pounds: "lb", lbs: "lb", lb: "lb",
  kilogram: "kg", kilograms: "kg", kg: "kg",
  gram: "g", grams: "g",
  ounce: "oz", ounces: "oz", oz: "oz",
  each: "each", ea: "each", piece: "each", pieces: "each",
  dozen: "doz", dozens: "doz", dz: "doz",
  pack: "pack", packs: "pack",
  gallon: "gal", gallons: "gal", gal: "gal",
  quart: "qt", quarts: "qt",
  pint: "pt", pints: "pt",
  liter: "l", liters: "l", l: "l",
  ml: "ml", milliliter: "ml",
};

const QUANTITY_PATTERNS = [
  /^(\d+(?:\.\d+)?)\s*(?:and|\/|\-)\s*(\d+(?:\.\d+)?)/,
  /(\d+(?:\.\d+)?)\s*(?:half|\.5)/,
  /^(\d+(?:\.\d+)?)/,
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  return Math.max(0, 1 - distance / maxLen);
}

export function extractQuantity(input: string): { quantity: number; unit: string; remaining: string } {
  let quantity = 1;
  let unit = "each";
  let remaining = input;
  for (const pattern of QUANTITY_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      quantity = parseFloat(match[1]);
      remaining = input.replace(match[0], "").trim();
      break;
    }
  }
  const unitMatch = input.match(/\b(\w+)\b/gi);
  if (unitMatch) {
    for (const word of unitMatch) {
      const normalized = word.toLowerCase();
      if (UNIT_PATTERNS[normalized]) {
        unit = UNIT_PATTERNS[normalized];
        remaining = remaining.replace(new RegExp(`\\b${word}\\b`, "i"), "").trim();
        break;
      }
    }
  }
  return { quantity: Math.max(1, quantity), unit, remaining };
}

export function matchLocation(
  input: string,
  availableLocations: Array<{ name: string; bin?: string | null; outletId: string }>,
): LocationMatch | null {
  const normalized = normalizeText(input);
  const aliasMatch = LOCATION_ALIAS_MAP.get(normalized);
  if (aliasMatch) {
    for (const loc of availableLocations) {
      const locNormalized = normalizeText(loc.name);
      if (locNormalized.includes(aliasMatch) || aliasMatch.includes(locNormalized)) {
        return {
          name: loc.name,
          bin: loc.bin ?? null,
          confidence: 0.95,
          isMistakeCorrection: normalized !== aliasMatch,
        };
      }
    }
    return {
      name: aliasMatch,
      confidence: 0.85,
      isMistakeCorrection: normalized !== aliasMatch,
    };
  }
  let bestMatch: { location: (typeof availableLocations)[0]; score: number } | null = null;
  for (const loc of availableLocations) {
    const locNormalized = normalizeText(loc.name);
    const score = calculateSimilarity(normalized, locNormalized);
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { location: loc, score };
    }
  }
  if (bestMatch) {
    return {
      name: bestMatch.location.name,
      bin: bestMatch.location.bin ?? null,
      confidence: bestMatch.score,
    };
  }
  return null;
}

export function matchItem(
  input: string,
  availableItems: InventoryItem[],
  threshold: number = 0.45,
): ItemMatch | null {
  const normalized = normalizeText(input);
  let bestMatch: { item: InventoryItem; score: number } | null = null;
  for (const item of availableItems) {
    const itemNormalized = normalizeText(item.name);
    if (itemNormalized === normalized) {
      return { id: item.id, name: item.name, confidence: 1.0 };
    }
    if (itemNormalized.includes(normalized) || normalized.includes(itemNormalized)) {
      const score = 0.9;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { item, score };
      }
      continue;
    }
    const score = calculateSimilarity(normalized, itemNormalized);
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { item, score };
    }
  }
  if (bestMatch && bestMatch.score >= threshold) {
    return {
      id: bestMatch.item.id,
      name: bestMatch.item.name,
      confidence: bestMatch.score,
    };
  }
  return null;
}

export function parseVoiceInput(
  input: string,
  availableItems: InventoryItem[],
  availableLocations: Array<{ name: string; bin?: string | null; outletId: string }>,
): ParsedVoiceInput | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const { quantity, unit, remaining: _afterQty } = extractQuantity(trimmed);
  const location = matchLocation(trimmed, availableLocations);
  let itemInput = trimmed;
  if (location) {
    itemInput = trimmed.replace(new RegExp(location.name, "i"), "").trim();
  }
  const unitKeywords = Object.keys(UNIT_PATTERNS);
  for (const unitKeyword of unitKeywords) {
    itemInput = itemInput.replace(new RegExp(`\\b${unitKeyword}\\b`, "i"), "").trim();
  }
  const itemMatch = matchItem(itemInput, availableItems);
  if (!itemMatch) {
    return {
      itemName: itemInput || trimmed,
      quantity,
      unit,
      location: location ?? undefined,
      confidence: 0.3,
      rawInput: trimmed,
    };
  }
  return {
    itemName: itemMatch.name,
    itemId: itemMatch.id,
    quantity,
    unit,
    location: location ?? undefined,
    confidence: Math.min(1, itemMatch.confidence),
    rawInput: trimmed,
  };
}

export function suggestLocations(
  searchTerm: string,
  availableLocations: Array<{ name: string; bin?: string | null }>,
  limit: number = 5,
): Array<{ name: string; bin?: string | null; score: number }> {
  const normalized = normalizeText(searchTerm);
  return availableLocations
    .map((loc) => {
      const locNormalized = normalizeText(loc.name);
      const score = calculateSimilarity(normalized, locNormalized);
      return { ...loc, score };
    })
    .filter((loc) => loc.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function suggestItems(
  searchTerm: string,
  availableItems: InventoryItem[],
  limit: number = 5,
): ItemMatch[] {
  const normalized = normalizeText(searchTerm);
  return availableItems
    .map((item) => ({
      id: item.id,
      name: item.name,
      confidence: calculateSimilarity(normalized, normalizeText(item.name)),
    }))
    .filter((match) => match.confidence > 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return UNIT_PATTERNS[normalized] || "each";
}
