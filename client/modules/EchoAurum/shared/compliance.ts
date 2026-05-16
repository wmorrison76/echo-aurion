export type ControlFramework = "SOC2" | "PCI" | "GDPR";
export type ControlStatus = "passing" | "attention" | "failing";
export interface EvidenceControl {
  controlId: string;
  title: string;
  framework: ControlFramework;
  domain: string;
  status: ControlStatus;
  lastRunAt: string;
  nextDueAt: string;
  owner: string;
  evidenceUri: string;
  glCodes: string[];
  automationPlaybook?: string;
  zapierWorkflowId?: string;
  notes?: string;
}
export interface ControlBreach {
  controlId: string;
  title: string;
  framework: ControlFramework;
  status: ControlStatus;
  lastRunAt: string;
  nextDueAt: string;
  owner: string;
  variance: string;
  glCodes: string[];
  recommendedActions: string[];
  zapierWorkflowId?: string;
}
export interface EvidenceScheduleItem {
  controlId: string;
  title: string;
  framework: ControlFramework;
  nextDueAt: string;
  owner: string;
  evidenceUri: string;
  automationPlaybook?: string;
}
export interface AutomationWorkflowItem {
  controlId: string;
  title: string;
  framework: ControlFramework;
  zapierWorkflowId?: string;
  automationPlaybook?: string;
  action: string;
}
export interface FrameworkSummary {
  controls: number;
  passing: number;
  attention: number;
  failing: number;
  nextDueAt?: string;
}
export interface ComplianceSummary {
  totalControls: number;
  passing: number;
  attention: number;
  failing: number;
  frameworks: Record<ControlFramework, FrameworkSummary>;
  nextEvidenceDue?: string;
}
export interface ComplianceDashboard {
  summary: ComplianceSummary;
  breaches: ControlBreach[];
  schedule: EvidenceScheduleItem[];
  automationQueue: AutomationWorkflowItem[];
}
export interface ComplianceDashboardInput {
  controls: EvidenceControl[];
  currentTime?: string;
}
const RECOMMENDATIONS: Record<
  ControlFramework,
  Record<ControlStatus, string[]>
> = {
  SOC2: {
    passing: ["Document evidence in Argus binder"],
    attention: [
      "Review control narrative with control owner",
      "Capture compensating control in Zelda doc",
    ],
    failing: [
      "Escalate to compliance lead",
      "Launch remediation plan and attach SOC drill-down",
    ],
  },
  PCI: {
    passing: ["Sync audit trail with cardholder data environment"],
    attention: [
      "Verify segmented network scan results",
      "Validate tokenization partner attestations",
    ],
    failing: [
      "Trigger incident response procedure",
      "Notify acquiring bank of remediation timeline",
    ],
  },
  GDPR: {
    passing: ["Confirm residency routing in Phoenix"],
    attention: [
      "Refresh data processing agreement inventory",
      "Coordinate with privacy counsel",
    ],
    failing: [
      "Freeze impacted processing activities",
      "Run DPIA update with privacy office",
    ],
  },
};
export function buildComplianceDashboard(
  input: ComplianceDashboardInput,
): ComplianceDashboard {
  const controls = [...input.controls];
  const now = input.currentTime
    ? new Date(input.currentTime).getTime()
    : Date.now();
  const summary: ComplianceSummary = {
    totalControls: controls.length,
    passing: 0,
    attention: 0,
    failing: 0,
    frameworks: {
      SOC2: { controls: 0, passing: 0, attention: 0, failing: 0 },
      PCI: { controls: 0, passing: 0, attention: 0, failing: 0 },
      GDPR: { controls: 0, passing: 0, attention: 0, failing: 0 },
    },
  };
  const breaches: ControlBreach[] = [];
  const schedule: EvidenceScheduleItem[] = [];
  const automationQueue: AutomationWorkflowItem[] = [];
  for (const control of controls) {
    const frameworkSummary = summary.frameworks[control.framework];
    frameworkSummary.controls += 1;
    frameworkSummary[control.status] += 1;
    summary[control.status] += 1;
    const nextDueTime = new Date(control.nextDueAt).getTime();
    const scheduleItem: EvidenceScheduleItem = {
      controlId: control.controlId,
      title: control.title,
      framework: control.framework,
      nextDueAt: control.nextDueAt,
      owner: control.owner,
      evidenceUri: control.evidenceUri,
      automationPlaybook: control.automationPlaybook,
    };
    schedule.push(scheduleItem);
    if (
      !frameworkSummary.nextDueAt ||
      new Date(control.nextDueAt) < new Date(frameworkSummary.nextDueAt)
    ) {
      frameworkSummary.nextDueAt = control.nextDueAt;
    }
    if (
      !summary.nextEvidenceDue ||
      new Date(control.nextDueAt) < new Date(summary.nextEvidenceDue)
    ) {
      summary.nextEvidenceDue = control.nextDueAt;
    }
    if (control.status !== "passing") {
      const recommendations = buildRecommendations(
        control.framework,
        control.status,
      );
      breaches.push({
        controlId: control.controlId,
        title: control.title,
        framework: control.framework,
        status: control.status,
        lastRunAt: control.lastRunAt,
        nextDueAt: control.nextDueAt,
        owner: control.owner,
        variance: control.notes ?? buildVarianceMessage(control, now),
        glCodes: control.glCodes,
        recommendedActions: recommendations,
        zapierWorkflowId: control.zapierWorkflowId,
      });
    }
    if (control.automationPlaybook || control.zapierWorkflowId) {
      automationQueue.push({
        controlId: control.controlId,
        title: control.title,
        framework: control.framework,
        zapierWorkflowId: control.zapierWorkflowId,
        automationPlaybook: control.automationPlaybook,
        action:
          control.status === "failing" ? "Remediation" : "Evidence capture",
      });
    }
  }
  breaches.sort((a, b) => statusWeight(b.status) - statusWeight(a.status));
  schedule.sort(
    (a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime(),
  );
  automationQueue.sort(
    (a, b) =>
      statusWeight(resolveStatusForQueue(a.controlId, controls)) -
      statusWeight(resolveStatusForQueue(b.controlId, controls)),
  );
  return { summary, breaches, schedule, automationQueue };
}
function buildVarianceMessage(control: EvidenceControl, now: number) {
  const nextDue = new Date(control.nextDueAt).getTime();
  const deltaDays = Math.round((nextDue - now) / (1000 * 60 * 60 * 24));
  if (deltaDays < 0) {
    return `Evidence overdue by ${Math.abs(deltaDays)} days.`;
  }
  if (deltaDays === 0) {
    return "Evidence due today.";
  }
  return `Evidence due in ${deltaDays} days.`;
}
function buildRecommendations(
  framework: ControlFramework,
  status: ControlStatus,
) {
  const defaults = RECOMMENDATIONS[framework][status];
  return defaults.length > 0
    ? defaults
    : ["Review control state with compliance team"];
}
function statusWeight(status: ControlStatus) {
  switch (status) {
    case "failing":
      return 3;
    case "attention":
      return 2;
    default:
      return 1;
  }
}
function resolveStatusForQueue(controlId: string, controls: EvidenceControl[]) {
  const control = controls.find((item) => item.controlId === controlId);
  return control?.status ?? "passing";
}
