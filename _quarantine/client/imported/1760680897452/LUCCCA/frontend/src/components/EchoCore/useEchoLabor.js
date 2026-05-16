import { useState, useEffect } from "react";

/**
 * useEchoLabor Hook
 * Returns hours, labor cost %, and flagged shifts.
 */
const useEchoLabor = (period = "weekly", options = {}) => {
  const [data, setData] = useState({
    totalHours: 0,
    totalCost: 0,
    laborCostPercent: 0,
    flagged: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchLabor = async () => {
      try {
        const res = await fetch(`/api/labor?period=${period}`, {
          method: "POST",
          body: JSON.stringify(options),
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();
        if (!active) return;

        const { totalHours, totalCost, revenue, shifts } = result;
        const laborCostPercent = revenue > 0 ? (totalCost / revenue) * 100 : 0;
        const flagged = shifts?.filter(s => s.hours > 10 || s.notes?.includes("overtime")) || [];

        setData({
          totalHours,
          totalCost,
          laborCostPercent: parseFloat(laborCostPercent.toFixed(2)),
          flagged,
        });
        setError(null);
      } catch (err) {
        if (active) {
          setError(err);
          setData({});
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLabor();
    return () => {
      active = false;
    };
  }, [period, JSON.stringify(options)]);

  return { data, loading, error };
};

export default useEchoLabor;
