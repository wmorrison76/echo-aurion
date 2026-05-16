import type { RequestHandler } from "express";
import {
  applySensitivityAdjustments,
  buildForecastNarrative,
  buildForecastScenario,
  buildStressTestScenario,
  type BaseForecastInput,
  type NoaaWeatherDriver,
  type PredictHqEventDriver,
  type SensitivitySettings,
  type StressTestConfig,
} from "../../shared/forecast";
import {
  normalizeNoaaForecastPeriods,
  normalizePredictHqEvents,
  type NoaaClimatology,
  type NoaaForecastResponse,
  type NoaaNormalizationOptions,
  type PredictHqNormalizationOptions,
  type PredictHqResponse,
} from "../../shared/forecastDrivers";
import {
  fetchNoaaDrivers,
  fetchPredictHqDrivers,
} from "../services/forecastDrivers";
interface PredictHqDriverConfig {
  events?: PredictHqEventDriver[];
  response?: PredictHqResponse;
  token?: string;
  endpoint?: string;
  query?: Record<string, string | number | boolean>;
  normalization?: PredictHqNormalizationOptions;
}
interface NoaaDriverConfig {
  drivers?: NoaaWeatherDriver[];
  response?: NoaaForecastResponse;
  endpoint?: string;
  gridId?: string;
  gridX?: number;
  gridY?: number;
  climatology?: NoaaClimatology;
  normalization?: NoaaNormalizationOptions;
}
interface ForecastRequestBody {
  base: BaseForecastInput[];
  label?: string;
  events?: PredictHqEventDriver[];
  weather?: NoaaWeatherDriver[];
  sensitivity?: SensitivitySettings;
  stressTest?: StressTestConfig;
  drivers?: { predictHq?: PredictHqDriverConfig; noaa?: NoaaDriverConfig };
}
function isBaseForecastArray(value: unknown): value is BaseForecastInput[] {
  return (
    Array.isArray(value) && value.every((day) => typeof day?.date === "string")
  );
}
async function resolvePredictHqDrivers(
  body: ForecastRequestBody,
): Promise<PredictHqEventDriver[]> {
  const direct = body.drivers?.predictHq;
  if (direct?.events) {
    return direct.events;
  }
  if (direct?.response) {
    return normalizePredictHqEvents(direct.response, direct.normalization);
  }
  if (direct?.token) {
    return fetchPredictHqDrivers({
      token: direct.token,
      endpoint: direct.endpoint,
      query: direct.query,
      normalization: direct.normalization,
    });
  }
  if (Array.isArray(body.events)) {
    return body.events;
  }
  return [];
}
async function resolveNoaaDrivers(
  body: ForecastRequestBody,
): Promise<NoaaWeatherDriver[]> {
  const direct = body.drivers?.noaa;
  if (direct?.drivers) {
    return direct.drivers;
  }
  if (direct?.response) {
    return normalizeNoaaForecastPeriods(
      direct.response,
      direct.climatology,
      direct.normalization,
    );
  }
  if (
    direct?.gridId &&
    direct.gridX !== undefined &&
    direct.gridY !== undefined
  ) {
    return fetchNoaaDrivers({
      gridId: direct.gridId,
      gridX: direct.gridX,
      gridY: direct.gridY,
      endpoint: direct.endpoint,
      climatology: direct.climatology,
      normalization: direct.normalization,
    });
  }
  if (Array.isArray(body.weather)) {
    return body.weather;
  }
  return [];
}
export const handleForecast: RequestHandler = async (req, res) => {
  const body = req.body as ForecastRequestBody;
  if (!isBaseForecastArray(body?.base)) {
    return res.status(400).json({ error: "base forecast input required" });
  }
  try {
    const label = body.label ?? "Base";
    const base = body.sensitivity
      ? applySensitivityAdjustments(body.base, body.sensitivity)
      : body.base;
    const [events, weather] = await Promise.all([
      resolvePredictHqDrivers(body),
      resolveNoaaDrivers(body),
    ]);
    const scenarioInput = { base, events, weather };
    const scenario = body.stressTest
      ? buildStressTestScenario(scenarioInput, body.stressTest, label)
      : buildForecastScenario(scenarioInput, label);
    const narrative = buildForecastNarrative(scenario);
    res.json({ scenario, narrative, drivers: { events, weather } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Forecast driver failure";
    res.status(502).json({ error: message });
  }
};
