import { useEffect, useState } from "react";
export interface OpsEvent {
  id: string;
  name: string;
  spaceName: string;
  startTime: string;
  headcount: number;
  setupType: string;
  notes?: string;
}
const EVENTS_API_BASE =
  import.meta.env.VITE_EVENTS_API_BASE || "https://events.example.com/api";
export function useOpsEvents() {
  const [events, setEvents] = useState<OpsEvent[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`${EVENTS_API_BASE}/ops/today`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as OpsEvent[];
      if (!cancelled) setEvents(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  return { events };
}
