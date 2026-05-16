/** * useSensorReadings - React hooks for sensor data management * Handles temperature, humidity, weight, and spoilage predictions */ import {
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  SensorReading,
  SensorReadingsDaily,
  WeightReading,
  SpoilagePrediction,
  TemperatureComplianceEvent,
} from "@shared/types/iot";
import * as sensorAPI from "@shared/api/sensor-readings";
interface UseSensorReadingsOptions {
  organizationId: string;
  outletId?: string;
  deviceId?: string;
  readingType?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useSensorReadings(options: UseSensorReadingsOptions) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sensorAPI.getSensorReadings(options.organizationId, {
        outletId: options.outletId,
        deviceId: options.deviceId,
        readingType: options.readingType,
        limit: 100,
      });
      setReadings(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch sensor readings"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    options.organizationId,
    options.outletId,
    options.deviceId,
    options.readingType,
  ]);
  useEffect(() => {
    fetchReadings();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchReadings,
        (options.refreshInterval || 60) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchReadings, options.autoRefresh, options.refreshInterval]);
  const addReading = useCallback(
    async (reading: Omit<SensorReading, "id" | "read_at">) => {
      try {
        const newReading = await sensorAPI.createSensorReading(reading);
        setReadings([newReading, ...readings]);
        return newReading;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to create sensor reading");
      }
    },
    [readings],
  );
  return { readings, loading, error, refetch: fetchReadings, addReading };
}
interface UseSensorTrendOptions {
  organizationId: string;
  outletId?: string;
  deviceId?: string;
  readingType?: string;
  days?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useSensorTrend(options: UseSensorTrendOptions) {
  const [dailyReadings, setDailyReadings] = useState<SensorReadingsDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchTrend = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sensorAPI.getSensorReadingsDaily(
        options.organizationId,
        {
          outletId: options.outletId,
          deviceId: options.deviceId,
          readingType: options.readingType,
        },
      );
      setDailyReadings(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch sensor trend"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    options.organizationId,
    options.outletId,
    options.deviceId,
    options.readingType,
  ]);
  useEffect(() => {
    fetchTrend();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchTrend,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchTrend, options.autoRefresh, options.refreshInterval]);
  const stats = {
    avgValue: dailyReadings.length
      ? dailyReadings.reduce((sum, r) => sum + (r.avg_value || 0), 0) /
        dailyReadings.length
      : 0,
    minValue: dailyReadings.length
      ? Math.min(...dailyReadings.map((r) => r.min_value || 0))
      : 0,
    maxValue: dailyReadings.length
      ? Math.max(...dailyReadings.map((r) => r.max_value || 0))
      : 0,
  };
  return { dailyReadings, loading, error, refetch: fetchTrend, stats };
}
interface UseWeightReadingsOptions {
  organizationId: string;
  outletId?: string;
  deviceId?: string;
  productId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useWeightReadings(options: UseWeightReadingsOptions) {
  const [readings, setReadings] = useState<WeightReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sensorAPI.getWeightReadings(options.organizationId, {
        outletId: options.outletId,
        deviceId: options.deviceId,
        productId: options.productId,
        limit: 100,
      });
      setReadings(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch weight readings"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    options.organizationId,
    options.outletId,
    options.deviceId,
    options.productId,
  ]);
  useEffect(() => {
    fetchReadings();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchReadings,
        (options.refreshInterval || 120) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchReadings, options.autoRefresh, options.refreshInterval]);
  const addReading = useCallback(
    async (reading: Omit<WeightReading, "id" | "created_at">) => {
      try {
        const newReading = await sensorAPI.createWeightReading(reading);
        setReadings([newReading, ...readings]);
        return newReading;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to create weight reading");
      }
    },
    [readings],
  );
  const spoilageRisks = readings.filter((r) => r.is_spoilage_risk);
  return {
    readings,
    loading,
    error,
    refetch: fetchReadings,
    addReading,
    spoilageRisks,
  };
}
interface UseSpoilageOptions {
  organizationId: string;
  outletId?: string;
  highRiskOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useSpoilagePredictions(options: UseSpoilageOptions) {
  const [predictions, setPredictions] = useState<SpoilagePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      let data = await sensorAPI.getSpoilagePredictions(
        options.organizationId,
        {
          outletId: options.outletId,
          riskLevel: options.highRiskOnly ? "high" : undefined,
        },
      );
      if (options.highRiskOnly) {
        data = data.filter(
          (p) => p.risk_level === "high" || p.risk_level === "critical",
        );
      }
      setPredictions(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch spoilage predictions"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId, options.highRiskOnly]);
  useEffect(() => {
    fetchPredictions();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchPredictions,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchPredictions, options.autoRefresh, options.refreshInterval]);
  const summary = {
    total: predictions.length,
    critical: predictions.filter((p) => p.risk_level === "critical").length,
    high: predictions.filter((p) => p.risk_level === "high").length,
    medium: predictions.filter((p) => p.risk_level === "medium").length,
    low: predictions.filter((p) => p.risk_level === "low").length,
  };
  return { predictions, loading, error, refetch: fetchPredictions, summary };
}
interface UseTemperatureComplianceOptions {
  organizationId: string;
  outletId?: string;
  unresolved?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useTemperatureCompliance(
  options: UseTemperatureComplianceOptions,
) {
  const [events, setEvents] = useState<TemperatureComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sensorAPI.getTemperatureComplianceEvents(
        options.organizationId,
        { outletId: options.outletId, unresolved: options.unresolved },
      );
      setEvents(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch temperature compliance events"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId, options.unresolved]);
  useEffect(() => {
    fetchEvents();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchEvents,
        (options.refreshInterval || 60) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchEvents, options.autoRefresh, options.refreshInterval]);
  const acknowledgeEvent = useCallback(
    async (eventId: string, acknowledgedBy: string, notes?: string) => {
      try {
        const updated = await sensorAPI.acknowledgeTemperatureEvent(
          eventId,
          acknowledgedBy,
          notes,
        );
        setEvents(events.map((e) => (e.id === eventId ? updated : e)));
        return updated;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to acknowledge event");
      }
    },
    [events],
  );
  const clearEvent = useCallback(
    async (eventId: string) => {
      try {
        const updated = await sensorAPI.clearTemperatureEvent(eventId);
        setEvents(events.map((e) => (e.id === eventId ? updated : e)));
        return updated;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to clear event");
      }
    },
    [events],
  );
  const summary = {
    total: events.length,
    unresolved: events.filter((e) => !e.cleared_at).length,
    critical: events.filter((e) => e.severity === "critical").length,
  };
  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    acknowledgeEvent,
    clearEvent,
    summary,
  };
}
