/** * Aurum Client * Handles all communication with the Aurum financial system */ import type { EventFinancialSummary } from "@/shared/types/events-financial";
const AURUM_BASE_URL =
  import.meta.env.VITE_AURUM_BASE_URL ||
  "https://aurum.yourdomain/api"; /** * Fetch event financial summary from Aurum * Combines forecast data with billing and cost data */
export async function fetchEventFinancialSummary(
  eventId: string,
): Promise<EventFinancialSummary | null> {
  try {
    const res = await fetch(
      `${AURUM_BASE_URL}/aurum/events/${eventId}/financial-summary`,
      {
        credentials: "include",
        headers: {
          "x-luccca-system": "EchoEventStudio",
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        `[Aurum] Failed to load event financial summary for ${eventId}:`,
        errorText,
      );
      return null;
    }
    return (await res.json()) as EventFinancialSummary;
  } catch (err) {
    console.error(`[Aurum] Network error fetching event financials:`, err);
    return null;
  }
} /** * Fetch multiple events' financial summaries */
export async function fetchEventFinancialsSummaries(
  eventIds: string[],
): Promise<Map<string, EventFinancialSummary>> {
  const results = new Map<string, EventFinancialSummary>();
  const promises = eventIds.map(async (eventId) => {
    const summary = await fetchEventFinancialSummary(eventId);
    if (summary) {
      results.set(eventId, summary);
    }
  });
  await Promise.all(promises);
  return results;
} /** * Get Aurum base URL (for testing or alternative endpoints) */
export function getAurumBaseUrl(): string {
  return AURUM_BASE_URL;
}
