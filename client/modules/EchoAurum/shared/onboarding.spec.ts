import { describe, expect, it } from "vitest";
import {
  buildOnboardingPlaybook,
  type OnboardingPhaseInput,
} from "./onboarding";
const PHASES: OnboardingPhaseInput[] = [
  {
    id: "phase-discovery",
    name: "Discovery & Data Wiring",
    durationDays: 7,
    objectives: [
      "Connect PMS, POS, and GL exports",
      "Enable SSO and role provisioning",
    ],
    roiBaseline: 0,
    roiTarget: 12000,
    metricLabel: "Annualized savings",
    dependencies: [],
    glCodes: ["5110", "5125"],
    zapierWorkflowId: "zapier:workflow:data-ingest",
  },
  {
    id: "phase-automation",
    name: "Automation & Guardrails",
    durationDays: 14,
    objectives: [
      "Deploy Zelda guardrails for vendor payouts",
      "Activate EchoSentinel for duplicate detection",
    ],
    roiBaseline: 12000,
    roiTarget: 42000,
    metricLabel: "Annualized savings",
    dependencies: ["phase-discovery"],
    glCodes: ["5110", "5125", "5132"],
    zapierWorkflowId: "zapier:workflow:guardrails",
  },
  {
    id: "phase-analytics",
    name: "Analytics & ROI Benchmarks",
    durationDays: 10,
    objectives: [
      "Roll out ROI scorecards per property",
      "Map KPI lift to GL segments",
    ],
    roiBaseline: 42000,
    roiTarget: 62000,
    metricLabel: "Annualized savings",
    dependencies: ["phase-automation"],
    glCodes: ["5110", "5125", "5132"],
  },
];
describe("buildOnboardingPlaybook", () => {
  it("produces cumulative ROI and timeline metrics", () => {
    const playbook = buildOnboardingPlaybook({ phases: PHASES });
    expect(playbook.totalDuration).toBe(31);
    expect(playbook.overallLiftPercent).toBeGreaterThan(0);
    expect(playbook.averagePayback).toBeGreaterThan(0);
    expect(playbook.phases).toHaveLength(3);
    const automationPhase = playbook.phases.find(
      (phase) => phase.id === "phase-automation",
    );
    expect(automationPhase?.dependencies).toContain("phase-discovery");
    expect(automationPhase?.glCodes).toContain("5132");
    expect(automationPhase?.cumulativeRoi).toBeGreaterThan(
      automationPhase.roiBaseline,
    );
  });
});
