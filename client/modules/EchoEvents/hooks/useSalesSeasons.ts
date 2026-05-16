import { useEffect, useState } from "react";
export interface SalesSeason {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}
const EVENTS_API_BASE =
  import.meta.env.VITE_EVENTS_API_BASE || "https://events.example.com/api";
export function useSalesSeasons() {
  const [seasons, setSeasons] = useState<SalesSeason[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function reload() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${EVENTS_API_BASE}/api/admin/sales/seasons`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = (await res.json()) as SalesSeason[];
      setSeasons(json);
    } catch (err: any) {
      setError(err.message ?? "Failed to load seasons");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  return { seasons, loading, error, reload };
}
export async function createSeason(payload: {
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}) {
  const res = await fetch(
    `${import.meta.env.VITE_EVENTS_API_BASE || "https://events.example.com/api"}/api/admin/sales/seasons`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
export async function updateSeason(
  id: string,
  payload: Partial<{
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>,
) {
  const res = await fetch(
    `${import.meta.env.VITE_EVENTS_API_BASE || "https://events.example.com/api"}/api/admin/sales/seasons/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
export async function runSeasonProcessing() {
  const res = await fetch(
    `${import.meta.env.VITE_EVENTS_API_BASE || "https://events.example.com/api"}/api/admin/sales/seasons/process`,
    { method: "POST", credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
