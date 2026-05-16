import {
  normalizeNoaaForecastPeriods,
  normalizePredictHqEvents,
  type NoaaClimatology,
  type NoaaNormalizationOptions,
  type NoaaForecastResponse,
  type PredictHqNormalizationOptions,
  type PredictHqResponse,
} from "../../shared/forecastDrivers";
import type {
  NoaaWeatherDriver,
  PredictHqEventDriver,
} from "../../shared/forecast";

export interface PredictHqFetchConfig {
  token: string;
  endpoint?: string;
  query?: Record<string, string | number | boolean>;
  normalization?: PredictHqNormalizationOptions;
}
const DEFAULT_PREDICTHQ_ENDPOINT = "https://api.predicthq.com/v1/events/";
async function requestPredictHqPage(url: URL, token: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PredictHQ request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as PredictHqResponse;
}
export async function fetchPredictHqDrivers(
  config: PredictHqFetchConfig,
): Promise<PredictHqEventDriver[]> {
  const endpoint = config.endpoint ?? DEFAULT_PREDICTHQ_ENDPOINT;
  const url = new URL(endpoint);
  if (config.query) {
    for (const [key, value] of Object.entries(config.query)) {
      url.searchParams.set(key, String(value));
    }
  }
  const allResults: PredictHqResponse["results"] = [];
  let nextUrl: URL | null = url;
  while (nextUrl) {
    const data = await requestPredictHqPage(nextUrl, config.token);
    allResults.push(...data.results);
    nextUrl = data.next ? new URL(data.next, endpoint) : null;
  }
  return normalizePredictHqEvents(
    { results: allResults },
    config.normalization,
  );
}

export interface NoaaFetchConfig {
  gridId: string;
  gridX: number;
  gridY: number;
  endpoint?: string;
  climatology?: NoaaClimatology;
  normalization?: NoaaNormalizationOptions;
}
const DEFAULT_NOAA_ENDPOINT = "https://api.weather.gov";
async function requestNoaaForecast(url: URL) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/ld+json",
      "User-Agent": "EchoAurum Forecast Studio",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`NOAA request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as NoaaForecastResponse;
}
export async function fetchNoaaDrivers(
  config: NoaaFetchConfig,
): Promise<NoaaWeatherDriver[]> {
  const base = config.endpoint ?? DEFAULT_NOAA_ENDPOINT;
  const url = new URL(
    `/gridpoints/${config.gridId}/${config.gridX},${config.gridY}/forecast`,
    base,
  );
  const forecast = await requestNoaaForecast(url);
  return normalizeNoaaForecastPeriods(
    forecast,
    config.climatology,
    config.normalization,
  );
}
