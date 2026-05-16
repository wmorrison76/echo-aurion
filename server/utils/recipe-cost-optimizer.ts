/**
 * Recipe Cost Optimizer
 * 
 * Optimizes recipe cost calculations by caching ingredient costs
 * and batching database queries
 */

import { logger } from '../lib/logger';
import { getSupabaseServiceClient } from '../lib/supabase-service-client';

interface IngredientCost {
  ingredient_id: string;
  ingredient_name: string;
  cost_per_unit: number;
  unit: string;
  vendor_id?: string;
  vendor_name?: string;
  last_updated: number;
}

export class RecipeCostOptimizer {
  // Cache for ingredient costs (ingredient_name -> cost)
  private costCache: Map<string, IngredientCost> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private pendingBatchLoad: Promise<void> | null = null;

  /**
   * Get ingredient cost from cache or database
   */
  async getIngredientCost(
    ingredientName: string,
    orgId: string,
    unit?: string
  ): Promise<number | null> {
    const cacheKey = `${orgId}:${ingredientName.toLowerCase()}`;
    const cached = this.costCache.get(cacheKey);

    // Return cached cost if valid
    if (cached && cached.last_updated + this.CACHE_TTL > Date.now()) {
      // Convert to requested unit if different
      if (unit && cached.unit !== unit) {
        try {
          const { convertUnit } = await import('./unit-converter');
          const convertedCost = convertUnit(cached.cost_per_unit, cached.unit, unit);
          return convertedCost;
        } catch (error) {
          logger.debug('[RecipeCostOptimizer] Unit conversion failed, using cached unit', {
            ingredientName,
            cachedUnit: cached.unit,
            requestedUnit: unit,
          });
        }
      }
      return cached.cost_per_unit;
    }

    // Fetch from database
    try {
      const cost = await this.fetchIngredientCostFromDB(ingredientName, orgId, unit);
      if (cost !== null) {
        // Cache the result
        this.costCache.set(cacheKey, {
          ingredient_id: '',
          ingredient_name: ingredientName,
          cost_per_unit: cost,
          unit: unit || 'each',
          last_updated: Date.now(),
        });
      }
      return cost;
    } catch (error) {
      logger.warn('[RecipeCostOptimizer] Failed to fetch ingredient cost', {
        ingredientName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Batch load ingredient costs (optimize multiple lookups)
   */
  async batchGetIngredientCosts(
    ingredientNames: string[],
    orgId: string
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const toFetch: string[] = [];

    // Check cache first
    for (const name of ingredientNames) {
      const cacheKey = `${orgId}:${name.toLowerCase()}`;
      const cached = this.costCache.get(cacheKey);
      if (cached && cached.last_updated + this.CACHE_TTL > Date.now()) {
        result.set(name, cached.cost_per_unit);
      } else {
        toFetch.push(name);
      }
    }

    // Fetch remaining from database
    if (toFetch.length > 0) {
      try {
        const costs = await this.batchFetchIngredientCostsFromDB(toFetch, orgId);
        for (const [name, cost] of costs.entries()) {
          result.set(name, cost);
          // Cache the result
          const cacheKey = `${orgId}:${name.toLowerCase()}`;
          this.costCache.set(cacheKey, {
            ingredient_id: '',
            ingredient_name: name,
            cost_per_unit: cost,
            unit: 'each',
            last_updated: Date.now(),
          });
        }
      } catch (error) {
        logger.warn('[RecipeCostOptimizer] Failed to batch fetch ingredient costs', {
          count: toFetch.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Fetch ingredient cost from database
   */
  private async fetchIngredientCostFromDB(
    ingredientName: string,
    orgId: string,
    unit?: string
  ): Promise<number | null> {
    try {
      const supabase = getSupabaseServiceClient();

      // Try to find in vendor catalog items
      const { data: catalogItem, error } = await supabase
        .from('vendor_catalog_items')
        .select('cost_per_unit, unit, ingredient_name, ingredient_id')
        .eq('org_id', orgId)
        .ilike('ingredient_name', `%${ingredientName}%`)
        .order('cost_per_unit', { ascending: true })
        .limit(1)
        .single();

      if (error || !catalogItem) {
        return null;
      }

      let cost = catalogItem.cost_per_unit || 0;

      // Convert unit if needed
      if (unit && catalogItem.unit && catalogItem.unit !== unit) {
        try {
          const { convertUnit } = await import('./unit-converter');
          cost = convertUnit(cost, catalogItem.unit, unit);
        } catch (convertError) {
          logger.debug('[RecipeCostOptimizer] Unit conversion failed', {
            ingredientName,
            fromUnit: catalogItem.unit,
            toUnit: unit,
          });
        }
      }

      return cost;
    } catch (error) {
      logger.error('[RecipeCostOptimizer] Error fetching ingredient cost from DB', {
        ingredientName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Batch fetch ingredient costs from database
   */
  private async batchFetchIngredientCostsFromDB(
    ingredientNames: string[],
    orgId: string
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (ingredientNames.length === 0) {
      return result;
    }

    try {
      const supabase = getSupabaseServiceClient();

      // Build query to find all ingredients at once
      // Using ilike with OR conditions for multiple names
      const conditions = ingredientNames
        .map((name, index) => `ingredient_name.ilike.%${name}%`)
        .join(',');

      const { data: catalogItems, error } = await supabase
        .from('vendor_catalog_items')
        .select('ingredient_name, cost_per_unit, unit')
        .eq('org_id', orgId)
        .or(conditions);

      if (error || !catalogItems) {
        return result;
      }

      // Map results to ingredient names (use first/lowest cost match)
      const nameMap = new Map<string, { cost: number; unit: string }>();
      for (const item of catalogItems) {
        const name = item.ingredient_name?.toLowerCase();
        if (!name) continue;

        // Find matching ingredient name
        for (const searchName of ingredientNames) {
          if (name.includes(searchName.toLowerCase()) || searchName.toLowerCase().includes(name)) {
            const existing = nameMap.get(searchName);
            const cost = item.cost_per_unit || 0;
            if (!existing || cost < existing.cost) {
              nameMap.set(searchName, { cost, unit: item.unit || 'each' });
            }
          }
        }
      }

      // Convert to result map
      for (const [name, { cost }] of nameMap.entries()) {
        result.set(name, cost);
      }
    } catch (error) {
      logger.error('[RecipeCostOptimizer] Error batch fetching ingredient costs', {
        count: ingredientNames.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  /**
   * Clear cost cache
   */
  clearCache(): void {
    this.costCache.clear();
    logger.info('[RecipeCostOptimizer] Cost cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    for (const value of this.costCache.values()) {
      if (value.last_updated + this.CACHE_TTL > now) {
        validEntries++;
      }
    }
    return {
      size: this.costCache.size,
      validEntries,
    };
  }
}

// Export singleton instance
export const recipeCostOptimizer = new RecipeCostOptimizer();
