/**
 * Genesis H — PAR Forecast Engine
 * Projects demand, calculates ending inventory, and recommends production actions.
 * v1: Deterministic logic (no ML/AI); extensible for Echo AI integration later.
 */

import type { ParProjection, StandingParRule } from "@/../shared/types/par";
import { getInventoryState } from "@/lib/inventory-store";

/**
 * Apply day-of-week modifier to base PAR if defined.
 * Returns the effective PAR for a given rule and optional date.
 */
function getEffectiveParQty(rule: StandingParRule, date?: Date): number {
  let parQty = rule.baseParQty;

  if (date && rule.dayOfWeekModifiers) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = dayNames[date.getDay()] as
      | "Sun"
      | "Mon"
      | "Tue"
      | "Wed"
      | "Thu"
      | "Fri"
      | "Sat";

    const modifier = rule.dayOfWeekModifiers[dayName];
    if (modifier !== undefined) {
      parQty = rule.baseParQty * modifier;
    }
  }

  return parQty;
}

/**
 * Main forecasting function.
 * Accepts a location, list of PAR rules, and upcoming demand.
 * Returns projections with recommended actions.
 */
export function forecastPars(args: {
  locationId: string;
  rules: StandingParRule[];
  upcomingDemand: Record<string, number>; // ingredientName -> qty needed over horizon
  forecastDate?: Date; // For day-of-week modifiers (defaults to today)
}): ParProjection[] {
  const { locationId, rules, upcomingDemand, forecastDate = new Date() } = args;

  const inventory = getInventoryState(locationId);

  return rules.map((rule) => {
    // Look up current inventory for this ingredient
    const inv = inventory.find(
      (i) => i.ingredientName === rule.ingredientName && i.unit === rule.unit,
    );

    const currentOnHand = inv?.onHandQty ?? 0;
    const projectedUsage = upcomingDemand[rule.ingredientName] ?? 0;
    const projectedEnding = currentOnHand - projectedUsage;

    // Get effective PAR (with day-of-week adjustments)
    const targetPar = getEffectiveParQty(rule, forecastDate);

    // Determine action and explanation
    let action: ParProjection["action"] = "OK";
    let explanation = "Inventory projected within normal range.";

    // Check if falling below PAR
    if (projectedEnding < targetPar && rule.allowAutoIncrease) {
      action = "PRODUCE_EARLY";
      const shortfall = targetPar - projectedEnding;
      explanation =
        `Projected inventory (${projectedEnding}) will fall ${shortfall} units below PAR (${targetPar}). ` +
        `Recommend starting production early to maintain readiness. ` +
        `Lead time: ${rule.leadTimeDays} days.`;
    } else if (projectedEnding < targetPar && !rule.allowAutoIncrease) {
      // Would fall below PAR but auto-increase is locked
      action = "OK";
      explanation = `Projected to fall below PAR, but auto-increase is disabled per chef configuration.`;
    }

    // Check if significantly over PAR
    if (projectedEnding > targetPar * 1.5 && rule.allowAutoDecrease) {
      action = "OVER_PAR_WARNING";
      const excess = projectedEnding - targetPar * 1.5;
      explanation =
        `Projected inventory (${projectedEnding}) significantly exceeds PAR (${targetPar}). ` +
        `Excess: ${excess.toFixed(1)} units. Risk of overproduction and waste.`;
    } else if (projectedEnding > targetPar * 1.5 && !rule.allowAutoDecrease) {
      // Over PAR but auto-decrease is locked
      action = "OK";
      explanation = `Inventory above target, but auto-decrease is disabled per chef configuration.`;
    }

    return {
      ingredientName: rule.ingredientName,
      unit: rule.unit,
      locationId: rule.locationId,
      currentOnHand,
      projectedUsage,
      projectedEnding,
      targetPar,
      leadTimeDays: rule.leadTimeDays,
      action,
      explanation,
    };
  });
}

/**
 * Helper: Calculate projected demand from multiple sources (for future integration).
 * v1: Returns the passed demand object as-is.
 * Later: Will aggregate from BEO/REO forecasts, historical patterns, Echo AI.
 */
export function aggregateDemandForecast(args: {
  baselineDemand: Record<string, number>;
  beoDemand?: Record<string, number>;
  historicalTrend?: number; // 0.8 = 80% of normal, 1.2 = 120% of normal
}): Record<string, number> {
  const { baselineDemand, beoDemand = {}, historicalTrend = 1.0 } = args;

  const combined: Record<string, number> = {};

  // Apply historical trend to baseline
  Object.entries(baselineDemand).forEach(([ingredient, qty]) => {
    combined[ingredient] = (combined[ingredient] ?? 0) + qty * historicalTrend;
  });

  // Add BEO demand
  Object.entries(beoDemand).forEach(([ingredient, qty]) => {
    combined[ingredient] = (combined[ingredient] ?? 0) + qty;
  });

  return combined;
}

/**
 * Evaluate overall location health based on all projections.
 * Returns summary with counts and risk level.
 */
export function evaluateLocationHealth(projections: ParProjection[]): {
  totalRules: number;
  healthy: number;
  earlyProduction: number;
  overProduction: number;
  riskLevel: "green" | "yellow" | "red";
} {
  const healthy = projections.filter((p) => p.action === "OK").length;
  const earlyProduction = projections.filter(
    (p) => p.action === "PRODUCE_EARLY",
  ).length;
  const overProduction = projections.filter(
    (p) => p.action === "OVER_PAR_WARNING",
  ).length;

  let riskLevel: "green" | "yellow" | "red" = "green";
  if (earlyProduction > 0 || overProduction > 0) {
    riskLevel = "yellow";
  }
  if (earlyProduction > projections.length * 0.3) {
    riskLevel = "red";
  }

  return {
    totalRules: projections.length,
    healthy,
    earlyProduction,
    overProduction,
    riskLevel,
  };
}
