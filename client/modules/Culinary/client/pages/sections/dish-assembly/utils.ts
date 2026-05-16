import { currencySymbol, type Recipe } from "@shared/recipes";
import { resolveMenuName } from "@/lib/menu-metadata";

export type DishComponentRow = {
  id: string;
  quantity: string;
  recipeId: string | null;
  label: string;
  notes: string;
};

export type AllergenRow = {
  id: string;
  itemName: string;
  allergen: string;
  modify: string;
  alternative: string;
};

export type PairingRow = {
  id: string;
  itemName: string;
  year: string;
  location: string;
  country: string;
};

export type PosSystemKey =
  | "agilysys"
  | "micros"
  | "aloha"
  | "toast"
  | "square"
  | "lightspeed"
  | "spoton";

export type PosMapping = {
  key: PosSystemKey;
  systemName: string;
  itemCode: string;
  autoCode: boolean;
  price: string;
  autoPrice: boolean;
  status: "draft" | "ready" | "synced";
};

export type RecipeSummary = {
  id: string;
  title: string;
  menuName: string;
  description: string;
  cuisine?: string | null;
  course?: string | null;
  tags: string[];
  rating?: number | null;
  image?: string | null;
  allergens: string[];
  equipment: string[];
  costPerPortion: number | null;
  currency: string;
  menuPrice: number | null;
  popularityHint: number | null;
};

export const POS_SYSTEM_DEFINITIONS: Array<{
  key: PosSystemKey;
  name: string;
  short: string;
}> = [
  { key: "agilysys", name: "Agilysys InfoGenesis", short: "Agilysys" },
  { key: "micros", name: "Oracle MICROS Simphony", short: "Simphony" },
  { key: "aloha", name: "NCR Aloha / Voyix", short: "Aloha" },
  { key: "toast", name: "Toast", short: "Toast" },
  { key: "square", name: "Square for Restaurants", short: "Square" },
  {
    key: "lightspeed",
    name: "Lightspeed Restaurant (K-Series)",
    short: "Lightspeed",
  },
  { key: "spoton", name: "SpotOn Restaurant", short: "SpotOn" },
];

export const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const numberFromUnknown = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "");
    if (!cleaned) return null;
    const normalized = cleaned.replace(/,(?=\d{3}\b)/g, "").replace(/,/g, "");
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const normalizeText = (value: unknown): string =>
  typeof value === "string"
    ? value.trim()
    : value == null
      ? ""
      : String(value).trim();

export const summarizeRecipe = (recipe: Recipe): RecipeSummary => {
  const extra = (recipe.extra ?? {}) as Record<string, unknown>;
  const serverNotes = (extra.serverNotes ?? null) as any;
  const tags = Array.isArray(recipe.tags)
    ? recipe.tags.map((tag) => String(tag)).filter(Boolean)
    : [];

  const equipment = Array.isArray(serverNotes?.modifiers?.equipment)
    ? (serverNotes.modifiers.equipment as unknown[])
        .map((value) => normalizeText(value))
        .filter(Boolean)
    : [];

  const allergens = Array.isArray(serverNotes?.allergens)
    ? (serverNotes.allergens as unknown[])
        .map((value) => normalizeText(value))
        .filter(Boolean)
    : [];

  const currencyRaw = normalizeText(serverNotes?.currency) || "USD";

  let costPerPortion: number | null = null;
  const portionCost = numberFromUnknown(serverNotes?.portionCost);
  const totals = (serverNotes?.totals ?? {}) as Record<string, unknown>;
  const fullRecipeCost = numberFromUnknown(totals?.fullRecipeCost);
  const portionCount = numberFromUnknown(serverNotes?.portionCount);
  if (portionCost !== null) {
    costPerPortion = portionCost;
  } else if (fullRecipeCost !== null && portionCount && portionCount > 0) {
    costPerPortion = Number((fullRecipeCost / portionCount).toFixed(2));
  }

  let menuPrice: number | null = null;
  const menuKeys = [
    "menuPrice",
    "menu_price",
    "price",
    "menuItemPrice",
    "menu_item_price",
  ];
  for (const key of menuKeys) {
    menuPrice = numberFromUnknown(extra[key]);
    if (menuPrice !== null) break;
  }

  const rating = typeof recipe.rating === "number" ? recipe.rating : null;
  const popularityHint = numberFromUnknown(
    extra.salesVelocity ?? extra.popularityScore,
  );

  const image =
    recipe.imageDataUrls?.[0] ??
    recipe.image ??
    (Array.isArray(recipe.imageNames) && recipe.imageNames.length
      ? String(recipe.imageNames[0])
      : null);

  return {
    id: recipe.id,
    title: recipe.title,
    menuName: resolveMenuName(recipe),
    description: recipe.description?.trim() ?? "",
    cuisine: recipe.cuisine ?? null,
    course: recipe.course ?? null,
    tags,
    rating,
    image,
    allergens,
    equipment,
    costPerPortion,
    currency: currencyRaw || "USD",
    menuPrice,
    popularityHint,
  } satisfies RecipeSummary;
};

export const parseQuantityValue = (quantity: string): number => {
  if (!quantity) return 1;
  const numeric = Number.parseFloat(quantity.trim().split(/\s+/)[0] ?? "");
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  const fractionMatch = quantity.match(/(\d+)\s*(?:\/|\s*)(\d+)/);
  if (fractionMatch) {
    const numerator = Number.parseFloat(fractionMatch[1] ?? "0");
    const denominator = Number.parseFloat(fractionMatch[2] ?? "1");
    if (denominator > 0) {
      return Number((numerator / denominator).toFixed(3));
    }
  }
  return 1;
};

export const formatCurrencyValue = (
  value: number | null | undefined,
  currency = "USD",
): string => {
  if (value == null || Number.isNaN(value)) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencySymbol(currency)}${value.toFixed(2)}`;
  }
};

const joinWithOxfordComma = (items: string[]) => {
  if (!items.length) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

export const generateMenuTitle = (
  rows: DishComponentRow[],
  summaries: Map<string, RecipeSummary>,
): string => {
  const names: string[] = [];
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    names.push(row.label.trim() || summary.menuName || summary.title);
  }
  if (!names.length) return "";
  const primary = names[0]!;
  if (names.length === 1) return primary;
  return `${primary} with ${joinWithOxfordComma(names.slice(1))}`;
};

export const generateMenuDescription = (
  rows: DishComponentRow[],
  summaries: Map<string, RecipeSummary>,
): string => {
  const highlights: string[] = [];
  const cuisines = new Set<string>();
  const descriptors = new Set<string>();

  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    const name = row.label.trim() || summary.menuName || summary.title;
    highlights.push(`${parseQuantityValue(row.quantity)}× ${name}`);
    if (summary.cuisine) cuisines.add(summary.cuisine);
    for (const tag of summary.tags) {
      if (!tag) continue;
      const normalized = tag.trim();
      if (!normalized) continue;
      descriptors.add(normalized);
    }
  }

  if (!highlights.length) return "";

  const cuisineText = cuisines.size
    ? `${joinWithOxfordComma(Array.from(cuisines))} inspiration`
    : "chef-driven";
  const descriptorText = descriptors.size
    ? `highlighting ${joinWithOxfordComma(Array.from(descriptors).slice(0, 4))}`
    : "crafted for service speed";

  return `A ${cuisineText} plate featuring ${joinWithOxfordComma(highlights)}. ${descriptorText} with a polished, guest-forward presentation.`;
};

export const generateServerNotes = (
  rows: DishComponentRow[],
  summaries: Map<string, RecipeSummary>,
): string => {
  const lines: string[] = [];
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    const name = row.label.trim() || summary.menuName || summary.title;
    lines.push(
      `• ${name}: reference mise notes in recipe book; ensure portion control to protect margin.`,
    );
  }
  if (!lines.length) {
    return "Confirm expo understands build, allergen alerts, and cadence for fire to table.";
  }
  lines.push("• Call out premium ingredients and prep story when presenting.");
  lines.push(
    "• Remind team to align phrasing with menu description for upsell consistency.",
  );
  return lines.join("\n");
};

export const generateServiceware = (
  rows: DishComponentRow[],
  summaries: Map<string, RecipeSummary>,
): string => {
  const equipment = new Set<string>();
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    summary.equipment.forEach((item) => equipment.add(item));
  }
  const essentials = equipment.size
    ? `Stage ${joinWithOxfordComma(Array.from(equipment))}.`
    : "Stage hot plates and polished flatware.";
  return `${essentials} Deliver on warm plates with branded steak knives and ramekins pre-filled as needed.`;
};

export const generateAllergenRows = (
  rows: DishComponentRow[],
  summaries: Map<string, RecipeSummary>,
): AllergenRow[] => {
  const list: AllergenRow[] = [];
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary || !summary.allergens.length) continue;
    const itemName = row.label.trim() || summary.menuName || summary.title;
    for (const allergen of summary.allergens) {
      list.push({
        id: createId(),
        itemName,
        allergen,
        modify: "Notify guest; omit on request",
        alternative: "Verify chef-approved substitution",
      });
    }
  }
  return list;
};

const cuisinePairings: Record<string, PairingRow[]> = {
  french: [
    {
      id: createId(),
      itemName: "Premier Cru Chardonnay",
      year: "2020",
      location: "Côte de Beaune",
      country: "France",
    },
    {
      id: createId(),
      itemName: "Grand Cru Champagne",
      year: "NV",
      location: "Montagne de Reims",
      country: "France",
    },
  ],
  spanish: [
    {
      id: createId(),
      itemName: "Ribera del Duero Crianza",
      year: "2019",
      location: "Castilla y León",
      country: "Spain",
    },
    {
      id: createId(),
      itemName: "Txakolina",
      year: "2022",
      location: "Getariako",
      country: "Spain",
    },
  ],
  italian: [
    {
      id: createId(),
      itemName: "Barolo",
      year: "2018",
      location: "Piedmont",
      country: "Italy",
    },
    {
      id: createId(),
      itemName: "Super Tuscan Blend",
      year: "2019",
      location: "Bolgheri",
      country: "Italy",
    },
  ],
  japanese: [
    {
      id: createId(),
      itemName: "Junmai Daiginjo Sake",
      year: "",
      location: "Niigata",
      country: "Japan",
    },
    {
      id: createId(),
      itemName: "Yuzu Highball",
      year: "Signature",
      location: "Bar Program",
      country: "In-house",
    },
  ],
};

export const generatePairings = (
  summaries: Map<string, RecipeSummary>,
  rows: DishComponentRow[],
): PairingRow[] => {
  const set = new Map<string, PairingRow>();
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    const cuisineKey = summary.cuisine?.toLowerCase() ?? "";
    const candidates =
      cuisinePairings[cuisineKey as keyof typeof cuisinePairings];
    if (candidates && candidates.length) {
      for (const candidate of candidates) {
        const key = `${candidate.itemName}:${candidate.location}:${candidate.country}`;
        if (!set.has(key)) {
          set.set(key, { ...candidate, id: createId() });
        }
      }
    }
  }
  if (!set.size) {
    set.set("default-reserve", {
      id: createId(),
      itemName: "Reserve Cabernet Blend",
      year: "2019",
      location: "Napa Valley",
      country: "USA",
    });
    set.set("default-zero-proof", {
      id: createId(),
      itemName: "Sparkling Verjus & Rosemary",
      year: "Signature",
      location: "House crafted",
      country: "USA",
    });
  }
  return Array.from(set.values());
};

export const estimatePopularityScore = (
  summaries: Map<string, RecipeSummary>,
  rows: DishComponentRow[],
): number => {
  const scores: number[] = [];
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    if (summary.popularityHint != null) {
      scores.push(Math.max(0, Math.min(100, summary.popularityHint)));
      continue;
    }
    if (summary.rating != null) {
      scores.push(Math.round((summary.rating / 5) * 100));
      continue;
    }
    scores.push(55);
  }
  if (!scores.length) return 50;
  return scores.reduce((acc, value) => acc + value, 0) / scores.length;
};

export const computeDishCost = (
  rows: DishComponentRow[],
  summaries: Map<string, RecipeSummary>,
): { totalCost: number; currency: string } => {
  let total = 0;
  let currency = "USD";
  for (const row of rows) {
    if (!row.recipeId) continue;
    const summary = summaries.get(row.recipeId);
    if (!summary) continue;
    if (summary.costPerPortion != null) {
      const qty = parseQuantityValue(row.quantity || "1");
      total += summary.costPerPortion * qty;
      currency = summary.currency || currency;
    }
  }
  return { totalCost: Number(total.toFixed(2)), currency };
};

export const parsePriceString = (value: string): number | null => {
  if (!value) return null;
  return numberFromUnknown(value);
};

export const classifyMenuEngineering = (
  foodCostPct: number | null,
  popularityScore: number,
): {
  classification: "Star" | "Plowhorse" | "Puzzle" | "Dog";
  narrative: string;
} => {
  const pct = foodCostPct ?? 0.33;
  const popular = popularityScore >= 60;
  if (pct <= 0.3 && popular) {
    return {
      classification: "Star",
      narrative:
        "High profitability & high demand. Feature in marketing and maintain plating standards.",
    };
  }
  if (pct > 0.3 && popular) {
    return {
      classification: "Plowhorse",
      narrative:
        "Guest favorite with thinner margins. Consider portion refinement or modest price move.",
    };
  }
  if (pct <= 0.3) {
    return {
      classification: "Puzzle",
      narrative:
        "Strong margin but trending lower demand. Coach team on storytelling and placement.",
    };
  }
  return {
    classification: "Dog",
    narrative:
      "Low margin and low demand. Validate concept or reposition within the menu mix.",
  };
};

export const defaultPosMappings = (): PosMapping[] =>
  POS_SYSTEM_DEFINITIONS.map(({ key, name }) => ({
    key,
    systemName: name,
    itemCode: "",
    autoCode: true,
    price: "",
    autoPrice: true,
    status: "draft",
  }));

export const buildPosCode = (title: string, system: string): string => {
  const base = title
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  const suffix = system
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const combined = `${base}-${suffix}`;
  return combined.slice(0, 32);
};

export const mergePosMappings = (
  current: PosMapping[],
  title: string,
  price: string,
): PosMapping[] =>
  current.map((entry) => {
    const next: PosMapping = { ...entry };
    if (entry.autoCode || !entry.itemCode) {
      next.itemCode = buildPosCode(title || "Dish", entry.systemName);
      next.autoCode = true;
    }
    if (entry.autoPrice || !entry.price) {
      next.price = price;
      next.autoPrice = true;
    }
    if (price) {
      next.status = "ready";
    }
    return next;
  });
