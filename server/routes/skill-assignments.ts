import { Router, Request, Response } from "express";
import { realtimeManager } from "../lib/realtime";
import * as Sentry from "@sentry/node";

const skillAssignmentsRouter = Router();

interface SkillAssignment {
  staffId: string;
  station: string;
  skillLevel: 1 | 2 | 3 | 4 | 5;
  trainedDate: string;
  trainedBy: string;
  performanceScore: number;
  shiftsWorked: number;
  consistency: number;
}

interface AssignmentOptimization {
  position: string;
  date: string;
  mealPeriod: string;
  recommendedStaff: {
    id: string;
    name: string;
    skillLevel: number;
    performanceScore: number;
    reason: string;
  }[];
  optimizationReason: string;
}

// Mock skill data
const staffSkills: Map<string, SkillAssignment[]> = new Map([
  [
    "staff-1",
    [
      {
        staffId: "staff-1",
        station: "Saute",
        skillLevel: 5,
        trainedDate: "2024-01-20",
        trainedBy: "Chef_Frank",
        performanceScore: 4.8,
        shiftsWorked: 156,
        consistency: 0.95,
      },
      {
        staffId: "staff-1",
        station: "Grill",
        skillLevel: 4,
        trainedDate: "2024-02-15",
        trainedBy: "Chef_Jean",
        performanceScore: 4.5,
        shiftsWorked: 89,
        consistency: 0.88,
      },
    ],
  ],
  [
    "staff-2",
    [
      {
        staffId: "staff-2",
        station: "Saute",
        skillLevel: 4,
        trainedDate: "2024-03-15",
        trainedBy: "Chef_Jean",
        performanceScore: 4.5,
        shiftsWorked: 98,
        consistency: 0.87,
      },
      {
        staffId: "staff-2",
        station: "Prep",
        skillLevel: 4,
        trainedDate: "2024-04-01",
        trainedBy: "Chef_Frank",
        performanceScore: 4.3,
        shiftsWorked: 112,
        consistency: 0.85,
      },
    ],
  ],
]);

// Get staff skills and performance
skillAssignmentsRouter.get("/api/skill-assignments/:staffId", async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const skills = staffSkills.get(staffId) || [];

    // Calculate overall competency
    const avgSkillLevel = skills.length > 0
      ? (skills.reduce((sum, s) => sum + s.skillLevel, 0) / skills.length).toFixed(2)
      : 0;

    const avgPerformance = skills.length > 0
      ? (skills.reduce((sum, s) => sum + s.performanceScore, 0) / skills.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      staffId,
      skills,
      competencyMetrics: {
        avgSkillLevel,
        avgPerformance,
        totalStations: skills.length,
        totalShiftsWorked: skills.reduce((sum, s) => sum + s.shiftsWorked, 0),
      },
    });
  } catch (error) {
    console.error("[SKILL-ASSIGNMENTS] Get skills error:", error);
    Sentry.captureException(error, {
      tags: { feature: "skill-assignments", action: "get-skills" },
      extra: { staffId },
    });
    res.status(500).json({
      success: false,
      error: "Failed to fetch staff skills",
    });
  }
});

// Get optimal assignment for a position
skillAssignmentsRouter.post("/api/skill-assignments/optimize", async (req: Request, res: Response) => {
  try {
    const {
      position,
      date,
      mealPeriod,
      availableStaff,
      forecastCovered,
    } = req.body;

    // Score each available staff member
    const staffScores = availableStaff
      .map((staffId: string) => {
        const skills = staffSkills.get(staffId) || [];
        const positionSkill = skills.find((s) => s.station === position);

        if (!positionSkill) {
          return null; // Not trained for this position
        }

        // Calculate composite score
        const skillScore = (positionSkill.skillLevel / 5) * 40;
        const performanceScore = (positionSkill.performanceScore / 5) * 40;
        const consistencyScore = positionSkill.consistency * 20;

        const totalScore = skillScore + performanceScore + consistencyScore;

        return {
          staffId,
          name: `Staff_${staffId}`,
          skillLevel: positionSkill.skillLevel,
          performanceScore: positionSkill.performanceScore,
          totalScore,
          reason: `${positionSkill.skillLevel}-star skill, ${positionSkill.performanceScore.toFixed(1)}/5 performance, ${(positionSkill.consistency * 100).toFixed(0)}% consistency`,
        };
      })
      .filter((s) => s !== null)
      .sort((a, b) => b!.totalScore - a!.totalScore);

    const optimization: AssignmentOptimization = {
      position,
      date,
      mealPeriod,
      recommendedStaff: staffScores.slice(0, 3),
      optimizationReason: `Recommended staff sorted by skill level, performance score, and consistency. Selected candidates are trained on ${position} and have proven track record.`,
    };

    // Log optimization
    realtimeManager.sendEvent("skill-assignments", {
      type: "assignment-optimized",
      data: optimization,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      optimization,
      optimizedCount: staffScores.length,
    });
  } catch (error) {
    console.error("[SKILL-ASSIGNMENTS] Optimize error:", error);
    Sentry.captureException(error, {
      tags: { feature: "skill-assignments", action: "optimize" },
      extra: { position, date, availableStaffCount: availableStaff?.length },
    });
    res.status(500).json({
      success: false,
      error: "Failed to optimize assignments",
    });
  }
});

// Get all untrained staff for a position
skillAssignmentsRouter.get("/api/skill-assignments/:position/untrained", async (req: Request, res: Response) => {
  try {
    const { position } = req.params;
    const untrained: string[] = [];

    for (const [staffId, skills] of staffSkills.entries()) {
      if (!skills.find((s) => s.station === position)) {
        untrained.push(staffId);
      }
    }

    res.json({
      success: true,
      position,
      untrainedStaff: untrained,
      count: untrained.length,
      message: `${untrained.length} staff members are NOT trained for ${position} and cannot cover shifts.`,
    });
  } catch (error) {
    console.error("[SKILL-ASSIGNMENTS] Get untrained error:", error);
    Sentry.captureException(error, {
      tags: { feature: "skill-assignments", action: "get-untrained" },
      extra: { position },
    });
    res.status(500).json({
      success: false,
      error: "Failed to fetch untrained staff",
    });
  }
});

// Add training record
skillAssignmentsRouter.post("/api/skill-assignments/train", async (req: Request, res: Response) => {
  try {
    const { staffId, station, trainedBy, skillLevel } = req.body;

    if (!staffSkills.has(staffId)) {
      staffSkills.set(staffId, []);
    }

    const skills = staffSkills.get(staffId)!;
    const existingSkill = skills.find((s) => s.station === station);

    if (existingSkill) {
      // Update existing training
      existingSkill.trainedDate = new Date().toISOString();
      existingSkill.trainedBy = trainedBy;
      existingSkill.skillLevel = skillLevel || existingSkill.skillLevel;
    } else {
      // Add new training
      skills.push({
        staffId,
        station,
        skillLevel: skillLevel || 1,
        trainedDate: new Date().toISOString(),
        trainedBy,
        performanceScore: 3.0,
        shiftsWorked: 0,
        consistency: 0.0,
      });
    }

    // Broadcast training update
    realtimeManager.sendEvent("skill-assignments", {
      type: "staff-trained",
      data: { staffId, station, trainedBy, skillLevel },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: `${staffId} trained on ${station}`,
      skills: staffSkills.get(staffId),
    });
  } catch (error) {
    console.error("[SKILL-ASSIGNMENTS] Train error:", error);
    Sentry.captureException(error, {
      tags: { feature: "skill-assignments", action: "train" },
      extra: { staffId, station, trainedBy },
    });
    res.status(500).json({
      success: false,
      error: "Failed to record training",
    });
  }
});

export default skillAssignmentsRouter;
