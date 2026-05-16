import { differenceInMinutes } from "date-fns";
import type {
  ControlFramework,
  ControlStatus,
  EvidenceControl,
} from "./compliance";
export type IncidentSeverity = "info" | "warning" | "critical";
export type AutomationHealth = "excellent" | "monitor" | "critical";
export type AutomationActionType =
  | "zapier"
  | "notification"
  | "runbook"
  | "ticket";
export interface ControlAutomationTelemetry {
  controlId: string;
  lastWorkflowRunAt: string;
  successRate90d: number;
  averageCompletionMinutes: number;
  lastFailureAt?: string;
  backlogCount?: number;
  zapierLatencySeconds?: number;
}
export interface ComplianceIncident {
  controlId: string;
  detectedAt: string;
  severity: IncidentSeverity;
  summary: string;
  remediationDeadline?: string;
  assignedTeam?: string;
}
export interface AutomationTrigger {
  event: "evidence_due" | "breach_detected" | "variance_detected";
  condition: string;
  severity: IncidentSeverity;
  signalSources: string[];
}
export interface AutomationAction {
  type: AutomationActionType;
  description: string;
  destination: string;
  parameters?: Record<string, string>;
}
export interface ZapierWorkflowMapping {
  workflowId: string;
  name: string;
  connectedApps: string[];
  status: "healthy" | "degraded";
  lastRunAt?: string;
  failuresPast24h: number;
  avgLatencySeconds?: number;
  url?: string;
}
export interface ControlAutomationWorkflow {
  controlId: string;
  title: string;
  framework: ControlFramework;
  owner: string;
  status: ControlStatus;
  automationHealth: AutomationHealth;
  nextDueAt: string;
  evidenceUri: string;
  automationPlaybook?: string;
  zapierWorkflowId?: string;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  metrics: {
    successRate90d: number;
    averageCompletionMinutes: number;
    backlogCount: number;
  };
  incidents: ComplianceIncident[];
}
export interface EnrichedComplianceIncident extends ComplianceIncident {
  controlTitle: string;
  framework: ControlFramework;
  automationHealth: AutomationHealth;
  workflowId?: string;
}
export interface ComplianceAutomationSummary {
  totalWorkflows: number;
  activeZapierWorkflows: number;
  automationHealth: Record<AutomationHealth, number>;
  frameworks: Record<
    ControlFramework,
    { count: number; critical: number; monitor: number }
  >;
  averageCompletionMinutes: number;
  generatedAt: string;
}
export interface ComplianceAutomationPlan {
  summary: ComplianceAutomationSummary;
  workflows: ControlAutomationWorkflow[];
  incidents: EnrichedComplianceIncident[];
  zapierCatalog: ZapierWorkflowMapping[];
  recommendations: string[];
}
export interface ComplianceAutomationInput {
  controls: EvidenceControl[];
  telemetry: ControlAutomationTelemetry[];
  incidents?: ComplianceIncident[];
  currentTime?: string;
}
const FRAMEWORK_APPS: Record<ControlFramework, string[]> = {
  SOC2: ["Jira", "Slack", "Guru"],
  PCI: ["Okta", "ServiceNow", "Splunk"],
  GDPR: ["Zendesk", "OneTrust", "Notion"],
};
export function buildComplianceAutomationPlan(
  input: ComplianceAutomationInput,
): ComplianceAutomationPlan {
  const now = input.currentTime ? new Date(input.currentTime) : new Date();
  const telemetryIndex = new Map<string, ControlAutomationTelemetry>();
  for (const item of input.telemetry) {
    telemetryIndex.set(item.controlId, normalizeTelemetry(item));
  }
  const incidentsByControl = new Map<string, ComplianceIncident[]>();
  for (const incident of input.incidents ?? []) {
    const list = incidentsByControl.get(incident.controlId) ?? [];
    list.push(incident);
    incidentsByControl.set(incident.controlId, list);
  }
  const workflows: ControlAutomationWorkflow[] = [];
  const zapierCatalogMap = new Map<string, ZapierWorkflowMapping>();
  const healthCounts: Record<AutomationHealth, number> = {
    excellent: 0,
    monitor: 0,
    critical: 0,
  };
  const frameworkSummary: Record<
    ControlFramework,
    { count: number; critical: number; monitor: number }
  > = {
    SOC2: { count: 0, critical: 0, monitor: 0 },
    PCI: { count: 0, critical: 0, monitor: 0 },
    GDPR: { count: 0, critical: 0, monitor: 0 },
  };
  const completionTimes: number[] = [];
  for (const control of input.controls) {
    const telemetry =
      telemetryIndex.get(control.controlId) ??
      buildDefaultTelemetry(control, now);
    const incidents = (incidentsByControl.get(control.controlId) ?? []).map(
      (incident) => normalizeIncident(incident),
    );
    const automationHealth = determineAutomationHealth(
      control.status,
      telemetry,
      incidents,
    );
    healthCounts[automationHealth] += 1;
    frameworkSummary[control.framework].count += 1;
    if (automationHealth === "critical") {
      frameworkSummary[control.framework].critical += 1;
    } else if (automationHealth === "monitor") {
      frameworkSummary[control.framework].monitor += 1;
    }
    completionTimes.push(telemetry.averageCompletionMinutes);
    const triggers = buildTriggers(control, automationHealth);
    const actions = buildActions(control, telemetry, automationHealth);
    if (control.zapierWorkflowId) {
      const mapping = resolveZapierMapping(
        control,
        telemetry,
        incidents,
        zapierCatalogMap.get(control.zapierWorkflowId),
      );
      zapierCatalogMap.set(control.zapierWorkflowId, mapping);
    }
    workflows.push({
      controlId: control.controlId,
      title: control.title,
      framework: control.framework,
      owner: control.owner,
      status: control.status,
      automationHealth,
      nextDueAt: control.nextDueAt,
      evidenceUri: control.evidenceUri,
      automationPlaybook: control.automationPlaybook,
      zapierWorkflowId: control.zapierWorkflowId,
      triggers,
      actions,
      metrics: {
        successRate90d: Number(telemetry.successRate90d.toFixed(2)),
        averageCompletionMinutes: Math.round(
          telemetry.averageCompletionMinutes,
        ),
        backlogCount: telemetry.backlogCount ?? 0,
      },
      incidents,
    });
  }
  const enrichedIncidents: EnrichedComplianceIncident[] = [];
  for (const workflow of workflows) {
    for (const incident of workflow.incidents) {
      enrichedIncidents.push({
        ...incident,
        controlTitle: workflow.title,
        framework: workflow.framework,
        automationHealth: workflow.automationHealth,
        workflowId: workflow.zapierWorkflowId,
      });
    }
  }
  enrichedIncidents.sort(compareIncidents);
  const summary: ComplianceAutomationSummary = {
    totalWorkflows: workflows.length,
    activeZapierWorkflows: zapierCatalogMap.size,
    automationHealth: healthCounts,
    frameworks: frameworkSummary,
    averageCompletionMinutes:
      completionTimes.length > 0
        ? Math.round(
            completionTimes.reduce((sum, value) => sum + value, 0) /
              completionTimes.length,
          )
        : 0,
    generatedAt: now.toISOString(),
  };
  const recommendations = buildRecommendations(workflows, enrichedIncidents);
  return {
    summary,
    workflows: workflows.sort((a, b) => priorityScore(a) - priorityScore(b)),
    incidents: enrichedIncidents,
    zapierCatalog: Array.from(zapierCatalogMap.values()).sort(
      compareZapierMappings,
    ),
    recommendations,
  };
}
function normalizeTelemetry(
  telemetry: ControlAutomationTelemetry,
): ControlAutomationTelemetry {
  return {
    controlId: telemetry.controlId,
    lastWorkflowRunAt: telemetry.lastWorkflowRunAt,
    successRate90d: clamp(telemetry.successRate90d, 0, 1),
    averageCompletionMinutes: Math.max(0, telemetry.averageCompletionMinutes),
    lastFailureAt: telemetry.lastFailureAt,
    backlogCount: telemetry.backlogCount ?? 0,
    zapierLatencySeconds: telemetry.zapierLatencySeconds,
  };
}
function normalizeIncident(incident: ComplianceIncident): ComplianceIncident {
  return {
    controlId: incident.controlId,
    detectedAt: incident.detectedAt,
    severity: incident.severity,
    summary: incident.summary,
    remediationDeadline: incident.remediationDeadline,
    assignedTeam: incident.assignedTeam ?? "Compliance Operations",
  };
}
function buildDefaultTelemetry(
  control: EvidenceControl,
  now: Date,
): ControlAutomationTelemetry {
  const timeSinceRun = Math.max(
    0,
    differenceInMinutes(now, new Date(control.lastRunAt)),
  );
  const backlog =
    control.status === "failing" ? 4 : control.status === "attention" ? 2 : 0;
  return {
    controlId: control.controlId,
    lastWorkflowRunAt: control.lastRunAt,
    successRate90d:
      control.status === "passing"
        ? 0.96
        : control.status === "attention"
          ? 0.83
          : 0.68,
    averageCompletionMinutes: Math.max(
      30,
      Math.min(240, timeSinceRun / 6 + 30),
    ),
    lastFailureAt: control.status === "passing" ? undefined : control.lastRunAt,
    backlogCount: backlog,
    zapierLatencySeconds: 45,
  };
}
function determineAutomationHealth(
  status: ControlStatus,
  telemetry: ControlAutomationTelemetry,
  incidents: ComplianceIncident[],
): AutomationHealth {
  const hasCriticalIncident = incidents.some(
    (incident) => incident.severity === "critical",
  );
  if (status === "failing" || hasCriticalIncident) {
    return "critical";
  }
  if (
    status === "attention" ||
    telemetry.successRate90d < 0.88 ||
    (telemetry.backlogCount ?? 0) > 1
  ) {
    return "monitor";
  }
  return "excellent";
}
function buildTriggers(
  control: EvidenceControl,
  automationHealth: AutomationHealth,
): AutomationTrigger[] {
  const triggers: AutomationTrigger[] = [];
  const leadTimeDays =
    automationHealth === "critical"
      ? 3
      : automationHealth === "monitor"
        ? 5
        : 7;
  triggers.push({
    event: "evidence_due",
    condition: `${leadTimeDays} days before ${control.framework} evidence due (${control.nextDueAt})`,
    severity:
      automationHealth === "critical"
        ? "critical"
        : automationHealth === "monitor"
          ? "warning"
          : "info",
    signalSources: ["Schedule service", "EchoLedger variance scanner"],
  });
  if (control.status !== "passing") {
    triggers.push({
      event: "breach_detected",
      condition: `${control.status.toUpperCase()} status detected during automated review`,
      severity: control.status === "failing" ? "critical" : "warning",
      signalSources: ["Argus audit trail", "Zelda variance engine"],
    });
  }
  return triggers;
}
function buildActions(
  control: EvidenceControl,
  telemetry: ControlAutomationTelemetry,
  automationHealth: AutomationHealth,
): AutomationAction[] {
  const actions: AutomationAction[] = [];
  if (control.zapierWorkflowId) {
    actions.push({
      type: "zapier",
      description: "Execute evidence capture Zap",
      destination: control.zapierWorkflowId,
      parameters: {
        playbook: control.automationPlaybook ?? "",
        expectedCompletion: `${Math.round(telemetry.averageCompletionMinutes)} minutes`,
      },
    });
  }
  actions.push({
    type: "notification",
    description: "Notify control owner in Slack",
    destination: `slack://user/${control.owner.replace(/\s+/g, "_").toLowerCase()}`,
    parameters: {
      channel: "#compliance-ops",
      priority:
        automationHealth === "critical"
          ? "p0"
          : automationHealth === "monitor"
            ? "p1"
            : "p2",
    },
  });
  actions.push({
    type: "runbook",
    description: "Attach Argus remediation runbook",
    destination:
      control.automationPlaybook ??
      `${control.framework}-${control.controlId}::standard-runbook`,
    parameters: { location: control.evidenceUri },
  });
  if (automationHealth === "critical") {
    actions.push({
      type: "ticket",
      description: "Open escalation ticket in ServiceNow",
      destination: "servicenow://incident",
      parameters: {
        assignmentGroup: "Compliance Engineering",
        controlId: control.controlId,
      },
    });
  }
  return actions;
}
function resolveZapierMapping(
  control: EvidenceControl,
  telemetry: ControlAutomationTelemetry,
  incidents: ComplianceIncident[],
  existing?: ZapierWorkflowMapping,
): ZapierWorkflowMapping {
  const failuresPast24h = incidents.filter(
    (incident) =>
      incident.severity === "critical" &&
      occurredWithinHours(incident.detectedAt, 24),
  ).length;
  const status =
    telemetry.successRate90d < 0.85 ||
    failuresPast24h > 0 ||
    (telemetry.zapierLatencySeconds ?? 0) > 120
      ? "degraded"
      : "healthy";
  const workflowKey = control.zapierWorkflowId!;
  const name = control.automationPlaybook ?? humanizeWorkflowId(workflowKey);
  if (existing) {
    return {
      ...existing,
      status:
        existing.status === "degraded" || status === "degraded"
          ? "degraded"
          : "healthy",
      failuresPast24h: existing.failuresPast24h + failuresPast24h,
      avgLatencySeconds: normalizeLatency(
        existing.avgLatencySeconds,
        telemetry.zapierLatencySeconds,
      ),
      lastRunAt: pickLatest(existing.lastRunAt, telemetry.lastWorkflowRunAt),
    };
  }
  return {
    workflowId: workflowKey,
    name,
    connectedApps: FRAMEWORK_APPS[control.framework],
    status,
    lastRunAt: telemetry.lastWorkflowRunAt,
    failuresPast24h,
    avgLatencySeconds: telemetry.zapierLatencySeconds,
    url: buildZapierUrl(workflowKey),
  };
}
function buildRecommendations(
  workflows: ControlAutomationWorkflow[],
  incidents: EnrichedComplianceIncident[],
): string[] {
  const recommendations: string[] = [];
  const criticalWorkflows = workflows.filter(
    (workflow) => workflow.automationHealth === "critical",
  );
  if (criticalWorkflows.length > 0) {
    recommendations.push(
      `Escalate remediation for ${criticalWorkflows.length} critical workflow${criticalWorkflows.length > 1 ? "s" : ""}, prioritizing ${criticalWorkflows
        .slice(0, 2)
        .map((workflow) => workflow.title)
        .join(" and")}.`,
    );
  }
  const degradedZapier = workflows
    .filter(
      (workflow) =>
        workflow.zapierWorkflowId &&
        workflow.actions.some((action) => action.type === "zapier"),
    )
    .filter((workflow) => workflow.automationHealth !== "excellent");
  if (degradedZapier.length > 0) {
    recommendations.push(
      `Review Zapier workflows for ${degradedZapier.length} control${degradedZapier.length > 1 ? "s" : ""} experiencing latency or failures.`,
    );
  }
  const approachingDeadlines = incidents.filter(
    (incident) =>
      incident.remediationDeadline &&
      occurredWithinHours(incident.remediationDeadline, 48),
  );
  if (approachingDeadlines.length > 0) {
    recommendations.push(
      `Resolve ${approachingDeadlines.length} incident${approachingDeadlines.length > 1 ? "s" : ""} with remediation deadlines inside 48 hours.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "All compliance automations are healthy. Continue monitoring telemetry.",
    );
  }
  return recommendations;
}
function priorityScore(workflow: ControlAutomationWorkflow) {
  const healthWeight =
    workflow.automationHealth === "critical"
      ? 0
      : workflow.automationHealth === "monitor"
        ? 1
        : 2;
  const statusWeight =
    workflow.status === "failing" ? 0 : workflow.status === "attention" ? 1 : 2;
  return healthWeight * 10 + statusWeight;
}
function compareIncidents(
  a: EnrichedComplianceIncident,
  b: EnrichedComplianceIncident,
) {
  const severityOrder = { critical: 0, warning: 1, info: 2 } as const;
  const diff = severityOrder[a.severity] - severityOrder[b.severity];
  if (diff !== 0) {
    return diff;
  }
  return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
}
function compareZapierMappings(
  a: ZapierWorkflowMapping,
  b: ZapierWorkflowMapping,
) {
  if (a.status === b.status) {
    return (b.avgLatencySeconds ?? 0) - (a.avgLatencySeconds ?? 0);
  }
  return a.status === "degraded" ? -1 : 1;
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function occurredWithinHours(timestamp: string, hours: number) {
  const target = new Date(timestamp).getTime();
  const now = Date.now();
  const threshold = hours * 60 * 60 * 1000;
  return now - target <= threshold;
}
function humanizeWorkflowId(value: string) {
  const trimmed = value.replace("zapier:workflow:", "");
  return trimmed
    .split(/[\-_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}
function normalizeLatency(current?: number, next?: number) {
  if (typeof current === "number" && typeof next === "number") {
    return Math.round((current + next) / 2);
  }
  return typeof current === "number" ? current : next;
}
function pickLatest(
  current: string | undefined,
  candidate: string | undefined,
) {
  if (!current) {
    return candidate;
  }
  if (!candidate) {
    return current;
  }
  return new Date(candidate) > new Date(current) ? candidate : current;
}
function buildZapierUrl(workflowId: string) {
  const key = workflowId.replace("zapier:workflow:", "");
  return `https://zapier.com/app/editor/${key}`;
}
