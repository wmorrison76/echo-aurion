import { Router, Request, Response } from "express";
import { mlRiskAssessmentService } from "../services/ml-risk-assessment-service";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { getUserOrgId } from "../lib/multi-tenant";

const router = Router();

/**
 * POST /api/ml-risk-assessment/assess
 * Assess risk for an event using ML-based analysis
 */
router.post("/assess", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.body;
    const orgId = getUserOrgId(req);

    if (!eventId || !orgId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "eventId and orgId are required",
      });
    }

    // Get event data from database
    const { supabase } = await import("../lib/supabase");
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        error: "EVENT_NOT_FOUND",
        message: "Event not found or access denied",
      });
    }

    // Calculate hours until event
    const eventDate = new Date(event.event_date);
    const now = new Date();
    const hoursUntilEvent = Math.max(0, (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Build risk input
    const riskInput = {
      headcount: event.headcount || 0,
      complexity: event.complexity || "medium",
      hoursUntilEvent,
      hasEngineeringWork: event.has_engineering_work || false,
      multiSpace: event.multi_space || false,
      vipLevel: event.vip_level || 0,
      weatherRisk: event.weather_risk || 0,
      menuComplexity: event.menu_complexity || 0,
    };

    // Assess risk
    const assessment = await mlRiskAssessmentService.assessEventRisk(eventId, orgId, riskInput);

    res.json({
      success: true,
      assessment,
    });
  } catch (error) {
    logger.error("[MLRiskAssessment] Assessment failed", { error, body: req.body });
    res.status(500).json({
      error: "ASSESSMENT_FAILED",
      message: "Failed to assess event risk",
    });
  }
});

/**
 * GET /api/ml-risk-assessment/event/:eventId
 * Get risk assessment for a specific event
 */
router.get("/event/:eventId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const orgId = getUserOrgId(req);

    if (!eventId || !orgId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "eventId and orgId are required",
      });
    }

    const assessment = await mlRiskAssessmentService.getEventAssessment(eventId, orgId);

    if (!assessment) {
      return res.status(404).json({
        error: "ASSESSMENT_NOT_FOUND",
        message: "Risk assessment not found for this event",
      });
    }

    res.json({
      success: true,
      assessment,
    });
  } catch (error) {
    logger.error("[MLRiskAssessment] Failed to get assessment", { error, eventId: req.params.eventId });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve risk assessment",
    });
  }
});

/**
 * GET /api/ml-risk-assessment/events
 * Get risk assessments for multiple events
 */
router.get("/events", requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);
    const { eventIds } = req.query;

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "orgId is required",
      });
    }

    const eventIdArray = eventIds
      ? (Array.isArray(eventIds) ? eventIds : [eventIds]).map(String)
      : undefined;

    const assessments = await mlRiskAssessmentService.getBulkAssessments(orgId, eventIdArray);

    res.json({
      success: true,
      assessments,
    });
  } catch (error) {
    logger.error("[MLRiskAssessment] Failed to get bulk assessments", { error });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve risk assessments",
    });
  }
});

/**
 * GET /api/ml-risk-assessment/mitigations/:eventId
 * Get risk mitigation recommendations for an event
 */
router.get("/mitigations/:eventId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const orgId = getUserOrgId(req);

    if (!eventId || !orgId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "eventId and orgId are required",
      });
    }

    const assessment = await mlRiskAssessmentService.getEventAssessment(eventId, orgId);

    if (!assessment) {
      return res.status(404).json({
        error: "ASSESSMENT_NOT_FOUND",
        message: "Risk assessment not found. Please assess the event first.",
      });
    }

    res.json({
      success: true,
      mitigations: assessment.mitigationRecommendations || [],
      riskFactors: assessment.riskFactors || [],
      riskScore: assessment.mlScore,
      confidence: assessment.mlConfidence,
    });
  } catch (error) {
    logger.error("[MLRiskAssessment] Failed to get mitigations", { error, eventId: req.params.eventId });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve mitigation recommendations",
    });
  }
});

/**
 * GET /api/ml-risk-assessment/dashboard
 * Get dashboard summary of risk assessments
 */
router.get("/dashboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);
    const { days = 30 } = req.query;

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "orgId is required",
      });
    }

    const summary = await mlRiskAssessmentService.getDashboardSummary(orgId, Number(days));

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error("[MLRiskAssessment] Failed to get dashboard summary", { error });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve dashboard summary",
    });
  }
});

export default router;