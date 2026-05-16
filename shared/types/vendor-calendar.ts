/**
 * Genesis F — Vendor Delivery Calendar (Canonical)
 * Defines which vendors deliver on which days + cutoff windows + rebate programs.
 */

export type Weekday = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export interface RebateProgram {
  programId: string; // e.g., "AVENDRA"
  minDropDollars?: number; // e.g., 500 — minimum order size to trigger rebate
  rebateRateBps?: number; // e.g., 150 = 1.5%
  notes?: string | null;
}

export interface VendorDeliveryRule {
  vendorId: string;
  vendorName: string;

  // Delivery days (e.g., ["MON", "WED", "FRI"])
  deliveryDays: Weekday[];

  // Cutoff time: order must be placed BEFORE this time on the day PRIOR to delivery
  // v1 assumption: all cutoffs are prior-day at HH:MM local time
  // Example: delivery on Wed → cutoff on Tue at 14:00
  cutoffLocalTimeHHMM: string; // Format: "HH:MM" e.g., "14:00"

  // Lead time rules (optional overrides for min/max days before delivery)
  minLeadDays?: number; // Minimum days before delivery order can be placed
  maxLeadDays?: number; // Maximum days before delivery order can be placed

  // Rebate program hints (surface now, compute later in Genesis I)
  rebateProgram?: RebateProgram | null;
}

export interface VendorCalendar {
  calendarId: "v1";
  timezone: string; // e.g., "America/New_York"
  vendors: VendorDeliveryRule[];
}
