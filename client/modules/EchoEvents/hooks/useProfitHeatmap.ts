/** * useProfitHeatmap Hook * Fetches profit heatmap data (outlet x weekday) * Part of LUCCCA Aurum financial analytics */ import {
  useEffect,
  useState,
} from "react";
const AURUM_BASE_URL =
  import.meta.env.VITE_AURUM_BASE_URL || "http://localhost:3001/api";
export interface HeatmapCell {
  outletId: string;
  weekday: number;
  weekdayName: string;
  eventsCount: number;
  totalRevenue: number;
  totalMargin: number;
  avgMarginPct: number;
}
export interface HeatmapData {
  startDate: string;
  endDate: string;
  outlets: string[];
  cells: HeatmapCell[];
  summary: {
    totalRevenue: number;
    totalMargin: number;
    bestOutlet: string | null;
    bestWeekday: number | null;
    eventsCount: number;
  };
}
export interface UseProfitHeatmapResult {
  heatmap: HeatmapData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} /** * Hook to fetch profit heatmap data for a date range * @param startDate - Start date (YYYY-MM-DD) * @param endDate - End date (YYYY-MM-DD) * @returns Heatmap data and loading/error states */
export function useProfitHeatmap(
  startDate: string,
  endDate: string,
): UseProfitHeatmapResult {
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchData = async () => {
    if (!startDate || !endDate) {
      setHeatmap(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${AURUM_BASE_URL}/aurum/events/profit-heatmap?` +
          `startDate=${encodeURIComponent(startDate)}&` +
          `endDate=${encodeURIComponent(endDate)}`,
        {
          credentials: "include",
          headers: { "x-luccca-system": "EchoEventStudio" },
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch heatmap: ${res.status}`);
      }
      const data = await res.json();
      setHeatmap(data.heatmap);
    } catch (err: any) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load heatmap data";
      console.error("[useProfitHeatmap]", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);
  return { heatmap, loading, error, refetch: fetchData };
}
export default useProfitHeatmap;
