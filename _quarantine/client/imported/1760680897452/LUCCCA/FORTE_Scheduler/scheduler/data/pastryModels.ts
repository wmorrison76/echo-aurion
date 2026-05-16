import { z } from 'zod';

export const PastryItemSpecSchema = z.object({
  id: z.string(),
  name: z.string(),
  yieldPerBatch: z.number(),
  basePrepMinutes: z.number(),
  passiveWaitMinutes: z.number().optional(),
  stages: z.array(z.object({
    key: z.string(),
    activeMinutes: z.number(),
    passiveMinutes: z.number().optional(),
    skillTags: z.array(z.string())
  })).optional(),
  shelfLifeDays: z.number().optional(),
  leadTimeDaysMin: z.number().default(14),
  canFreeze: z.boolean().default(true),
  storage: z.enum(['ambient','refrigerated','frozen']).default('frozen')
});
export type PastryItemSpec = z.infer<typeof PastryItemSpecSchema>;

export const PastryDemandSchema = z.object({
  dateNeeded: z.string(),
  outletId: z.string(),
  qty: z.number().int(),
  itemSpecId: z.string(),
  linkedBEOId: z.string().optional()
});
export type PastryDemand = z.infer<typeof PastryDemandSchema>;

export interface PastryPlan {
  batches: Array<{
    itemSpecId: string;
    plannedDate: string;
    qty: number;
    laborMinutesActive: number;
    laborMinutesPassive: number;
    stageBreakdown: Array<{
      stage: string;
      active: number;
      passive?: number;
      skillTags: string[];
    }>;
    assignedTo?: string[];
  }>;
  totalActiveMinutes: number;
  totalPassiveMinutes: number;
}
