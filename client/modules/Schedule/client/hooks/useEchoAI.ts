/** * Hook to query EchoAI backend securely */
import { useState, useCallback } from "react";
import { useTenancy } from "./useTenancy";
export interface EchoResponse {
  text: string;
  optimization?: {
    summary: {
      totalHours: number;
      totalRevenue: number;
      splh: number;
      laborVariance: number;
      workloadDeficit: number;
      staffCount: number;
    };
    recommendations: string[];
  };
}
export function useEchoAI() {
  const { tenancy } = useTenancy();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EchoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ask = useCallback(
    async (prompt: string): Promise<EchoResponse | null> => {
      if (!tenancy.org_id || !tenancy.outlet_id || !tenancy.dept_id) {
        setError("Tenancy context not configured");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/echo/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: tenancy.org_id,
            outlet_id: tenancy.outlet_id,
            dept_id: tenancy.dept_id,
            prompt,
          }),
        });
        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }
        const data: EchoResponse = await res.json();
        setResponse(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Echo AI error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tenancy],
  );
  const generateScenarios = useCallback(
    async (
      totalTips: number,
      members: Array<{
        employee_id: string;
        hours_worked: number;
        revenue_attrib: number;
      }>,
    ) => {
      if (!tenancy.org_id || !tenancy.outlet_id || !tenancy.dept_id) {
        setError("Tenancy context not configured");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/echo/scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: tenancy.org_id,
            outlet_id: tenancy.outlet_id,
            dept_id: tenancy.dept_id,
            scenarios: [
              {
                label: "Hours Only",
                rule: "HOURS",
                hours_weight: 100,
                revenue_weight: 0,
              },
              {
                label: "Revenue Only",
                rule: "REVENUE",
                hours_weight: 0,
                revenue_weight: 100,
              },
              {
                label: "70/30",
                rule: "HYBRID",
                hours_weight: 70,
                revenue_weight: 30,
              },
              {
                label: "50/50",
                rule: "HYBRID",
                hours_weight: 50,
                revenue_weight: 50,
              },
              {
                label: "30/70",
                rule: "HYBRID",
                hours_weight: 30,
                revenue_weight: 70,
              },
            ],
            total_tips: totalTips,
            members,
          }),
        });
        if (!res.ok) {
          throw new Error(`API error: ${res.statusText}`);
        }
        const data = await res.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Scenario generation error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tenancy],
  );
  const clear = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);
  return { ask, generateScenarios, response, loading, error, clear };
}
