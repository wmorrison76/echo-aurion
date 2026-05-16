/**
 * Labor Forecast Service
 * Inputs: forecast covers, banquet guarantees, historical labor.
 * Outputs: recommended staffing by station/shift.
 * Emits trace: LABOR_RECOMMENDATION_CREATED.
 */

import { logger } from "../../lib/logger";

export interface LaborForecastInput {
  orgId: string;
  outletId?: string;
  date: string;
  forecastCovers?: number;
  banquetGuarantees?: number;
  historicalLaborHours?: number;
  historicalCovers?: number;
}

export interface StaffingRecommendation {
  stationId: string;
  stationName: string;
  shiftStart: string;
  shiftEnd: string;
  recommendedHours: number;
  recommendedHeadcount: number;
  rationale?: string;
}

export interface LaborForecastResult {
  orgId: string;
  outletId?: string;
  date: string;
  recommendations: StaffingRecommendation[];
  traceId: string;
  emittedAt: string;
}

const DEFAULT_STATIONS = [
  { stationId: "kitchen", stationName: "Kitchen" },
  { stationId: "foh", stationName: "Front of House" },
  { stationId: "bar", stationName: "Bar" },
];

/**
 * Compute recommended staffing by station/shift from covers, guarantees, and history.
 * Deterministic rules (no AI-only); emits LABOR_RECOMMENDATION_CREATED trace.
 */
export async function runLaborForecast(
  input: LaborForecastInput,
  emitTrace: (eventType: string, payload: Record<string, unknown>) => Promise<string | null>
): Promise<LaborForecastResult> {
  const { orgId, outletId, date, forecastCovers = 0, banquetGuarantees = 0, historicalLaborHours = 0, historicalCovers = 0 } = input;
  const totalCovers = forecastCovers + banquetGuarantees || Math.max(forecastCovers, historicalCovers, 1);
  const hoursPerCover = historicalCovers > 0 ? historicalLaborHours / historicalCovers : 0.08;
  const totalHours = Math.max(totalCovers * hoursPerCover, totalCovers * 0.05);
  const recommendations: StaffingRecommendation[] = DEFAULT_STATIONS.map((s, i) => {
    const share = i === 0 ? 0.5 : i === 1 ? 0.35 : 0.15;
    const hours = Math.round(totalHours * share * 10) / 10;
    return {
      stationId: s.stationId,
      stationName: s.stationName,
      shiftStart: "09:00",
      shiftEnd: "23:00",
      recommendedHours: hours,
      recommendedHeadcount: Math.max(1, Math.ceil(hours / 8)),
      rationale: `Share of total covers ${totalCovers}`,
    };
  });

  const traceId = `labor-${orgId}-${date}-${Date.now()}`;
  const emittedAt = new Date().toISOString();
  await emitTrace("LABOR_RECOMMENDATION_CREATED", {
    orgId,
    outletId,
    date,
    recommendations,
    traceId,
    emittedAt,
    totalCovers,
    totalHours,
  });
  logger.info("[LaborForecast] LABOR_RECOMMENDATION_CREATED", { orgId, date, traceId });
  return { orgId, outletId, date, recommendations, traceId, emittedAt };
}
