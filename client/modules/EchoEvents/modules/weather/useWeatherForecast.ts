import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  WeatherForecast,
  WeatherRequestPayload,
} from "@shared/weather/types";
import { requestWeatherForecast, WeatherApiError } from "./api";
interface UseWeatherForecastOptions {
  autoRefreshMs?: number;
  enabled?: boolean;
}
interface UseWeatherForecastState {
  forecast: WeatherForecast | null;
  loading: boolean;
  error: string | null;
  source: string | null;
  refresh: () => Promise<void>;
}
export function useWeatherForecast(
  payload: WeatherRequestPayload | null,
  options: UseWeatherForecastOptions = {},
): UseWeatherForecastState {
  const { autoRefreshMs = 15 * 60 * 1000, enabled = true } = options;
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const latestPayload = useRef<WeatherRequestPayload | null>(payload);
  const executeFetch = useCallback(async () => {
    if (!enabled || !latestPayload.current) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await requestWeatherForecast(
        latestPayload.current,
      );
      setForecast(data);
      setSource(meta.source);
    } catch (err) {
      if (err instanceof WeatherApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error while loading weather");
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
    () => ({ forecast, loading, error, source, refresh }),
    [forecast, loading, error, source, refresh],
  );
}
