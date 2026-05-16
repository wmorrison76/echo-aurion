/**
 * REOPlanner
 * Converts Restaurant Event Orders (REOs) into structured workload tasks.
 */
import { REOInput } from '@data/reoModels';

export const REOPlanner = {
  plan(reos: REOInput[]) {
    // TODO: Add REO-based workload planning logic
    return { totalGuests: reos.reduce((a,r)=>a+r.guestCount,0) };
  }
};
