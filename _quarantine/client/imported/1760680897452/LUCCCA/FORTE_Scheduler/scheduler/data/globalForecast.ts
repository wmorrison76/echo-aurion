import { z } from 'zod';
import { BEOInputSchema } from './beoModels';
import { PastryDemandSchema } from './pastryModels';
import { ProductionOrderSchema } from './productionModels';

export const GlobalForecastInputSchema = z.object({
  beos: z.array(BEOInputSchema).default([]),
  pastryDemands: z.array(PastryDemandSchema).default([]),
  productionOrders: z.array(ProductionOrderSchema).default([])
});
export type GlobalForecastInput = z.infer<typeof GlobalForecastInputSchema>;

export interface UnifiedWorkload {
  // Normalized structure the scheduler can reason on
  byDate: Record<string, {
    // ISO date
    hoursActive: number;
    hoursPassive?: number;
    rolesRequired?: Record<string, number>; // e.g., 'pastry_decorator':2
  }>;
}
