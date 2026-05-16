/** * useSeasonResults Hook * Fetches season performance results and rankings * Part of LUCCCA sales analytics */ import {
  useEffect,
  useState,
} from "react";
import type {
  SalesSeason,
  SalesPerformanceSnapshot,
} from "@shared/types/rewards-types";
const EVENTS_API_BASE =
  import.meta.env.VITE_EVENTS_API_BASE || "http://localhost:3000/api";
export interface SeasonResultsData {
  season: SalesSeason;
  rankings: SalesPerformanceSnapshot[];
  summary: {
    totalRevenue: number;
    totalProfit: number;
    averageMarginPct: number;
    averageWinRatePct: number;
    totalEvents: number;
    topPerformer: SalesPerformanceSnapshot | null;
  };
}
export interface UseSeasonResultsResult {
  data: SeasonResultsData | null;
  seasons: SalesSeason[];
  loading: boolean;
  seasonsLoading: boolean;
  error: string | null;
  refetch: (seasonId: string) => void;
  fetchSeasons: () => void;
} /** * Hook to fetch season results * @param seasonId - Initial season ID to fetch * @returns Season results, available seasons, and loading/error states */
export function useSeasonResults(seasonId?: string): UseSeasonResultsResult {
  const [data, setData] = useState<SeasonResultsData | null>(null);
  const [seasons, setSeasons] = useState<SalesSeason[]>([]);
  const [loading, setLoading] = useState(false);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchSeasons = async () => {
    try {
      setSeasonsLoading(true);
      const res = await fetch(`${EVENTS_API_BASE}/admin/sales/seasons`, {
        credentials: "include",
        headers: { "x-luccca-system": "EchoEventStudio" },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch seasons");
      }
      const data = await res.json();
      setSeasons(data.seasons || []);
    } catch (err: any) {
      console.error("[useSeasonResults] Error fetching seasons:", err);
      setSeasons([]);
    } finally {
      setSeasonsLoading(false);
    }
  };
  const fetchData = async (id: string) => {
    if (!id) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${EVENTS_API_BASE}/admin/sales/seasons/${encodeURIComponent(id)}/results`,
        {
          credentials: "include",
          headers: { "x-luccca-system": "EchoEventStudio" },
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch season results: ${res.status}`);
      }
      const responseData = await res.json();
      setData(responseData.results);
    } catch (err: any) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load season results";
      console.error("[useSeasonResults]", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }; // Fetch seasons on mount useEffect(() => { fetchSeasons(); }, []); // Fetch season results when seasonId changes useEffect(() => { if (seasonId) { fetchData(seasonId); } }, [seasonId]); return { data, seasons, loading, seasonsLoading, error, refetch: fetchData, fetchSeasons, };
}
export default useSeasonResults;
