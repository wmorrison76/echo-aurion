/**
 * Maestro Data Hooks
 *
 * React hooks for panels to fetch and update data from the Maestro API.
 * Includes caching, error handling, and automatic synchronization.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { get, post, patch } from "@/lib/api-client";
import { useMaestro } from "@/contexts/MaestroContext";

interface UseDataOptions {
  autoFetch?: boolean;
  cacheTime?: number; // ms
  refetchInterval?: number; // ms
}

/**
 * useFetchEventData
 * Fetch event details from API with caching
 */
export function useFetchEventData<T = any>(
  endpoint: string,
  options?: UseDataOptions,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentEvent } = useMaestro();
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);
  const refetchIntervalRef = useRef<NodeJS.Timer | null>(null);

  const autoFetch = options?.autoFetch ?? true;
  const cacheTime = options?.cacheTime ?? 30000; // 30 seconds default
  const refetchInterval = options?.refetchInterval;

  const fetchData = useCallback(async () => {
    if (!currentEvent) return;

    // Check cache
    if (
      cacheRef.current &&
      Date.now() - cacheRef.current.timestamp < cacheTime
    ) {
      setData(cacheRef.current.data);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await get<T>(
        `/api/maestro${endpoint.replace(":eventId", currentEvent.id)}`,
      );

      if (result) {
        cacheRef.current = { data: result, timestamp: Date.now() };
        setData(result);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch data";
      setError(errorMsg);
      console.error("[MAESTRO-DATA] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentEvent, endpoint, cacheTime]);

  useEffect(() => {
    if (autoFetch && currentEvent) {
      fetchData();
    }
  }, [currentEvent, autoFetch, fetchData]);

  // Setup refetch interval if specified
  useEffect(() => {
    if (refetchInterval) {
      refetchIntervalRef.current = setInterval(fetchData, refetchInterval);
      return () => {
        if (refetchIntervalRef.current) {
          clearInterval(refetchIntervalRef.current);
        }
      };
    }
  }, [refetchInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * useUpdateEventData
 * Update event data via API and trigger changelog
 */
export function useUpdateEventData(endpoint: string) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentEvent } = useMaestro();

  const update = useCallback(
    async (payload: Record<string, any>) => {
      if (!currentEvent) return null;

      try {
        setUpdating(true);
        setError(null);

        const result = await patch(
          `/api/maestro${endpoint.replace(":eventId", currentEvent.id)}`,
          payload,
        );

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Update failed";
        setError(errorMsg);
        console.error("[MAESTRO-DATA] Update error:", err);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [currentEvent, endpoint],
  );

  return {
    update,
    updating,
    error,
  };
}

/**
 * usePostEventAction
 * POST an action to the API (create, confirm, etc.)
 */
export function usePostEventAction(endpoint: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentEvent } = useMaestro();

  const execute = useCallback(
    async (payload?: Record<string, any>) => {
      if (!currentEvent) return null;

      try {
        setLoading(true);
        setError(null);

        const result = await post(
          `/api/maestro${endpoint.replace(":eventId", currentEvent.id)}`,
          payload || {},
        );

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Action failed";
        setError(errorMsg);
        console.error("[MAESTRO-DATA] POST error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentEvent, endpoint],
  );

  return {
    execute,
    loading,
    error,
  };
}

/**
 * usePollEventData
 * Continuously poll for event data (useful for real-time updates without WebSocket)
 */
export function usePollEventData<T = any>(
  endpoint: string,
  interval: number = 5000,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentEvent } = useMaestro();
  const pollTimerRef = useRef<NodeJS.Timer | null>(null);

  const poll = useCallback(async () => {
    if (!currentEvent) return;

    try {
      setLoading(true);

      const result = await get<T>(
        `/api/maestro${endpoint.replace(":eventId", currentEvent.id)}`,
      );

      if (result) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Poll failed";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentEvent, endpoint]);

  useEffect(() => {
    // Start polling
    poll();
    pollTimerRef.current = setInterval(poll, interval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [poll, interval]);

  return {
    data,
    loading,
    error,
    poll,
  };
}
