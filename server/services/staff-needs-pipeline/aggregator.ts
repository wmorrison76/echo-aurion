/**
 * Staff Needs Pipeline — Aggregates staff need layers and pinch points into ONM.
 * Consumes BEO staffing, shortage forecaster, labor model, and/or smoke run summary.
 */

import * as crypto from "crypto";
import fs from "fs";
import path from "path";
import type {
  StaffNeedLayer,
  PinchPoint,
  OperationalNeedsMapping,
  OperationalNeedsSummary,
  SmokeRunSummary,
  StaffNeedLevel,
} from "./types.js";
import type { EventStaffingRequirement } from "../beo-reo-staffing-analyzer.js";
import type { ShortageForecast } from "../staff-shortage-forecaster.js";
import type { LaborModelParams } from "../echostratus/models/labor-model.js";

const STAFF_LEVEL_BY_ROLE: Record<string, StaffNeedLevel> = {
  manager: "management",
  director: "management",
  executive: "management",
  lead: "supervisory",
  supervisor: "supervisory",
  chef: "supervisory",
  sous: "supervisory",
  temp: "temp",
  agency: "temp",
  contractor: "temp",
  cook: "line",
  server: "line",
  waiter: "line",
  steward: "line",
  busser: "line",
  garde: "line",
  pastry: "line",
  saucier: "line",
  bartender: "line",
  host: "line",
  runner: "line",
};

const DEFAULT_LEVEL = "line";

function roleToLevel(roleCode: string, roleName: string): StaffNeedLevel {
  const key = (roleCode || roleName || "").toLowerCase().replace(/\s+/g, "_");
  for (const [pattern, level] of Object.entries(STAFF_LEVEL_BY_ROLE)) {
    if (key.includes(pattern.replace("_", ""))) return level;
  }
  return DEFAULT_LEVEL;
}

function createPinchPoint(
  type: PinchPoint["type"],
  severity: PinchPoint["severity"],
  description: string,
  timeWindow: string,
  recommendedAction: string,
  relatedRoleCodes: string[],
  outletId?: string,
): PinchPoint {
  return {
    id: `pinch-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    type,
    severity,
    description,
    timeWindow,
    recommendedAction,
    relatedRoleCodes,
    outletId,
  };
}

export interface PipelineInputs {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  beoStaffing?: EventStaffingRequirement[];
  shortageForecast?: ShortageForecast;
  laborModel?: LaborModelParams;
  smokeRunSummary?: SmokeRunSummary;
}

/**
 * Build staff need layers from BEO/REO staffing analyzer output.
 */
function layersFromBeoStaffing(
  requirements: EventStaffingRequirement[],
  periodStart: string,
  periodEnd: string,
): StaffNeedLayer[] {
  const layers: StaffNeedLayer[] = [];
  for (const req of requirements) {
    for (const need of req.staffingNeeds) {
      const level = roleToLevel(need.roleCode, need.role);
      layers.push({
        level,
        roleCode: need.roleCode,
        roleName: need.role,
        count: need.count,
        timeWindow: `${req.eventDate}T${need.startTime}/${req.eventDate}T${need.endTime}`,
        source: "beo",
        estimatedHours: need.count * 6,
        notes: req.eventId,
      });
    }
  }
  return layers;
}

/**
 * Build staff need layers and pinch points from shortage forecast.
 */
function fromShortageForecast(
  forecast: ShortageForecast,
  periodStart: string,
  periodEnd: string,
): { layers: StaffNeedLayer[]; pinchPoints: PinchPoint[] } {
  const layers: StaffNeedLayer[] = [];
  const pinchPoints: PinchPoint[] = [];

  for (const s of forecast.shortages) {
    const level = roleToLevel(s.role, s.roleName);
    layers.push({
      level: s.shortage > 0 ? "temp" : level,
      roleCode: s.role,
      roleName: s.roleName,
      count: s.shortage > 0 ? s.shortage : s.needed,
      timeWindow: s.date,
      source: "shortage",
      notes: s.recommendedActions.join("; "),
    });

    if (s.severity === "critical" || s.severity === "high") {
      pinchPoints.push(
        createPinchPoint(
          "role",
          s.severity,
          `Staff shortage: ${s.roleName} — need ${s.shortage} more on ${s.date}`,
          s.date,
          s.recommendedActions[0] || "Add temp staff or job share",
          [s.role],
        ),
      );
    }
  }

  return { layers, pinchPoints };
}

/**
 * Build staff need layers from labor model (role capacities).
 */
function layersFromLaborModel(
  labor: LaborModelParams,
  periodStart: string,
  periodEnd: string,
): StaffNeedLayer[] {
  const layers: StaffNeedLayer[] = [];
  for (const role of labor.roles) {
    const level = roleToLevel(role.roleId, role.roleName);
    const estimatedCount = Math.ceil(
      (labor.scheduledHours || 0) / (8 * labor.roles.length) || 1,
    );
    layers.push({
      level,
      roleCode: role.roleId,
      roleName: role.roleName,
      count: estimatedCount,
      timeWindow: `${periodStart}/${periodEnd}`,
      outletId: labor.outletId,
      source: "labor_model",
      estimatedHours: labor.scheduledHours,
    });
  }
  return layers;
}

/**
 * Build a minimal ONM from smoke run summary (no live BEO/shortage/labor).
 */
function fromSmokeRunSummary(
  tenantId: string,
  summary: SmokeRunSummary,
  periodStart: string,
  periodEnd: string,
): { layers: StaffNeedLayer[]; pinchPoints: PinchPoint[] } {
  const layers: StaffNeedLayer[] = [];
  const scope = summary.scope;
  const totalSurface = (scope?.panels || 0) + (scope?.modules || 0) + (scope?.serverRoutes || 0) + (scope?.serverServices || 0);
  if (totalSurface > 0) {
    const lineCount = Math.max(1, Math.min(20, Math.ceil(totalSurface / 10)));
    const supervisoryCount = Math.max(1, Math.ceil(lineCount / 5));
    const managementCount = Math.max(1, Math.ceil(supervisoryCount / 3));
    layers.push(
      {
        level: "line",
        roleCode: "LINE",
        roleName: "Line (cooks, servers)",
        count: lineCount,
        timeWindow: `${periodStart}/${periodEnd}`,
        source: "smoke_run",
        notes: `From scope: ${scope?.panels || 0} panels, ${scope?.modules || 0} modules`,
      },
      {
        level: "supervisory",
        roleCode: "SUPERVISORY",
        roleName: "Supervisory",
        count: supervisoryCount,
        timeWindow: `${periodStart}/${periodEnd}`,
        source: "smoke_run",
      },
      {
        level: "management",
        roleCode: "MANAGEMENT",
        roleName: "Management",
        count: managementCount,
        timeWindow: `${periodStart}/${periodEnd}`,
        source: "smoke_run",
      },
    );
  }
  const pinchPoints: PinchPoint[] = [];
  if (summary.difficulty >= 4) {
    pinchPoints.push(
      createPinchPoint(
        "capacity",
        "low",
        "Stress test passed at high difficulty — system covered all positions.",
        `${periodStart}/${periodEnd}`,
        "Use ONM for ongoing staffing decisions.",
        [],
      ),
    );
  }
  return { layers, pinchPoints };
}

/**
 * Aggregate layers (merge same level+role+timeWindow), then build summary.
 */
function aggregateLayers(allLayers: StaffNeedLayer[]): StaffNeedLayer[] {
  const key = (l: StaffNeedLayer) => `${l.level}|${l.roleCode}|${l.timeWindow}|${l.outletId || ""}`;
  const map = new Map<string, StaffNeedLayer>();
  for (const l of allLayers) {
    const k = key(l);
    const existing = map.get(k);
    if (existing) existing.count += l.count;
    else map.set(k, { ...l });
  }
  return Array.from(map.values());
}

function buildSummary(
  staffLayers: StaffNeedLayer[],
  pinchPoints: PinchPoint[],
  periodStart: string,
  periodEnd: string,
): OperationalNeedsSummary {
  const totalFteByLevel: Record<StaffNeedLevel, number> = {
    temp: 0,
    line: 0,
    supervisory: 0,
    management: 0,
  };
  for (const l of staffLayers) {
    totalFteByLevel[l.level] = (totalFteByLevel[l.level] || 0) + l.count;
  }
  const criticalPinchCount = pinchPoints.filter((p) => p.severity === "critical").length;
  const highPinchCount = pinchPoints.filter((p) => p.severity === "high").length;
  return {
    totalFteByLevel,
    criticalPinchCount,
    highPinchCount,
    totalPinchPoints: pinchPoints.length,
    periodStart,
    periodEnd,
  };
}

/**
 * Run the staff needs pipeline and return an OperationalNeedsMapping.
 */
export async function runStaffNeedsPipeline(inputs: PipelineInputs): Promise<OperationalNeedsMapping> {
  const {
    tenantId,
    periodStart,
    periodEnd,
    beoStaffing,
    shortageForecast,
    laborModel,
    smokeRunSummary,
  } = inputs;

  const allLayers: StaffNeedLayer[] = [];
  const allPinchPoints: PinchPoint[] = [];

  if (beoStaffing?.length) {
    allLayers.push(...layersFromBeoStaffing(beoStaffing, periodStart, periodEnd));
  }

  if (shortageForecast) {
    const { layers, pinchPoints } = fromShortageForecast(
      shortageForecast,
      periodStart,
      periodEnd,
    );
    allLayers.push(...layers);
    allPinchPoints.push(...pinchPoints);
  }

  if (laborModel?.roles?.length) {
    allLayers.push(...layersFromLaborModel(laborModel, periodStart, periodEnd));
  }

  if (smokeRunSummary) {
    const { layers, pinchPoints } = fromSmokeRunSummary(
      tenantId,
      smokeRunSummary,
      periodStart,
      periodEnd,
    );
    allLayers.push(...layers);
    allPinchPoints.push(...pinchPoints);
  }

  const staffLayers = aggregateLayers(allLayers);
  const summary = buildSummary(staffLayers, allPinchPoints, periodStart, periodEnd);

  const mapping: OperationalNeedsMapping = {
    generatedAt: new Date().toISOString(),
    tenantId,
    period: { start: periodStart, end: periodEnd },
    staffLayers,
    pinchPoints: allPinchPoints,
    summary,
    metadata: smokeRunSummary
      ? {
          smokeRunId: smokeRunSummary.runId,
          difficulty: smokeRunSummary.difficulty,
          durationMs: smokeRunSummary.durationMs,
          scopePanels: smokeRunSummary.scope?.panels,
          scopeModules: smokeRunSummary.scope?.modules,
          connectivityScenarios: smokeRunSummary.connectivity?.length,
        }
      : undefined,
  };

  return mapping;
}

/**
 * Write ONM to disk as JSON and optional Markdown.
 */
export function writeOperationalNeedsMapping(
  mapping: OperationalNeedsMapping,
  outputDir: string,
): { jsonPath: string; mdPath: string } {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const base = `OPERATIONAL_NEEDS_MAPPING_${mapping.generatedAt.slice(0, 10)}_${Date.now()}`;
  const jsonPath = path.join(outputDir, `${base}.json`);
  const mdPath = path.join(outputDir, `${base}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(mapping, null, 2), "utf-8");

  const md = [
    "# Operational Needs Mapping",
    "",
    `Generated: ${mapping.generatedAt}`,
    `Tenant: ${mapping.tenantId}`,
    `Period: ${mapping.period.start} — ${mapping.period.end}`,
    "",
    "## Summary",
    "",
    `| Level | FTE |`,
    `|-------|-----|`,
    ...Object.entries(mapping.summary.totalFteByLevel).map(
      ([level, count]) => `| ${level} | ${count} |`,
    ),
    "",
    `Critical pinch points: ${mapping.summary.criticalPinchCount}`,
    `High pinch points: ${mapping.summary.highPinchCount}`,
    `Total pinch points: ${mapping.summary.totalPinchPoints}`,
    "",
    "## Staff Layers",
    "",
    ...mapping.staffLayers.map(
      (l) => `- **${l.roleName}** (${l.level}): ${l.count} — ${l.timeWindow} [${l.source}]`,
    ),
    "",
    "## Pinch Points",
    "",
    ...mapping.pinchPoints.map(
      (p) => `- [${p.severity}] ${p.description} — ${p.recommendedAction}`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(mdPath, md, "utf-8");
  return { jsonPath, mdPath };
}
