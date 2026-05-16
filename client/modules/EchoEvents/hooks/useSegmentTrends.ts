import { useEffect, useState } from "react";
export interface SegmentTrendRow {
  year: number;
  month: number;
  segment: string;
  eventsCount: number;
  totalRevenue: number;
  totalMargin: number;
  avgMarginPct: number;
}
const AURUM_BASE_URL =
  import.meta.env.VITE_AURUM_BASE_URL || "https://aurum.example.com/api";
export function useSegmentTrends(params: {
  startDate: string;
  endDate: string;
  propertyId?: string;
}) {
  const [rows, setRows] = useState<SegmentTrendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const query = new URLSearchParams({
          startDate: params.startDate,
          endDate: params.endDate,
        });
        if (params.propertyId) {
          query.set("propertyId", params.propertyId);
        }
        const res = await fetch(
          `${AURUM_BASE_URL}/api/aurum/events/segment-trends?${query.toString()}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const json = (await res.json()) as SegmentTrendRow[];
        if (!cancelled) setRows(json);
      } catch (err: any) {
        if (!cancelled)
          setError(err.message ?? "Failed to load segment trends");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.startDate, params.endDate, params.propertyId]);
  return { rows, loading, error };
}
