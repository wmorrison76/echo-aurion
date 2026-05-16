/**
 * Overtime Sentinel
 * Monitors scheduled hours vs thresholds; predicts overtime risk 3–7 days ahead;
 * suggests shift swaps or staffing changes; emits trace with explanation links.
 */

import { logger } from "../../lib/logger";

export interface ScheduleSnapshot {
  userId: string;
  date: string;
  scheduledHours: number;
  thresholdHours?: number;
}

export interface OvertimeRisk {
  userId: string;
  date: string;
  scheduledHours: number;
  thresholdHours: number;
  riskLevel: "low" | "medium" | "high";
  suggestedActions: string[];
  explanationTraceId?: string;
}

const DEFAULT_THRESHOLD = 40;

/**
 * Predict overtime risk 3–7 days ahead from schedule snapshot; suggest swaps/changes; emit trace.
 */
export async function runOvertimeSentinel(
  schedules: ScheduleSnapshot[],
  emitTrace: (eventType: string, payload: Record<string, unknown>) => Promise<string | null>
): Promise<OvertimeRisk[]> {
  const risks: OvertimeRisk[] = [];
  const byUser = new Map<string, ScheduleSnapshot[]>();
  for (const s of schedules) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }
  for (const [userId, list] of byUser) {
    const weekHours = list.reduce((sum, s) => sum + s.scheduledHours, 0);
    const threshold = list[0]?.thresholdHours ?? DEFAULT_THRESHOLD;
    let riskLevel: "low" | "medium" | "high" = "low";
    const suggestedActions: string[] = [];
    if (weekHours > threshold * 1.2) {
      riskLevel = "high";
      suggestedActions.push("Consider shift swap or additional hire");
    } else if (weekHours > threshold) {
      riskLevel = "medium";
      suggestedActions.push("Review shift distribution for next 3–7 days");
    }
    const traceId = `overtime-${userId}-${Date.now()}`;
    const risk: OvertimeRisk = {
      userId,
      date: list[0]?.date ?? "",
      scheduledHours: weekHours,
      thresholdHours: threshold,
      riskLevel,
      suggestedActions,
      explanationTraceId: traceId,
    };
    risks.push(risk);
    await emitTrace("OVERTIME_SENTINEL", {
      userId,
      weekHours,
      threshold,
      riskLevel,
      suggestedActions,
      traceId,
      explanationLink: `/api/trace-ledger?traceId=${traceId}`,
    });
  }
  logger.info("[OvertimeSentinel] Risks evaluated", { count: risks.length });
  return risks;
}
