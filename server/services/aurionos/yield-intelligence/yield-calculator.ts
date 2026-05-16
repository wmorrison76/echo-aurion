/**
 * Yield-Aware Costing
 * Calculates usable yield and cost per unit
 */

import {
  YieldCalculation,
  RecipeCosting,
} from '../../../../shared/types/aurionos';
import { UUID } from '../../../../shared/types/base';

export class YieldCalculator {
  /**
   * Calculate yield for an ingredient
   */
  calculateYield(
    ingredientId: UUID,
    ingredientName: string,
    rawWeight: number,
    rawUnit: string,
    rawCost: number,
    trimLossPct: number,
    cookingLossPct: number
  ): YieldCalculation {
    const totalLoss = trimLossPct + cookingLossPct;
    const yieldPct = 100 - totalLoss;
    const usableWeight = rawWeight * (yieldPct / 100);
    const costPerUsableUnit = rawWeight > 0 ? rawCost / usableWeight : 0;
    
    return {
      ingredientId,
      ingredientName,
      rawWeight,
      rawUnit,
      rawCost,
      trimLoss: trimLossPct,
      cookingLoss: cookingLossPct,
      usableWeight,
      usableUnit: rawUnit,
      costPerUsableUnit,
      yieldPercentage: yieldPct,
      calculatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Calculate recipe costing with yield-aware ingredient costs
   */
  calculateRecipeCosting(
    recipeId: UUID,
    recipeName: string,
    ingredients: Array<{
      ingredientId: UUID;
      ingredientName: string;
      quantityNeeded: number;
      unit: string;
      rawCost: number;
      trimLossPct: number;
      cookingLossPct: number;
    }>,
    portionSize: number
  ): RecipeCosting {
    const ingredientCosts = ingredients.map(ing => {
      const yieldCalc = this.calculateYield(
        ing.ingredientId,
        ing.ingredientName,
        ing.quantityNeeded,
        ing.unit,
        ing.rawCost,
        ing.trimLossPct,
        ing.cookingLossPct
      );
      return {
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredientName,
        quantityNeeded: ing.quantityNeeded,
        unit: ing.unit,
        yieldAwareCost: yieldCalc.costPerUsableUnit * ing.quantityNeeded
      };
    });
    
    const totalCost = ingredientCosts.reduce((sum, ing) => sum + ing.yieldAwareCost, 0);
    const portionCost = portionSize > 0 ? totalCost / portionSize : 0;
    
    return {
      recipeId,
      recipeName,
      ingredients: ingredientCosts,
      totalCost,
      portionCost,
      portionSize,
      calculatedAt: new Date().toISOString()
    };
  }
}

export const yieldCalculator = new YieldCalculator();
