type Unit = "qt" | "lb" | "ea" | "kg" | "l";

export interface IngredientRequirement {
  sku: string;
  name: string;
  amountPerBatch: number;
  unit: Unit;
  caseSize: number;
  caseLabel: string;
}

export interface RecipeProfile {
  id: string;
  name: string;
  yield: number;
  ingredients: IngredientRequirement[];
}

export interface InventorySnapshot {
  sku: string;
  onHand: number;
  unit: Unit;
  par: number;
}

export interface OrderGuideLine {
  sku: string;
  name: string;
  required: number;
  unit: Unit;
  pullFromStoreroom: number;
  orderFromVendor: number;
  caseLabel: string;
  casesToOrder: number;
}

export interface OrderGuidePlan {
  eventName: string;
  covers: number;
  recipes: string[];
  storeroom: OrderGuideLine[];
  vendorOrders: OrderGuideLine[];
  summary: string;
}

const RECIPES: Record<string, RecipeProfile> = {
  "creme brulee": {
    id: "creme-brulee",
    name: "Crème brûlée",
    yield: 24,
    ingredients: [
      {
        sku: "CREME-CREAM",
        name: "Heavy Cream 32oz",
        amountPerBatch: 6,
        unit: "qt",
        caseSize: 12,
        caseLabel: "12 x 1qt",
      },
      {
        sku: "CREME-YOLKS",
        name: "Pastured Egg Yolks",
        amountPerBatch: 8,
        unit: "ea",
        caseSize: 180,
        caseLabel: "15 dozen",
      },
      {
        sku: "CREME-SUGAR",
        name: "Vanilla Sugar",
        amountPerBatch: 5,
        unit: "lb",
        caseSize: 20,
        caseLabel: "20 lb sack",
      },
    ],
  },
  "florentine torte": {
    id: "florentine-torte",
    name: "Florentine Torte",
    yield: 18,
    ingredients: [
      {
        sku: "FLORENTINE-ALMOND",
        name: "Sliced Almonds",
        amountPerBatch: 4,
        unit: "lb",
        caseSize: 25,
        caseLabel: "25 lb case",
      },
      {
        sku: "FLORENTINE-BUTTER",
        name: "European Butter",
        amountPerBatch: 6,
        unit: "lb",
        caseSize: 30,
        caseLabel: "30 lb case",
      },
    ],
  },
};

const INVENTORY: Record<string, InventorySnapshot> = {
  "CREME-CREAM": { sku: "CREME-CREAM", onHand: 14, unit: "qt", par: 18 },
  "CREME-YOLKS": { sku: "CREME-YOLKS", onHand: 90, unit: "ea", par: 120 },
  "CREME-SUGAR": { sku: "CREME-SUGAR", onHand: 8, unit: "lb", par: 16 },
  "FLORENTINE-ALMOND": {
    sku: "FLORENTINE-ALMOND",
    onHand: 12,
    unit: "lb",
    par: 20,
  },
  "FLORENTINE-BUTTER": {
    sku: "FLORENTINE-BUTTER",
    onHand: 10,
    unit: "lb",
    par: 24,
  },
};

export interface OrderGuideOptions {
  requestedRecipes?: string[];
  covers?: number;
  eventName?: string;
}

export function buildOrderGuidePlan(
  transcript: string,
  options: OrderGuideOptions = {},
): OrderGuidePlan | null {
  const normalized = stripDiacritics(transcript).toLowerCase();
  const recipes = resolveRecipes(normalized, options.requestedRecipes);
  if (recipes.length === 0) {
    return null;
  }
  const covers = options.covers ?? inferCovers(normalized) ?? 100;
  const eventName = options.eventName ?? inferEventName(transcript) ?? "Service";

  const storeroom: OrderGuideLine[] = [];
  const vendorOrders: OrderGuideLine[] = [];

  for (const recipeKey of recipes) {
    const recipe = RECIPES[recipeKey];
    if (!recipe) continue;
    const batches = Math.ceil(covers / recipe.yield);
    for (const ingredient of recipe.ingredients) {
      const inventory = INVENTORY[ingredient.sku];
      const required = ingredient.amountPerBatch * batches;
      const onHand = inventory?.onHand ?? 0;
      const pull = Math.min(required, onHand);
      const toOrder = Math.max(0, required - pull);
      const casesToOrder = toOrder > 0 ? Math.ceil(toOrder / ingredient.caseSize) : 0;
      const line: OrderGuideLine = {
        sku: ingredient.sku,
        name: ingredient.name,
        required,
        unit: ingredient.unit,
        pullFromStoreroom: pull,
        orderFromVendor: toOrder,
        caseLabel: ingredient.caseLabel,
        casesToOrder,
      };
      if (toOrder > 0) vendorOrders.push(line);
      if (pull > 0) storeroom.push(line);
    }
  }

  const summary = formatSummary(eventName, covers, recipes, vendorOrders);

  return {
    eventName,
    covers,
    recipes: recipes.map((key) => RECIPES[key]?.name ?? key),
    storeroom,
    vendorOrders,
    summary,
  };
}

export function renderOrderGuide(plan: OrderGuidePlan): string {
  const storeroomLines = plan.storeroom.length
    ? plan.storeroom
        .map(
          (line) =>
            `• ${line.name} (${line.sku}) – pull ${line.pullFromStoreroom.toFixed(
              1,
            )}${line.unit} (${line.caseLabel})`,
        )
        .join("\n")
    : "• Nothing to pull from storeroom";

  const vendorLines = plan.vendorOrders.length
    ? plan.vendorOrders
        .map((line) => {
          const cases = line.casesToOrder;
          const casesText = cases > 0 ? `${cases} case(s)` : `${line.orderFromVendor.toFixed(1)}${line.unit}`;
          return `• ${line.name} (${line.sku}) – order ${casesText} (${line.caseLabel})`;
        })
        .join("\n")
    : "• No external orders required";

  return [
    `Event: ${plan.eventName}`,
    `Covers: ${plan.covers}`,
    `Recipes: ${plan.recipes.join(", ")}`,
    "",
    "Storeroom pulls:",
    storeroomLines,
    "",
    "External vendor orders:",
    vendorLines,
    "",
    plan.summary,
  ].join("\n");
}

export function generateOrderGuideResponse(
  transcript: string,
  options?: OrderGuideOptions,
): string | null {
  const plan = buildOrderGuidePlan(transcript, options);
  if (!plan) {
    return null;
  }
  return renderOrderGuide(plan);
}

function stripDiacritics(input: string) {
  return input.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function resolveRecipes(transcript: string, provided?: string[]): string[] {
  if (provided?.length) {
    return provided
      .map((name) => stripDiacritics(name).toLowerCase())
      .filter((name) => RECIPES[name]);
  }
  const matches = Object.keys(RECIPES).filter((key) =>
    transcript.includes(stripDiacritics(key).toLowerCase()),
  );
  return matches.length ? matches : ["creme brulee"];
}

function inferCovers(transcript: string): number | null {
  const match = transcript.match(/(\d{2,4})\s*(guests|people|covers|servings?)/i);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isNaN(value) ? null : value;
}

function inferEventName(text: string): string | null {
  const match = text.match(/for\s+the\s+([^.,]+)/i);
  if (match?.[1]) {
    return capitalize(match[1].trim());
  }
  return null;
}

function capitalize(input: string) {
  return input.replace(/(^|\s)([a-z])/g, (m) => m.toUpperCase());
}

function formatSummary(
  eventName: string,
  covers: number,
  recipes: string[],
  vendorOrders: OrderGuideLine[],
) {
  if (vendorOrders.length === 0) {
    return `All ingredients for ${eventName} (${covers} covers) are available from storeroom stock.`;
  }
  const vendorList = vendorOrders.map((order) => order.name).join(", ");
  return `Prepared ${eventName} (${covers} covers). Send purchase order for ${vendorList} once approved.`;
}
