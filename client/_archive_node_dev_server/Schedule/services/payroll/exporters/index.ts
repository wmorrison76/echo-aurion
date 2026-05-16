import {
  toADP,
  toQuickBooks,
  toPaychex,
  toPaylocity,
  toGusto,
  toDayforce,
  toUKG,
} from "../../../../client/apps/scheduler-ui/lib/payrollCsvMappers";
import type { WeeklyTotals } from "../../../../shared/payroll";
export function exportForVendor(vendor: string, data: WeeklyTotals): string {
  const v = vendor.trim().toLowerCase();
  switch (v) {
    case "adp":
      return toADP(data);
    case "quickbooks":
    case "qb":
      return toQuickBooks(data);
    case "paychex":
      return toPaychex(data);
    case "paylocity":
      return toPaylocity(data);
    case "gusto":
      return toGusto(data);
    case "dayforce":
      return toDayforce(data);
    case "ukg":
      return toUKG(data);
    default:
      throw new Error(`Unknown vendor: ${vendor}`);
  }
}
