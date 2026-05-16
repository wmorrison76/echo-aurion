import type { ScheduleInput, ScheduleDraft, ForecastTier } from '@data/models';

export const OptimizationSolver = {
  solve(input: ScheduleInput, tier: ForecastTier): ScheduleDraft {
    return {
      shifts: [],
      tierUsed: tier.id
    };
  }
};
