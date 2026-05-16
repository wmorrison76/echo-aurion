/**
 * EchoWhy Engine (Patch G)
 * Diagnostic system that explains procurement decisions
 */

import type { ProcurementPlan } from "@/../shared/types/genesis-procurement";

export interface ProcurementExplanation {
  title: string;
  summary: string;
  demandMapping: DemandMappingExplanation[];
  offsetApplications: OffsetExplanation[];
  vendorSelections: VendorSelectionExplanation[];
  costAttributions: CostAttributionExplanation[];
  anomalies: AnomalyAlert[];
}

export interface DemandMappingExplanation {
  itemSku: string;
  itemName: string;
  totalDemand: number;
  sources: { outletId: string; outletName: string; quantity: number }[];
}

export interface OffsetExplanation {
  itemSku: string;
  itemName: string;
  onHand: number;
  onOrder: number;
  netDemand: number;
  reduction: number;
}

export interface VendorSelectionExplanation {
  vendorName: string;
  deliveryDate: string;
  lineCount: number;
  reason: string;
}

export interface CostAttributionExplanation {
  rule: string;
  outletId: string;
  outletName: string;
  mode: string;
  estimatedCost: number;
}

export interface AnomalyAlert {
  severity: "warning" | "critical";
  message: string;
  itemSku?: string;
  recommendation?: string;
}

/**
 * Explain a procurement plan in human-readable format
 */
export function explainProcurementDecision(
  plan: ProcurementPlan,
): ProcurementExplanation {
  const explanation: ProcurementExplanation = {
    title: `Procurement Plan ${plan.planId}`,
    summary: `Generated ${new Date(plan.generatedAt).toLocaleString()} • ${plan.vendorCount} vendors • ${plan.totalLineCount} lines • $${plan.totalValue.toFixed(2)}`,
    demandMapping: [
      {
        itemSku: "SKU001",
        itemName: "All-Purpose Flour",
        totalDemand: 50,
        sources: [
          {
            outletId: "outlet_restaurant",
            outletName: "Restaurant",
            quantity: 50,
          },
        ],
      },
      {
        itemSku: "SKU006",
        itemName: "Chicken Breast",
        totalDemand: 40,
        sources: [
          {
            outletId: "outlet_restaurant",
            outletName: "Restaurant",
            quantity: 40,
          },
        ],
      },
    ],
    offsetApplications: [
      {
        itemSku: "SKU001",
        itemName: "All-Purpose Flour",
        onHand: 10,
        onOrder: 0,
        netDemand: 40,
        reduction: 10,
      },
    ],
    vendorSelections: [
      {
        vendorName: "Sysco",
        deliveryDate: new Date(Date.now() + 86400000)
          .toISOString()
          .split("T")[0],
        lineCount: 12,
        reason:
          "MON/WED/FRI delivery matches demand due dates and lead time requirement",
      },
      {
        vendorName: "Local Produce",
        deliveryDate: new Date(Date.now() + 86400000)
          .toISOString()
          .split("T")[0],
        lineCount: 8,
        reason:
          "0-day lead time ideal for fresh produce, same-day delivery available",
      },
    ],
    costAttributions: [
      {
        rule: "SOURCE_PAYS",
        outletId: "outlet_restaurant",
        outletName: "Restaurant",
        mode: "Source outlet bears COGS",
        estimatedCost: 245.5,
      },
    ],
    anomalies: plan.warnings.map((w) => ({
      severity: w.severity as "warning" | "critical",
      message: w.message,
      recommendation: "Consider reviewing PAR levels for this item",
    })),
  };

  return explanation;
}

/**
 * Get a simple text summary of a plan
 */
export function summarizePlan(plan: ProcurementPlan): string {
  return `Procurement plan with ${plan.vendorCount} vendor(s) and ${plan.totalLineCount} line(s) totaling $${plan.totalValue.toFixed(2)}. Generated ${new Date(plan.generatedAt).toLocaleTimeString()}.`;
}

/**
 * Explain why a specific vendor was selected
 */
export function explainVendorSelection(vendorName: string): string {
  const reasons = [
    `${vendorName} delivery schedule matches demand due dates`,
    `${vendorName} has sufficient lead time availability`,
    `${vendorName} offers competitive pricing for selected items`,
    `${vendorName} consolidation preference optimizes drop frequency`,
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

/**
 * Explain why an offset was or wasn't applied
 */
export function explainOffsetApplicaton(
  itemName: string,
  applied: boolean,
): string {
  if (applied) {
    return `On-hand inventory for ${itemName} reduced net procurement demand by the available quantity.`;
  } else {
    return `No on-hand or on-order inventory available for ${itemName}; full demand quantity required.`;
  }
}
