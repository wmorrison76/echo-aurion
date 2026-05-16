export interface RecipeCostLine {
  name: string;
  quantity: number;
  unitCost: number;
  yieldPercent?: number;
}

export interface RecipeCostSummary {
  totalCost: number;
  costPerPortion: number;
  suggestedPriceLow: number;
  suggestedPriceHigh: number;
  foodCostPercentAtSuggestedPriceLow: number;
  foodCostPercentAtSuggestedPriceHigh: number;
}

export interface PnLSnapshot {
  foodRevenue: number;
  beverageRevenue: number;
  laborCost: number;
  foodCost: number;
  beverageCost: number;
  otherExpenses: number;
}

export interface PnLAnalysis {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  primeCostPercent: number;
  foodCostPercent: number;
  beverageCostPercent: number;
  laborPercent: number;
  notes: string[];
}

export class FinanceEngine {
  static calculateRecipeCost(
    lines: RecipeCostLine[],
    portions: number,
    targetFoodCostPercentRange: [number, number] = [0.25, 0.35],
  ): RecipeCostSummary {
    let totalCost = 0;
    for (const line of lines) {
      const effectiveQty =
        line.yieldPercent && line.yieldPercent > 0
          ? line.quantity / (line.yieldPercent / 100)
          : line.quantity;
      totalCost += effectiveQty * line.unitCost;
    }

    const costPerPortion = portions ? totalCost / portions : totalCost;
    const [low, high] = targetFoodCostPercentRange;
    const suggestedPriceLow = costPerPortion / high;
    const suggestedPriceHigh = costPerPortion / low;

    return {
      totalCost,
      costPerPortion,
      suggestedPriceLow,
      suggestedPriceHigh,
      foodCostPercentAtSuggestedPriceLow:
        totalCost / (suggestedPriceLow * portions || 1),
      foodCostPercentAtSuggestedPriceHigh:
        totalCost / (suggestedPriceHigh * portions || 1),
    };
  }

  static analyzePnL(pnl: PnLSnapshot): PnLAnalysis {
    const totalRevenue = pnl.foodRevenue + pnl.beverageRevenue;
    const foodCostPercent = totalRevenue ? pnl.foodCost / pnl.foodRevenue : 0;
    const beverageCostPercent = totalRevenue
      ? pnl.beverageCost / pnl.beverageRevenue
      : 0;
    const totalCost =
      pnl.laborCost + pnl.foodCost + pnl.beverageCost + pnl.otherExpenses;
    const profit = totalRevenue - totalCost;
    const laborPercent = totalRevenue ? pnl.laborCost / totalRevenue : 0;
    const primeCostPercent = totalRevenue
      ? (pnl.laborCost + pnl.foodCost + pnl.beverageCost) / totalRevenue
      : 0;

    const notes: string[] = [];

    if (primeCostPercent > 0.65) {
      notes.push(
        "Prime cost is high; investigate labor and food/bev efficiency.",
      );
    }

    if (laborPercent > 0.35) {
      notes.push(
        "Labor percent appears elevated; consider schedule optimization.",
      );
    }

    if (foodCostPercent > 0.35) {
      notes.push("Food cost over 35%; review menu pricing and waste.");
    }

    return {
      totalRevenue,
      totalCost,
      profit,
      primeCostPercent,
      foodCostPercent,
      beverageCostPercent,
      laborPercent,
      notes,
    };
  }
}
