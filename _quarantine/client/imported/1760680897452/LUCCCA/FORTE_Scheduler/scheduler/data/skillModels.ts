import { z } from 'zod';

export const SkillProfileSchema = z.object({
  employeeId: z.string(),
  skillRatings: z.record(z.string(), z.number().min(0).max(5)) // tag -> 0..5 rating
});
export type SkillProfile = z.infer<typeof SkillProfileSchema>;
