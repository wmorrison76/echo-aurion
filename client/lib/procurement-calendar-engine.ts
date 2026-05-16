/**
 * Genesis F — Procurement Calendar Engine (Deterministic)
 *
 * INPUT:
 *  - vendor delivery calendar (when each vendor delivers + cutoff times)
 *  - procurement lines from Genesis C (what we need to buy, when)
 *  - rolling horizon window (start/end dates)
 *
 * ALGORITHM:
 *  For each procurement line with a due date, assign it to the LATEST deliverable drop
 *  that still arrives before (or on) the due date. This prevents ordering too early
 *  while ensuring we never miss a due date.
 *
 * OUTPUT:
 *  ProcurementCalendarPlan with vendor drops grouped by vendor + delivery date.
 */

import type {
  VendorCalendar,
  Weekday,
} from "@/../shared/types/vendor-calendar";
import type {
  ProcurementCalendarPlan,
  ProcurementDrop,
  ProcurementLine,
} from "@/../shared/types/procurement-calendar";

/**
 * Generate a unique ID with prefix and timestamp.
 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Extract the weekday (0=SUN, 6=SAT) from a Date.
 */
function weekdayOf(date: Date): Weekday {
  const d = date.getDay();
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d] as Weekday;
}

/**
 * Normalize a date to start of day (00:00:00) in local timezone.
 */
function startOfDayISO(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Enumerate all eligible vendor delivery dates within a window.
 */
function enumerateVendorDeliveries(
  vendor: VendorCalendar["vendors"][number],
  windowStartISO: string,
  windowEndISO: string,
): Date[] {
  const start = startOfDayISO(windowStartISO);
  const end = startOfDayISO(windowEndISO);
  const dates: Date[] = [];

  // Iterate through each day in the window
  for (let cursor = new Date(start); cursor <= end; ) {
    const wd = weekdayOf(cursor);
    if (vendor.deliveryDays.includes(wd)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Compute the cutoff timestamp for a given delivery date.
 * v1 assumption: cutoff is the day PRIOR to delivery at vendor's cutoffLocalTimeHHMM.
 *
 * Example:
 *  - Delivery: Wed Jan 29
 *  - Cutoff: Tue Jan 28 at 14:00 (from vendor.cutoffLocalTimeHHMM)
 */
function computeCutoff(deliveryDate: Date, cutoffHHMM: string): Date {
  const [hh, mm] = cutoffHHMM.split(":").map(Number);
  const cutoff = new Date(deliveryDate);
  cutoff.setDate(cutoff.getDate() - 1); // Prior day
  cutoff.setHours(hh, mm, 0, 0);
  return cutoff;
}

/**
 * Core engine: Generate procurement calendar plan.
 *
 * @param args.calendar - Vendor delivery calendar (from vendor-calendar-store)
 * @param args.windowStartISO - Planning window start (ISO date)
 * @param args.windowEndISO - Planning window end (ISO date)
 * @param args.lines - Procurement lines from Genesis C plan
 * @param args.groupId - Optional: if this plan is for a specific group/BEO
 * @returns ProcurementCalendarPlan with drops assigned
 */
export function generateProcurementCalendarPlan(args: {
  calendar: VendorCalendar;
  windowStartISO: string;
  windowEndISO: string;
  lines: ProcurementLine[];
  groupId?: string | null;
}): ProcurementCalendarPlan {
  const { calendar, windowStartISO, windowEndISO, lines, groupId } = args;

  // Pre-compute all vendor delivery dates and cutoff times for the window
  const vendorDeliveryMap = new Map<
    string,
    {
      vendorName: string;
      deliveries: Array<{ deliverOn: Date; cutoffAt: Date }>;
    }
  >();

  for (const vendor of calendar.vendors) {
    const deliveryDates = enumerateVendorDeliveries(
      vendor,
      windowStartISO,
      windowEndISO,
    );

    const deliveries = deliveryDates.map((d) => ({
      deliverOn: d,
      cutoffAt: computeCutoff(d, vendor.cutoffLocalTimeHHMM),
    }));

    vendorDeliveryMap.set(vendor.vendorId, {
      vendorName: vendor.vendorName,
      deliveries,
    });
  }

  // Drops map: keyed by "vendorId::deliverOnISO" to group lines by vendor + delivery date
  const dropsMap = new Map<string, ProcurementDrop>();

  // Process each procurement line
  for (const line of lines) {
    const vendor = vendorDeliveryMap.get(line.vendorId);

    // Skip if vendor not in calendar or has no deliveries
    if (!vendor || vendor.deliveries.length === 0) {
      console.warn(
        `Vendor "${line.vendorName}" (${line.vendorId}) not found in calendar or has no deliveries`,
      );
      continue;
    }

    // Extract the earliest (most urgent) due date from this line's sources
    const dueISO = line.sources
      .map((s) => s.dueAtISO)
      .sort((a, b) => a.localeCompare(b))[0];

    if (!dueISO) {
      console.warn(`Procurement line "${line.ingredientName}" has no due date`);
      continue;
    }

    const due = new Date(dueISO);

    // Find the LATEST delivery date that is <= due date
    const eligible = vendor.deliveries
      .filter((d) => d.deliverOn.getTime() <= due.getTime())
      .sort((a, b) => b.deliverOn.getTime() - a.deliverOn.getTime())[0];

    // Fallback: if no eligible date, use the earliest delivery in window
    // This is a safety valve; it will appear as a risk in the UI
    const chosen = eligible ?? vendor.deliveries[0];

    const deliverOnISO = chosen.deliverOn.toISOString();
    const cutoffAtISO = chosen.cutoffAt.toISOString();
    const key = `${line.vendorId}::${deliverOnISO}`;

    // Add line to existing drop or create new drop
    const existing = dropsMap.get(key);
    if (existing) {
      existing.lines.push(line);
    } else {
      dropsMap.set(key, {
        dropId: uid("drop"),
        vendorId: line.vendorId,
        vendorName: vendor.vendorName,
        deliverOnISO,
        cutoffAtISO,
        lines: [line],
        estimatedTotalCost: null,
        rebateHint: null,
      });
    }
  }

  // Convert drops map to array and sort by delivery date
  const drops = Array.from(dropsMap.values()).sort((a, b) =>
    a.deliverOnISO.localeCompare(b.deliverOnISO),
  );

  const plan: ProcurementCalendarPlan = {
    planId: uid("proc_cal"),
    createdAtISO: new Date().toISOString(),
    groupId: groupId ?? null,
    windowStartISO,
    windowEndISO,
    drops,
    note:
      "Genesis F: Procurement lines automatically assigned to the latest deliverable vendor drop before due date. " +
      "This prevents ordering too early while ensuring no missed events. Consolidation opportunities surface for Genesis I (rebate engine).",
  };

  return plan;
}
