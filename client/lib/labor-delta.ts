import type { LaborRequirement, LaborDelta } from "@/../shared/types/labor";

/**
 * Compute labor deltas from requirements and scheduled staff
 * delta = required - scheduled
 * + means understaffed, - means overstaffed
 */
export function computeLaborDeltas(
  requirements: LaborRequirement[],
  scheduled: Record<string, number> = {},
): LaborDelta[] {
  return requirements.map((req) => {
    const scheduledCount = scheduled[req.station] ?? 0;
    const delta = req.requiredStaff - scheduledCount;

    return {
      station: req.station,
      required: req.requiredStaff,
      scheduled: scheduledCount,
      delta,
    };
  });
}
