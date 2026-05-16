import { useState, useEffect } from "react";

/**
 * useEchoFinance Hook
 * Provides key metrics: revenue, cost, net profit, margin.
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
    let active = true;
    const fetchFinance = async () => {
      try {
        const res = await fetch(`/api/finance?range=${range}`, {
          method: "POST",
          body: JSON.stringify(options),
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();
        if (!active) return;

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
        if (active) {
          setError(err);
          setData({});
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchFinance();
    return () => {
      active = false;
    };
  }, [range, JSON.stringify(options)]);

  return { data, loading, error };
};

export default useEchoFinance;
