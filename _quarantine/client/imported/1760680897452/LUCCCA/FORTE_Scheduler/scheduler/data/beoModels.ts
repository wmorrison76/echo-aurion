import { z } from 'zod';

export const BEOInputSchema = z.object({
  id: z.string(),
  guestCount: z.number().int(),
  menuComplexity: z.enum(['low', 'medium', 'high']),
  breaks: z.array(z.string()).optional(),
  mealTypes: z.array(z.string()).optional()
});
export type BEOInput = z.infer<typeof BEOInputSchema>;

export interface BEOForecast {
  totalGuests: number;
  estimatedPrepHours: number;
  notes?: string;
}
