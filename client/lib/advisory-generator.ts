import type { AdvisoryMessage } from "@/../shared/types/advisory";

/**
 * Generates deterministic advisory messages based on operational deltas.
 * Uses rule-based logic to avoid LLM hallucinations.
 * All recommendations and severity are derived from thresholds.
 */
export function generateAdvisory({
  beoId,
  revision,
  foodCostDelta,
  laborStaffDelta,
  laborHoursDelta,
}: {
  beoId: string;
  revision: number;
  foodCostDelta: number;
  laborStaffDelta: number;
  laborHoursDelta: number;
}): AdvisoryMessage {
  const recommendations: string[] = [];

  // Food cost recommendations
  if (foodCostDelta > 250) {
    recommendations.push(
      "Review vendor selections or adjust menu portions to offset food cost increase.",
    );
  }

  if (foodCostDelta > 0 && foodCostDelta <= 250) {
    recommendations.push("Monitor food cost trajectory for this event.");
  }

  if (foodCostDelta < 0) {
    recommendations.push(
      "Food cost savings achieved. Consider documenting this vendor selection.",
    );
  }

  // Labor staffing recommendations
  if (laborStaffDelta > 1) {
    recommendations.push(
      `Add ${laborStaffDelta} staff member(s) to avoid service strain.`,
    );
  } else if (laborStaffDelta === 1) {
    recommendations.push("Add 1 staff member to meet production requirements.");
  }

  if (laborStaffDelta < -1) {
    recommendations.push(
      `You may be overstaffed by ${Math.abs(laborStaffDelta)}. Consider reallocating labor.`,
    );
  } else if (laborStaffDelta === -1) {
    recommendations.push(
      "Consider if you can reallocate or reduce labor by 1 staff member.",
    );
  }

  // Severity determination (rule-based)
  let severity: "info" | "warning" | "critical" = "info";

  if (foodCostDelta > 500 || laborStaffDelta > 2) {
    severity = "critical";
  } else if (foodCostDelta > 250 || laborStaffDelta > 0) {
    severity = "warning";
  }

  return {
    advisoryId: `${beoId}:rev:${revision}`,
    beoId,
    revision,

    title: `Revision ${revision} Impact Summary`,
    summary: `This revision introduces operational changes that affect cost and staffing.`,

    impacts: {
      foodCostDelta,
      laborStaffDelta,
      laborHoursDelta,
    },

    recommendations,
    severity,

    generatedAt: new Date().toISOString(),
  };
}
