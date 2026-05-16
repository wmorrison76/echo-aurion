import type { ProductionSheet } from "@/../shared/types/production";
import type { LaborRequirement } from "@/../shared/types/labor";

/**
 * Estimate labor requirements from production sheets
 * v1 rules:
 * - 1 staff per 50 portions
 * - 1 hour per 25 portions
 *
 * Simple, transparent, and replaceable by AI later
 */
export function estimateLabor(sheets: ProductionSheet[]): LaborRequirement[] {
  return sheets.map((sheet) => {
    const totalQty = sheet.items.reduce((sum, item) => sum + item.quantity, 0);

    const requiredStaff = Math.ceil(totalQty / 50);
    const estimatedHours = Math.ceil(totalQty / 25);

    return {
      station: sheet.station,
      requiredStaff,
      estimatedHours,

      derivedFrom: {
        beoId: sheet.beoId,
        productionId: sheet.productionId,
      },
    };
  });
}
