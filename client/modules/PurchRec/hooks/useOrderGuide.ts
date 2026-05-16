import { useEffect, useState, useRef } from "react";
import {
  generateOrderGuide,
  OrderGuideRow,
} from "../services/orderGuide.service";
import { logger } from "@/lib/logger";

interface UseOrderGuideResult {
  rows: OrderGuideRow[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useOrderGuide(): UseOrderGuideResult {
  const [rows, setRows] = useState<OrderGuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isInitialLoadRef = useRef(true);

  const load = async () => {
    setLoading(true);
    try {
      logger.debug("Loading order guide");
      const result = await generateOrderGuide();
      setRows(result);
      setError(null);
      setLastUpdated(new Date());
      logger.info("Order guide loaded successfully", { count: result.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        "Failed to load order guide",
        err instanceof Error ? err : new Error(errorMessage),
      );
      
      // Only set error on initial load or if we don't have any rows
      if (isInitialLoadRef.current || rows.length === 0) {
        setError(err as Error);
      } else {
        // On subsequent loads, warn but keep showing stale data
        logger.warn("Order guide refresh failed, using cached data", { errorMessage });
      }
    } finally {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  };

  useEffect(() => {
    // Initial load
    void load();

    return () => {
      // Cleanup
    };
  }, []);

  return {
    rows,
    loading,
    error,
    refresh: load,
    lastUpdated,
  };
}
