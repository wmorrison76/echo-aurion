import { currencySymbol, type Recipe } from "@shared/recipes";

const NUMERIC_KEYS = [
  "menuPrice",
  "menu_price",
  "price",
  "menuItemPrice",
  "menu_item_price",
  "sellingPrice",
  "selling_price",
];

const NAME_KEYS = [
  "menuName",
  "menu_item_name",
  "menuItemName",
  "menu_title",
  "menuTitle",
];

const CATEGORY_KEYS = [
  "menuCategory",
  "menu_category",
  "menuGroup",
  "menu_group",
  "menuSection",
  "menu_section",
  "menuFolder",
  "menu_folder",
];

export const MENU_CATEGORIES = [
  { key: "appetizer", label: "Appetizer" },
  { key: "salad", label: "Salad" },
  { key: "soups", label: "Soups" },
  { key: "starters", label: "Starters" },
  { key: "mains", label: "Mains" },
  { key: "dessert", label: "Dessert" },
] as const;

export type MenuCategoryKey = (typeof MENU_CATEGORIES)[number]["key"];

type RecipeExtra = Record<string, unknown> | undefined | null;

const parseNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "");
    const normalized = cleaned.replace(/,(?=\d{3}\b)/g, "").replace(/,/g, "");
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const stripAccents = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const matchCategoryFromString = (value: string): MenuCategoryKey | null => {
  const normalized = stripAccents(value.trim());
  if (!normalized) return null;
  if (normalized.includes("appet")) return "appetizer";
  if (normalized.includes("salad")) return "salad";
  if (normalized.includes("soup") || normalized.includes("bisque")) return "soups";
  if (normalized.includes("starter") || normalized.includes("snack") || normalized.includes("tapa")) {
    return "starters";
  }
  if (
    normalized.includes("main") ||
    normalized.includes("entree") ||
    normalized.includes("platter") ||
    normalized.includes("large") ||
    normalized.includes("vegetable") ||
    normalized.includes("grill")
  ) {
    return "mains";
  }
  if (normalized.includes("dessert") || normalized.includes("pastry") || normalized.includes("sweet")) {
    return "dessert";
  }
  return null;
};

const extraRecord = (recipe: Recipe): RecipeExtra =>
  (recipe.extra ?? undefined) as RecipeExtra;

export const resolveMenuName = (recipe: Recipe): string => {
  const extra = extraRecord(recipe) ?? {};
  for (const key of NAME_KEYS) {
    const raw = extra[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return recipe.title;
};

export const resolveMenuPrice = (recipe: Recipe): string | null => {
  const extra = extraRecord(recipe) ?? {};
  let price: number | null = null;
  for (const key of NUMERIC_KEYS) {
    price = parseNumeric(extra[key]);
    if (price !== null) break;
  }
  if (price === null) return null;
  const currencyRaw = extra.currency || extra.currencyCode || extra.currency_code;
  const currency =
    typeof currencyRaw === "string" && currencyRaw.trim().length
      ? currencyRaw.trim().toUpperCase()
      : "USD";
  return `${currencySymbol(currency)}${price.toFixed(2)}`;
};

export const resolveMenuCategoryKey = (recipe: Recipe): MenuCategoryKey | null => {
  const extra = extraRecord(recipe) ?? {};
  const candidates: string[] = [];
  for (const key of CATEGORY_KEYS) {
    const raw = extra[key];
    if (typeof raw === "string" && raw.trim()) {
      candidates.push(raw);
    }
  }
  if (recipe.course) {
    candidates.push(recipe.course);
  }
  if (recipe.tags?.length) {
    candidates.push(...recipe.tags);
  }
  for (const candidate of candidates) {
    const match = matchCategoryFromString(candidate);
    if (match) return match;
  }
  return null;
};

export const getCategoryLabel = (key: MenuCategoryKey | null): string =>
  key ? MENU_CATEGORIES.find((category) => category.key === key)?.label ?? "" : "";
