import { useMemo } from "react";
import { YIELD_REFERENCE_DATA } from "@/data/yieldReference";

type Dimension = "mass" | "volume" | "count";

type BaseUnitResult = {
  value: number;
  unit: string;
  dimension: Dimension;
};

type TokenTarget = {
  nameTokens: string[];
  descriptorTokens: string[];
  prepTokens: string[];
  categories: string[];
};

type BaseYieldRule = {
  id: string;
  percent: number;
  reason: string;
  ingredientTokens?: string[];
  descriptorTokens?: string[];
  prepTokens?: string[];
  category?: string;
  priority?: number;
};

type BaseYieldMatch = {
  percent: number | null;
  reason: string | null;
  ruleId: string | null;
};

type IntegratedYieldResult = {
  percent: number | null;
  source: IngredientYieldSource;
};

type IngredientYieldSource = "none" | "base" | "chef" | "combined";

type NormalizedIngredient = {
  baseName: string;
  tokens: string[];
  descriptors: string[];
  descriptorTokens: string[];
  categories: string[];
  key: string;
};

type ChefYieldMatch = {
  percent: number;
  method: string;
  note?: string;
  recordId: string;
  recordedAt: number;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "fresh",
  "large",
  "small",
  "medium",
  "organic",
  "local",
  "farm",
  "heirloom",
  "baby",
  "wild",
  "whole",
  "ripe",
  "the",
  "of",
  "new",
  "young",
  "heritage",
  "super",
  "extra",
  "grade",
  "jumbo",
  "frozen",
  "raw",
  "cooked",
]);

const IRREGULAR_SINGULARS: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  feet: "foot",
  geese: "goose",
  mice: "mouse",
  lice: "louse",
  knives: "knife",
  loaves: "loaf",
  leaves: "leaf",
  halves: "half",
  wives: "wife",
  lives: "life",
  selves: "self",
  people: "person",
  children: "child",
  oxen: "ox",
  deer: "deer",
};

const INGREDIENT_CATEGORIES: Record<string, string[]> = {
  carrot: ["vegetable", "root"],
  beet: ["vegetable", "root"],
  parsnip: ["vegetable", "root"],
  radish: ["vegetable", "root"],
  turnip: ["vegetable", "root"],
  potato: ["vegetable", "root"],
  rutabaga: ["vegetable", "root"],
  celeriac: ["vegetable", "root"],
  fennel: ["vegetable", "bulb"],
  onion: ["vegetable", "bulb"],
  shallot: ["vegetable", "bulb"],
  garlic: ["vegetable", "bulb"],
  pepper: ["vegetable", "fruit"],
  tomato: ["vegetable", "fruit"],
  squash: ["vegetable", "fruit"],
  zucchini: ["vegetable", "fruit"],
  cucumber: ["vegetable", "fruit"],
  peach: ["fruit", "stone"],
  apricot: ["fruit", "stone"],
  plum: ["fruit", "stone"],
  apple: ["fruit"],
  pear: ["fruit"],
  mango: ["fruit"],
  pineapple: ["fruit"],
  cabbage: ["vegetable", "leaf"],
  kale: ["vegetable", "leaf"],
  lettuce: ["vegetable", "leaf"],
  spinach: ["vegetable", "leaf"],
  chicken: ["protein", "poultry"],
  turkey: ["protein", "poultry"],
  duck: ["protein", "poultry"],
  beef: ["protein", "red"],
  lamb: ["protein", "red"],
  pork: ["protein", "red"],
  salmon: ["protein", "seafood"],
  tuna: ["protein", "seafood"],
  shrimp: ["protein", "seafood"],
  lobster: ["protein", "seafood"],
};

const BASE_YIELD_RULES: BaseYieldRule[] = [
  {
    id: "carrot-peeled",
    percent: 82,
    reason: "Carrot peeled and topped loss",
    ingredientTokens: ["carrot"],
    descriptorTokens: ["peeled"],
    priority: 90,
  },
  {
    id: "root-peeled",
    percent: 84,
    reason: "Root vegetable peel trimming",
    category: "root",
    descriptorTokens: ["peeled"],
    priority: 70,
  },
  {
    id: "root-trimmed",
    percent: 90,
    reason: "Root vegetable trimmed/stemmed",
    category: "root",
    descriptorTokens: ["trimmed", "topped", "top", "stemmed"],
    priority: 60,
  },
  {
    id: "fruit-peeled",
    percent: 80,
    reason: "Fruit peeled",
    category: "fruit",
    descriptorTokens: ["peeled"],
    priority: 50,
  },
  {
    id: "stonefruit-pitted",
    percent: 88,
    reason: "Stone fruit pitted",
    category: "stone",
    descriptorTokens: ["pitted", "halved", "destoned"],
    priority: 60,
  },
  {
    id: "leafy-trimmed",
    percent: 88,
    reason: "Leafy greens trimmed",
    category: "leaf",
    descriptorTokens: ["trimmed", "stemmed"],
    priority: 45,
  },
  {
    id: "bulb-peeled",
    percent: 75,
    reason: "Bulb vegetable peeled",
    category: "bulb",
    descriptorTokens: ["peeled"],
    priority: 55,
  },
  {
    id: "protein-trim",
    percent: 72,
    reason: "Protein trimmed/deboned",
    category: "protein",
    descriptorTokens: ["trimmed", "cleaned", "butchered", "deboned", "skinned"],
    priority: 65,
  },
  {
    id: "generic-peeled",
    percent: 87,
    reason: "General peel loss",
    descriptorTokens: ["peeled"],
    priority: 40,
  },
  {
    id: "generic-seeded",
    percent: 92,
    reason: "Seeds removed",
    descriptorTokens: ["seeded", "deseeded", "seedless"],
    priority: 40,
  },
  {
    id: "generic-trimmed",
    percent: 94,
    reason: "General trim loss",
    descriptorTokens: ["trimmed", "stemmed", "topped", "top"],
    priority: 35,
  },
  {
    id: "generic-cleaned",
    percent: 95,
    reason: "Cleaned and prepped",
    descriptorTokens: ["cleaned", "prepped"],
    priority: 25,
  },
];

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  tsp: 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  tbsp: 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  floz: 29.5735,
  "fl oz": 29.5735,
  ounce: 29.5735,
  ounces: 29.5735,
  oz: 29.5735,
  cup: 236.588,
  cups: 236.588,
  pint: 473.176,
  pints: 473.176,
  pt: 473.176,
  quart: 946.353,
  quarts: 946.353,
  qt: 946.353,
  qts: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
  gal: 3785.41,
};

const MASS_TO_G: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
};

const COUNT_UNITS = new Set(["each", "ea", "piece", "pieces", "count"]);

function clampPercent(value: number): number {
  return Math.max(0, Math.min(9999, value));
}

function singularize(value: string): string {
  if (!value) return value;
  if (IRREGULAR_SINGULARS[value]) return IRREGULAR_SINGULARS[value];
  if (value.endsWith("ies") && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("ves") && value.length > 3) {
    return `${value.slice(0, -3)}f`;
  }
  if (value.endsWith("oes") && value.length > 3) {
    return value.slice(0, -2);
  }
  if (value.endsWith("s") && value.length > 3) {
    return value.slice(0, -1);
  }
  return value;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => singularize(token.trim()))
    .filter((token) => token && !STOP_WORDS.has(token));
}

function parseIngredient(value: string): NormalizedIngredient {
  const normalized = String(value || "");
  const descriptors: string[] = [];
  let base = normalized.replace(/\(([^)]+)\)/g, (_, inner: string) => {
    descriptors.push(inner);
    return "";
  });
  base = base.split(/[–—-]/)[0] ?? base;
  base = base.split(",")[0] ?? base;

  const descriptorParts = normalized
    .split(/[(),]/)
    .slice(1)
    .map((part) => part.trim())
    .filter(Boolean);
  descriptors.push(...descriptorParts);

  const baseTokens = tokenize(base);
  const descriptorTokens = Array.from(
    new Set(descriptors.flatMap((part) => tokenize(part))),
  );

  const baseName = baseTokens.join(" ") || base.trim().toLowerCase();
  const categories = Array.from(
    new Set(
      baseTokens.flatMap((token) => INGREDIENT_CATEGORIES[token] ?? []),
    ),
  );
  const key = [...baseTokens, ...descriptorTokens]
    .filter(Boolean)
    .slice(0, 5)
    .join("-");

  return {
    baseName,
    tokens: baseTokens,
    descriptors,
    descriptorTokens,
    categories,
    key,
  };
}

function buildTarget(item: string, prep?: string): TokenTarget {
  const normalized = parseIngredient(item);
  const prepTokens = prep ? tokenize(prep) : [];
  return {
    nameTokens: normalized.tokens,
    descriptorTokens: Array.from(
      new Set([...normalized.descriptorTokens, ...prepTokens]),
    ),
    prepTokens,
    categories: normalized.categories,
  };
}

function countSharedTokens(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let matches = 0;
  for (const token of a) {
    if (setB.has(token)) matches += 1;
  }
  return matches;
}

type YieldReferenceEntryInternal = {
  id: string;
  percent: number;
  reason: string;
  tokens: string[];
  descriptorTokens: string[];
  prepTokens: string[];
  categories: string[];
};

const YIELD_REFERENCE_INDEX: YieldReferenceEntryInternal[] = YIELD_REFERENCE_DATA.map(
  (entry) => {
    const ingredientMeta = parseIngredient(entry.item);
    const prepTokens = tokenize(entry.method);
    const reasonBase = entry.notes
      ? entry.notes
      : `Reference yield for ${entry.item}${entry.method ? ` (${entry.method})` : ""}`;
    return {
      id: entry.id,
      percent: clampPercent(entry.yield),
      reason: reasonBase,
      tokens: ingredientMeta.tokens,
      descriptorTokens: ingredientMeta.descriptorTokens,
      prepTokens,
      categories: ingredientMeta.categories,
    };
  },
);

function findReferenceYield(target: TokenTarget): BaseYieldMatch | null {
  let bestScore = 0;
  let bestEntry: YieldReferenceEntryInternal | null = null;

  for (const entry of YIELD_REFERENCE_INDEX) {
    const baseOverlap = countSharedTokens(target.nameTokens, entry.tokens);
    if (baseOverlap === 0) continue;

    let score = baseOverlap * 8;
    const descriptorOverlap = countSharedTokens(
      target.descriptorTokens,
      entry.descriptorTokens,
    );
    if (descriptorOverlap) score += descriptorOverlap * 4;

    const methodOverlap = countSharedTokens(target.prepTokens, entry.prepTokens);
    if (methodOverlap) score += methodOverlap * 7;

    const descriptorToBase = countSharedTokens(target.descriptorTokens, entry.tokens);
    if (descriptorToBase) score += descriptorToBase * 3;

    if (entry.prepTokens.length && methodOverlap === 0) score *= 0.6;

    for (const category of entry.categories) {
      if (target.categories.includes(category)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (!bestEntry) return null;
  if (bestScore < 8 && bestEntry.prepTokens.length > 0) return null;
  if (bestScore < 5) return null;

  return {
    percent: bestEntry.percent,
    reason: bestEntry.reason,
    ruleId: `reference:${bestEntry.id}`,
  };
}

function matchesRule(rule: BaseYieldRule, target: TokenTarget): number {
  let score = 0;
  if (rule.ingredientTokens?.length) {
    const hasIngredient = rule.ingredientTokens.some((token) =>
      target.nameTokens.includes(token),
    );
    if (!hasIngredient) return 0;
    score += 5;
  }
  if (rule.category) {
    if (!target.categories.includes(rule.category)) return 0;
    score += 3;
  }
  if (rule.descriptorTokens?.length) {
    const hasDescriptor = rule.descriptorTokens.some((token) =>
      target.descriptorTokens.includes(token),
    );
    if (!hasDescriptor) return 0;
    score += 2;
  }
  if (rule.prepTokens?.length) {
    const prepMatch = rule.prepTokens.some((token) =>
      target.prepTokens.includes(token),
    );
    if (!prepMatch) return 0;
    score += 2;
  }
  score += rule.priority ?? 0;
  return score;
}

const PANTRY_TOKENS = [
  "salt",
  "sugar",
  "flour",
  "starch",
  "yeast",
  "seasoning",
  "spice",
  "powder",
  "soda",
  "cornstarch",
  "gelatin",
  "panko",
  "breadcrumbs",
  "vinegar",
  "baking",
  "cocoa",
  "coffee",
  "tea",
] as const;

const OUTER_LAYER_TOKENS = [
  "peeled",
  "peel",
  "shell",
  "shelled",
  "husk",
  "hulled",
  "cored",
  "pit",
  "pitted",
  "seeded",
  "destemmed",
  "stemmed",
  "top",
  "topped",
  "skin",
  "skinned",
  "scaled",
] as const;

const TRIM_TOKENS = [
  "trim",
  "trimmed",
  "fabricated",
  "fabricate",
  "butcher",
  "butchered",
  "clean",
  "cleaned",
  "debone",
  "deboned",
  "bone",
  "boned",
  "fillet",
  "filleted",
] as const;

const KNIFE_PREP_TOKENS = [
  "dice",
  "diced",
  "chop",
  "chopped",
  "mince",
  "minced",
  "slice",
  "sliced",
  "julienne",
  "julienned",
  "shave",
  "shaved",
  "grate",
  "grated",
  "brunoise",
  "baton",
  "batonnet",
  "matchstick",
  "cube",
  "cubed",
  "wedge",
  "wedged",
  "fine",
  "rough",
  "rondelle",
  "chiffonade",
  "segment",
  "segmented",
  "supreme",
  "supremed",
  "zest",
  "zested",
] as const;

const HIGH_HEAT_TOKENS = [
  "roast",
  "roasted",
  "grill",
  "grilled",
  "broil",
  "broiled",
  "bake",
  "baked",
  "char",
  "charred",
  "sear",
  "seared",
  "fry",
  "fried",
  "saute",
  "sauteed",
  "sauté",
  "sautéed",
  "smoke",
  "smoked",
  "toast",
  "toasted",
  "brown",
  "browned",
] as const;

const MOIST_HEAT_TOKENS = [
  "braise",
  "braised",
  "stew",
  "stewed",
  "simmer",
  "simmered",
  "poach",
  "poached",
  "boil",
  "boiled",
  "steam",
  "steamed",
  "blanch",
  "blanched",
  "confit",
  "confited",
  "sous",
  "pressure",
] as const;

function evaluateHeuristicYield(target: TokenTarget): BaseYieldMatch {
  const tokens = new Set(
    [...target.nameTokens, ...target.descriptorTokens, ...target.prepTokens].filter(
      Boolean,
    ),
  );
  const categories = new Set(target.categories);
  const hasAny = (values: readonly string[]) =>
    values.some((value) => tokens.has(value));
  const hasCategory = (value: string) => categories.has(value);
  const hasProteinCategory =
    hasCategory("protein") || hasCategory("poultry") || hasCategory("seafood");
  const hasProduceCategory =
    hasCategory("vegetable") ||
    hasCategory("root") ||
    hasCategory("bulb") ||
    hasCategory("leaf") ||
    hasCategory("fruit");

  if (!hasProduceCategory && !hasProteinCategory && hasAny(PANTRY_TOKENS)) {
    return {
      percent: 100,
      reason: "Pantry staple retains full yield",
      ruleId: "heuristic:pantry-staple",
    };
  }

  if (hasAny(OUTER_LAYER_TOKENS)) {
    let percent = 86;
    if (hasCategory("fruit")) percent = 82;
    else if (hasCategory("bulb")) percent = 78;
    else if (hasCategory("root")) percent = 84;
    else if (hasCategory("seafood")) percent = 65;
    else if (hasCategory("poultry")) percent = 72;
    else if (hasCategory("protein")) percent = 74;
    return {
      percent: clampPercent(percent),
      reason: "Estimated yield after removing outer layers",
      ruleId: "heuristic:outer-layer-trim",
    };
  }

  if (hasAny(TRIM_TOKENS)) {
    let percent = hasProduceCategory ? 90 : 78;
    let ruleId = hasProduceCategory
      ? "heuristic:trim-produce"
      : "heuristic:trim-protein";
    let reason = hasProduceCategory
      ? "Estimated produce yield after trimming"
      : "Estimated protein yield after fabrication";
    if (hasCategory("seafood")) {
      percent = 68;
      ruleId = "heuristic:trim-seafood";
      reason = "Estimated seafood yield after fabrication";
    } else if (hasCategory("poultry")) {
      percent = 74;
      ruleId = "heuristic:trim-poultry";
      reason = "Estimated poultry yield after fabrication";
    } else if (hasCategory("protein")) {
      percent = 78;
      ruleId = "heuristic:trim-protein";
      reason = "Estimated protein yield after fabrication";
    } else if (hasCategory("leaf")) {
      percent = 92;
      ruleId = "heuristic:trim-leaf";
      reason = "Estimated leafy greens yield after trimming";
    } else if (hasCategory("bulb") || hasCategory("root")) {
      percent = 88;
      ruleId = hasCategory("bulb")
        ? "heuristic:trim-bulb"
        : "heuristic:trim-root";
      reason = hasCategory("bulb")
        ? "Estimated aromatic yield after trimming"
        : "Estimated root vegetable yield after trimming";
    }
    return {
      percent: clampPercent(percent),
      reason,
      ruleId,
    };
  }

  if (hasAny(KNIFE_PREP_TOKENS)) {
    let percent = 93;
    let ruleId = "heuristic:knife-prep:general";
    let reason = "Estimated yield after knife prep";
    if (hasCategory("bulb")) {
      percent = 88;
      ruleId = "heuristic:knife-prep:bulb";
      reason = "Estimated aromatic yield after knife prep";
    } else if (hasCategory("root")) {
      percent = 90;
      ruleId = "heuristic:knife-prep:root";
      reason = "Estimated root vegetable yield after knife prep";
    } else if (hasCategory("leaf")) {
      percent = 92;
      ruleId = "heuristic:knife-prep:leaf";
      reason = "Estimated leafy greens yield after knife prep";
    } else if (hasCategory("fruit")) {
      percent = 91;
      ruleId = "heuristic:knife-prep:fruit";
      reason = "Estimated fruit yield after knife prep";
    } else if (hasCategory("seafood")) {
      percent = 82;
      ruleId = "heuristic:knife-prep:seafood";
      reason = "Estimated seafood yield after fabrication";
    } else if (hasCategory("poultry")) {
      percent = 80;
      ruleId = "heuristic:knife-prep:poultry";
      reason = "Estimated poultry yield after fabrication";
    } else if (hasCategory("protein")) {
      percent = 85;
      ruleId = "heuristic:knife-prep:protein";
      reason = "Estimated protein yield after fabrication";
    }
    return {
      percent: clampPercent(percent),
      reason,
      ruleId,
    };
  }

  if (hasAny(HIGH_HEAT_TOKENS)) {
    const isProtein = hasProteinCategory;
    return {
      percent: clampPercent(isProtein ? 78 : 88),
      reason: "Estimated yield after high-heat cooking",
      ruleId: `heuristic:high-heat:${isProtein ? "protein" : "produce"}`,
    };
  }

  if (hasAny(MOIST_HEAT_TOKENS)) {
    const isProtein = hasProteinCategory;
    return {
      percent: clampPercent(isProtein ? 90 : 95),
      reason: "Estimated yield after moist-heat cooking",
      ruleId: `heuristic:moist-heat:${isProtein ? "protein" : "produce"}`,
    };
  }

  if (hasCategory("seafood")) {
    return {
      percent: clampPercent(70),
      reason: "Typical seafood fabrication loss",
      ruleId: "heuristic:seafood-default",
    };
  }
  if (hasCategory("poultry")) {
    return {
      percent: clampPercent(74),
      reason: "Typical poultry fabrication loss",
      ruleId: "heuristic:poultry-default",
    };
  }
  if (hasCategory("protein")) {
    return {
      percent: clampPercent(78),
      reason: "Typical protein fabrication loss",
      ruleId: "heuristic:protein-default",
    };
  }
  if (hasCategory("bulb")) {
    return {
      percent: clampPercent(90),
      reason: "Typical aromatic prep yield",
      ruleId: "heuristic:bulb-default",
    };
  }
  if (hasCategory("root")) {
    return {
      percent: clampPercent(92),
      reason: "Typical root vegetable prep yield",
      ruleId: "heuristic:root-default",
    };
  }
  if (hasCategory("leaf")) {
    return {
      percent: clampPercent(94),
      reason: "Typical leafy greens prep yield",
      ruleId: "heuristic:leaf-default",
    };
  }
  if (hasCategory("fruit")) {
    return {
      percent: clampPercent(92),
      reason: "Typical fruit prep yield",
      ruleId: "heuristic:fruit-default",
    };
  }
  if (hasCategory("vegetable")) {
    return {
      percent: clampPercent(95),
      reason: "Typical vegetable prep yield",
      ruleId: "heuristic:vegetable-default",
    };
  }

  const fallbackPercent = hasProduceCategory ? 96 : 100;
  return {
    percent: clampPercent(fallbackPercent),
    reason: hasProduceCategory
      ? "General produce prep yield assumption"
      : "Default yield assumption",
    ruleId: hasProduceCategory
      ? "heuristic:produce-fallback"
      : "heuristic:default",
  };
}

export function computeBaseYield(item: string, prep?: string): BaseYieldMatch {
  const target = buildTarget(item, prep);
  const reference = findReferenceYield(target);
  if (reference) return reference;
  let bestScore = 0;
  let bestRule: BaseYieldRule | null = null;
  for (const rule of BASE_YIELD_RULES) {
    const score = matchesRule(rule, target);
    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }
  if (!bestRule) {
    return evaluateHeuristicYield(target);
  }
  return {
    percent: bestRule.percent,
    reason: bestRule.reason,
    ruleId: bestRule.id,
  };
}

export function estimateHeuristicYield(
  item: string,
  prep?: string,
): BaseYieldMatch {
  return evaluateHeuristicYield(buildTarget(item, prep));
}

export function combineYields(
  base: number | null,
  chef: number | null,
): IntegratedYieldResult {
  if (base == null && chef == null)
    return { percent: null, source: "none" };
  if (base == null) return { percent: chef, source: "chef" };
  if (chef == null) return { percent: base, source: "base" };
  const combined = clampPercent((base / 100) * (chef / 100) * 100);
  return { percent: combined, source: "combined" };
}

export function formatYieldPercent(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return String(Math.round(rounded));
  }
  return rounded.toFixed(1);
}

export function normalizeUnit(value: string): string {
  return String(value || "").trim().toLowerCase();
}

export function convertToBaseUnit(
  qty: number,
  unit: string,
): BaseUnitResult | null {
  if (!Number.isFinite(qty) || qty < 0) return null;
  const key = normalizeUnit(unit);
  if (VOLUME_TO_ML[key] != null) {
    return { value: qty * VOLUME_TO_ML[key], unit: "ml", dimension: "volume" };
  }
  if (MASS_TO_G[key] != null) {
    return { value: qty * MASS_TO_G[key], unit: "g", dimension: "mass" };
  }
  if (COUNT_UNITS.has(key)) {
    return { value: qty, unit: "each", dimension: "count" };
  }
  return null;
}

export function areCompatibleUnits(a: string, b: string): boolean {
  const convA = convertToBaseUnit(1, a);
  const convB = convertToBaseUnit(1, b);
  if (!convA || !convB) return false;
  return convA.dimension === convB.dimension;
}

export function computeYieldPercent(
  inputQty: number,
  inputUnit: string,
  outputQty: number,
  outputUnit: string,
): number | null {
  const input = convertToBaseUnit(inputQty, inputUnit);
  const output = convertToBaseUnit(outputQty, outputUnit);
  if (!input || !output) return null;
  if (input.dimension !== output.dimension) return null;
  if (input.value === 0) return null;
  return clampPercent((output.value / input.value) * 100);
}

export function createIngredientKey(value: string): string {
  return parseIngredient(value).key;
}

export function extractIngredientMetadata(item: string) {
  return parseIngredient(item);
}

export function createPrepKey(value: string): string {
  return tokenize(value).slice(0, 4).join("-");
}

export function createMethodKey(value: string): string {
  return tokenize(value).slice(0, 6).join("-");
}

export function collectPrepTokens(item: string, prep?: string): string[] {
  const meta = parseIngredient(item);
  const prepTokens = prep ? tokenize(prep) : [];
  return Array.from(new Set([...meta.descriptorTokens, ...prepTokens]));
}

export function useBaseYieldDiagnostics(item: string, prep: string) {
  return useMemo(() => computeBaseYield(item, prep), [item, prep]);
}

export type {
  BaseYieldMatch,
  ChefYieldMatch,
  IntegratedYieldResult,
  IngredientYieldSource,
  NormalizedIngredient,
};
