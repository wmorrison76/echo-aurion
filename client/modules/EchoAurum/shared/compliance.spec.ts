import { describe, expect, it } from "vitest";
import { buildComplianceDashboard, type EvidenceControl } from "./compliance";
const CONTROLS: EvidenceControl[] = [
  {
    controlId: "SOC2-CC1.1",
    title: "Change management approvals",
    framework: "SOC2",
    domain: "Change Management",
    status: "attention",
    lastRunAt: "2024-11-05T02:00:00Z",
    nextDueAt: "2024-11-12T02:00:00Z",
    owner: "Morgan Ellis",
    evidenceUri: "https://evidence.luccca.cloud/soc2/change-logs",
    glCodes: ["5110", "5125"],
    automationPlaybook: "SOC2-CC1.1::zapier-change-approval",
    zapierWorkflowId: "zapier:workflow:change-approvals",
    notes: "Evidence due in 7 days",
  },
  {
    controlId: "PCI-10.2",
    title: "Cardholder access reviews",
    framework: "PCI",
    domain: "Access Management",
    status: "failing",
    lastRunAt: "2024-10-28T04:00:00Z",
    nextDueAt: "2024-11-04T04:00:00Z",
    owner: "Alexis Roy",
    evidenceUri: "https://evidence.luccca.cloud/pci/access-reviews",
    glCodes: ["5125"],
    automationPlaybook: "PCI-10.2::zapier-access-review",
    zapierWorkflowId: "zapier:workflow:cardholder-access",
  },
  {
    controlId: "GDPR-DSAR",
    title: "Data subject request tracking",
    framework: "GDPR",
    domain: "Privacy",
    status: "passing",
    lastRunAt: "2024-11-06T05:00:00Z",
    nextDueAt: "2024-11-13T05:00:00Z",
    owner: "Taylor Chen",
    evidenceUri: "https://evidence.luccca.cloud/gdpr/dsar",
    glCodes: ["5132"],
  },
];
describe("buildComplianceDashboard", () => {
  it("summarizes controls, breaches, and automation queue", () => {
    const dashboard = buildComplianceDashboard({
      controls: CONTROLS,
      currentTime: "2024-11-06T12:00:00Z",
    });
    expect(dashboard.summary.totalControls).toBe(3);
    expect(dashboard.summary.failing).toBe(1);
    expect(dashboard.summary.frameworks.PCI.failing).toBe(1);
    expect(dashboard.summary.nextEvidenceDue).toBe("2024-11-04T04:00:00Z");
    const pciBreach = dashboard.breaches.find(
      (item) => item.controlId === "PCI-10.2",
    );
    expect(pciBreach).toBeDefined();
    expect(pciBreach?.glCodes).toContain("5125");
    expect(pciBreach?.recommendedActions.length).toBeGreaterThan(0);
    expect(dashboard.schedule[0].controlId).toBe("PCI-10.2");
    expect(
      dashboard.automationQueue.some((item) =>
        item.zapierWorkflowId?.includes("zapier"),
      ),
    ).toBe(true);
  });
});
