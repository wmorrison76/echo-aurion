import { useEffect, useState } from "react";
export interface ProfitExplorerEvent {
  eventId: string;
  name: string;
  outletId: string;
  spaceId: string;
  salesUserId: string;
  salesUserName: string;
  startDatetime: string;
  headcount: number;
  billedRevenue: number;
  cogsTotal: number;
  margin: number;
  marginPct: number;
}
const AURUM_BASE_URL =
  import.meta.env.VITE_AURUM_BASE_URL || "https://aurum.example.com/api";
export interface ProfitExplorerFilters {
  startDate: string;
  endDate: string;
  outletId?: string;
  salesUserId?: string;
  minMarginPct?: number;
  maxMarginPct?: number;
}
export function useProfitExplorer(filters: ProfitExplorerFilters) {
  const [events, setEvents] = useState<ProfitExplorerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        if (filters.outletId) params.set("outletId", filters.outletId);
        if (filters.salesUserId) params.set("salesUserId", filters.salesUserId);
        if (filters.minMarginPct != null)
          params.set("minMarginPct", String(filters.minMarginPct));
        if (filters.maxMarginPct != null)
          params.set("maxMarginPct", String(filters.maxMarginPct));
        const res = await fetch(
          `${AURUM_BASE_URL}/api/aurum/events/profit-explorer?${params}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = (await res.json()) as ProfitExplorerEvent[];
        if (!cancelled) setEvents(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load profit data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [
    filters.startDate,
    filters.endDate,
    filters.outletId,
    filters.salesUserId,
    filters.minMarginPct,
    filters.maxMarginPct,
  ]);
  return { events, loading, error };
}
