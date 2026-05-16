import { z } from 'zod';

export const REOInputSchema = z.object({
  id: z.string(),
  guestCount: z.number().int(),
  menuComplexity: z.enum(['low','medium','high']),
  outletId: z.string(),
  date: z.string()
});
export type REOInput = z.infer<typeof REOInputSchema>;
