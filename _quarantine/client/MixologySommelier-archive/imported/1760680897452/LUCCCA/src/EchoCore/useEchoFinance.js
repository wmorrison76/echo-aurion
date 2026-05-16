// File: src/components/EchoCore/useEchoFinance.js

import { useState, useEffect } from "react";

/**
 * useEchoFinance Hook
 *
 * Central finance engine hook for LUCCCA.
 * Pulls and computes financial metrics such as:
 * - Total revenue
 * - Food & beverage cost %
 * - Labor ratios
 * - Net profit by time period
 *
 * Can be used in dashboards, AutoBEO Builder, and EchoPulse financial overlays.
 *
 * @param {string} range - Time range (e.g., "daily", "weekly", "monthly", "custom")
 * @param {object} options - Optional filters (e.g., outlet, cost center, dates)
 * @returns {{ data: object, loading: boolean, error: any }}
 */
const useEchoFinance = (range = "monthly", options = {}) => {
  const [data, setData] = useState({
    revenue: 0,
    laborCost: 0,
    foodCost: 0,
    beverageCost: 0,
    netProfit: 0,
    profitMargin: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const fetchFinance = async () => {
      setLoading(true);
      try {
        // Replace with actual API call or query to financial module
        const res = await fetch(`/api/finance?range=${range}`, {
          method: "POST",
          body: JSON.stringify(options),
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();

        if (!isActive) return;

        const { revenue, laborCost, foodCost, beverageCost } = result;

        const netProfit = revenue - (laborCost + foodCost + beverageCost);
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        setData({
          revenue,
          laborCost,
          foodCost,
          beverageCost,
          netProfit,
          profitMargin: parseFloat(profitMargin.toFixed(2)),
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

    fetchFinance();
    return () => {
      isActive = false;
    };
  }, [range, JSON.stringify(options)]); // Re-fetch on range or filters change

  return { data, loading, error };
};

export default useEchoFinance;
