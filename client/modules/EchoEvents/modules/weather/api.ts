import { z } from "zod";
import {
  weatherForecastSchema,
  weatherRequestSchema,
  weatherHistorySchema,
  weatherHistoryRequestSchema,
  type WeatherRequestPayload,
  type WeatherHistoryRequestPayload,
} from "@shared/weather/types";
const weatherForecastResponseSchema = z.object({
  data: weatherForecastSchema,
  meta: z.object({ source: z.string() }),
});
const weatherHistoryResponseSchema = z.object({
  data: weatherHistorySchema,
  meta: z.object({ source: z.string() }),
});
export type WeatherApiResponse = z.infer<typeof weatherForecastResponseSchema>;
export type WeatherHistoryApiResponse = z.infer<
  typeof weatherHistoryResponseSchema
>;
export async function requestWeatherForecast(
  payload: WeatherRequestPayload,
): Promise<WeatherApiResponse> {
  const parsedPayload = weatherRequestSchema.parse(payload);
  const response = await fetch("/api/weather/forecast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsedPayload),
  });
  if (!response.ok) {
    let details: unknown = undefined;
    try {
      details = await response.json();
    } catch (error) {
      details = null;
    }
    throw new WeatherApiError(
      `Weather request failed (${response.status})`,
      details,
    );
  }
  const json = (await response.json()) as unknown;
  const validated = weatherForecastResponseSchema.parse(json);
  return validated;
}
export async function requestWeatherHistory(
  payload: WeatherHistoryRequestPayload,
): Promise<WeatherHistoryApiResponse> {
  const parsedPayload = weatherHistoryRequestSchema.parse(payload);
  const response = await fetch("/api/weather/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsedPayload),
  });
  if (!response.ok) {
    let details: unknown = undefined;
    try {
      details = await response.json();
    } catch (error) {
      details = null;
    }
    throw new WeatherApiError(
      `Weather history request failed (${response.status})`,
      details,
    );
  }
  const json = (await response.json()) as unknown;
  const validated = weatherHistoryResponseSchema.parse(json);
  return validated;
}
export class WeatherApiError extends Error {
  public readonly details: unknown;
  constructor(message: string, details: unknown) {
    super(message);
    this.details = details;
  }
}
