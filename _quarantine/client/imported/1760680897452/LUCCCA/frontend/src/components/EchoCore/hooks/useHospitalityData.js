// File: src/components/EchoCore/hooks/useHospitalityData.js

import { useState, useEffect } from "react";

/**
 * useHospitalityData Hook
 *
 * Pulls operational data from LUCCCA’s backend or mock API.
 * Can be extended to include room bookings, table turns, menu hits, guest profiles.
 *
 * @param {string} source - API endpoint or context key (e.g., "dailyMetrics", "reservations")
 * @returns {{ data: any, loading: boolean, error: any }}
 */
const useHospitalityData = (source = "dailyMetrics") => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Replace this with actual LUCCCA backend fetch logic
        const res = await fetch(`/api/hospitality/${source}`);
        const result = await res.json();

        if (isActive) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(err);
          setData(null);
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [source]);

  return { data, loading, error };
};

export default useHospitalityData;
