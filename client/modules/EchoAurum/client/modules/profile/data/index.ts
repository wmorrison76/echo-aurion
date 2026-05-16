import type { EvidenceControl } from "../../../../shared/compliance";
import type {
  ProfileAutomationRun,
  ProfileConnector,
  ProfileSession,
  ProfileTimelineEvent,
  ProfileUserIdentity,
} from "../../../../shared/profile";
import { controls as complianceControls } from "@/modules/compliance/data";
export const profileUser: ProfileUserIdentity = {
  id: "user-morgan-ellis",
  name: "Morgan Ellis",
  email: "morgan.ellis@luccca.cloud",
  title: "VP Finance Transformation",
  department: "Finance & Compliance",
  entity: "LUCCCA Holdings",
  authenticationProvider: "Okta SSO",
  timezone: "America/New_York",
  avatarUrl: "https://cdn.luccca.cloud/avatars/morgan-ellis.png",
  guardrails: [
    "Zelda MFA enforcement",
    "Argus immutable audit",
    "Phoenix reversal approvals",
  ],
  responsibilities: [
    "Approves ACH releases above $250K",
    "Maintains SOC 2 and PCI DSS control library",
    "Owns variance remediation playbooks across properties",
  ],
  lastLoginAt: "2024-11-06T13:58:00Z",
  mfaEnrolled: true,
};
export const profileSessions: ProfileSession[] = [
  {
    id: "session-nyc-macbook",
    device: 'MacBook Pro 16" (2023)',
    location: "New York, NY, USA",
    ipAddress: "66.24.12.58",
    lastActiveAt: "2024-11-06T14:35:00Z",
    mfaVerifiedAt: "2024-11-06T13:59:00Z",
    riskLevel: "low",
    guardrailsObserved: ["Okta push MFA", "Zelda session notarized"],
  },
  {
    id: "session-den-ipad",
    device: 'iPad Pro 12.9"',
    location: "Denver, CO, USA",
    ipAddress: "104.28.12.96",
    lastActiveAt: "2024-11-05T23:14:00Z",
    riskLevel: "medium",
    guardrailsObserved: ["Device posture ok", "Phoenix geo-fence satisfied"],
  },
  {
    id: "session-sfo-surface",
    device: "Surface Laptop Studio",
    location: "San Francisco, CA, USA",
    ipAddress: "35.203.91.11",
    lastActiveAt: "2024-11-04T18:22:00Z",
    riskLevel: "high",
    guardrailsObserved: [
      "VPN bypass attempt blocked",
      "Odin anomaly score 7.4",
    ],
  },
];
export const profileConnectors: ProfileConnector[] = [
  {
    id: "zapier-luccca-compliance",
    name: "Zapier Compliance Orchestrations",
    vendor: "Zapier",
    category: "Automation",
    status: "healthy",
    lastSyncAt: "2024-11-06T14:20:00Z",
    coverage: ["SOC2", "PCI"],
    automationCount: 7,
    detail:
      "Runs evidence capture, Slack escalations, and Notion binder updates for failing controls.",
  },
  {
    id: "supabase-control-repo",
    name: "Supabase Control Repository",
    vendor: "Supabase",
    category: "Data Warehouse",
    status: "healthy",
    lastSyncAt: "2024-11-06T14:10:00Z",
    coverage: ["SOC2", "GDPR"],
    automationCount: 12,
    detail:
      "Stores Argus binder artifacts and DSAR fulfillment history for GDPR attestations.",
  },
  {
    id: "pagerduty-guardrails",
    name: "PagerDuty Guardrail Escalations",
    vendor: "PagerDuty",
    category: "Incident Response",
    status: "degraded",
    lastSyncAt: "2024-11-05T22:45:00Z",
    coverage: ["PCI"],
    automationCount: 2,
    detail:
      "Weekend rotation acknowledged PCI-10.2 remediation but final confirmation pending.",
  },
];
export const profileAutomations: ProfileAutomationRun[] = [
  {
    id: "automation-soc-change",
    controlId: "SOC2-CC1.1",
    title: "Change approval binder sync",
    zapierWorkflowId: "zapier:workflow:change-approvals",
    targetApp: "Notion",
    lastRunAt: "2024-11-06T13:45:00Z",
    nextRunAt: "2024-11-06T16:45:00Z",
    status: "running",
    outcome: "success",
  },
  {
    id: "automation-pci-access",
    controlId: "PCI-10.2",
    title: "Cardholder access remediation",
    zapierWorkflowId: "zapier:workflow:cardholder-access",
    targetApp: "ServiceNow",
    lastRunAt: "2024-11-05T21:05:00Z",
    nextRunAt: "2024-11-06T21:05:00Z",
    status: "paused",
    outcome: "warning",
  },
  {
    id: "automation-pci-scan",
    controlId: "PCI-11.3",
    title: "Segmentation scan ingestion",
    zapierWorkflowId: "zapier:workflow:segmentation-scan",
    targetApp: "BigQuery",
    lastRunAt: "2024-11-03T04:00:00Z",
    nextRunAt: "2024-11-10T04:00:00Z",
    status: "scheduled",
    outcome: "success",
  },
  {
    id: "automation-gdpr-dsar",
    controlId: "GDPR-DSAR",
    title: "DSAR fulfillment ledger push",
    zapierWorkflowId: "zapier:workflow:gdpr-dsar",
    targetApp: "Supabase",
    lastRunAt: "2024-11-06T11:30:00Z",
    nextRunAt: "2024-11-06T17:30:00Z",
    status: "running",
    outcome: "warning",
  },
];
export const profileTimeline: ProfileTimelineEvent[] = [
  {
    id: "timeline-automation-change",
    timestamp: "2024-11-06T14:32:00Z",
    category: "automation",
    severity: "success",
    summary: "Zapier change management run completed",
    details:
      "Uploaded Jira ticket CHG-3421 evidence into Argus binder with Okta approval hash.",
    relatedControlId: "SOC2-CC1.1",
    relatedAutomationId: "automation-soc-change",
  },
  {
    id: "timeline-session-alert",
    timestamp: "2024-11-05T23:16:00Z",
    category: "session",
    severity: "warning",
    summary: "Medium risk session verified",
    details: "Denver iPad session challenged with MFA due to off-hours access.",
    relatedControlId: "SOC2-CC1.1",
  },
  {
    id: "timeline-pci-escalation",
    timestamp: "2024-11-05T21:08:00Z",
    category: "compliance",
    severity: "critical",
    summary: "PCI-10.2 remediation escalated",
    details:
      "PagerDuty escalation triggered ServiceNow task INC-88914 for Alexis Roy.",
    relatedControlId: "PCI-10.2",
    relatedAutomationId: "automation-pci-access",
  },
  {
    id: "timeline-dsar-warning",
    timestamp: "2024-11-06T11:35:00Z",
    category: "automation",
    severity: "warning",
    summary: "DSAR automation produced warning",
    details:
      "One Supabase record missing residency tag; Phoenix follow-up scheduled.",
    relatedControlId: "GDPR-DSAR",
    relatedAutomationId: "automation-gdpr-dsar",
  },
];
export const profileControls: EvidenceControl[] = complianceControls.map(
  (control) => ({ ...control }),
);
export const profileCurrentTime = "2024-11-06T15:00:00Z";
