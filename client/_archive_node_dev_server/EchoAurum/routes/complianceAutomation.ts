import type { RequestHandler } from "express";
import {
  buildComplianceAutomationPlan,
  type ComplianceAutomationInput,
  type ComplianceIncident,
  type ControlAutomationTelemetry,
} from "../../shared/complianceAutomation";
import type { EvidenceControl } from "../../shared/compliance";
export const handleComplianceAutomation: RequestHandler = (req, res) => {
  const { controls, telemetry, incidents, currentTime } = req.body ?? {};
  const payload: ComplianceAutomationInput = {
    controls: coerceControls(controls),
    telemetry: coerceTelemetry(telemetry),
    incidents: coerceIncidents(incidents),
    currentTime: typeof currentTime === "string" ? currentTime : undefined,
  };
  try {
    const plan = buildComplianceAutomationPlan(payload);
    res.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to build compliance automation plan.";
    res.status(500).json({ error: message });
  }
};
function coerceControls(value: unknown): EvidenceControl[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isEvidenceControl) as EvidenceControl[];
}
function coerceTelemetry(value: unknown): ControlAutomationTelemetry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isControlAutomationTelemetry)
    .map((item) => normalizeTelemetry(item));
}
function coerceIncidents(value: unknown): ComplianceIncident[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const incidents = value.filter(isComplianceIncident) as ComplianceIncident[];
  return incidents.length > 0 ? incidents : undefined;
}
function isEvidenceControl(value: unknown): value is EvidenceControl {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<EvidenceControl>;
  return (
    typeof candidate.controlId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.framework === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.nextDueAt === "string" &&
    typeof candidate.owner === "string" &&
    typeof candidate.evidenceUri === "string"
  );
}
function isControlAutomationTelemetry(
  value: unknown,
): value is ControlAutomationTelemetry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<ControlAutomationTelemetry>;
  return (
    typeof candidate.controlId === "string" &&
    typeof candidate.lastWorkflowRunAt === "string" &&
    typeof candidate.successRate90d === "number" &&
    typeof candidate.averageCompletionMinutes === "number"
  );
}
function normalizeTelemetry(
  value: ControlAutomationTelemetry,
): ControlAutomationTelemetry {
  return {
    controlId: value.controlId,
    lastWorkflowRunAt: value.lastWorkflowRunAt,
    successRate90d: value.successRate90d,
    averageCompletionMinutes: value.averageCompletionMinutes,
    lastFailureAt:
      typeof value.lastFailureAt === "string" ? value.lastFailureAt : undefined,
    backlogCount:
      typeof value.backlogCount === "number" ? value.backlogCount : undefined,
    zapierLatencySeconds:
      typeof value.zapierLatencySeconds === "number"
        ? value.zapierLatencySeconds
        : undefined,
  };
}
function isComplianceIncident(value: unknown): value is ComplianceIncident {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<ComplianceIncident>;
  return (
    typeof candidate.controlId === "string" &&
    typeof candidate.detectedAt === "string" &&
    typeof candidate.severity === "string" &&
    typeof candidate.summary === "string"
  );
}
