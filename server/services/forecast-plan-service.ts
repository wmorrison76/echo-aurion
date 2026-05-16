import type { TraceLedgerAppendInput } from "../../shared/types/trace-ledger";
import type { ForecastPlan, ForecastDay } from "./forecast-plan-store";
import { getForecastPlan, updateForecastPlan } from "./forecast-plan-store";
import { appendTraceEvent } from "./trace-ledger-fallback";

export interface DemandDelta {
  date: string;
  previousForecast: number;
  newForecast: number;
  delta: number;
}

export interface ActorContext {
  userId?: string;
  role?: string;
  system?: string;
}

/**
 * Compute demand deltas between previous and current forecast plans
 */
function computeDemandDeltas(
  previous: ForecastPlan | null,
  current: ForecastPlan,
): DemandDelta[] {
  if (!previous) {
    return [];
  }

  const deltas: DemandDelta[] = [];
  const previousByDate = new Map<string, ForecastDay>();
  previous.days.forEach((day) => {
    previousByDate.set(day.date, day);
  });

  current.days.forEach((day) => {
    const prevDay = previousByDate.get(day.date);
    if (prevDay) {
      const prevForecast = prevDay.override ?? prevDay.forecast;
      const newForecast = day.override ?? day.forecast;
      const delta = newForecast - prevForecast;

      if (delta !== 0) {
        deltas.push({
          date: day.date,
          previousForecast: prevForecast,
          newForecast,
          delta,
        });
      }
    }
  });

  return deltas;
}

/**
 * Generate a traceId (correlationId) for trace continuity
 */
function generateTraceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const loadForecastPlan = async (orgId: string) => {
  return getForecastPlan(orgId);
};

export const saveForecastPlan = async (
  orgId: string,
  plan: ForecastPlan,
  actor?: ActorContext,
) => {
  // Load previous plan to compute deltas
  const previous = await getForecastPlan(orgId);
  const updated = await updateForecastPlan(orgId, plan);

  // Generate traceId for continuity across domains
  const traceId = generateTraceId();
  const timestamp = new Date().toISOString();
  const actorContext = actor || { system: "forecast-hub" };

  const append = async (entry: Omit<TraceLedgerAppendInput, "orgId">) =>
    appendTraceEvent({ orgId, ...entry });

  // Emit standard forecast update trace
  await append({
    entityType: "forecast-plan",
    entityId: orgId,
    sourceRef: traceId,
    payload: {
      action: "FORECAST_UPDATED",
      days: updated.days.length,
      actor: actorContext,
      timestamp,
    },
  });

  const hasOverrides = updated.days.some(
    (day) => day.override != null && Number.isFinite(day.override),
  );
  if (hasOverrides) {
    await append({
      entityType: "forecast-plan",
      entityId: orgId,
      sourceRef: traceId,
      payload: {
        action: "FORECAST_OVERRIDE_SET",
        actor: actorContext,
        timestamp,
      },
    });
  }

  // Compute and emit demand deltas
  const deltas = computeDemandDeltas(previous, updated);
  for (const delta of deltas) {
    await append({
      entityType: "demand-delta",
      entityId: `delta-${delta.date}-${orgId}`,
      sourceRef: traceId,
      payload: {
        action: "DEMAND_DELTA_EMITTED",
        date: delta.date,
        previousForecast: delta.previousForecast,
        newForecast: delta.newForecast,
        delta: delta.delta,
        actor: actorContext,
        timestamp,
      },
    });
  }

  return { plan: updated, traceId, deltas };
};
