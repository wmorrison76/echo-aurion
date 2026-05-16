/**
 * Ingredient-to-Inventory Mapping System
 * Links recipe ingredients to physical inventory items
 */

import { supabase } from "@/lib/auth-service";
import type { InventoryItem } from "@/lib/inventory-service";

export interface IngredientMapping {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  inventoryItemId: string;
  inventoryItemSku: string;
  conversionFactor: number; // How many units of inventory = 1 unit of ingredient
  sourceUnit: string; // Inventory unit (e.g., "kg")
  targetUnit: string; // Recipe unit (e.g., "g")
  createdAt: number;
  updatedAt: number;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  quantity: number;
  unit: string;
  cost?: number;
}

export interface InventoryAllocation {
  id: string;
  inventoryItemId: string;
  recipeId: string;
  allocatedQuantity: number;
  remainingQuantity: number;
  allocatedAt: number;
  allocatedBy: string;
}

/**
 * Create ingredient-to-inventory mapping
 */
export async function mapIngredientToInventory(
  recipeId: string,
  ingredientId: string,
  ingredientName: string,
  inventoryItemId: string,
  inventoryItemSku: string,
  conversionFactor: number,
  sourceUnit: string,
  targetUnit: string,
): Promise<{ success: boolean; data?: IngredientMapping; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    // Check if mapping exists
    const { data: existing } = await supabase
      .from("ingredient_inventory_mappings")
      .select("*")
      .eq("recipe_id", recipeId)
      .eq("ingredient_id", ingredientId)
      .single();

    let result;

    if (existing) {
      // Update
      result = await supabase
        .from("ingredient_inventory_mappings")
        .update({
          inventory_item_id: inventoryItemId,
          inventory_item_sku: inventoryItemSku,
          conversion_factor: conversionFactor,
          source_unit: sourceUnit,
          target_unit: targetUnit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Create
      result = await supabase
        .from("ingredient_inventory_mappings")
        .insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          ingredient_name: ingredientName,
          inventory_item_id: inventoryItemId,
          inventory_item_sku: inventoryItemSku,
          conversion_factor: conversionFactor,
          source_unit: sourceUnit,
          target_unit: targetUnit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      data: mapIngredientMapping(result.data),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get ingredient mappings for recipe
 */
export async function getRecipeIngredientMappings(
  recipeId: string,
): Promise<IngredientMapping[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("ingredient_inventory_mappings")
      .select("*")
      .eq("recipe_id", recipeId);

    if (error) {
      return [];
    }

    return data?.map(mapIngredientMapping) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Find inventory item for ingredient
 */
export async function findInventoryForIngredient(
  outletId: string,
  ingredientName: string,
  ingredientUnit: string,
): Promise<InventoryItem | null> {
  if (!supabase) {
    return null;
  }

  try {
    // First try exact match
    const { data: exact } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .ilike("name", ingredientName)
      .single();

    if (exact) {
      return mapInventoryItem(exact);
    }

    // Try fuzzy match on name
    const { data: fuzzy } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .ilike("name", `%${ingredientName}%`)
      .limit(1)
      .single();

    return fuzzy ? mapInventoryItem(fuzzy) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate inventory needed for recipe
 */
export async function calculateRecipeInventoryNeeds(
  recipeId: string,
  servings: number,
  baseServings: number,
): Promise<
  Array<{
    ingredientId: string;
    ingredientName: string;
    inventoryItemId: string;
    inventorySku: string;
    requiredQuantity: number;
    unit: string;
    available: number;
    unitCost: number;
    totalCost: number;
  }>
> {
  if (!supabase) {
    return [];
  }

  try {
    const mappings = await getRecipeIngredientMappings(recipeId);

    const needs = [];

    for (const mapping of mappings) {
      const { data: ingredient } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("id", mapping.ingredientId)
        .single();

      if (!ingredient) continue;

      const { data: inventory } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", mapping.inventoryItemId)
        .single();

      if (!inventory) continue;

      // Calculate required quantity based on servings
      const baseQuantity = ingredient.quantity;
      const requiredQuantity = (baseQuantity / baseServings) * servings;
      const inventoryQuantity = requiredQuantity / mapping.conversionFactor;

      needs.push({
        ingredientId: mapping.ingredientId,
        ingredientName: mapping.ingredientName,
        inventoryItemId: mapping.inventoryItemId,
        inventorySku: mapping.inventoryItemSku,
        requiredQuantity,
        unit: mapping.targetUnit,
        available: inventory.quantity,
        unitCost: inventory.unit_cost,
        totalCost: inventoryQuantity * inventory.unit_cost,
      });
    }

    return needs;
  } catch (error) {
    console.error("Error calculating inventory needs:", error);
    return [];
  }
}

/**
 * Check ingredient availability
 */
export async function checkIngredientAvailability(
  recipeId: string,
  outletId: string,
  servings: number = 1,
  baseServings: number = 1,
): Promise<{
  available: boolean;
  missingIngredients: string[];
  lowIngredients: string[];
  costs: { totalCost: number; perServing: number };
}> {
  if (!supabase) {
    return {
      available: false,
      missingIngredients: [],
      lowIngredients: [],
      costs: { totalCost: 0, perServing: 0 },
    };
  }

  try {
    const needs = await calculateRecipeInventoryNeeds(
      recipeId,
      servings,
      baseServings,
    );

    const missing: string[] = [];
    const low: string[] = [];
    let totalCost = 0;

    for (const need of needs) {
      const requiredQuantity =
        (need.requiredQuantity / baseServings) * servings;
      const inventoryQuantity = requiredQuantity / (need.available || 1);

      totalCost += need.totalCost;

      if (need.available === 0) {
        missing.push(need.ingredientName);
      } else if (need.available < inventoryQuantity) {
        low.push(
          `${need.ingredientName} (need ${inventoryQuantity}, have ${need.available})`,
        );
      }
    }

    return {
      available: missing.length === 0,
      missingIngredients: missing,
      lowIngredients: low,
      costs: {
        totalCost,
        perServing: servings > 0 ? totalCost / servings : 0,
      },
    };
  } catch (error) {
    console.error("Error checking availability:", error);
    return {
      available: false,
      missingIngredients: [],
      lowIngredients: [],
      costs: { totalCost: 0, perServing: 0 },
    };
  }
}

/**
 * Allocate inventory for recipe preparation
 */
export async function allocateInventoryForRecipe(
  recipeId: string,
  outletId: string,
  servings: number,
  baseServings: number,
  allocatedBy: string,
): Promise<{
  success: boolean;
  allocations?: InventoryAllocation[];
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const needs = await calculateRecipeInventoryNeeds(
      recipeId,
      servings,
      baseServings,
    );

    const allocations: InventoryAllocation[] = [];

    for (const need of needs) {
      const inventoryQuantity =
        (need.requiredQuantity / baseServings) * servings;

      // Create allocation record
      const { data: allocation, error: allocError } = await supabase
        .from("inventory_allocations")
        .insert({
          inventory_item_id: need.inventoryItemId,
          recipe_id: recipeId,
          allocated_quantity: inventoryQuantity,
          remaining_quantity: inventoryQuantity,
          allocated_at: new Date().toISOString(),
          allocated_by: allocatedBy,
        })
        .select()
        .single();

      if (allocError) {
        return { success: false, error: allocError.message };
      }

      allocations.push(mapAllocation(allocation));

      // Optionally: Update inventory quantity if auto-deduction is enabled
      // await adjustInventory(...);
    }

    return { success: true, allocations };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get ingredient cost for recipe
 */
export async function getRecipeIngredientCost(
  recipeId: string,
  servings: number = 1,
  baseServings: number = 1,
): Promise<{ cost: number; costPerServing: number }> {
  const needs = await calculateRecipeInventoryNeeds(
    recipeId,
    servings,
    baseServings,
  );

  const totalCost = needs.reduce((sum, need) => sum + need.totalCost, 0);

  return {
    cost: totalCost,
    costPerServing: servings > 0 ? totalCost / servings : 0,
  };
}

/**
 * Get inventory items with mapping status
 */
export async function getInventoryItemsWithMappingStatus(
  outletId: string,
  recipeId: string,
): Promise<
  Array<
    InventoryItem & {
      mapped: boolean;
      mappingId?: string;
    }
  >
> {
  if (!supabase) {
    return [];
  }

  try {
    const mappings = await getRecipeIngredientMappings(recipeId);
    const mappedItemIds = new Set(mappings.map((m) => m.inventoryItemId));

    const { data: items, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId);

    if (error || !items) {
      return [];
    }

    return items.map((item) => ({
      ...mapInventoryItem(item),
      mapped: mappedItemIds.has(item.id),
      mappingId: mappings.find((m) => m.inventoryItemId === item.id)?.id,
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Map database records
 */
function mapIngredientMapping(record: any): IngredientMapping {
  return {
    id: record.id,
    recipeId: record.recipe_id,
    ingredientId: record.ingredient_id,
    ingredientName: record.ingredient_name,
    inventoryItemId: record.inventory_item_id,
    inventoryItemSku: record.inventory_item_sku,
    conversionFactor: record.conversion_factor,
    sourceUnit: record.source_unit,
    targetUnit: record.target_unit,
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime(),
  };
}

function mapInventoryItem(record: any) {
  return {
    id: record.id,
    outletId: record.outlet_id,
    sku: record.sku,
    name: record.name,
    category: record.category,
    quantity: record.quantity,
    unit: record.unit,
    minimumStock: record.minimum_stock,
    maximumStock: record.maximum_stock,
    unitCost: record.unit_cost,
    supplier: record.supplier,
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime(),
  };
}

function mapAllocation(record: any): InventoryAllocation {
  return {
    id: record.id,
    inventoryItemId: record.inventory_item_id,
    recipeId: record.recipe_id,
    allocatedQuantity: record.allocated_quantity,
    remainingQuantity: record.remaining_quantity,
    allocatedAt: new Date(record.allocated_at).getTime(),
    allocatedBy: record.allocated_by,
  };
}
