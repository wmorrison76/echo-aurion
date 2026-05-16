import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  WeatherHistory,
  WeatherHistoryRequestPayload,
} from "@shared/weather/types";
import { requestWeatherHistory, WeatherApiError } from "./api";
interface UseWeatherHistoryOptions {
  autoRefreshMs?: number;
  enabled?: boolean;
}
interface UseWeatherHistoryState {
  history: WeatherHistory | null;
  loading: boolean;
  error: string | null;
  source: string | null;
  refresh: () => Promise<void>;
}
export function useWeatherHistory(
  payload: WeatherHistoryRequestPayload | null,
  options: UseWeatherHistoryOptions = {},
): UseWeatherHistoryState {
  const { autoRefreshMs = 6 * 60 * 60 * 1000, enabled = true } = options;
  const [history, setHistory] = useState<WeatherHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const latestPayload = useRef<WeatherHistoryRequestPayload | null>(payload);
  const executeFetch = useCallback(async () => {
    if (!enabled || !latestPayload.current) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await requestWeatherHistory(latestPayload.current);
      setHistory(data);
      setSource(meta.source);
    } catch (err) {
      if (err instanceof WeatherApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error while loading weather history");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  const refresh = useCallback(async () => {
    await executeFetch();
  }, [executeFetch]);
  useEffect(() => {
    latestPayload.current = payload;
  }, [payload]);
  useEffect(() => {
    if (!enabled || !payload) {
      return undefined;
    }
    executeFetch();
    if (autoRefreshMs <= 0) {
      return undefined;
    }
    refreshTimer.current = window.setInterval(() => {
      executeFetch();
    }, autoRefreshMs);
    return () => {
      if (refreshTimer.current) {
        window.clearInterval(refreshTimer.current);
      }
    };
  }, [autoRefreshMs, enabled, executeFetch, payload]);
  return useMemo(
    () => ({ history, loading, error, source, refresh }),
    [history, loading, error, source, refresh],
  );
}
