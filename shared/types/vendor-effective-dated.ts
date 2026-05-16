/**
 * Vendor Effective-Dated Rules (Patch D)
 * Purpose:
 * - Allow scheduling vendor rule changes for a future effective date
 * - Provide a version id for audit/journaling
 *
 * Industry practice:
 * - "As-of" effective dating is standard in ERP systems (rates, vendors, tax, contracts)
 */

export type Weekday = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface VendorScheduleRule {
  vendorId: string;
  vendorName: string;
  deliveryDays: Weekday[];
  cutoffTimeLocal: string; // "HH:mm"
  minLeadDays: number; // >= 0
  preferConsolidatedDrops: boolean;
}

export interface VendorRuleChange {
  changeId: string;
  vendorId: string;
  effectiveDateISO: string; // YYYY-MM-DD
  // Partial patch applied to VendorScheduleRule:
  patch: Partial<Omit<VendorScheduleRule, "vendorId">>;
  memo: string; // why it changed
  createdAt: string; // ISO
  createdBy?: string; // actor who created the change
}

export interface VendorRulesVersion {
  versionId: string;
  asOfDateISO: string; // YYYY-MM-DD
  // normalized snapshot hash input
  vendors: VendorScheduleRule[];
  generatedAt: string; // ISO
}
