/**
 * ProductionPlanner
 * Uses par levels, outlet orders, and cook abilities to allocate prep workload.
 */
import type { ProductionOrder, ProductionPlan } from '@data/productionModels';

export const ProductionPlanner = {
  plan(orders: ProductionOrder[]): ProductionPlan {
    const plan: ProductionPlan = { totalHours: 0, requiredSkills: [] };

    for (const order of orders) {
      // Estimate time based on complexity and volume
      const itemHours = order.quantity * (order.complexityFactor || 0.1);
      plan.totalHours += itemHours;
      plan.requiredSkills.push(...order.requiredSkills);
    }

    return plan;
  }
};
