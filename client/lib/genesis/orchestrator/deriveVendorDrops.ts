/**
 * Derive Vendor Drops
 * Groups demand items into vendor delivery windows respecting cutoff times and lead times
 */

import type { Vendor } from "@/../shared/types/genesis-procurement";
import type {
  DemandItem,
  SupplyOption,
} from "@/../shared/types/genesis-orchestrator";
import {
  nextOccurrenceOfDay,
  calculateOrderDateISO,
  calculateCutoffISO,
  isCutoffPassed,
  toISO,
} from "@/lib/dateUtils";

export interface VendorDropAssignment {
  vendorId: string;
  vendorName: string;
  deliveryDateISO: string;
  orderByDateISO: string;
  cutoffISO: string;
  demandIds: string[]; // demands assigned to this drop
  estimatedCost: number;
  notes: string;
}

/**
 * Calculate the next vendor delivery date
 */
function nextVendorDeliveryDate(vendor: Vendor, startFromISO?: string): string {
  if (vendor.deliveryDays.length === 0) {
    throw new Error(`Vendor ${vendor.name} has no delivery days configured`);
  }

  // Find the next occurrence of any delivery day
  let earliestDate = new Date("2099-12-31");

  for (const dayName of vendor.deliveryDays) {
    const nextDate = new Date(nextOccurrenceOfDay(dayName, startFromISO));
    if (nextDate < earliestDate) {
      earliestDate = nextDate;
    }
  }

  return toISO(earliestDate);
}

/**
 * Assign demands to vendor drops
 * Each vendor drop respects:
 * - vendor delivery days
 * - lead time (days before delivery to order)
 * - cutoff time (time of day by which order must be placed)
 */
export function assignDemandsToVendorDrops(
  demands: DemandItem[],
  vendors: Vendor[],
): VendorDropAssignment[] {
  const drops: VendorDropAssignment[] = [];

  for (const vendor of vendors) {
    // Calculate next delivery date for this vendor
    const deliveryDateISO = nextVendorDeliveryDate(vendor);

    // Calculate when order must be placed
    const orderByDateISO = calculateOrderDateISO(
      deliveryDateISO,
      vendor.leadTimeDays,
    );

    // Calculate cutoff time on the order-by date
    const cutoffISO = calculateCutoffISO(
      orderByDateISO,
      vendor.cutoffTimeUTC || "14:00",
    );

    // Check if cutoff has already passed
    const cutoffPassed = isCutoffPassed(cutoffISO);

    // Find demands that can be fulfilled by this vendor
    const assignedDemands: DemandItem[] = [];
    const assignedDemandIds: string[] = [];

    for (const demand of demands) {
      // Simple matching: assume vendor can fulfill if not already assigned
      // In a real system, you'd check vendor capabilities, item availability, etc.
      const dueDate = new Date(demand.dueAt);
      const deliveryDate = new Date(deliveryDateISO);

      // Assign if delivery is on or before due date, and not yet assigned
      if (
        deliveryDate <= dueDate &&
        !drops.some((d) => d.demandIds.includes(demand.demandId))
      ) {
        assignedDemandIds.push(demand.demandId);
        assignedDemands.push(demand);
      }
    }

    if (assignedDemandIds.length > 0) {
      const estimatedCost = assignedDemands.reduce(
        (sum, d) => sum + (d.quantity || 0) * 50, // Placeholder cost estimation
        0,
      );

      drops.push({
        vendorId: vendor.vendorId,
        vendorName: vendor.name,
        deliveryDateISO,
        orderByDateISO,
        cutoffISO,
        demandIds: assignedDemandIds,
        estimatedCost,
        notes: cutoffPassed
          ? "⚠️ Cutoff has passed; this drop may not be fulfillable"
          : "",
      });
    }
  }

  return drops;
}

/**
 * Check if a demand can be fulfilled by a specific vendor delivery date
 */
export function canFulfillByDate(
  demandDueDate: string,
  deliveryDate: string,
): boolean {
  return new Date(deliveryDate) <= new Date(demandDueDate);
}

/**
 * Consolidate multiple vendors into a single order if beneficial
 */
export function consolidateVendorDrops(
  drops: VendorDropAssignment[],
  minConsolidationValue: number = 500,
): VendorDropAssignment[] {
  // Simple consolidation: group drops by delivery date if within threshold
  const consolidated: Map<string, VendorDropAssignment> = new Map();

  drops.forEach((drop) => {
    const key = drop.deliveryDateISO;

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.demandIds.push(...drop.demandIds);
      existing.estimatedCost += drop.estimatedCost;
      existing.vendorName += ` + ${drop.vendorName}`;
    } else {
      consolidated.set(key, { ...drop });
    }
  });

  return Array.from(consolidated.values());
}

/**
 * Get the cost impact of consolidation
 */
export function getConsolidationSavings(
  originalCost: number,
  consolidatedCost: number,
): number {
  return originalCost - consolidatedCost;
}
