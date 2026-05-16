import { z } from 'zod';

export const ProductionOrderSchema = z.object({
  item: z.string(),
  quantity: z.number(),
  complexityFactor: z.number().optional(),
  requiredSkills: z.array(z.string())
});
export type ProductionOrder = z.infer<typeof ProductionOrderSchema>;

export interface ProductionPlan {
  totalHours: number;
  requiredSkills: string[];
}
