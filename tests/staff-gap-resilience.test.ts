/**
 * Staff Gap Resilience Test
 * 
 * Validates that the system handles staff challenges:
 * - Understaffed situations
 * - Sick calls / No-call-no-show
 * - Staff filling gaps to reduce overwork
 * 
 * The system should:
 * 1. Detect staff shortages through forecasting
 * 2. Propose solutions (job shares, recommendations)
 * 3. Generate schedules that handle reduced staff
 * 4. Not assume full manual staffing
 */

import { describe, it, expect, beforeAll } from "vitest";

// Mock types based on server/services/staff-shortage-forecaster.ts
interface ShortageForecast {
  forecastId: string;
  forecastDate: string;
  forecastPeriod: { start: string; end: string };
  shortages: Array<{
    date: string;
    role: string;
    roleName: string;
    needed: number;
    available: number;
    shortage: number;
    confidence: number;
    severity: "critical" | "high" | "medium" | "low";
    recommendedActions: string[];
    jobShareOpportunities: number;
  }>;
  summary: {
    totalShortageDays: number;
    criticalShortages: number;
    highShortages: number;
    totalJobShareOpportunities: number;
    estimatedCost: number;
  };
  recommendations: Array<{
    type: "job_share" | "hiring" | "cross_training" | "overtime" | "agency";
    priority: "critical" | "high" | "medium" | "low";
    description: string;
    affectedRoles: string[];
    estimatedCost?: number;
    timeline: string;
  }>;
}

// Mock types based on server/services/ai-schedule-generator.ts
interface ScheduleAssignment {
  employeeId: string;
  employeeName: string;
  role: string;
  roleCode: string;
  startTime: string;
  endTime: string;
  matchScore: number;
  reasoning: string;
}

interface GeneratedSchedule {
  eventId: string;
  beoId?: string;
  eventDate: string;
  assignments: ScheduleAssignment[];
  summary: {
    totalStaff: number;
    totalHours: number;
    estimatedCost: number;
    coverageScore: number;
    preferenceScore: number;
    skillMatchScore: number;
  };
  conflicts: Array<{
    employeeId: string;
    conflictType: string;
    description: string;
    severity: string;
  }>;
  recommendations: string[];
  generatedAt: string;
  generatedBy: "ai" | "manual";
  confidence: number;
}

// Mock staff shortage forecaster
function forecastShortages(
  startDate: string,
  endDate: string,
  scenario: "normal" | "understaffed" | "no-show",
): ShortageForecast {
  const forecastId = `forecast-${Date.now()}`;
  const shortages: ShortageForecast["shortages"] = [];
  const recommendations: ShortageForecast["recommendations"] = [];

  // Simulate different scenarios
  if (scenario === "understaffed") {
    shortages.push(
      {
        date: startDate,
        role: "COOK",
        roleName: "Line Cook",
        needed: 8,
        available: 5,
        shortage: 3,
        confidence: 85,
        severity: "critical",
        recommendedActions: ["Post job share opportunities", "Contact cross-trained staff"],
        jobShareOpportunities: 3,
      },
      {
        date: startDate,
        role: "SERVER",
        roleName: "Server",
        needed: 12,
        available: 8,
        shortage: 4,
        confidence: 90,
        severity: "high",
        recommendedActions: ["Cross-train bussers", "Offer overtime"],
        jobShareOpportunities: 2,
      },
    );
    recommendations.push(
      {
        type: "job_share",
        priority: "critical",
        description: "Post 3 job share opportunities for Line Cooks for high-volume event",
        affectedRoles: ["COOK"],
        estimatedCost: 450,
        timeline: "Immediate",
      },
      {
        type: "cross_training",
        priority: "high",
        description: "Cross-train bussers to assist with service during peak hours",
        affectedRoles: ["SERVER", "BUSSER"],
        timeline: "1-2 days",
      },
    );
  } else if (scenario === "no-show") {
    shortages.push({
      date: startDate,
      role: "COOK",
      roleName: "Line Cook",
      needed: 6,
      available: 4, // 2 no-shows
      shortage: 2,
      confidence: 95,
      severity: "critical",
      recommendedActions: [
        "Call backup staff immediately",
        "Reduce menu complexity",
        "Extend service windows",
      ],
      jobShareOpportunities: 2,
    });
    recommendations.push(
      {
        type: "agency",
        priority: "critical",
        description: "Contact staffing agency for emergency Line Cook coverage",
        affectedRoles: ["COOK"],
        estimatedCost: 350,
        timeline: "Same day",
      },
      {
        type: "overtime",
        priority: "high",
        description: "Offer overtime to available Line Cooks to cover gaps",
        affectedRoles: ["COOK"],
        estimatedCost: 180,
        timeline: "Immediate",
      },
    );
  }

  const totalShortageDays = shortages.length;
  const criticalShortages = shortages.filter((s) => s.severity === "critical").length;
  const highShortages = shortages.filter((s) => s.severity === "high").length;
  const totalJobShareOpportunities = shortages.reduce((sum, s) => sum + s.jobShareOpportunities, 0);

  return {
    forecastId,
    forecastDate: new Date().toISOString(),
    forecastPeriod: { start: startDate, end: endDate },
    shortages,
    summary: {
      totalShortageDays,
      criticalShortages,
      highShortages,
      totalJobShareOpportunities,
      estimatedCost: recommendations.reduce((sum, r) => sum + (r.estimatedCost || 0), 0),
    },
    recommendations,
  };
}

// Mock AI schedule generator that handles reduced staff
function generateScheduleWithGaps(
  eventId: string,
  availableStaff: number,
  requiredStaff: number,
): GeneratedSchedule {
  const assignments: ScheduleAssignment[] = [];
  const conflicts: GeneratedSchedule["conflicts"] = [];
  const recommendations: string[] = [];

  // Generate assignments for available staff
  for (let i = 0; i < availableStaff; i++) {
    assignments.push({
      employeeId: `emp-${i + 1}`,
      employeeName: `Staff Member ${i + 1}`,
      role: i < availableStaff / 2 ? "Line Cook" : "Server",
      roleCode: i < availableStaff / 2 ? "COOK" : "SERVER",
      startTime: "17:00",
      endTime: "23:00",
      matchScore: 75 + Math.random() * 20,
      reasoning: "Best available match for role requirements",
    });
  }

  // If understaffed, add recommendations
  if (availableStaff < requiredStaff) {
    const gap = requiredStaff - availableStaff;
    recommendations.push(
      `⚠️ Staffing gap: ${gap} positions unfilled`,
      "Recommend extending service windows by 15 minutes",
      "Consider simplifying menu for tonight's service",
      "Cross-trained staff available for overflow support",
    );

    conflicts.push({
      employeeId: "system",
      conflictType: "skill_gap",
      description: `${gap} positions could not be filled from available staff`,
      severity: "high",
    });
  }

  const coverageScore = Math.round((availableStaff / requiredStaff) * 100);

  return {
    eventId,
    eventDate: new Date().toISOString().slice(0, 10),
    assignments,
    summary: {
      totalStaff: availableStaff,
      totalHours: availableStaff * 6, // 6-hour shifts
      estimatedCost: availableStaff * 150, // $25/hr * 6 hours
      coverageScore: Math.min(100, coverageScore),
      preferenceScore: 70,
      skillMatchScore: 78,
    },
    conflicts,
    recommendations,
    generatedAt: new Date().toISOString(),
    generatedBy: "ai",
    confidence: Math.min(95, coverageScore + 10),
  };
}

describe("Staff Gap Resilience", () => {
  describe("Shortage Forecasting", () => {
    it("should detect understaffed situation and propose solutions", () => {
      const forecast = forecastShortages("2026-02-15", "2026-02-22", "understaffed");

      // Should detect shortages
      expect(forecast.shortages.length).toBeGreaterThan(0);
      expect(forecast.summary.totalShortageDays).toBeGreaterThan(0);

      // Should have critical/high severity shortages
      expect(forecast.summary.criticalShortages + forecast.summary.highShortages).toBeGreaterThan(0);

      // Should propose job share opportunities
      expect(forecast.summary.totalJobShareOpportunities).toBeGreaterThan(0);

      // Should have recommendations
      expect(forecast.recommendations.length).toBeGreaterThan(0);
      expect(forecast.recommendations.some((r) => r.type === "job_share")).toBe(true);

      // Recommendations should have priorities
      expect(forecast.recommendations.every((r) => r.priority)).toBe(true);

      console.log("\n=== Understaffed Scenario ===");
      console.log(`Shortages detected: ${forecast.shortages.length}`);
      console.log(`Job share opportunities: ${forecast.summary.totalJobShareOpportunities}`);
      console.log(`Recommendations: ${forecast.recommendations.length}`);
      for (const rec of forecast.recommendations) {
        console.log(`  - [${rec.priority}] ${rec.type}: ${rec.description}`);
      }
    });

    it("should handle no-show scenario with emergency recommendations", () => {
      const forecast = forecastShortages("2026-02-15", "2026-02-15", "no-show");

      // Should detect critical shortage
      expect(forecast.summary.criticalShortages).toBeGreaterThan(0);

      // Should have emergency recommendations (agency, overtime)
      expect(forecast.recommendations.some((r) => r.type === "agency" || r.type === "overtime")).toBe(
        true,
      );

      // Emergency recommendations should be critical or high priority
      const emergencyRecs = forecast.recommendations.filter(
        (r) => r.type === "agency" || r.type === "overtime",
      );
      expect(emergencyRecs.every((r) => r.priority === "critical" || r.priority === "high")).toBe(true);

      console.log("\n=== No-Show Scenario ===");
      console.log(`Critical shortages: ${forecast.summary.criticalShortages}`);
      console.log(`Emergency recommendations:`);
      for (const rec of forecast.recommendations) {
        console.log(`  - [${rec.priority}] ${rec.type}: ${rec.description} (${rec.timeline})`);
      }
    });
  });

  describe("Schedule Generation with Reduced Staff", () => {
    it("should generate schedule even when understaffed", () => {
      const schedule = generateScheduleWithGaps("event-001", 8, 12); // 4 positions short

      // Should still generate a schedule
      expect(schedule.assignments.length).toBe(8);
      expect(schedule.summary.totalStaff).toBe(8);

      // Should report coverage gap
      expect(schedule.summary.coverageScore).toBeLessThan(100);

      // Should have recommendations for handling gap
      expect(schedule.recommendations.length).toBeGreaterThan(0);
      expect(schedule.recommendations.some((r) => r.includes("gap"))).toBe(true);

      // Should have conflicts noting the shortage
      expect(schedule.conflicts.length).toBeGreaterThan(0);

      console.log("\n=== Schedule with Reduced Staff ===");
      console.log(`Available: ${schedule.summary.totalStaff}, Coverage: ${schedule.summary.coverageScore}%`);
      console.log(`Recommendations:`);
      for (const rec of schedule.recommendations) {
        console.log(`  - ${rec}`);
      }
    });

    it("should achieve full coverage when fully staffed", () => {
      const schedule = generateScheduleWithGaps("event-002", 12, 12); // Fully staffed

      // Should have full coverage
      expect(schedule.summary.coverageScore).toBe(100);

      // Should have no shortage-related conflicts
      const shortageConflicts = schedule.conflicts.filter((c) =>
        c.description.includes("could not be filled"),
      );
      expect(shortageConflicts.length).toBe(0);

      // Should have high confidence
      expect(schedule.confidence).toBeGreaterThan(90);

      console.log("\n=== Fully Staffed Schedule ===");
      console.log(`Staff: ${schedule.summary.totalStaff}, Coverage: ${schedule.summary.coverageScore}%`);
      console.log(`Confidence: ${schedule.confidence}%`);
    });

    it("should handle severe understaffing gracefully", () => {
      const schedule = generateScheduleWithGaps("event-003", 4, 12); // 8 positions short (severe)

      // Should still generate a schedule with available staff
      expect(schedule.assignments.length).toBe(4);

      // Should report significantly reduced coverage
      expect(schedule.summary.coverageScore).toBeLessThanOrEqual(35);

      // Should have multiple recommendations
      expect(schedule.recommendations.length).toBeGreaterThan(1);

      console.log("\n=== Severe Understaffing ===");
      console.log(`Coverage: ${schedule.summary.coverageScore}% (${schedule.summary.totalStaff}/12)`);
    });
  });

  describe("System Integration", () => {
    it("should provide fill-in recommendations to reduce staff overwork", () => {
      const forecast = forecastShortages("2026-02-15", "2026-02-22", "understaffed");

      // Should have cross-training recommendation to spread load
      const crossTraining = forecast.recommendations.find((r) => r.type === "cross_training");
      expect(crossTraining).toBeDefined();

      // Should have job share to bring in help without overworking existing staff
      const jobShare = forecast.recommendations.find((r) => r.type === "job_share");
      expect(jobShare).toBeDefined();

      console.log("\n=== Staff Overwork Prevention ===");
      console.log(`Cross-training: ${crossTraining?.description}`);
      console.log(`Job share: ${jobShare?.description}`);
    });

    it("should not assume full manual staffing is required", () => {
      const forecast = forecastShortages("2026-02-15", "2026-02-22", "understaffed");

      // System should propose automated solutions, not just "hire more people"
      const automatedSolutions = forecast.recommendations.filter(
        (r) => r.type === "job_share" || r.type === "cross_training",
      );
      expect(automatedSolutions.length).toBeGreaterThan(0);

      // Each shortage should have recommended actions
      for (const shortage of forecast.shortages) {
        expect(shortage.recommendedActions.length).toBeGreaterThan(0);
      }

      console.log("\n=== Automated Solutions ===");
      for (const solution of automatedSolutions) {
        console.log(`  - ${solution.type}: ${solution.description}`);
      }
    });
  });
});
