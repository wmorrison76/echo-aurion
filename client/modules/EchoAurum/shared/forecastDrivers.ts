import type { NoaaWeatherDriver, PredictHqEventDriver } from "./forecast";
export interface PredictHqEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  category?: string;
  rank?: number;
  local_rank?: number;
  phq_rank?: number;
  duration?: number; // seconds attendance?: number; impact_models?: { forecast?: { occupancy?: number; adr?: number; }; };
}
export interface PredictHqResponse {
  results: PredictHqEvent[];
  next?: string | null;
  previous?: string | null;
}
export interface PredictHqNormalizationOptions {
  rankWeight?: number;
  attendanceWeight?: number;
  durationWeight?: number;
  attendanceLogBase?: number;
  maxImpact?: number;
  categoryMultipliers?: Record<string, number>;
  impactScale?: number;
}
const DEFAULT_PREDICTHQ_OPTIONS: Required<PredictHqNormalizationOptions> = {
  rankWeight: 0.5,
  attendanceWeight: 0.35,
  durationWeight: 0.15,
  attendanceLogBase: 10,
  maxImpact: 0.35,
  categoryMultipliers: {},
  impactScale: 1,
};
function normalizeRank(event: PredictHqEvent) {
  const rank = event.phq_rank ?? event.rank ?? event.local_rank ?? 0;
  return Math.max(0, Math.min(1, rank / 100));
}
function normalizeAttendance(event: PredictHqEvent, logBase: number) {
  if (!event.attendance || event.attendance <= 0) {
    return 0;
  }
  const adjustedBase = Math.max(2, logBase);
  const numerator = Math.log(event.attendance + 1);
  const denominator = Math.log(adjustedBase ** 5); // treat ~base^5 as"max" scale event return Math.max(0, Math.min(1, numerator / denominator));
}
function normalizeDuration(event: PredictHqEvent) {
  if (!event.duration || event.duration <= 0) {
    return 0;
  }
  const hours = event.duration / 3600;
  const cappedHours = Math.min(hours, 48);
  return cappedHours / 48;
}
export function normalizePredictHqEvents(
  response: PredictHqResponse,
  options: PredictHqNormalizationOptions = {},
): PredictHqEventDriver[] {
  const resolved = { ...DEFAULT_PREDICTHQ_OPTIONS, ...options };
  const categoryWeights = resolved.categoryMultipliers ?? {};
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  return response.results
    .map((event) => {
      const rankComponent = safe(normalizeRank(event)) * resolved.rankWeight;
      const attendanceComponent =
        safe(normalizeAttendance(event, resolved.attendanceLogBase)) *
        resolved.attendanceWeight;
      const durationComponent =
        safe(normalizeDuration(event)) * resolved.durationWeight;
      const multiplier = categoryWeights[event.category ?? ""] ?? 1;
      const modeledOccupancy = safe(
        event.impact_models?.forecast?.occupancy ?? 0,
      );
      let impact =
        (rankComponent + attendanceComponent + durationComponent) * multiplier +
        modeledOccupancy;
      impact = safe(impact);
      const scaledImpact = impact * resolved.impactScale;
      const boundedImpact = Math.max(
        -resolved.maxImpact,
        Math.min(resolved.maxImpact, scaledImpact),
      );
      const out = Number(boundedImpact.toFixed(4));
      return {
        id: event.id,
        name: event.title,
        impact: Number.isFinite(out) ? out : 0,
        startDate: event.start,
        endDate: event.end,
      } satisfies PredictHqEventDriver;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
export interface NoaaForecastPeriod {
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit: "F" | "C";
  probabilityOfPrecipitation?: { value: number | null; unitCode?: string };
}
export interface NoaaForecastProperties {
  periods: NoaaForecastPeriod[];
}
export interface NoaaForecastResponse {
  properties: NoaaForecastProperties;
}
export interface NoaaClimatologyEntry {
  avgTempC: number;
  avgPrecipChance: number; // 0-1
}
export type NoaaClimatology = Record<string, NoaaClimatologyEntry>;
export interface NoaaNormalizationOptions {
  fallbackAvgTempC?: number;
  fallbackAvgPrecipChance?: number;
}
const DEFAULT_NOAA_OPTIONS: Required<NoaaNormalizationOptions> = {
  fallbackAvgTempC: 18,
  fallbackAvgPrecipChance: 0.2,
};
function toCelsius(value: number, unit: "F" | "C") {
  return unit === "C" ? value : ((value - 32) * 5) / 9;
}
function probabilityToRatio(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value / 100));
}
export function normalizeNoaaForecastPeriods(
  response: NoaaForecastResponse,
  climatology: NoaaClimatology = {},
  options: NoaaNormalizationOptions = {},
): NoaaWeatherDriver[] {
  const resolved = { ...DEFAULT_NOAA_OPTIONS, ...options };
  const aggregates = new Map<
    string,
    {
      tempSum: number;
      tempCount: number;
      precipSum: number;
      precipCount: number;
    }
  >();
  for (const period of response.properties.periods) {
    const date = period.startTime.slice(0, 10);
    const entry = aggregates.get(date) ?? {
      tempSum: 0,
      tempCount: 0,
      precipSum: 0,
      precipCount: 0,
    };
    entry.tempSum += toCelsius(period.temperature, period.temperatureUnit);
    entry.tempCount += 1;
    const precipRatio = probabilityToRatio(
      period.probabilityOfPrecipitation?.value ?? undefined,
    );
    if (precipRatio !== undefined) {
      entry.precipSum += precipRatio;
      entry.precipCount += 1;
    }
    aggregates.set(date, entry);
  }
  return [...aggregates.entries()]
    .map(([date, aggregate]) => {
      const avgTempC = aggregate.tempSum / Math.max(aggregate.tempCount, 1);
      const avgPrecipChance =
        aggregate.precipCount > 0
          ? aggregate.precipSum / aggregate.precipCount
          : undefined;
      const baseline = climatology[date] ?? {
        avgTempC: resolved.fallbackAvgTempC,
        avgPrecipChance: resolved.fallbackAvgPrecipChance,
      };
      const precipitationChance = avgPrecipChance ?? baseline.avgPrecipChance;
      return {
        date,
        temperatureAnomaly: Number((avgTempC - baseline.avgTempC).toFixed(3)),
        precipitationChance: Number(
          Math.max(0, Math.min(1, precipitationChance)).toFixed(3),
        ),
      } satisfies NoaaWeatherDriver;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
