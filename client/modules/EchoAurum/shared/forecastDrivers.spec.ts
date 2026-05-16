import { describe, expect, it } from "vitest";
import type {
  PredictHqResponse,
  NoaaForecastResponse,
  NoaaClimatology,
} from "./forecastDrivers";
import {
  normalizeNoaaForecastPeriods,
  normalizePredictHqEvents,
} from "./forecastDrivers";
describe("normalizePredictHqEvents", () => {
  it("derives impact using rank, attendance, and duration", () => {
    const response: PredictHqResponse = {
      results: [
        {
          id: "evt-1",
          title: "Hospitality Expo",
          start: "2024-12-01",
          end: "2024-12-02",
          phq_rank: 85,
          attendance: 32000,
          duration: 36 * 3600,
          category: "conferences",
        },
        {
          id: "evt-2",
          title: "Local Concert",
          start: "2024-12-03",
          end: "2024-12-03",
          rank: 40,
          attendance: 4000,
          duration: 4 * 3600,
          category: "concerts",
        },
      ],
    };
    const events = normalizePredictHqEvents(response, {
      categoryMultipliers: { conferences: 1.2 },
      maxImpact: 0.5,
    });
    expect(events).toHaveLength(2);
    const [expo, concert] = events;
    expect(expo.impact).toBeGreaterThan(concert.impact);
    expect(expo.startDate).toBe("2024-12-01");
    expect(expo.endDate).toBe("2024-12-02");
  });
  it("caps impact at configured maximum", () => {
    const response: PredictHqResponse = {
      results: [
        {
          id: "evt-surge",
          title: "Mega Festival",
          start: "2024-12-10",
          end: "2024-12-12",
          phq_rank: 99,
          attendance: 500000,
          duration: 72 * 3600,
        },
      ],
    };
    const events = normalizePredictHqEvents(response, { maxImpact: 0.2 });
    expect(events[0].impact).toBeLessThanOrEqual(0.2);
  });
});
describe("normalizeNoaaForecastPeriods", () => {
  it("converts forecast periods into daily anomalies", () => {
    const response: NoaaForecastResponse = {
      properties: {
        periods: [
          {
            startTime: "2024-12-01T06:00:00-05:00",
            endTime: "2024-12-01T12:00:00-05:00",
            temperature: 68,
            temperatureUnit: "F",
            probabilityOfPrecipitation: { value: 40 },
          },
          {
            startTime: "2024-12-01T12:00:00-05:00",
            endTime: "2024-12-01T18:00:00-05:00",
            temperature: 70,
            temperatureUnit: "F",
            probabilityOfPrecipitation: { value: 55 },
          },
          {
            startTime: "2024-12-02T06:00:00-05:00",
            endTime: "2024-12-02T12:00:00-05:00",
            temperature: 60,
            temperatureUnit: "F",
            probabilityOfPrecipitation: { value: 10 },
          },
        ],
      },
    };
    const climatology: NoaaClimatology = {
      "2024-12-01": { avgTempC: 18, avgPrecipChance: 0.25 },
      "2024-12-02": { avgTempC: 16, avgPrecipChance: 0.3 },
    };
    const drivers = normalizeNoaaForecastPeriods(response, climatology);
    expect(drivers).toHaveLength(2);
    const first = drivers[0];
    expect(first.date).toBe("2024-12-01");
    expect(first.temperatureAnomaly).toBeCloseTo(
      ((68 - 32) * (5 / 9) + (70 - 32) * (5 / 9)) / 2 - 18,
      1,
    );
    expect(first.precipitationChance).toBeCloseTo((0.4 + 0.55) / 2, 3);
  });
  it("falls back to configured climatology defaults", () => {
    const response: NoaaForecastResponse = {
      properties: {
        periods: [
          {
            startTime: "2024-12-05T00:00:00Z",
            endTime: "2024-12-05T06:00:00Z",
            temperature: 15,
            temperatureUnit: "C",
            probabilityOfPrecipitation: { value: null },
          },
        ],
      },
    };
    const drivers = normalizeNoaaForecastPeriods(
      response,
      {},
      { fallbackAvgTempC: 12, fallbackAvgPrecipChance: 0.35 },
    );
    expect(drivers[0].temperatureAnomaly).toBeCloseTo(3, 5);
    expect(drivers[0].precipitationChance).toBeCloseTo(0.35, 5);
  });
});
