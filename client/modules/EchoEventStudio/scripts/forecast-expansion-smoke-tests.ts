/**
 * Smoke tests for forecast expansion (aggregation, BEO, calendar, reservations, normalization).
 * Run from repo root: npx tsx client/modules/EchoEventStudio/scripts/forecast-expansion-smoke-tests.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

async function run() {
  const orgId = "demo-org";
  const dateRange = { start: "2026-01-01", end: "2026-01-07" };

  // 1. BEO integration (no DB: returns [])
  const { extractBEOForecastData } =
    await import("../../../../server/services/forecast/beo-integration");
  const beoPoints = await extractBEOForecastData(orgId, dateRange, null);
  assert(Array.isArray(beoPoints), "BEO integration should return array");
  console.log("OK: BEO integration returns array, length =", beoPoints.length);

  // 2. Event correlation
  const { correlateBEOToMealPeriod } =
    await import("../../../../server/services/forecast/event-correlation");
  const corr = correlateBEOToMealPeriod({
    beoId: "test",
    eventId: "e1",
    documentType: "Banquet Event Order",
    start: "2026-01-01T18:00:00",
    end: "2026-01-01T22:00:00",
    gtd: 50,
  });
  assert(Array.isArray(corr), "correlateBEOToMealPeriod should return array");
  console.log("OK: event correlation returns array, length =", corr.length);

  // 3. Data normalization
  const { normalizeForecastPoint, resolveConflicts } =
    await import("../../../../server/services/forecast/data-normalization");
  const point = {
    date: "2026-01-01",
    outletId: null,
    mealPeriod: "dinner" as const,
    guestCount: 100,
    source: "beo" as const,
    confidence: 0.9,
  };
  const normalized = normalizeForecastPoint(point, {
    type: "beo",
    weight: 0.95,
  });
  assert(
    normalized.date === point.date && normalized.guestCount === 100,
    "normalize preserves date and guestCount",
  );
  const resolved = resolveConflicts([normalized]);
  assert(resolved.length === 1, "resolveConflicts preserves single point");
  console.log("OK: data normalization and resolveConflicts");

  // 4. Aggregation engine (no fetchers: empty result)
  const { aggregateForecastData } =
    await import("../../../../server/services/forecast/aggregation-engine");
  const result = await aggregateForecastData(
    orgId,
    dateRange,
    {},
    { supabase: null, userId: "system" },
  );
  assert(
    result.orgId === orgId && Array.isArray(result.points),
    "aggregation returns AggregatedForecast",
  );
  assert(
    result.dateRange.start === dateRange.start &&
      result.dateRange.end === dateRange.end,
    "dateRange preserved",
  );
  console.log("OK: aggregation engine, points =", result.points.length);

  // 5. Variance analysis
  const { calculateAccuracyMetrics, identifySystematicErrors } =
    await import("../../../../server/services/forecast/variance-analysis");
  const variances = [
    {
      date: "2026-01-01",
      outletId: null,
      mealPeriod: "dinner",
      forecastGuestCount: 100,
      actualGuestCount: 95,
      varianceGuest: -5,
    },
    {
      date: "2026-01-02",
      outletId: null,
      mealPeriod: "dinner",
      forecastGuestCount: 100,
      actualGuestCount: 105,
      varianceGuest: 5,
    },
  ];
  const metrics = calculateAccuracyMetrics(variances);
  assert(
    typeof metrics.mape === "number" && metrics.sampleCount === 2,
    "accuracy metrics",
  );
  const systematic = identifySystematicErrors(variances);
  assert(Array.isArray(systematic), "systematic errors array");
  console.log("OK: variance analysis");

  // 6. Optimization
  const { optimizeForecastCoefficients } =
    await import("../../../../server/services/forecast/optimization-engine");
  const hist = [
    {
      date: "2026-01-01",
      outletId: null,
      mealPeriod: "dinner",
      forecastGuestCount: 100,
      forecastRevenue: 5000,
    },
    {
      date: "2026-01-02",
      outletId: null,
      mealPeriod: "dinner",
      forecastGuestCount: 100,
      forecastRevenue: 5000,
    },
  ];
  const actual = [
    {
      date: "2026-01-01",
      outletId: null,
      mealPeriod: "dinner",
      actualGuestCount: 95,
      actualRevenue: 4800,
    },
    {
      date: "2026-01-02",
      outletId: null,
      mealPeriod: "dinner",
      actualGuestCount: 105,
      actualRevenue: 5200,
    },
  ];
  const coeff = optimizeForecastCoefficients(hist, actual);
  assert(
    typeof coeff.guestCountMultiplier === "number",
    "optimization returns coefficients",
  );
  console.log("OK: optimization engine");

  console.log("\nAll forecast expansion smoke tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
