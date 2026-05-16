/**
 * BEO Recipe Scaling Service (A3)
 *
 * When a BEO is approved (or explicitly POST-ed to the scale endpoint),
 * this service:
 *   1. Loads the BEO and its menu items
 *   2. Pulls all linked recipes from beo_recipe_links
 *   3. For each recipe, runs recipeAIAnalyzer.scaleRecipe() against the
 *      BEO's guest count
 *   4. Persists rows into scaled_ingredients keyed by beo_id (added in
 *      migration 072) so A4's PO consolidation can read them
 *   5. Emits a unifiedEventBus signal so downstream services (A4, A5)
 *      can pick up without polling
 *
 * Recipe data sourcing is pluggable: the service tries Supabase first
 * (recipes table), and if no recipe rows exist the service falls back
 * to a one-line inferred recipe (qty 1 of the menu item itself per
 * guest). This keeps the chain alive in dev environments where the
 * recipes catalog isn't fully populated, while logging a warn so the
 * gap is visible.
 */

import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from "../lib/unified-event-bus";
import { recipeAIAnalyzer, type ScaledRecipe, type RecipeIngredient } from "./recipe-ai-analyzer";
import { isStrict, StrictModeError } from "../lib/strict-mode";

export interface ScaleBEORecipesInput {
  beoId: string;
  /** Override the BEO's stored guest count (for what-if). */
  guestCountOverride?: number;
  /** If true, delete prior rows before re-inserting (default true). */
  replaceExisting?: boolean;
  userId?: string;
  /**
   * A4.6: when true, allow the inferred-fallback recipe path even in
   * strict mode. Default behavior is governed by NODE_ENV / the strict
   * mode env vars; this is the explicit per-call escape hatch.
   */
  allowSoftFail?: boolean;
}

export interface ScaleBEORecipesResult {
  beoId: string;
  guestCount: number;
  recipesScaled: number;
  ingredientsWritten: number;
  scaledIngredientIds: string[];
  warnings: string[];
}

interface BEORow {
  id: string;
  org_id: string;
  event_id: string;
  beo_number?: string;
  content_data?: Record<string, any>;
  lifecycle_event_id?: string | null;
}

interface RecipeLinkRow {
  beo_id: string;
  org_id: string;
  menu_item_id: string;
  recipe_id: string;
  recipe_name?: string | null;
}

interface RecipeRow {
  id: string;
  name?: string;
  yield_amount?: number;
  yield_unit?: string;
  ingredients?: Array<{
    name?: string;
    ingredient_name?: string;
    quantity?: number;
    unit?: string;
    unit_cost?: number;
    cost_per_unit?: number;
  }>;
}

async function loadBEO(beoId: string): Promise<BEORow | null> {
  const { data, error } = await supabase
    .from("beo_banquet_orders")
    .select("id, org_id, event_id, beo_number, content_data, lifecycle_event_id")
    .eq("id", beoId)
    .limit(1);
  if (error) {
    logger.error("[BEORecipeScaling] failed to load BEO", { beoId, error: error.message ?? String(error) });
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as BEORow;
}

async function loadRecipeLinks(beoId: string): Promise<RecipeLinkRow[]> {
  const { data, error } = await supabase
    .from("beo_recipe_links")
    .select("beo_id, org_id, menu_item_id, recipe_id, recipe_name")
    .eq("beo_id", beoId);
  if (error) {
    logger.error("[BEORecipeScaling] failed to load recipe links", { beoId, error: error.message ?? String(error) });
    return [];
  }
  return Array.isArray(data) ? (data as RecipeLinkRow[]) : [];
}

async function loadRecipe(recipeId: string): Promise<RecipeRow | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, yield_amount, yield_unit, ingredients")
    .eq("id", recipeId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as RecipeRow;
}

function recipeRowToScaled(row: RecipeRow, fallbackName: string): ScaledRecipe {
  const originalYield = Number(row.yield_amount) > 0 ? Number(row.yield_amount) : 1;
  const ingredients: RecipeIngredient[] = Array.isArray(row.ingredients)
    ? row.ingredients.map((i) => ({
        name: String(i.name ?? i.ingredient_name ?? "").trim() || "(unnamed)",
        originalQuantity: Number(i.quantity) || 0,
        originalUnit: String(i.unit ?? "ea"),
        unitCost: Number(i.unit_cost ?? i.cost_per_unit ?? 0) || undefined,
      }))
    : [];
  return {
    recipeName: row.name ?? fallbackName,
    originalYield,
    originalYieldUnit: row.yield_unit ?? "portion",
    targetYield: originalYield,
    targetYieldUnit: row.yield_unit ?? "portion",
    scalingFactor: 1,
    ingredients,
    prepSteps: [],
  };
}

/**
 * Best-effort fallback: when the recipes catalog has no row for a linked
 * recipe id, treat the menu item as a one-line "recipe" of 1 portion per
 * guest. The chain stays alive; A4 can still consolidate.
 */
function fallbackInferredRecipe(link: RecipeLinkRow): ScaledRecipe {
  return {
    recipeName: link.recipe_name ?? `Recipe ${link.recipe_id}`,
    originalYield: 1,
    originalYieldUnit: "portion",
    targetYield: 1,
    targetYieldUnit: "portion",
    scalingFactor: 1,
    ingredients: [
      {
        name: link.recipe_name ?? `Item ${link.menu_item_id}`,
        originalQuantity: 1,
        originalUnit: "portion",
      },
    ],
    prepSteps: [],
  };
}

function determineGuestCount(beo: BEORow, override?: number): number {
  if (override && override > 0) return override;
  const fromContent = Number(beo.content_data?.guestCount);
  if (Number.isFinite(fromContent) && fromContent > 0) return fromContent;
  // Last resort — fall back to 1 so scaling math doesn't blow up.
  return 1;
}

export async function scaleBEORecipes(
  input: ScaleBEORecipesInput,
): Promise<ScaleBEORecipesResult> {
  const replaceExisting = input.replaceExisting !== false;
  const warnings: string[] = [];

  const beo = await loadBEO(input.beoId);
  if (!beo) {
    throw new Error(`BEO ${input.beoId} not found`);
  }

  const guestCount = determineGuestCount(beo, input.guestCountOverride);
  const links = await loadRecipeLinks(input.beoId);

  if (links.length === 0) {
    warnings.push("no recipe links on BEO — nothing to scale");
    logger.warn("[BEORecipeScaling] BEO has no recipe links", { beoId: input.beoId });
  }

  if (replaceExisting) {
    const { error: delErr } = await supabase
      .from("scaled_ingredients")
      .delete()
      .eq("beo_id", input.beoId);
    if (delErr) {
      warnings.push(`failed to clear prior scaled rows: ${delErr.message ?? String(delErr)}`);
    }
  }

  const insertedIds: string[] = [];
  let recipesScaled = 0;

  const strict = isStrict({ area: "recipe-scale", allowSoftFail: input.allowSoftFail });
  const missingRecipeIds: string[] = [];

  for (const link of links) {
    const recipeRow = await loadRecipe(link.recipe_id);
    let base: ScaledRecipe;
    if (recipeRow) {
      base = recipeRowToScaled(recipeRow, link.recipe_name ?? link.recipe_id);
    } else {
      if (strict) {
        // A4.6: in strict mode, refuse to scale against a guess. Collect
        // the missing ids so the error surfaces all of them at once
        // instead of one round-trip per missing recipe.
        missingRecipeIds.push(link.recipe_id);
        continue;
      }
      warnings.push(`recipe ${link.recipe_id} not found in catalog — using inferred fallback (set RECIPE_CHAIN_STRICT=true to fail loudly)`);
      base = fallbackInferredRecipe(link);
    }

    let scaled: ScaledRecipe;
    try {
      scaled = recipeAIAnalyzer.scaleRecipe(base, guestCount);
    } catch (err) {
      warnings.push(
        `scaleRecipe failed for ${link.recipe_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    recipesScaled += 1;

    // Insert one scaled_ingredients row per ingredient
    for (const ing of scaled.ingredients) {
      const totalCost =
        typeof ing.unitCost === "number" && Number.isFinite(ing.unitCost)
          ? Number(((ing.scaledQuantity ?? 0) * ing.unitCost).toFixed(2))
          : null;

      const { data: inserted, error: insErr } = await supabase
        .from("scaled_ingredients")
        .insert({
          beo_id: input.beoId,
          event_id: beo.event_id,
          org_id: beo.org_id,
          recipe_id: link.recipe_id,
          ingredient_name: ing.name,
          original_quantity: ing.originalQuantity,
          original_unit: ing.originalUnit,
          scaled_quantity: ing.scaledQuantity ?? ing.originalQuantity * scaled.scalingFactor,
          scaled_unit: ing.scaledUnit ?? ing.originalUnit,
          unit_cost: ing.unitCost ?? null,
          total_cost: totalCost,
          guest_count: guestCount,
          scaling_factor: scaled.scalingFactor,
        })
        .select("id");

      if (insErr) {
        warnings.push(
          `insert failed for ${ing.name}: ${insErr.message ?? String(insErr)}`,
        );
        continue;
      }
      const id = Array.isArray(inserted) && inserted[0]?.id;
      if (id) insertedIds.push(id);
    }
  }

  // A4.6: if strict mode collected missing recipe ids, refuse the run
  // before the downstream bus event fires. Caller gets a single error
  // listing every missing id so they can fix the catalog in one pass.
  if (strict && missingRecipeIds.length > 0) {
    throw new StrictModeError(
      "recipe-scale",
      `Cannot scale BEO ${input.beoId}: ${missingRecipeIds.length} linked recipes missing from catalog`,
      { beoId: input.beoId, missingRecipeIds },
    );
  }

  const result: ScaleBEORecipesResult = {
    beoId: input.beoId,
    guestCount,
    recipesScaled,
    ingredientsWritten: insertedIds.length,
    scaledIngredientIds: insertedIds,
    warnings,
  };

  // Tell downstream (A4 PO consolidation, A5 production sheet) that
  // scaled rows are now available for this BEO.
  await unifiedEventBus.publish(
    UNIFIED_EVENT_TYPES.PRODUCTION_GENERATED,
    {
      beoId: input.beoId,
      eventId: beo.event_id,
      lifecycleEventId: beo.lifecycle_event_id,
      orgId: beo.org_id,
      guestCount,
      recipesScaled,
      ingredientsWritten: insertedIds.length,
      stage: "beo-recipes-scaled",
    },
    {
      source: { bus: "unified", module: "beo_recipe_scaling" },
      tenantId: beo.org_id,
    },
  );

  logger.info("[BEORecipeScaling] scaled", {
    beoId: input.beoId,
    guestCount,
    recipesScaled,
    ingredientsWritten: insertedIds.length,
    warnings: warnings.length,
  });

  return result;
}
