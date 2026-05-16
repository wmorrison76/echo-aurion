import type {
  ComplianceIncident,
  ControlAutomationTelemetry,
} from "@shared/complianceAutomation";
export const automationTelemetry: ControlAutomationTelemetry[] = [
  {
    controlId: "SOC2-CC1.1",
    lastWorkflowRunAt: "2024-11-06T12:15:00Z",
    successRate90d: 0.94,
    averageCompletionMinutes: 46,
    backlogCount: 1,
    zapierLatencySeconds: 42,
  },
  {
    controlId: "PCI-10.2",
    lastWorkflowRunAt: "2024-11-04T19:05:00Z",
    successRate90d: 0.72,
    averageCompletionMinutes: 88,
    lastFailureAt: "2024-11-03T18:45:00Z",
    backlogCount: 4,
    zapierLatencySeconds: 136,
  },
  {
    controlId: "PCI-11.3",
    lastWorkflowRunAt: "2024-11-05T09:40:00Z",
    successRate90d: 0.86,
    averageCompletionMinutes: 64,
    backlogCount: 2,
    zapierLatencySeconds: 78,
  },
  {
    controlId: "GDPR-DSAR",
    lastWorkflowRunAt: "2024-11-06T10:10:00Z",
    successRate90d: 0.97,
    averageCompletionMinutes: 32,
    zapierLatencySeconds: 38,
  },
];
export const complianceIncidents: ComplianceIncident[] = [
  {
    controlId: "PCI-10.2",
    detectedAt: "2024-11-03T18:40:00Z",
    severity: "critical",
    summary:
      "Privileged access review missed two quarterly attestations across cardholder data systems.",
    remediationDeadline: "2024-11-05T23:59:00Z",
    assignedTeam: "Security Governance",
  },
  {
    controlId: "PCI-11.3",
    detectedAt: "2024-11-04T13:25:00Z",
    severity: "warning",
    summary:
      "Segmentation scan produced medium severity findings requiring validation before evidence submission.",
    remediationDeadline: "2024-11-08T17:00:00Z",
    assignedTeam: "Network Engineering",
  },
  {
    controlId: "SOC2-CC1.1",
    detectedAt: "2024-11-06T08:05:00Z",
    severity: "info",
    summary:
      "Pending change ticket requires secondary approval to satisfy dual-control checklist.",
    remediationDeadline: "2024-11-07T20:00:00Z",
  },
];
