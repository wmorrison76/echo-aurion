/**
 * Echo AI^3 — Recipe Chain
 *
 * The connective tissue between Echo AI^3 cognition and the culinary stack.
 * Three composable steps form a single chain that AI^3 (or any caller) can
 * drive end-to-end:
 *
 *   1. buildRecipeFromIntent   — turn a structured ChefIntent into a priced
 *                                 Recipe. Pulls live vendor-invoice unit
 *                                 prices and yield data when an `originBase`
 *                                 URL is supplied; otherwise falls back to
 *                                 whatever the intent already carries.
 *   2. composeDishFromRecipes  — assemble one or more recipes into a plated
 *                                 dish (plate assembly), summing portion
 *                                 cost across components.
 *   3. publishDishCostToPos    — publish the plated dish's current cost
 *                                 (and computed food-cost %) to a target POS
 *                                 system, recording the publication for
 *                                 downstream sales-data reconciliation.
 *
 * Each step writes to an in-process store and emits a trace ledger entry so
 * AI^3 actions are observable in the same audit log every other module uses.
 *
 * The stores are intentionally tiny module-scoped Maps. They are real (not
 * stubs): callers can build, compose, and publish in a single process and
 * read the results back via the getters. Persisting beyond process lifetime
 * is the responsibility of the persistence layer that wraps these calls
 * (e.g. the recipes-crud router or a postgres repository) — this file owns
 * the cognition-side composition only.
 */

import { emitTrace } from "../../lib/trace-emitter";
import { logger } from "../../lib/logger";

// ─── Types ───────────────────────────────────────────────────────────────

export interface ChefIntentItem {
  name: string;
  qty: number;
  unit: string;
  prep?: string;
  /** Optional explicit unit cost in dollars. Overrides vendor-SKU lookup. */
  unitCost?: number;
  /** Optional explicit yield % (0–100). Overrides yield-DB lookup. */
  yieldPct?: number;
}

export interface ChefIntent {
  name: string;
  servings: number;
  items: ChefIntentItem[];
  /** Free-form chef note carried into the recipe record. */
  notes?: string;
  /** Soft hint used by AI^3 for categorization (e.g. "entree"). */
  courseHint?: string;
  /** Optional explicit org id; otherwise the trace context decides. */
  orgId?: string;
}

export interface RecipeChainItem extends ChefIntentItem {
  unitCost: number;
  yieldPct: number;
  lineCost: number;
  vendorName?: string;
  vendorSku?: string;
}

export interface ChainRecipe {
  id: string;
  name: string;
  servings: number;
  items: RecipeChainItem[];
  totalCost: number;
  costPerServing: number;
  notes?: string;
  courseHint?: string;
  orgId: string;
  source: "echo-ai3";
  createdAt: string;
}

export interface DishComponent {
  recipeId: string;
  portions: number;
}

export interface ComposeDishInput {
  dishName: string;
  components: DishComponent[];
  plateNotes?: string;
  orgId?: string;
}

export interface ChainDish {
  id: string;
  name: string;
  components: Array<DishComponent & { recipeName: string; lineCost: number }>;
  totalCost: number;
  plateNotes?: string;
  orgId: string;
  source: "echo-ai3";
  createdAt: string;
}

export interface PublishDishCostInput {
  dishId: string;
  posSystem: string; // "toast" | "square" | "touchbistro" | "micros" | …
  posCode: string;
  sellPrice?: number;
  outletId?: string;
  orgId?: string;
}

export interface PosCostPublication {
  id: string;
  dishId: string;
  dishName: string;
  posSystem: string;
  posCode: string;
  unitCost: number;
  sellPrice?: number;
  foodCostPct?: number;
  outletId?: string;
  orgId: string;
  publishedAt: string;
}

export interface RecipeChainContext {
  /**
   * Origin of the running server (e.g. "http://127.0.0.1:8080"). When set,
   * the chain enriches each item with live vendor-invoice pricing via
   * /api/vendor-skus/lookup and yield data via /api/yields/search.
   */
  originBase?: string;
  /** Pass-through request used to scope traces to the caller. */
  req?: any;
  orgId?: string;
  userId?: string;
}

// ─── Stores ───────────────────────────────────────────────────────────────

const recipeStore = new Map<string, ChainRecipe>();
const dishStore = new Map<string, ChainDish>();
const publicationStore = new Map<string, PosCostPublication>();

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const safeNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// ─── Pricing enrichment ───────────────────────────────────────────────────

interface VendorSkuMatch {
  description: string;
  current_unit_price: number;
  current_uom?: string;
  vendor_name?: string;
  item_code?: string;
}

interface YieldMatch {
  name: string;
  yield_pct?: number;
  ap_cost_lb?: number;
  unit?: string;
}

async function lookupVendorSku(
  name: string,
  base: string,
): Promise<VendorSkuMatch | null> {
  try {
    const url = `${base.replace(/\/+$/, "")}/api/vendor-skus/lookup?q=${encodeURIComponent(name)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { matches?: VendorSkuMatch[] };
    return (data.matches && data.matches[0]) || null;
  } catch {
    return null;
  }
}

async function lookupYield(name: string, base: string): Promise<YieldMatch | null> {
  try {
    const url = `${base.replace(/\/+$/, "")}/api/yields/search?q=${encodeURIComponent(name)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: YieldMatch[] };
    return (data.results && data.results[0]) || null;
  } catch {
    return null;
  }
}

async function enrichItem(
  item: ChefIntentItem,
  ctx: RecipeChainContext,
): Promise<RecipeChainItem> {
  let unitCost = safeNumber(item.unitCost);
  let yieldPct = safeNumber(item.yieldPct, 100);
  let vendorName: string | undefined;
  let vendorSku: string | undefined;

  if (ctx.originBase) {
    if (!unitCost) {
      const sku = await lookupVendorSku(item.name, ctx.originBase);
      if (sku) {
        unitCost = safeNumber(sku.current_unit_price);
        vendorName = sku.vendor_name;
        vendorSku = sku.item_code;
      }
    }
    if (yieldPct === 100) {
      const y = await lookupYield(item.name, ctx.originBase);
      if (y && typeof y.yield_pct === "number") {
        yieldPct = y.yield_pct;
        if (!unitCost && typeof y.ap_cost_lb === "number") unitCost = y.ap_cost_lb;
      }
    }
  }

  const qty = safeNumber(item.qty);
  return {
    name: item.name,
    qty,
    unit: item.unit,
    prep: item.prep,
    unitCost,
    yieldPct,
    lineCost: Number((qty * unitCost).toFixed(4)),
    vendorName,
    vendorSku,
  };
}

// ─── Step 1: build a recipe ───────────────────────────────────────────────

export async function buildRecipeFromIntent(
  intent: ChefIntent,
  ctx: RecipeChainContext = {},
): Promise<ChainRecipe> {
  if (!intent.name?.trim()) throw new Error("ChefIntent.name is required");
  if (!Array.isArray(intent.items) || intent.items.length === 0) {
    throw new Error("ChefIntent.items must contain at least one ingredient");
  }
  const servings = Math.max(1, Math.floor(safeNumber(intent.servings, 1)));

  const enrichedItems: RecipeChainItem[] = [];
  for (const item of intent.items) enrichedItems.push(await enrichItem(item, ctx));

  const totalCost = Number(
    enrichedItems.reduce((sum, i) => sum + i.lineCost, 0).toFixed(4),
  );
  const orgId = intent.orgId ?? ctx.orgId ?? "default";

  const recipe: ChainRecipe = {
    id: newId("recipe"),
    name: intent.name.trim(),
    servings,
    items: enrichedItems,
    totalCost,
    costPerServing: Number((totalCost / servings).toFixed(4)),
    notes: intent.notes,
    courseHint: intent.courseHint,
    orgId,
    source: "echo-ai3",
    createdAt: new Date().toISOString(),
  };

  recipeStore.set(recipe.id, recipe);

  await emitTrace(
    ctx.req ?? orgId,
    "recipe",
    recipe.id,
    "echo-ai3-recipe-chain",
    "recipe",
    { intent, originBase: ctx.originBase ? "live" : "offline" },
    { recipeId: recipe.id, totalCost: recipe.totalCost, costPerServing: recipe.costPerServing },
    { sourceRef: "echo-ai3.buildRecipe", system: "echo-ai3", userId: ctx.userId },
  );

  logger.info("[EchoAI3.RecipeChain] Recipe built", {
    recipeId: recipe.id,
    name: recipe.name,
    totalCost: recipe.totalCost,
    items: recipe.items.length,
  });

  return recipe;
}

// ─── Step 2: compose plated dish ──────────────────────────────────────────

export async function composeDishFromRecipes(
  input: ComposeDishInput,
  ctx: RecipeChainContext = {},
): Promise<ChainDish> {
  if (!input.dishName?.trim()) throw new Error("dishName is required");
  if (!Array.isArray(input.components) || input.components.length === 0) {
    throw new Error("components must contain at least one recipe");
  }

  const components: ChainDish["components"] = [];
  let totalCost = 0;
  for (const c of input.components) {
    const recipe = recipeStore.get(c.recipeId);
    if (!recipe) throw new Error(`Recipe ${c.recipeId} not found in chain store`);
    const portions = Math.max(0, safeNumber(c.portions, 1));
    const lineCost = Number((recipe.costPerServing * portions).toFixed(4));
    totalCost += lineCost;
    components.push({
      recipeId: recipe.id,
      portions,
      recipeName: recipe.name,
      lineCost,
    });
  }
  totalCost = Number(totalCost.toFixed(4));
  const orgId = input.orgId ?? ctx.orgId ?? "default";

  const dish: ChainDish = {
    id: newId("dish"),
    name: input.dishName.trim(),
    components,
    totalCost,
    plateNotes: input.plateNotes,
    orgId,
    source: "echo-ai3",
    createdAt: new Date().toISOString(),
  };

  dishStore.set(dish.id, dish);

  await emitTrace(
    ctx.req ?? orgId,
    "dish",
    dish.id,
    "echo-ai3-recipe-chain",
    "recipe",
    { dishName: dish.name, components: input.components },
    { dishId: dish.id, totalCost, componentCount: components.length },
    { sourceRef: "echo-ai3.composeDish", system: "echo-ai3", userId: ctx.userId },
  );

  logger.info("[EchoAI3.RecipeChain] Dish composed", {
    dishId: dish.id,
    name: dish.name,
    totalCost,
    components: components.length,
  });

  return dish;
}

// ─── Step 3: publish dish cost to POS ─────────────────────────────────────

export async function publishDishCostToPos(
  input: PublishDishCostInput,
  ctx: RecipeChainContext = {},
): Promise<PosCostPublication> {
  if (!input.dishId) throw new Error("dishId is required");
  if (!input.posSystem) throw new Error("posSystem is required");
  if (!input.posCode) throw new Error("posCode is required");

  const dish = dishStore.get(input.dishId);
  if (!dish) throw new Error(`Dish ${input.dishId} not found in chain store`);

  const sellPrice = typeof input.sellPrice === "number" ? input.sellPrice : undefined;
  const foodCostPct =
    sellPrice && sellPrice > 0
      ? Number(((dish.totalCost / sellPrice) * 100).toFixed(2))
      : undefined;
  const orgId = input.orgId ?? ctx.orgId ?? dish.orgId ?? "default";

  const publication: PosCostPublication = {
    id: newId("pos-pub"),
    dishId: dish.id,
    dishName: dish.name,
    posSystem: input.posSystem,
    posCode: input.posCode,
    unitCost: dish.totalCost,
    sellPrice,
    foodCostPct,
    outletId: input.outletId,
    orgId,
    publishedAt: new Date().toISOString(),
  };

  publicationStore.set(publication.id, publication);

  await emitTrace(
    ctx.req ?? orgId,
    "pos-cost-publication",
    publication.id,
    "echo-ai3-recipe-chain",
    "pos",
    { dishId: dish.id, posSystem: input.posSystem, posCode: input.posCode, sellPrice },
    {
      publicationId: publication.id,
      unitCost: publication.unitCost,
      foodCostPct: publication.foodCostPct,
    },
    { sourceRef: "echo-ai3.publishPosCost", system: "echo-ai3", userId: ctx.userId },
  );

  logger.info("[EchoAI3.RecipeChain] POS cost published", {
    publicationId: publication.id,
    dishId: dish.id,
    posSystem: publication.posSystem,
    unitCost: publication.unitCost,
    foodCostPct: publication.foodCostPct,
  });

  return publication;
}

// ─── Read-side accessors (for tests, debug, downstream services) ──────────

export function getChainRecipe(id: string): ChainRecipe | undefined {
  return recipeStore.get(id);
}

export function getChainDish(id: string): ChainDish | undefined {
  return dishStore.get(id);
}

export function getPosPublication(id: string): PosCostPublication | undefined {
  return publicationStore.get(id);
}

export function listRecentPublications(limit = 50): PosCostPublication[] {
  return Array.from(publicationStore.values())
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, Math.max(1, limit));
}

/**
 * Drive the full chain in one call: build → compose → publish.
 * Useful for tests and for AI^3 actions that originate from a single intent.
 */
export async function runFullChain(args: {
  intent: ChefIntent;
  portionsPerDish?: number;
  pos?: { posSystem: string; posCode: string; sellPrice?: number; outletId?: string };
  ctx?: RecipeChainContext;
}): Promise<{
  recipe: ChainRecipe;
  dish: ChainDish;
  publication?: PosCostPublication;
}> {
  const ctx = args.ctx ?? {};
  const recipe = await buildRecipeFromIntent(args.intent, ctx);
  const dish = await composeDishFromRecipes(
    {
      dishName: args.intent.name,
      components: [{ recipeId: recipe.id, portions: args.portionsPerDish ?? 1 }],
      plateNotes: args.intent.notes,
      orgId: args.intent.orgId,
    },
    ctx,
  );
  const publication = args.pos
    ? await publishDishCostToPos({ dishId: dish.id, ...args.pos, orgId: args.intent.orgId }, ctx)
    : undefined;
  return { recipe, dish, publication };
}
