import { useEffect, useState } from "react";
export interface ScopeKPIs {
  throughput: number;
  avgPathM: number;
  seatsPerM2: number;
}
export function useScopeKPIs(
  session: string = "default",
  variantId?: string,
): ScopeKPIs | null {
  const [kpis, setKpis] = useState<ScopeKPIs | null>(null);
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        let url = `/api/scope/kpis?session=${encodeURIComponent(session)}`;
        if (variantId) {
          url += `&variantId=${encodeURIComponent(variantId)}`;
        }
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setKpis(data);
        }
      } catch (err) {
        console.error("Failed to fetch KPIs:", err);
      }
    };
    fetchKPIs();
  }, [session, variantId]);
  return kpis;
}
