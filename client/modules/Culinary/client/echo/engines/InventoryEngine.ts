export interface InventoryItemSnapshot {
  itemId: string;
  name: string;
  onHandQty: number;
  parLevel: number;
  reorderMultiple?: number;
  leadTimeDays: number;
  avgDailyUsage: number;
}

export interface ReorderRecommendation {
  itemId: string;
  name: string;
  recommendedOrderQty: number;
  reason: string;
}

export class InventoryEngine {
  static recommendReorders(
    items: InventoryItemSnapshot[],
    safetyDays: number = 2,
  ): ReorderRecommendation[] {
    const recs: ReorderRecommendation[] = [];

    for (const item of items) {
      const daysCover =
        item.avgDailyUsage > 0 ? item.onHandQty / item.avgDailyUsage : Infinity;
      const targetDays = (item.leadTimeDays || 0) + safetyDays;

      if (daysCover < targetDays) {
        const targetQty = (item.leadTimeDays + safetyDays) * item.avgDailyUsage;
        let orderQty = Math.max(0, targetQty - item.onHandQty);
        if (item.reorderMultiple && item.reorderMultiple > 0) {
          const mult = item.reorderMultiple;
          orderQty = Math.ceil(orderQty / mult) * mult;
        }

        recs.push({
          itemId: item.itemId,
          name: item.name,
          recommendedOrderQty: Math.round(orderQty),
          reason: `Coverage (${daysCover.toFixed(
            1,
          )} days) below target of ~${targetDays} days.`,
        });
      }
    }

    return recs;
  }
}
