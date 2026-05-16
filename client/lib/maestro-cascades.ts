/**
 * Maestro Cascade Logic
 *
 * When a change is made to an event, this module determines what other systems
 * need to be automatically updated (recipes scaled, inventory recalculated, labor adjusted).
 *
 * Example cascade:
 * Guest Count +50 → Production recipes scaled → Inventory deltas recalculated → Labor hours adjusted
 */

import type { Event, ChangelogEntry } from "@shared/types/maestro";

export interface CascadeEffect {
  system: string; // "production", "inventory", "labor", "budget"
  action: string; // "scale_recipes", "recalculate_deltas", "adjust_hours"
  description: string;
  estimatedImpact: Record<string, any>;
  requiresApproval: boolean;
}

/**
 * Determine cascade effects for a specific change
 */
export function calculateCascadeEffects(
  change: Partial<ChangelogEntry>,
  currentEvent: Event,
): CascadeEffect[] {
  const effects: CascadeEffect[] = [];

  // GUEST COUNT CHANGE: Cascade to production → inventory → labor
  if (change.field === "guestCount" && change.newValue && change.oldValue) {
    const scaleFactor = change.newValue / change.oldValue;

    effects.push({
      system: "production",
      action: "scale_recipes",
      description: `Scale all recipes by ${(scaleFactor * 100).toFixed(0)}% (${change.oldValue} → ${change.newValue} guests)`,
      estimatedImpact: {
        recipesAffected: currentEvent.recipes?.length || 0,
        prepTimeMultiplier: scaleFactor,
      },
      requiresApproval: scaleFactor > 1.5 || scaleFactor < 0.5, // Big changes need approval
    });

    effects.push({
      system: "inventory",
      action: "recalculate_deltas",
      description: `Recalculate ingredient quantities (${(scaleFactor * 100).toFixed(0)}% scaling)`,
      estimatedImpact: {
        itemsAffected: currentEvent.inventoryImpact?.length || 0,
        costMultiplier: scaleFactor,
      },
      requiresApproval: scaleFactor > 1.3,
    });

    effects.push({
      system: "labor",
      action: "adjust_hours",
      description: `Adjust labor hours based on production scaling`,
      estimatedImpact: {
        stationsAffected: currentEvent.productionBreakdown?.length || 0,
        hourMultiplier: scaleFactor,
      },
      requiresApproval: false,
    });
  }

  // MENU CHANGE: Cascade to production → inventory → labor → budget
  if (change.field === "menuItems" || change.field === "recipes") {
    effects.push({
      system: "production",
      action: "rebuild_breakdown",
      description: "Rebuild production breakdown based on new menu",
      estimatedImpact: {
        recalculateBottlenecks: true,
      },
      requiresApproval: true,
    });

    effects.push({
      system: "inventory",
      action: "recalculate_deltas",
      description: "Recalculate all ingredient requirements",
      estimatedImpact: {
        itemsAffected: "all",
      },
      requiresApproval: true,
    });

    effects.push({
      system: "budget",
      action: "recalculate_cogs",
      description: "Recalculate food cost based on new recipes",
      estimatedImpact: {
        costChange: "unknown",
      },
      requiresApproval: true,
    });
  }

  // PREP START DATE CHANGE: Adjust timeline and labor distribution
  if (change.field === "prepStartDate") {
    effects.push({
      system: "labor",
      action: "redistribute_hours",
      description: "Redistribute labor hours across prep period",
      estimatedImpact: {
        affectsConcurrency: true,
      },
      requiresApproval: false,
    });

    effects.push({
      system: "production",
      action: "adjust_timeline",
      description: "Adjust production timeline and bottleneck analysis",
      estimatedImpact: {
        affectsCriticalPath: true,
      },
      requiresApproval: false,
    });
  }

  // SERVICE TIME CHANGE: Affects final prep and plating workload
  if (change.field === "serviceStartTime") {
    effects.push({
      system: "production",
      action: "adjust_plating_windows",
      description: "Adjust plating and final prep timing",
      estimatedImpact: {
        affectsPlatingStations: true,
      },
      requiresApproval: false,
    });

    effects.push({
      system: "labor",
      action: "adjust_release_times",
      description: "Adjust staff release times based on new service time",
      estimatedImpact: {
        affectsStaffing: true,
      },
      requiresApproval: false,
    });
  }

  // GUARANTEED GUESTS CHANGE: Affects minimum inventory needed
  if (change.field === "guaranteedGuests") {
    effects.push({
      system: "inventory",
      action: "update_safety_stock",
      description: "Update minimum inventory safety stock levels",
      estimatedImpact: {
        safetyStockChange: `Based on ${change.newValue} guaranteed guests`,
      },
      requiresApproval: false,
    });
  }

  return effects;
}

/**
 * Determine which systems are affected by a change
 */
export function getAffectedSystems(
  field: string,
): ("production" | "inventory" | "labor" | "budget")[] {
  const mapping: Record<
    string,
    ("production" | "inventory" | "labor" | "budget")[]
  > = {
    guestCount: ["production", "inventory", "labor", "budget"],
    guaranteedGuests: ["inventory"],
    recipes: ["production", "inventory", "labor", "budget"],
    menuItems: ["production", "inventory", "labor", "budget"],
    prepStartDate: ["production", "labor"],
    setupStartTime: ["production", "labor"],
    serviceStartTime: ["production", "labor"],
    cleanupEndTime: ["labor"],
    venueName: ["production"],
    clientName: [],
    clientEmail: [],
    description: [],
  };

  return mapping[field] || [];
}

/**
 * Determine if a change requires approval before applying
 *
 * High-impact changes require approval from EC (Executive Chef) or Admin
 */
export function requiresApproval(
  field: string,
  oldValue: any,
  newValue: any,
): boolean {
  // Always require approval for menu/recipe changes
  if (field === "recipes" || field === "menuItems") {
    return true;
  }

  // Require approval for significant guest count changes (±25%)
  if (field === "guestCount") {
    const change = Math.abs((newValue - oldValue) / oldValue);
    return change > 0.25;
  }

  // Require approval for significant date changes (less than 3 days before)
  if (field === "prepStartDate" || field === "setupStartTime") {
    const oldDate = new Date(oldValue).getTime();
    const newDate = new Date(newValue).getTime();
    const daysUntilEvent = 3 * 24 * 60 * 60 * 1000;
    return Math.abs(oldDate - newDate) > daysUntilEvent;
  }

  return false;
}

/**
 * Priority order for executing cascading auto-actions
 * (dependencies: recipes must be scaled before inventory can be calculated)
 */
export function getExecutionOrder(effects: CascadeEffect[]): CascadeEffect[] {
  const order = ["production", "inventory", "labor", "budget"];
  return effects.sort(
    (a, b) => order.indexOf(a.system) - order.indexOf(b.system),
  );
}

/**
 * Generate readable description of cascade effects
 */
export function describeCascades(effects: CascadeEffect[]): string {
  if (effects.length === 0) {
    return "No cascading updates needed.";
  }

  const grouped = effects.reduce(
    (acc, effect) => {
      if (!acc[effect.system]) {
        acc[effect.system] = [];
      }
      acc[effect.system].push(effect.description);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const descriptions = Object.entries(grouped)
    .map(([system, items]) => `${system}: ${items.join("; ")}`)
    .join("\n");

  return `This change will trigger the following cascading updates:\n\n${descriptions}`;
}
