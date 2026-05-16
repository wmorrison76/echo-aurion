import {
  buildComplianceDashboard,
  type ComplianceDashboard,
  type EvidenceControl,
  type ControlBreach,
} from "./compliance";
import type { SessionRiskLevel } from "./session";
export type ConnectorStatus = "healthy" | "degraded" | "disconnected";
export type AutomationStatus = "scheduled" | "running" | "paused";
export type AutomationResult = "success" | "warning" | "error";
export type TimelineCategory =
  | "compliance"
  | "automation"
  | "session"
  | "integration";
export type TimelineSeverity = "info" | "success" | "warning" | "critical";
export type RecommendationPriority = "high" | "medium" | "low";
export type ProfileRiskTier = "low" | "moderate" | "elevated";
export interface ProfileUserIdentity {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  entity: string;
  authenticationProvider: string;
  timezone: string;
  avatarUrl?: string;
  guardrails: string[];
  responsibilities: string[];
  lastLoginAt: string;
  mfaEnrolled: boolean;
}
export interface ProfileSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  mfaVerifiedAt?: string;
  riskLevel: SessionRiskLevel;
  guardrailsObserved: string[];
}
export interface ProfileConnector {
  id: string;
  name: string;
  vendor: string;
  category: string;
  status: ConnectorStatus;
  lastSyncAt: string;
  coverage: ControlBreach["framework"][];
  automationCount: number;
  detail: string;
}
export interface ProfileAutomationRun {
  id: string;
  controlId: string;
  title: string;
  zapierWorkflowId: string;
  targetApp: string;
  lastRunAt: string;
  nextRunAt: string;
  status: AutomationStatus;
  outcome: AutomationResult;
}
export interface ProfileTimelineEvent {
  id: string;
  timestamp: string;
  category: TimelineCategory;
  severity: TimelineSeverity;
  summary: string;
  details?: string;
  relatedControlId?: string;
  relatedAutomationId?: string;
}
export interface ProfileRecommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  relatedControlId?: string;
  relatedAutomationId?: string;
}
export interface ProfileMetrics {
  totalControls: number;
  failingControls: number;
  attentionControls: number;
  complianceCoveragePercent: number;
  activeAutomations: number;
  healthyConnectors: number;
  activeSessions: number;
}
export interface AuthenticatedProfileInput {
  user: ProfileUserIdentity;
  sessions: ProfileSession[];
  connectors: ProfileConnector[];
  automations: ProfileAutomationRun[];
  timeline: ProfileTimelineEvent[];
  controls: EvidenceControl[];
  currentTime?: string;
}
export interface AuthenticatedProfile {
  identity: ProfileUserIdentity & {
    riskScore: number;
    riskTier: ProfileRiskTier;
    complianceCoveragePercent: number;
  };
  metrics: ProfileMetrics;
  sessions: ProfileSession[];
  connectors: ProfileConnector[];
  automationRuns: ProfileAutomationRun[];
  compliance: ComplianceDashboard;
  timeline: ProfileTimelineEvent[];
  recommendations: ProfileRecommendation[];
}
export function buildAuthenticatedProfile(
  input: AuthenticatedProfileInput,
): AuthenticatedProfile {
  const compliance = buildComplianceDashboard({
    controls: input.controls,
    currentTime: input.currentTime,
  });
  const sessions = [...input.sessions].sort(
    (a, b) =>
      new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime(),
  );
  const connectors = [...input.connectors].sort(
    (a, b) => connectorStatusWeight(b.status) - connectorStatusWeight(a.status),
  );
  const automationRuns = [...input.automations].sort(sortAutomations);
  const timeline = [...input.timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const failingControls = compliance.summary.failing;
  const attentionControls = compliance.summary.attention;
  const activeAutomations = automationRuns.filter(
    (item) => item.status !== "paused",
  ).length;
  const healthyConnectors = connectors.filter(
    (item) => item.status === "healthy",
  ).length;
  const highRiskSessions = sessions.filter(
    (item) => item.riskLevel === "high",
  ).length;
  const mediumRiskSessions = sessions.filter(
    (item) => item.riskLevel === "medium",
  ).length;
  const complianceCoveragePercent =
    compliance.summary.totalControls === 0
      ? 0
      : Math.round(
          (compliance.summary.passing / compliance.summary.totalControls) * 100,
        );
  const riskScore =
    failingControls * 4 +
    attentionControls * 2 +
    highRiskSessions * 3 +
    mediumRiskSessions;
  const riskTier = resolveRiskTier(riskScore);
  const recommendations = buildRecommendations(
    compliance,
    automationRuns,
  ).slice(0, 8);
  const identity = {
    ...input.user,
    riskScore,
    riskTier,
    complianceCoveragePercent,
  };
  const metrics: ProfileMetrics = {
    totalControls: compliance.summary.totalControls,
    failingControls,
    attentionControls,
    complianceCoveragePercent,
    activeAutomations,
    healthyConnectors,
    activeSessions: sessions.length,
  };
  return {
    identity,
    metrics,
    sessions,
    connectors,
    automationRuns,
    compliance,
    timeline,
    recommendations,
  };
}
function connectorStatusWeight(status: ConnectorStatus) {
  switch (status) {
    case "healthy":
      return 3;
    case "degraded":
      return 2;
    default:
      return 1;
  }
}
function automationStatusWeight(status: AutomationStatus) {
  switch (status) {
    case "running":
      return 3;
    case "scheduled":
      return 2;
    default:
      return 1;
  }
}
function sortAutomations(a: ProfileAutomationRun, b: ProfileAutomationRun) {
  const statusComparison =
    automationStatusWeight(b.status) - automationStatusWeight(a.status);
  if (statusComparison !== 0) {
    return statusComparison;
  }
  return new Date(b.nextRunAt).getTime() - new Date(a.nextRunAt).getTime();
}
function resolveRiskTier(score: number): ProfileRiskTier {
  if (score >= 12) {
    return "elevated";
  }
  if (score >= 6) {
    return "moderate";
  }
  return "low";
}
function buildRecommendations(
  compliance: ComplianceDashboard,
  automations: ProfileAutomationRun[],
): ProfileRecommendation[] {
  const recommendations: ProfileRecommendation[] = [];
  for (const breach of compliance.breaches) {
    const priority: RecommendationPriority =
      breach.status === "failing" ? "high" : "medium";
    const messageBase = `${breach.title} (${breach.framework})`;
    for (const action of breach.recommendedActions.slice(0, 2)) {
      recommendations.push({
        id: `breach-${breach.controlId}-${hash(action)}`,
        title: action,
        description: `${messageBase} · Owner ${breach.owner}`,
        priority,
        relatedControlId: breach.controlId,
      });
    }
  }
  for (const automation of automations) {
    if (automation.status === "paused") {
      recommendations.push({
        id: `automation-${automation.id}-resume`,
        title: "Resume paused automation",
        description: `${automation.title} is paused. Review remediation notes and re-enable Zapier workflow ${automation.zapierWorkflowId}.`,
        priority: "medium",
        relatedControlId: automation.controlId,
        relatedAutomationId: automation.id,
      });
    } else if (automation.outcome === "warning") {
      recommendations.push({
        id: `automation-${automation.id}-followup`,
        title: "Investigate automation warning",
        description: `${automation.title} reported a warning during the last run (${automation.lastRunAt}). Validate evidence attachment in ${automation.targetApp}.`,
        priority: "medium",
        relatedControlId: automation.controlId,
        relatedAutomationId: automation.id,
      });
    }
  }
  return recommendations;
}
function hash(value: string) {
  let hashValue = 0;
  for (let index = 0; index < value.length; index += 1) {
    hashValue = (hashValue << 5) - hashValue + value.charCodeAt(index);
    hashValue |= 0;
  }
  return Math.abs(hashValue).toString(36);
}
