/**
 * Extract BEO/REO data for forecast aggregation.
 * Reads from beo_banquet_orders (Supabase) when available; otherwise returns empty.
 */

import type { ForecastDataPoint, BEODocumentForForecast } from "../../../shared/types/forecast-sources";
import { correlateBEOToMealPeriod } from "./event-correlation";

export type DateRange = { start: string; end: string };

/** Fetch BEO documents from DB for org and date range. Returns array of BEO-like docs. */
export async function fetchBEODocumentsFromDB(
  orgId: string,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<BEODocumentForForecast[]> {
  if (!supabase) return [];

  try {
    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, date, outlet_id, guest_count")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .gte("date", dateRange.start)
      .lte("date", dateRange.end);

    if (!events?.length) return [];

    const eventIds = events.map((e: any) => e.id);
    const { data: beos } = await supabase
      .from("beo_banquet_orders")
      .select("id, org_id, event_id, beo_number, beo_name, content_data, status")
      .eq("org_id", orgId)
      .in("event_id", eventIds)
      .in("status", ["approved", "active", "pending_approval", "draft"]);

    if (!beos?.length) return [];

    const eventMap = new Map(events.map((e: any) => [e.id, e]));
    const docs: BEODocumentForForecast[] = [];

    for (const row of beos) {
      const ev = eventMap.get(row.event_id);
      const content = (row.content_data as Record<string, unknown>) || {};
      const start = ev?.start_time ?? (content.start as string) ?? "";
      const end = ev?.end_time ?? (content.end as string) ?? "";
      const gtd = (content.gtd as number) ?? ev?.guest_count;
      const exp = (content.exp as number) ?? gtd;
      const set = (content.set as number) ?? gtd;
      docs.push({
        beoId: String(row.id),
        eventId: String(row.event_id),
        documentType: (content.documentType as "Restaurant Event Order" | "Banquet Event Order") ?? "Banquet Event Order",
        outletId: ev?.outlet_id ?? (content.outletId as string),
        outletName: (content.outletName as string) ?? undefined,
        start: typeof start === "string" ? start : "",
        end: typeof end === "string" ? end : "",
        exp: typeof exp === "number" ? exp : undefined,
        gtd: typeof gtd === "number" ? gtd : undefined,
        set: typeof set === "number" ? set : undefined,
        title: (content.title as string) ?? ev?.title,
        status: row.status,
        beoNumber: row.beo_number ?? undefined,
        beoName: row.beo_name ?? undefined,
      });
    }

    return docs;
  } catch {
    return [];
  }
}

/**
 * Extract BEO forecast data points for the given org and date range.
 */
export async function extractBEOForecastData(
  orgId: string,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<ForecastDataPoint[]> {
  const beos = await fetchBEODocumentsFromDB(orgId, dateRange, supabase);
  const points: ForecastDataPoint[] = [];

  for (const beo of beos) {
    const date = beo.start.slice(0, 10);
    if (date < dateRange.start || date > dateRange.end) continue;

    const correlations = correlateBEOToMealPeriod(beo);
    for (const corr of correlations) {
      if (corr.guestCount <= 0) continue;
      points.push({
        date,
        outletId: beo.outletId ?? null,
        outletName: beo.outletName,
        mealPeriod: corr.mealPeriod,
        guestCount: corr.guestCount,
        source: beo.documentType === "Restaurant Event Order" ? "reo" : "beo",
        sourceId: beo.beoId,
        confidence: 0.95,
        eventType: "beo",
      });
    }
  }

  return points;
}

/**
 * Extract REO forecast data (same as BEO; REO is a document type).
 */
export async function extractREOForecastData(
  orgId: string,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<ForecastDataPoint[]> {
  return extractBEOForecastData(orgId, dateRange, supabase);
}

/** BEO breakdown row for ForecastHub Group/BEO table */
export interface BEOBreakdownRow {
  date: string;
  beoId: string;
  beoNumber: string;
  groupName: string;
  outletId?: string | null;
  outletName?: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  lateNight: number;
  total: number;
  eventId?: string;
}

/**
 * Get BEO breakdown by date (group name + meal period B/L/D/late night) for ForecastHub.
 */
export async function getBEOBreakdownRows(
  orgId: string,
  dateRange: DateRange,
  supabase: { from: (table: string) => any } | null,
): Promise<BEOBreakdownRow[]> {
  const docs = await fetchBEODocumentsFromDB(orgId, dateRange, supabase);
  const rows: BEOBreakdownRow[] = [];

  for (const beo of docs) {
    const date = beo.start.slice(0, 10);
    if (date < dateRange.start || date > dateRange.end) continue;

    const correlations = correlateBEOToMealPeriod(beo);
    const breakfast = correlations.find((c) => c.mealPeriod === "breakfast")?.guestCount ?? 0;
    const lunch = correlations.find((c) => c.mealPeriod === "lunch")?.guestCount ?? 0;
    const dinner = correlations.find((c) => c.mealPeriod === "dinner")?.guestCount ?? 0;
    const lateNight = correlations.find((c) => c.mealPeriod === "late_night")?.guestCount ?? 0;
    const allDay = correlations.find((c) => c.mealPeriod === "all_day")?.guestCount ?? 0;
    const total = breakfast + lunch + dinner + lateNight + allDay;

    rows.push({
      date,
      beoId: beo.beoId,
      beoNumber: beo.beoNumber ?? "",
      groupName: beo.beoName ?? beo.title ?? "Unnamed event",
      outletId: beo.outletId ?? null,
      outletName: beo.outletName,
      breakfast,
      lunch,
      dinner,
      lateNight,
      total: total || allDay,
      eventId: beo.eventId,
    });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.groupName.localeCompare(b.groupName));
}
