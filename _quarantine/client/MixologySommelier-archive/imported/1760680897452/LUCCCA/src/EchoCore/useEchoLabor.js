// File: src/components/EchoCore/useEchoLabor.js

import { useState, useEffect } from "react";

/**
 * useEchoLabor Hook
 *
 * Fetches and computes labor analytics:
 * - Total hours worked
 * - Labor cost by department or employee
 * - Labor cost percentage vs revenue
 * - Flags for overtime or inefficiencies
 *
 * @param {string} period - Timeframe (e.g., "daily", "weekly", "monthly")
 * @param {object} options - Optional filters (e.g., outlet, position, employeeId)
 * @returns {{ data: object, loading: boolean, error: any }}
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
    let isActive = true;

    const fetchLabor = async () => {
      setLoading(true);
      try {
        // Replace with your actual backend or Firebase call
        const res = await fetch(`/api/labor?period=${period}`, {
          method: "POST",
          body: JSON.stringify(options),
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();

        if (!isActive) return;

        const { totalHours, totalCost, revenue, shifts } = result;

        // Calculate labor cost %
        const laborCostPercent = revenue > 0 ? (totalCost / revenue) * 100 : 0;

        // Detect overtime or anomalies
        const flagged = shifts?.filter(shift => shift.hours > 10 || shift.notes?.includes("overtime")) || [];

        setData({
          totalHours,
          totalCost,
          laborCostPercent: parseFloat(laborCostPercent.toFixed(2)),
          flagged,
        });
        setError(null);
      } catch (err) {
        if (isActive) {
          setError(err);
          setData({});
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchLabor();
    return () => {
      isActive = false;
    };
  }, [period, JSON.stringify(options)]);

  return { data, loading, error };
};

export default useEchoLabor;

