import type { BEODocument } from "@/../shared/types/beo";
import type { Recipe, RecipeExport } from "@shared/recipes";
import type {
  ProductionItem,
  ProductionSheet,
  ProductionStation,
} from "@/../shared/types/production";
import type { PurchaseDelta, PurchasePlan } from "@/../shared/types/purchasing";
import type {
  LaborPlan,
  LaborRequirement,
  LaborStation,
} from "@/../shared/types/labor";
import type { OrderLine } from "../types/genesis-integration";
import {
  Store,
  id as makeId,
} from "@/modules/PurchasingReceiving/client/lib/store";
import { updateBeo } from "@/lib/beo-store";
import {
  calculateIngredientCost,
  searchPurchasingInventory,
} from "@/modules/Culinary/client/lib/ingredient-purchasing-sync";
import {
  analyzeRecipeForEcho,
  type FlavorFingerprint,
  type RecipeAnalysisInput,
} from "@/modules/Culinary/shared/echo/flavor-engine";

const LS_RECIPES = "app.recipes.v1";

export type BeoRecipeMatch = {
  menuItemId: string;
  menuItemName: string;
  recipeId: string | null;
  recipeTitle: string | null;
  matchSource: "recipeId" | "title" | "created" | "missing";
  scaleFactor: number;
  station: ProductionStation;
  flavorMatchScore: number | null;
  missingIngredients: string[];
};

export type BeoOpsPlan = {
  productionSheets: ProductionSheet[];
  purchasePlan: PurchasePlan | null;
  orders: OrderLine[];
  laborPlan: LaborPlan | null;
  recipeMatches: BeoRecipeMatch[];
  missingRecipes: string[];
  totalIngredientCost: number;
  totalRecipeCount: number;
};

type MenuItemRow = {
  sectionIndex: number;
  itemIndex: number;
  menuPath: string;
  itemName: string;
  recipeId?: string | null;
};

const recipeTitleKey = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const parseNumber = (value: string | number | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.+-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseYieldPercent = (value?: string): number => {
  if (!value) return 100;
  const parsed = parseNumber(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  if (parsed <= 1) return parsed * 100;
  return parsed;
};

const inferStationFromText = (value: string): ProductionStation => {
  const v = value.toLowerCase();
  if (v.includes("dessert") || v.includes("pastry") || v.includes("cake"))
    return "PASTRY";
  if (v.includes("salad") || v.includes("cold") || v.includes("appetizer"))
    return "COLD";
  if (v.includes("bar") || v.includes("cocktail") || v.includes("bev"))
    return "BAR";
  if (v.includes("garde")) return "GARDE";
  if (v.includes("hot") || v.includes("entree") || v.includes("main"))
    return "HOT";
  return "OTHER";
};

const toLaborStation = (station: ProductionStation): LaborStation => {
  if (station === "GARDE") return "GARDE";
  if (station === "PASTRY") return "PASTRY";
  if (station === "BAR") return "BAR";
  if (station === "COLD") return "COLD";
  if (station === "HOT") return "HOT";
  return "OTHER";
};

const mapStationFromRecipe = (
  recipe: Recipe | null,
  menuItem: MenuItemRow,
): ProductionStation => {
  const serverNotes = (recipe?.extra as any)?.serverNotes as
    | RecipeExport
    | undefined;
  const course = serverNotes?.modifiers?.courses?.join(" ") ?? "";
  const type = serverNotes?.modifiers?.recipeType?.join(" ") ?? "";
  const tags = recipe?.tags?.join(" ") ?? "";
  const composite = [
    menuItem.menuPath,
    menuItem.itemName,
    course,
    type,
    tags,
  ].join(" ");
  return inferStationFromText(composite);
};

const readRecipes = (): Recipe[] => {
  try {
    const raw = localStorage.getItem(LS_RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecipes = (recipes: Recipe[]) => {
  try {
    localStorage.setItem(LS_RECIPES, JSON.stringify(recipes));
  } catch {
    // ignore write failures
  }
};

const getRecipeExport = (recipe: Recipe): RecipeExport | null => {
  const extra = (recipe.extra ?? {}) as Record<string, unknown>;
  const serverNotes = extra.serverNotes as RecipeExport | undefined;
  if (!serverNotes || !serverNotes.ingredients?.length) return null;
  return serverNotes;
};

const buildRecipeInput = (
  recipe: Recipe,
  exportData: RecipeExport,
): RecipeAnalysisInput => {
  const servings = exportData.portionCount || exportData.yieldQty || 1;
  const ingredients = exportData.ingredients
    .filter((row) => row.item && row.qty)
    .map((row) => ({
      name: row.item,
      amount: Math.max(0, parseNumber(row.qty)),
      tags: row.prep ? [row.prep] : [],
    }));
  const techniqueSteps =
    exportData.modifiers?.prepMethod?.map((method) => {
      const m = method.toLowerCase();
      if (m.includes("grill")) return { technique: "grilled" as const };
      if (m.includes("roast")) return { technique: "roasted" as const };
      if (m.includes("fry")) return { technique: "fried" as const };
      if (m.includes("sear")) return { technique: "seared" as const };
      if (m.includes("smoke")) return { technique: "smoked" as const };
      if (m.includes("ferment")) return { technique: "fermented" as const };
      if (m.includes("pickle")) return { technique: "pickled" as const };
      if (m.includes("steam")) return { technique: "steamed" as const };
      if (m.includes("poach")) return { technique: "poached" as const };
      return { technique: "raw" as const };
    }) ?? [];
  return {
    id: recipe.id,
    name: exportData.title || recipe.title,
    servings,
    ingredients,
    techniqueSteps,
  };
};

const buildChefFingerprint = (recipes: Recipe[]): FlavorFingerprint | null => {
  const fingerprints: FlavorFingerprint[] = [];
  recipes.forEach((recipe) => {
    const exportData = getRecipeExport(recipe);
    if (!exportData) return;
    const analysis = analyzeRecipeForEcho(buildRecipeInput(recipe, exportData));
    fingerprints.push(analysis.fingerprint);
  });
  if (!fingerprints.length) return null;
  const totals = new Map<string, number>();
  fingerprints[0].attributes.forEach((attr) => totals.set(attr.id, 0));
  fingerprints.forEach((fp) => {
    fp.attributes.forEach((attr) => {
      totals.set(attr.id, (totals.get(attr.id) || 0) + attr.intensity);
    });
  });
  const attributes = fingerprints[0].attributes.map((attr) => ({
    ...attr,
    intensity: (totals.get(attr.id) || 0) / fingerprints.length,
  }));
  return {
    recipeId: "chef-profile",
    recipeName: "Chef Flavor Profile",
    attributes,
    descriptors: ["signature"],
  };
};

const flavorSimilarity = (
  a: FlavorFingerprint | null,
  b: FlavorFingerprint | null,
): number | null => {
  if (!a || !b) return null;
  const map = new Map(a.attributes.map((attr) => [attr.id, attr.intensity]));
  let score = 0;
  let denom = 0;
  b.attributes.forEach((attr) => {
    const base = map.get(attr.id) ?? 0;
    score += base * attr.intensity;
    denom += 1;
  });
  return denom ? score / denom : null;
};

const listMenuItems = (beo: BEODocument): MenuItemRow[] => {
  const sections = beo.menu?.sections ?? [];
  const items: MenuItemRow[] = [];
  sections.forEach((section, idx) => {
    const sectionTitle = section.sectionTitle || `Section ${idx + 1}`;
    section.items.forEach((item, itemIdx) => {
      items.push({
        sectionIndex: idx,
        itemIndex: itemIdx,
        menuPath: `${sectionTitle}/${itemIdx + 1}`,
        itemName: item.itemName,
        recipeId: item.recipeId ?? null,
      });
    });
  });
  return items;
};

const createDraftRecipe = (title: string): Recipe => {
  const now = Date.now();
  return {
    id: `recipe-${makeId()}`,
    title,
    createdAt: now,
    extra: {
      recipeStatus: "draft",
      needsReview: true,
      serverNotes: {
        title,
        ingredients: [],
        directions:
          "Draft recipe created from BEO menu item. Add ingredients and steps.",
        allergens: [],
        modifiers: {
          nationality: [],
          courses: [],
          recipeType: [],
          prepMethod: [],
          equipment: [],
        },
        totals: { fullRecipeCost: 0 },
        currency: "USD",
      },
    },
  } as Recipe;
};

export function buildBeoOpsPlan({
  beo,
  eventId,
  eventTitle,
  eventDate,
  guestCount,
}: {
  beo: BEODocument;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  guestCount: number;
}): BeoOpsPlan {
  const recipes = readRecipes();
  const chefProfile = buildChefFingerprint(recipes);
  const menuItems = listMenuItems(beo);
  const updatedSections = beo.menu?.sections
    ? beo.menu.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item })),
      }))
    : null;
  let menuChanged = false;
  const missingRecipes: string[] = [];
  const recipeMatches: BeoRecipeMatch[] = [];
  const productionItems: ProductionItem[] = [];
  const purchaseMap = new Map<
    string,
    PurchaseDelta & {
      matches?: ReturnType<typeof searchPurchasingInventory>;
      sourceRecipeIds?: string[];
    }
  >();
  let totalIngredientCost = 0;
  let totalRecipeCount = 0;

  menuItems.forEach((menu) => {
    const recipeById = menu.recipeId
      ? recipes.find((r) => r.id === menu.recipeId)
      : null;
    const menuKey = recipeTitleKey(menu.itemName);
    const recipeByTitle =
      recipeById ||
      recipes.find((r) => recipeTitleKey(r.title) === menuKey) ||
      null;

    let recipe = recipeById || recipeByTitle;
    let matchSource: BeoRecipeMatch["matchSource"] = recipeById
      ? "recipeId"
      : recipeByTitle
        ? "title"
        : "missing";

    if (!recipe) {
      const draft = createDraftRecipe(menu.itemName);
      recipes.unshift(draft);
      writeRecipes(recipes);
      recipe = draft;
      matchSource = "created";
      missingRecipes.push(menu.itemName);
    }

    const exportData = recipe ? getRecipeExport(recipe) : null;
    const station = mapStationFromRecipe(recipe, menu);
    const portionCount = exportData?.portionCount || exportData?.yieldQty || 1;
    const scaleFactor = portionCount > 0 ? guestCount / portionCount : 1;
    const analysis = exportData
      ? analyzeRecipeForEcho(buildRecipeInput(recipe as Recipe, exportData))
      : null;
    const flavorMatchScore = analysis
      ? flavorSimilarity(chefProfile, analysis.fingerprint)
      : null;

    const missingIngredients: string[] = [];

    if (exportData) {
      totalRecipeCount += 1;
      exportData.ingredients.forEach((row) => {
        if (!row.item || !row.qty) return;
        const qty = Math.max(0, parseNumber(row.qty)) * scaleFactor;
        const unit = row.unit || "unit";
        const yieldPct = parseYieldPercent(row.yield);
        const matches = searchPurchasingInventory(row.item, 0.5);
        const match = matches[0];
        if (!match) missingIngredients.push(row.item);
        const ingredientId =
          match?.inventoryId ??
          Store.ensureItem(beo.outletId || "main", row.item).id;
        const key = ingredientId;
        const existing = purchaseMap.get(key);
        const required = qty;
        const toOrder = required;
        const merged: PurchaseDelta & {
          matches?: ReturnType<typeof searchPurchasingInventory>;
          sourceRecipeIds?: string[];
        } = existing
          ? {
              ...existing,
              required: existing.required + required,
              toOrder: existing.toOrder + toOrder,
              sourceRecipeIds: [
                ...(existing.sourceRecipeIds || []),
                recipe?.id || "",
              ],
            }
          : {
              ingredientId,
              ingredientName: row.item,
              required,
              onHand: 0,
              onOrder: 0,
              toOrder,
              unit,
              matches,
              sourceRecipeIds: recipe?.id ? [recipe.id] : [],
            };
        purchaseMap.set(key, merged);
        totalIngredientCost += calculateIngredientCost(
          match || ({ costPerUnit: 0, packSize: 1, packUnit: unit } as any),
          qty,
          unit,
          yieldPct,
        );
      });
    }

    productionItems.push({
      itemId: recipe?.id ?? menu.menuPath,
      itemName: menu.itemName,
      station,
      quantity: Math.max(1, Math.round(guestCount)),
      unit: "portions",
      derivedFrom: { beoId: beo.beoId, menuPath: menu.menuPath },
      notes: exportData?.subtitle || undefined,
    });

    recipeMatches.push({
      menuItemId: menu.menuPath,
      menuItemName: menu.itemName,
      recipeId: recipe?.id ?? null,
      recipeTitle: exportData?.title ?? recipe?.title ?? null,
      matchSource,
      scaleFactor,
      station,
      flavorMatchScore,
      missingIngredients,
    });

    if (updatedSections && recipe?.id) {
      const target =
        updatedSections[menu.sectionIndex]?.items?.[menu.itemIndex];
      if (target && target.recipeId !== recipe.id) {
        target.recipeId = recipe.id;
        menuChanged = true;
      }
    }
  });

  if (menuChanged && updatedSections) {
    updateBeo(
      {
        ...beo,
        menu: {
          ...(beo.menu || {}),
          sections: updatedSections,
        },
      },
      "Linked recipes to BEO menu items",
    );
  }

  const productionSheets = (
    ["HOT", "COLD", "GARDE", "PASTRY", "BAR", "OTHER"] as const
  )
    .map((station) => {
      const items = productionItems.filter((item) => item.station === station);
      return {
        productionId: `prod-${beo.beoId}`,
        beoId: beo.beoId,
        eventId,
        outletName: beo.outletName || "Outlet",
        eventTitle,
        eventDate,
        station,
        items,
        generatedAt: new Date().toISOString(),
        revision: 1,
      } as ProductionSheet;
    })
    .filter((sheet) => sheet.items.length > 0);

  const purchasePlan: PurchasePlan | null = purchaseMap.size
    ? {
        planId: `plan-${beo.beoId}`,
        beoId: beo.beoId,
        revision: 1,
        generatedAt: new Date().toISOString(),
        ingredients: Array.from(purchaseMap.values()).map((entry) => ({
          ingredientId: entry.ingredientId,
          ingredientName: entry.ingredientName,
          required: Math.round(entry.required * 100) / 100,
          onHand: entry.onHand,
          onOrder: entry.onOrder,
          toOrder: Math.round(entry.toOrder * 100) / 100,
          unit: entry.unit,
        })),
      }
    : null;

  const neededByAt = beo.start
    ? new Date(
        new Date(beo.start).getTime() - 2 * 24 * 60 * 60 * 1000,
      ).toISOString()
    : undefined;
  const expectedDeliveryAt = beo.start
    ? new Date(
        new Date(beo.start).getTime() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString()
    : undefined;

  const orders: OrderLine[] =
    purchasePlan?.ingredients.map((entry, idx) => ({
      id: `order-${beo.beoId}-${idx + 1}`,
      orderId: `po-${beo.beoId}`,
      itemId: entry.ingredientId,
      quantity: entry.toOrder,
      unit: entry.unit,
      vendorId: "AUTO",
      producingNodeId: stationToNodeId(
        inferStationFromText(entry.ingredientName),
      ),
      receivingNodeId: stationToNodeId(
        inferStationFromText(entry.ingredientName),
      ),
      payingNodeId: stationToNodeId("OTHER"),
      sourceBEODs: [beo.beoId],
      sourceRecipeIds:
        purchaseMap.get(entry.ingredientId)?.sourceRecipeIds ?? [],
      sourceEventIds: [eventId],
      status: "ordered",
      neededByAt,
      expectedDeliveryAt,
      leadTimeDays: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })) ?? [];

  const laborPlan = buildLaborPlan({
    beoId: beo.beoId,
    eventDate: beo.start ?? eventDate,
    eventTimeRange:
      beo.start && beo.end ? `${beo.start} - ${beo.end}` : eventDate,
    productionSheets,
  });

  return {
    productionSheets,
    purchasePlan,
    orders,
    laborPlan,
    recipeMatches,
    missingRecipes,
    totalIngredientCost,
    totalRecipeCount,
  };
}

function stationToNodeId(station: ProductionStation | "OTHER") {
  if (station === "PASTRY") return "node-bakery";
  if (station === "BAR") return "node-bar";
  if (station === "HOT" || station === "COLD" || station === "GARDE")
    return "node-production-kitchen";
  return "node-outlet";
}

function buildLaborPlan({
  beoId,
  eventDate,
  eventTimeRange,
  productionSheets,
}: {
  beoId: string;
  eventDate: string;
  eventTimeRange: string;
  productionSheets: ProductionSheet[];
}): LaborPlan | null {
  if (!productionSheets.length) return null;
  const totals = new Map<LaborStation, { items: number; portions: number }>();
  productionSheets.forEach((sheet) => {
    const station = toLaborStation(sheet.station);
    const current = totals.get(station) ?? { items: 0, portions: 0 };
    const portions = sheet.items.reduce((sum, item) => sum + item.quantity, 0);
    totals.set(station, {
      items: current.items + sheet.items.length,
      portions: current.portions + portions,
    });
  });
  const requirements: LaborRequirement[] = [];
  totals.forEach((val, station) => {
    const requiredStaff = Math.max(1, Math.ceil(val.portions / 120));
    const estimatedHours = Math.max(2, Math.round(val.portions / 40));
    requirements.push({
      station,
      requiredStaff,
      estimatedHours,
      derivedFrom: { beoId, productionId: `prod-${beoId}` },
    });
  });
  return {
    planId: `labor-${beoId}`,
    beoId,
    revision: 1,
    eventDate,
    eventTimeRange,
    generatedAt: new Date().toISOString(),
    requirements,
    deltas: requirements.map((req) => ({
      station: req.station,
      required: req.requiredStaff,
      scheduled: Math.max(0, req.requiredStaff - 1),
      delta: 1,
    })),
  };
}
