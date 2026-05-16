/********************************************************************
 * Calendar Engine API Routes
 * Builds 43-47: SLA, Reschedule Simulator, Cascading Impact, Weekly Digest
 *********************************************************************/

import { Request, Response } from "express";
import { evaluateSLAsForEvent, getSLAStatus } from "../lib/sla-engine";
import { simulateReschedule } from "../lib/reschedule-simulator";
import { computeCascadingImpact } from "../lib/cascading-impact";
import { generateWeeklyECDigest } from "../lib/weekly-ec-digest";

/**
 * POST /api/calendar/sla-evaluate
 * Evaluate SLAs for an event
 */
export async function evaluateSLAHandler(req: Request, res: Response) {
  try {
    const { event } = req.body;

    if (!event) {
      return res.status(400).json({ error: "Missing event data" });
    }

    const slaStatus = getSLAStatus(event);

    return res.json({
      ok: slaStatus.allMet,
      slaStatus,
      results: slaStatus.breaches.length === 0 ? "All SLAs met" : `${slaStatus.breaches.length} SLA breach(es)`,
    });
  } catch (error: any) {
    console.error("SLA evaluation error:", error);
    return res.status(500).json({
      error: "SLA evaluation failed",
      details: error.message,
    });
  }
}

/**
 * POST /api/calendar/simulate-reschedule
 * Simulate rescheduling an event
 * Body: { event, newStartTime, newEndTime, otherEvents }
 */
export async function rescheduleSimulatorHandler(req: Request, res: Response) {
  try {
    const { event, newStartTime, newEndTime, otherEvents = [] } = req.body;

    if (!event || !newStartTime || !newEndTime) {
      return res.status(400).json({
        error: "Missing required fields: event, newStartTime, newEndTime",
      });
    }

    const result = simulateReschedule({
      event,
      newStartTime,
      newEndTime,
      otherEvents,
    });

    return res.json({
      ok: result.simulation.feasible,
      simulation: result.simulation,
      warnings: result.simulation.warnings,
      riskDelta: result.riskDelta,
      slaDelta: result.slaDelta,
      newConflicts: result.newConflicts,
    });
  } catch (error: any) {
    console.error("Reschedule simulation error:", error);
    return res.status(500).json({
      error: "Reschedule simulation failed",
      details: error.message,
    });
  }
}

/**
 * POST /api/calendar/cascading-impact
 * Analyze cascading impact of changes
 * Body: { oldEvent, newEvent, laborRate, averageStaffRatio }
 */
export async function cascadingImpactHandler(req: Request, res: Response) {
  try {
    const { oldEvent, newEvent, laborRate, averageStaffRatio } = req.body;

    if (!oldEvent || !newEvent) {
      return res.status(400).json({
        error: "Missing required fields: oldEvent, newEvent",
      });
    }

    const impact = computeCascadingImpact({
      oldEvent,
      newEvent,
      laborRate,
      averageStaffRatio,
    });

    return res.json({
      ok: true,
      impact,
      summary: impact.summary,
      costDelta: impact.costDelta,
      riskDelta: impact.riskDelta,
      headcountDelta: impact.headcountDelta,
    });
  } catch (error: any) {
    console.error("Cascading impact error:", error);
    return res.status(500).json({
      error: "Cascading impact analysis failed",
      details: error.message,
    });
  }
}

/**
 * POST /api/calendar/weekly-digest
 * Generate weekly EC digest
 * Body: { weekLabel, events, conflicts, dailyRisk, dailyRevenue }
 */
export async function weeklyDigestHandler(req: Request, res: Response) {
  try {
    const { weekLabel, events = [], conflicts = [], dailyRisk = [], dailyRevenue = [] } = req.body;

    if (!weekLabel) {
      return res.status(400).json({
        error: "Missing required field: weekLabel",
      });
    }

    const digest = generateWeeklyECDigest({
      weekLabel,
      events,
      conflicts,
      dailyRisk,
      dailyRevenue,
    });

    return res.json({
      ok: true,
      markdown: digest.markdown,
      summary: digest.summary,
    });
  } catch (error: any) {
    console.error("Weekly digest generation error:", error);
    return res.status(500).json({
      error: "Weekly digest generation failed",
      details: error.message,
    });
  }
}

/**
 * GET /api/calendar/health
 * Check if calendar engines are running
 */
export async function calendarHealthHandler(req: Request, res: Response) {
  try {
    return res.json({
      ok: true,
      engines: {
        slaEngine: "✓ Ready",
        rescheduleSimulator: "✓ Ready",
        cascadingImpactEngine: "✓ Ready",
        weeklyDigestGenerator: "✓ Ready",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Calendar engines health check failed",
      details: error.message,
    });
  }
}
