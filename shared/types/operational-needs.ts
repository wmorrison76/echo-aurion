/**
 * Operational Needs Mapping (ONM) — Data model for staff need layers and pinch points.
 * Used by the staff-needs pipeline, EchoStratus, EchoAurum, and decision-maker APIs.
 */

/** Staff need level: temp, line, supervisory, management */
export type StaffNeedLevel = "temp" | "line" | "supervisory" | "management";

/** One layer of staff need (role + count + time window). */
export interface StaffNeedLayer {
  level: StaffNeedLevel;
  roleCode: string;
  roleName: string;
  count: number;
  timeWindow: string; // e.g. "2026-02-15" or "2026-02-15T17:00/2026-02-15T23:00"
  outletId?: string;
  source: "beo" | "shortage" | "demand" | "labor_model" | "smoke_run";
  estimatedHours?: number;
  notes?: string;
}

/** Pinch point: operational stress (station, role, or time). */
export interface PinchPoint {
  id: string;
  type: "station" | "role" | "time" | "capacity";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  timeWindow: string;
  recommendedAction: string;
  relatedRoleCodes: string[];
  outletId?: string;
  metadata?: Record<string, unknown>;
}

/** Summary of an operational needs mapping. */
export interface OperationalNeedsSummary {
  totalFteByLevel: Record<StaffNeedLevel, number>;
  criticalPinchCount: number;
  highPinchCount: number;
  totalPinchPoints: number;
  periodStart: string;
  periodEnd: string;
}

/** Full operational needs mapping produced by the pipeline. */
export interface OperationalNeedsMapping {
  generatedAt: string;
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  staffLayers: StaffNeedLayer[];
  pinchPoints: PinchPoint[];
  summary: OperationalNeedsSummary;
  metadata?: {
    smokeRunId?: string;
    difficulty?: number;
    durationMs?: number;
    scopePanels?: number;
    scopeModules?: number;
    connectivityScenarios?: number;
  };
}

/** Summary passed from smoke harness when tests pass at max difficulty. */
export interface SmokeRunSummary {
  runId?: string;
  difficulty: number;
  durationMs: number;
  passedTests: number;
  totalTests: number;
  scope: {
    panels: number;
    modules: number;
    serverRoutes: number;
    serverServices: number;
    testFiles: number;
  };
  connectivity?: Array<{
    scenarioId: string;
    scenarioName: string;
    passed: boolean;
    durationMs: number;
  }>;
  reportMdPath?: string;
  reportJsonPath?: string;
}
