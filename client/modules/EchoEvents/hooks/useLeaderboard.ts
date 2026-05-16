import { useEffect, useState } from "react";
import type { SalesPerformance } from "../../shared/team-stats";
const EVENTS_API_BASE =
  import.meta.env.VITE_EVENTS_API_BASE || "https://events.example.com/api";
export function useLeaderboard(period: string) {
  const [stats, setStats] = useState<SalesPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${EVENTS_API_BASE}/leaderboard?period=${encodeURIComponent(period)}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as SalesPerformance[];
        if (!cancelled) setStats(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load leaderboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);
  return { stats, loading, error };
}
