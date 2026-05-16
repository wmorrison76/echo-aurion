import { PastryItemSpec, PastryDemand, PastryPlan } from '@data/pastryModels';

/**
 * PastryForecastEngine
 * Plans pastry production batches and time allocation.
 */
export const PastryForecastEngine = {
  plan(demands: PastryDemand[], specs: PastryItemSpec[]): PastryPlan {
    const batches = [];
    let totalActive = 0;
    let totalPassive = 0;
    for (const demand of demands) {
      const spec = specs.find(s => s.id === demand.itemSpecId);
      if (!spec) continue;
      const batchesNeeded = Math.ceil(demand.qty / spec.yieldPerBatch);
      const stageBreakdown = (spec.stages || []).map(stage => ({
        stage: stage.key,
        active: stage.activeMinutes * batchesNeeded,
        passive: (stage.passiveMinutes || 0) * batchesNeeded,
        skillTags: stage.skillTags
      }));
      const activeSum = stageBreakdown.reduce((a, b) => a + b.active, 0);
      const passiveSum = stageBreakdown.reduce((a, b) => a + (b.passive || 0), 0);
      totalActive += activeSum;
      totalPassive += passiveSum;
      batches.push({
        itemSpecId: spec.id,
        plannedDate: demand.dateNeeded,
        qty: demand.qty,
        laborMinutesActive: activeSum,
        laborMinutesPassive: passiveSum,
        stageBreakdown
      });
    }
    return { batches, totalActiveMinutes: totalActive, totalPassiveMinutes: totalPassive };
  }
};
