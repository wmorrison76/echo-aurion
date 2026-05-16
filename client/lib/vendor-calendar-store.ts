/**
 * Genesis F — Vendor Calendar Store (Local v1)
 * Persists vendor delivery calendars with cutoff times and rebate hints.
 * v1: localStorage backed, sample vendors initialized on first run.
 */

import type { VendorCalendar } from "@/../shared/types/vendor-calendar";

const KEY = "luccca:vendor_calendar:v1";

/**
 * Retrieve vendor calendar from localStorage.
 * Returns null if not found or invalid.
 */
export function getVendorCalendar(): VendorCalendar | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VendorCalendar;
  } catch (error) {
    console.error("Failed to parse vendor calendar from localStorage:", error);
    return null;
  }
}

/**
 * Save vendor calendar to localStorage.
 */
export function saveVendorCalendar(cal: VendorCalendar): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cal));
  } catch (error) {
    console.error("Failed to save vendor calendar to localStorage:", error);
  }
}

/**
 * Initialize sample vendor calendar if none exists.
 * v1: Hard-coded sample vendors (Avendra, Buyers Edge, Local Produce).
 * Later: Fetch from EchoAurum or admin config.
 */
export function initializeSampleVendorCalendar(): void {
  if (getVendorCalendar()) {
    // Calendar already exists, skip initialization
    return;
  }

  const sampleCalendar: VendorCalendar = {
    calendarId: "v1",
    timezone: "America/New_York",
    vendors: [
      {
        vendorId: "avendra_main",
        vendorName: "Avendra / Mainline",
        deliveryDays: ["MON", "WED", "FRI", "SAT"],
        cutoffLocalTimeHHMM: "14:00",
        minLeadDays: 1,
        maxLeadDays: 5,
        rebateProgram: {
          programId: "AVENDRA",
          minDropDollars: 500,
          rebateRateBps: 150,
          notes:
            "Consolidate drops to improve rebate eligibility. 1.5% back on orders ≥$500.",
        },
      },
      {
        vendorId: "buyers_edge",
        vendorName: "Buyers Edge",
        deliveryDays: ["TUE", "THU"],
        cutoffLocalTimeHHMM: "12:00",
        minLeadDays: 2,
        maxLeadDays: 7,
        rebateProgram: {
          programId: "BUYERS_EDGE",
          minDropDollars: 750,
          rebateRateBps: 100,
          notes:
            "Better rebate on larger drops. Limited delivery days (Tue/Thu only). 1.0% back on orders ≥$750.",
        },
      },
      {
        vendorId: "local_produce",
        vendorName: "Local Produce Co",
        deliveryDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        cutoffLocalTimeHHMM: "18:00",
        minLeadDays: 0,
        maxLeadDays: 3,
        rebateProgram: null,
      },
    ],
  };

  saveVendorCalendar(sampleCalendar);
}
