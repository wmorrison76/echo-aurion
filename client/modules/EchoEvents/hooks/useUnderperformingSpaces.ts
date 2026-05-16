import { useEffect, useState } from "react";
export interface UnderperformingSpaceRow {
  spaceId: string;
  spaceName: string | null;
  spaceType: string | null;
  propertyId: string | null;
  propertyName: string | null;
  eventsCount: number;
  avgMarginPct: number;
  benchmarkMarginPct: number;
  marginGapPct: number;
}
const AURUM_BASE_URL =
  import.meta.env.VITE_AURUM_BASE_URL || "https://aurum.example.com/api";
export function useUnderperformingSpaces(params: {
  startDate: string;
  endDate: string;
  propertyId?: string;
  minEvents?: number;
  gapThresholdPct?: number;
}) {
  const [rows, setRows] = useState<UnderperformingSpaceRow[]>([]);
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
        if (params.minEvents != null) {
          query.set("minEvents", String(params.minEvents));
        }
        if (params.gapThresholdPct != null) {
          query.set("gapThresholdPct", String(params.gapThresholdPct));
        }
        const res = await fetch(
          `${AURUM_BASE_URL}/api/aurum/events/underperforming-spaces?${query.toString()}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const json = (await res.json()) as UnderperformingSpaceRow[];
        if (!cancelled) setRows(json);
      } catch (err: any) {
        if (!cancelled)
          setError(err.message ?? "Failed to load underperforming spaces");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [
    params.startDate,
    params.endDate,
    params.propertyId,
    params.minEvents,
    params.gapThresholdPct,
  ]);
  return { rows, loading, error };
}
