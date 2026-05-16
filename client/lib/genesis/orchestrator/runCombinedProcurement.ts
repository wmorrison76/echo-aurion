/**
 * Combined Procurement Orchestrator
 * Merges E (IFO) + F (Vendor Schedule) + G (Inventory Offsets) + H (PARs) + D (Cost Attribution)
 * into a unified procurement plan
 */

import type { GenesisConfig } from "@/../shared/types/genesis-config";
import type {
  DemandItem,
  CombinedProcurementPlan,
} from "@/../shared/types/genesis-orchestrator";
import type {
  ProcurementPlan,
  VendorSchedule,
  InventoryOffsetsSnapshot,
  AurumDraft,
} from "@/../shared/types/genesis-procurement";
import {
  applyInventoryOffsets,
  filterZeroDemands,
} from "./applyInventoryOffsets";
import { assignDemandsToVendorDrops } from "./deriveVendorDrops";
import { createAurumDrafts } from "./createAurumDrafts";
import { toISO } from "@/lib/dateUtils";

export interface OrchestratorInput {
  config: GenesisConfig;
  demands: DemandItem[];
  vendorSchedule: VendorSchedule;
  inventoryOffsets: InventoryOffsetsSnapshot;
}

export interface OrchestratorOutput {
  plan: ProcurementPlan;
  aurumDrafts: AurumDraft[];
  executionTimeMs: number;
}

/**
 * Run the combined procurement orchestrator
 * Main entry point for unified procurement planning
 */
export function runCombinedProcurement(
  input: OrchestratorInput,
): OrchestratorOutput {
  const startTime = performance.now();

  // Step 1: Validate inputs
  if (!input.demands || input.demands.length === 0) {
    return createEmptyPlan(input);
  }

  // Step 2: Apply inventory offsets to reduce demand
  const { adjustedDemands, offsetApplications } = applyInventoryOffsets(
    [...input.demands],
    input.inventoryOffsets,
  );

  // Step 3: Filter out zero demands
  const netDemands = filterZeroDemands(adjustedDemands);

  if (netDemands.length === 0) {
    return createEmptyPlan(input);
  }

  // Step 4: Assign demands to vendor drops
  const vendorDrops = assignDemandsToVendorDrops(
    netDemands,
    input.vendorSchedule.vendors,
  );

  // Step 5: Convert vendor drops to procurement lines
  const procurementLines = vendorDrops.flatMap((drop) => {
    return netDemands
      .filter((d) => drop.demandIds.includes(d.demandId))
      .map((demand) => ({
        lineId: `line_${demand.demandId}_${drop.vendorId}`,
        demandId: demand.demandId,
        locationId: demand.locationId,
        itemKey: demand.itemKey,
        itemName: demand.itemName,
        unit: demand.unit,
        quantity: demand.quantity,
        quantityOffset: demand.quantityOffset,
        costPerUnit: 50, // Placeholder
        totalCost: (demand.quantity || 0) * 50,
        costAttributionMode: "REQUESTING_OUTLET_PAYS" as const,
        sourceType: demand.sourceType,
      }));
  });

  // Step 6: Calculate totals
  const totalLineCount = procurementLines.length;
  const totalValue = procurementLines.reduce(
    (sum, line) => sum + line.totalCost,
    0,
  );
  const vendorCount = vendorDrops.length;

  // Step 7: Create journal drafts
  const aurumDrafts = createAurumDrafts(procurementLines, input.config);

  // Step 8: Generate audit notes
  const auditNotes = [
    ...offsetApplications.map((app) => ({
      noteId: `audit_${app.demandId}`,
      lineId: app.demandId,
      category: "OFFSET_APPLIED" as const,
      message: app.notes,
      timestamp: toISO(new Date()),
    })),
  ];

  // Step 9: Generate idempotency checksum
  const checksum = generateIdempotencyChecksum({
    demandCount: input.demands.length,
    offsetCount: input.inventoryOffsets.offsets.length,
    vendorCount: input.vendorSchedule.vendors.length,
    timestamp: new Date().getTime(),
  });

  // Step 10: Assemble plan
  const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const plan: ProcurementPlan = {
    planId,
    propertyId: input.config.propertyId,
    generatedAt: toISO(new Date()),
    generatedBy: "system",
    totalLineCount,
    totalValue,
    vendorCount,
    vendorDrops: vendorDrops.map((drop) => ({
      ...drop,
      lines: procurementLines.filter((line) =>
        drop.demandIds.includes(line.demandId),
      ),
    })),
    warnings: generateWarnings(netDemands, vendorDrops),
    auditNotes,
    idempotencyChecksum: checksum,
    aurumDrafts,
  };

  const endTime = performance.now();

  return {
    plan,
    aurumDrafts,
    executionTimeMs: endTime - startTime,
  };
}

/**
 * Create an empty plan when no demands exist
 */
function createEmptyPlan(input: OrchestratorInput): OrchestratorOutput {
  const plan: ProcurementPlan = {
    planId: `plan_${Date.now()}_empty`,
    propertyId: input.config.propertyId,
    generatedAt: toISO(new Date()),
    generatedBy: "system",
    totalLineCount: 0,
    totalValue: 0,
    vendorCount: 0,
    vendorDrops: [],
    warnings: [
      {
        warningId: "warn_no_demands",
        severity: "info",
        message: "No procurement demands after offset application",
        affectedLineIds: [],
      },
    ],
    auditNotes: [],
    idempotencyChecksum: "empty_plan",
    aurumDrafts: [],
  };

  return {
    plan,
    aurumDrafts: [],
    executionTimeMs: 0,
  };
}

/**
 * Generate warnings for the plan
 */
function generateWarnings(
  demands: DemandItem[],
  drops: ReturnType<typeof assignDemandsToVendorDrops>,
): Array<{
  warningId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  affectedLineIds: string[];
}> {
  const warnings: Array<{
    warningId: string;
    severity: "info" | "warning" | "critical";
    message: string;
    affectedLineIds: string[];
  }> = [];

  // Check for unassigned demands
  const assignedIds = new Set(drops.flatMap((d) => d.demandIds));
  const unassignedDemands = demands.filter((d) => !assignedIds.has(d.demandId));

  if (unassignedDemands.length > 0) {
    warnings.push({
      warningId: "warn_unassigned_demands",
      severity: "warning",
      message: `${unassignedDemands.length} demand(s) could not be assigned to vendor drops`,
      affectedLineIds: unassignedDemands.map((d) => d.demandId),
    });
  }

  // Check for upcoming cutoffs
  const upcomingCutoffs = drops.filter((d) => d.notes?.includes("⚠️"));
  if (upcomingCutoffs.length > 0) {
    warnings.push({
      warningId: "warn_cutoff_passed",
      severity: "warning",
      message: `${upcomingCutoffs.length} drop(s) have upcoming or passed cutoff times`,
      affectedLineIds: upcomingCutoffs.flatMap((d) => d.demandIds),
    });
  }

  return warnings;
}

/**
 * Generate idempotency checksum for deduplication
 */
function generateIdempotencyChecksum(input: {
  demandCount: number;
  offsetCount: number;
  vendorCount: number;
  timestamp: number;
}): string {
  const str = `${input.demandCount}_${input.offsetCount}_${input.vendorCount}_${input.timestamp}`;
  return Buffer.from(str).toString("base64").substring(0, 16);
}

/**
 * Check if two plans are equivalent (for idempotency)
 */
export function arePlansEquivalent(
  plan1: ProcurementPlan,
  plan2: ProcurementPlan,
): boolean {
  return (
    plan1.totalLineCount === plan2.totalLineCount &&
    plan1.totalValue === plan2.totalValue &&
    plan1.vendorCount === plan2.vendorCount &&
    plan1.idempotencyChecksum === plan2.idempotencyChecksum
  );
}

/**
 * Export plan as JSON
 */
export function exportPlanAsJSON(plan: ProcurementPlan): string {
  return JSON.stringify(plan, null, 2);
}

/**
 * Export plan as CSV
 */
export function exportPlanAsCSV(plan: ProcurementPlan): string {
  const rows: string[] = [];

  // Header
  rows.push(
    "Vendor,Delivery Date,Item,Quantity,Unit,Cost Per Unit,Total Cost,Attribution Mode",
  );

  // Rows
  plan.vendorDrops.forEach((drop) => {
    drop.lines.forEach((line) => {
      rows.push(
        [
          drop.vendorName,
          drop.scheduledDeliveryDate,
          line.itemName,
          line.quantity,
          line.unit,
          line.costPerUnit,
          line.totalCost,
          line.costAttributionMode,
        ].join(","),
      );
    });
  });

  return rows.join("\n");
}
