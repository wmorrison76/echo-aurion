/**
 * Production Yield Tracker
 *
 * Tracks actual yields during production execution
 * Integrates with:
 * - BEO Execution module (banquet yields)
 * - Kitchen display system (à la carte yields)
 * - Pastry production tracking
 */

import {
  yieldComparisonService,
  type ActualYield,
} from "./yield-comparison-service";

export interface ProductionYieldRecord {
  id: string;
  recipeId: string;
  recipeName: string;
  batchId?: string;
  beoId?: string;
  outletId: string;
  outletName: string;
  date: string;
  shift?: string;
  recordedBy: string;
  ingredients: Array<{
    ingredientId: string;
    ingredientName: string;
    inputQuantity: number;
    inputUnit: string;
    actualOutput: number;
    outputUnit: string;
    actualYield: number; // percentage
    prepMethod?: string;
    notes?: string;
  }>;
  totalBatchSize?: number;
  totalOutput?: number;
  waste?: number;
  wasteReason?: string;
  equipmentUsed?: string[];
  staffMembers?: string[];
}

class ProductionYieldTracker {
  private records: Map<string, ProductionYieldRecord> = new Map();

  /**
   * Record production yield from BEO execution
   */
  async recordFromBEO(record: ProductionYieldRecord): Promise<void> {
    console.log(
      `[YieldTracker] Recording BEO yield: ${record.recipeName} (${record.beoId})`,
    );

    // Store record
    this.records.set(record.id, record);

    // Record individual ingredient yields
    for (const ingredient of record.ingredients) {
      const actual: ActualYield = {
        recipeId: record.recipeId,
        recipeName: record.recipeName,
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.ingredientName,
        actualYield: ingredient.actualYield,
        actualOutput: ingredient.actualOutput,
        inputQuantity: ingredient.inputQuantity,
        inputUnit: ingredient.inputUnit,
        prepMethod: ingredient.prepMethod,
        batchSize: record.totalBatchSize,
        date: record.date,
        recordedBy: record.recordedBy,
        notes: ingredient.notes,
      };

      yieldComparisonService.recordActual(actual);
    }

    // Dispatch event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("production-yield-recorded", {
          detail: record,
        }),
      );
    }
  }

  /**
   * Record production yield from kitchen display system
   */
  async recordFromKDS(record: ProductionYieldRecord): Promise<void> {
    console.log(`[YieldTracker] Recording KDS yield: ${record.recipeName}`);

    this.records.set(record.id, record);

    for (const ingredient of record.ingredients) {
      const actual: ActualYield = {
        recipeId: record.recipeId,
        recipeName: record.recipeName,
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.ingredientName,
        actualYield: ingredient.actualYield,
        actualOutput: ingredient.actualOutput,
        inputQuantity: ingredient.inputQuantity,
        inputUnit: ingredient.inputUnit,
        prepMethod: ingredient.prepMethod,
        date: record.date,
        recordedBy: record.recordedBy,
        notes: ingredient.notes,
      };

      yieldComparisonService.recordActual(actual);
    }
  }

  /**
   * Record production yield from pastry production
   */
  async recordFromPastry(record: ProductionYieldRecord): Promise<void> {
    console.log(`[YieldTracker] Recording pastry yield: ${record.recipeName}`);

    this.records.set(record.id, record);

    for (const ingredient of record.ingredients) {
      const actual: ActualYield = {
        recipeId: record.recipeId,
        recipeName: record.recipeName,
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.ingredientName,
        actualYield: ingredient.actualYield,
        actualOutput: ingredient.actualOutput,
        inputQuantity: ingredient.inputQuantity,
        inputUnit: ingredient.inputUnit,
        prepMethod: ingredient.prepMethod,
        date: record.date,
        recordedBy: record.recordedBy,
        notes: ingredient.notes,
      };

      yieldComparisonService.recordActual(actual);
    }
  }

  /**
   * Get yield records for a recipe
   */
  getRecordsForRecipe(recipeId: string, limit = 50): ProductionYieldRecord[] {
    const records: ProductionYieldRecord[] = [];

    for (const record of this.records.values()) {
      if (record.recipeId === recipeId) {
        records.push(record);
      }
    }

    return records
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /**
   * Get yield records for a BEO
   */
  getRecordsForBEO(beoId: string): ProductionYieldRecord[] {
    const records: ProductionYieldRecord[] = [];

    for (const record of this.records.values()) {
      if (record.beoId === beoId) {
        records.push(record);
      }
    }

    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  /**
   * Get yield records for an outlet
   */
  getRecordsForOutlet(
    outletId: string,
    startDate?: string,
    endDate?: string,
  ): ProductionYieldRecord[] {
    const records: ProductionYieldRecord[] = [];

    for (const record of this.records.values()) {
      if (record.outletId === outletId) {
        if (startDate && record.date < startDate) continue;
        if (endDate && record.date > endDate) continue;
        records.push(record);
      }
    }

    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  /**
   * Calculate average yield for a recipe
   */
  getAverageYield(recipeId: string, ingredientId?: string): number | null {
    const records = this.getRecordsForRecipe(recipeId);

    if (records.length === 0) return null;

    let totalYield = 0;
    let count = 0;

    for (const record of records) {
      for (const ingredient of record.ingredients) {
        if (!ingredientId || ingredient.ingredientId === ingredientId) {
          totalYield += ingredient.actualYield;
          count++;
        }
      }
    }

    return count > 0 ? totalYield / count : null;
  }
}

export const productionYieldTracker = new ProductionYieldTracker();
