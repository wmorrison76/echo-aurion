import { useEffect, useState } from "react";
export interface EventFinancialSummary {
  eventId: string;
  beoId: string;
  outletId: string;
  currency: string;
  forecastRevenueTotal: number;
  billedRevenueTotal: number;
  amountPaidTotal: number;
  outstandingBalance: number;
  cogsTotal: number;
  cogsPerCover: number;
  grossMargin: number;
  lastCostUpdatedAt?: string;
}
const AURUM_BASE_URL = import.meta.env.VITE_AURUM_BASE_URL;
export function useEventFinancials(eventId: string | null) {
  const [summary, setSummary] = useState<EventFinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = AURUM_BASE_URL
          ? `${AURUM_BASE_URL}/aurum`
          : "/api/aurum";
        const res = await fetch(
          `${baseUrl}/events/${eventId}/financial-summary`,
          {
            credentials: "include",
            headers: { "x-luccca-system": "EchoEventStudio" },
          },
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as EventFinancialSummary;
        if (!cancelled) setSummary(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load financials");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);
  return { summary, loading, error };
}
